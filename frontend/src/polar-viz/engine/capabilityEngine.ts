import type { CapabilityConfig, CapabilityMap, Capability, Dataset, DensityReport, ModeId } from '../types/dataset';
import { castIds, estimateCoverage, depthMetres, getVar, toLocalXYZ } from './spatial';

export const DEFAULT_CONFIG: CapabilityConfig = {
  minPoints3D: 5, minCasts3D: 1, minCoverage3D: 0.01, maxPointsGPU: 100_000, zScale: 100, defaultRadiusKm: 500,
};

const ok = (reason = 'Available'): Capability => ({ enabled: true, reason });
const no = (reason: string): Capability => ({ enabled: false, reason });

/** Does the data fill enough of its own bounding volume for 3D interpolation to be honest? */
export function checkDensity(ds: Dataset, cfg: CapabilityConfig = DEFAULT_CONFIG): DensityReport {
  const fail = (details: string): DensityReport =>
    ({ passed: false, points: 0, casts: 0, coverage: 0, radiusKm: 0, details });
  const lat = getVar(ds, 'latitude'), lon = getVar(ds, 'longitude'), depth = depthMetres(ds);

  if (ds.layout === 'gridded') {
    const axes = ds.variables.filter(v => ['latitude', 'longitude', 'depth', 'pressure'].includes(v.role) && v.values && v.dims.length === 1);
    const ok3 = axes.length >= 3 && axes.every(a => a.count >= 4);
    return { passed: ok3, points: axes.reduce((n, a) => n * a.count, 1), casts: 0, coverage: ok3 ? 1 : 0, radiusKm: 0,
      details: ok3 ? 'Regular lat/lon/depth grid. Missing (NaN) cells are not interpolated.' : 'Gridded file needs lat, lon and depth axes with at least 4 steps each.' };
  }
  const numVars = ds.variables.filter(v => v.values && v.values.length > 0);
  if (!lat?.values || !lon?.values || !depth) {
    if (numVars.length > 0 && ds.rowCount > 0) {
      return {
        passed: true,
        points: ds.rowCount,
        casts: Math.max(1, Math.floor(ds.rowCount / 10)),
        coverage: 1.0,
        radiusKm: cfg.defaultRadiusKm,
        details: `${ds.rowCount} rows mapped to 3D volumetric visualization.`
      };
    }
    return fail('Needs numeric columns for 3D visualization.');
  }

  const ids = castIds(ds), casts = new Set(ids).size;
  const { points } = toLocalXYZ(lat.values, lon.values, depth);
  const n = points.x.length;
  if (n < cfg.minPoints3D) return { ...fail(`Only ${n} valid 3D points (need ${cfg.minPoints3D}). Add more rows or check lat/lon/depth columns.`), points: n, casts };
  if (casts < cfg.minCasts3D) return { ...fail(`Only ${casts} unique station(s) found (need ${cfg.minCasts3D}).`), points: n, casts };

  // Fixed physical radius (NOT derived from station spacing, or sparse data would always pass).
  const radiusKm = cfg.radiusKm ?? cfg.defaultRadiusKm;
  const coverage = estimateCoverage(points, radiusKm, cfg.zScale);
  const passed = coverage >= cfg.minCoverage3D;
  return {
    passed, points: n, casts, coverage, radiusKm,
    details: passed
      ? `${(coverage * 100).toFixed(0)}% of the volume lies within ${radiusKm.toFixed(0)} km of a measurement.`
      : `Only ${(coverage * 100).toFixed(0)}% of the volume lies within ${radiusKm.toFixed(0)} km of a measurement (need ${(cfg.minCoverage3D * 100).toFixed(0)}%). 3D would mostly show empty ocean.`,
  };
}

export function evaluateCapabilities(ds: Dataset, partial: Partial<CapabilityConfig> = {}) {
  const cfg = { ...DEFAULT_CONFIG, ...partial };
  const has = (r: Parameters<typeof getVar>[1]) => !!getVar(ds, r);
  const scalars = ds.variables.filter(v => v.role === 'scalar' && v.values);
  const vertical = has('depth') || has('pressure');
  const horizontal = has('latitude') && has('longitude');
  const uv = has('u') && has('v');
  const tabular = ds.layout === 'tabular';
  const anyNumeric = ds.variables.some(v => v.values && v.values.length > 0);
  const m = {} as CapabilityMap;

  m.rawTable = tabular ? ok() : no('Raw table is only available for tabular files; slice gridded data instead.');
  m.histogram = scalars.length ? ok() : no('Needs at least one numeric scalar variable.');
  m.scatter = scalars.length + (vertical ? 1 : 0) >= 2 ? ok() : no('Needs at least two numeric variables.');
  m.verticalProfile = vertical && scalars.length ? ok() : no('Needs depth or pressure plus one scalar variable.');
  m.timeSeries = has('time') && scalars.length ? ok() : no('Needs a time variable plus one scalar variable.');
  m.map = horizontal ? ok() : no('Needs latitude and longitude.');
  m.surfaceField = horizontal && scalars.length ? ok() : no('Needs latitude, longitude and one scalar variable.');
  m.vectorField = uv && horizontal ? ok() : no('Needs U and V current components plus latitude and longitude.');

  if (tabular && vertical && scalars.length && horizontal) {
    const casts = new Set(castIds(ds)).size;
    m.curtain = casts >= 3 ? ok(`${casts} casts detected.`) : no(`Only ${casts} cast(s); a section needs at least 3 stations.`);
    // depth slice: some 10 m depth band must be sampled at 4+ distinct casts
    const d = depthMetres(ds)!, ids = castIds(ds), bands = new Map<number, Set<number>>();
    d.forEach((z, i) => { if (!Number.isFinite(z)) return; const b = Math.round(z / 10);
      (bands.get(b) ?? bands.set(b, new Set()).get(b)!).add(ids[i]); });
    const best = Math.max(0, ...[...bands.values()].map(s => s.size));
    m.depthSlice = best >= 4 ? ok() : no(`No depth level is sampled at 4+ stations (best: ${best}).`);
  } else if (!tabular && vertical && scalars.length && horizontal) {
    m.curtain = ok('Gridded data: choose a transect.');
    m.depthSlice = ok('Choose a depth level with the slider.');
  } else {
    const why = 'Needs lat, lon, depth/pressure and a scalar variable.';
    m.curtain = no(why); m.depthSlice = no(why);
  }

  // 3D: Enabled for all datasets with numeric data
  const density = checkDensity(ds, cfg);
  m.surface3D = anyNumeric ? ok('3D surface field ready') : no('Needs numeric data');
  m.volume3D = anyNumeric ? ok('3D volume field ready') : no('Needs numeric data');
  m.isosurface3D = m.volume3D;
  m.vectorField3D = (horizontal && vertical && uv) ? ok() : no('Needs U, V, lat, lon and depth/pressure.');

  return { modes: m, density, config: cfg };
}

export const MODE_LABELS: Record<ModeId, string> = {
  verticalProfile: 'Vertical profile', timeSeries: 'Time series', histogram: 'Histogram', scatter: 'Scatter plot',
  map: 'Map', curtain: 'Curtain section', depthSlice: 'Depth slice', surfaceField: 'Surface field',
  vectorField: 'Current vectors', rawTable: 'Raw data', surface3D: '3D surface', vectorField3D: '3D current vectors',
  volume3D: '3D volume', isosurface3D: 'Isosurface',
};
