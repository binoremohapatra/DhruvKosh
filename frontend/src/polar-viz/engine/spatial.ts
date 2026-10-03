import type { Dataset, Variable, VarRole } from '../types/dataset';

export const KM_PER_DEG = 111.32;

export interface Points { x: Float32Array; y: Float32Array; z: Float32Array } // km; z = depth in km (down +)

export function getVar(ds: Dataset, role: VarRole): Variable | undefined {
  return ds.variables.find(v => v.role === role && (v.values || v.labels));
}

/** Depth in metres, positive down. Pressure (dbar) is used as ~1 m/dbar if no depth column exists. */
export function depthMetres(ds: Dataset): Float64Array | undefined {
  const v = getVar(ds, 'depth') ?? getVar(ds, 'pressure');
  if (!v?.values) return undefined;
  const arr = Float64Array.from(v.values);
  const sorted = Array.from(arr).filter(Number.isFinite).sort((a, b) => a - b);
  if (sorted.length && sorted[Math.floor(sorted.length / 2)] < 0) for (let i = 0; i < arr.length; i++) arr[i] = -arr[i];
  return arr;
}

/** One integer id per row identifying the cast/station. Uses station labels, else 0.01° lat/lon cells. */
export function castIds(ds: Dataset): Int32Array {
  const n = ds.rowCount, ids = new Int32Array(n), seen = new Map<string, number>();
  const st = getVar(ds, 'station'), lat = getVar(ds, 'latitude')?.values, lon = getVar(ds, 'longitude')?.values;
  for (let i = 0; i < n; i++) {
    const key = st?.labels ? st.labels[i] : st?.values ? String(st.values[i])
      : lat && lon ? `${Math.round(lat[i] * 100)}|${Math.round(lon[i] * 100)}` : '0';
    if (!seen.has(key)) seen.set(key, seen.size);
    ids[i] = seen.get(key)!;
  }
  return ids;
}

/** Local equirectangular projection (km). Handles the antimeridian by unwrapping around the first longitude. */
export function toLocalXYZ(lat: ArrayLike<number>, lon: ArrayLike<number>, depthM: ArrayLike<number>) {
  const keep: number[] = [];
  for (let i = 0; i < lat.length; i++)
    if (Number.isFinite(lat[i]) && Number.isFinite(lon[i]) && Number.isFinite(depthM[i])) keep.push(i);
  const lat0 = keep.length ? lat[keep[0]] : 0, lon0 = keep.length ? lon[keep[0]] : 0;
  const kmLon = KM_PER_DEG * Math.cos((lat0 * Math.PI) / 180);
  const n = keep.length, x = new Float32Array(n), y = new Float32Array(n), z = new Float32Array(n);
  keep.forEach((src, k) => {
    x[k] = (((lon[src] - lon0 + 540) % 360) - 180) * kmLon;
    y[k] = (lat[src] - lat0) * KM_PER_DEG;
    z[k] = depthM[src] / 1000;
  });
  return { points: { x, y, z } as Points, rows: Int32Array.from(keep) };
}

/** Pull aligned (points, values) for one scalar variable from any tabular dataset. */
export function extractPoints(ds: Dataset, scalarName: string) {
  const numVars = ds.variables.filter(v => v.values && v.values.length > 0);
  if (numVars.length === 0) return undefined;

  const valVar = ds.variables.find(v => v.name === scalarName) || numVars[0];
  const val = valVar?.values;
  if (!val) return undefined;

  const n = ds.rowCount;
  const latVar = getVar(ds, 'latitude');
  const lonVar = getVar(ds, 'longitude');
  const depthArr = depthMetres(ds);

  const isGeo = !!(latVar?.values && lonVar?.values);

  if (isGeo) {
    const lat = latVar!.values!;
    const lon = lonVar!.values!;
    const depth = depthArr || new Float64Array(n).fill(0);
    const { points, rows } = toLocalXYZ(lat, lon, depth);
    const keep: number[] = [];
    rows.forEach((r, k) => { if (Number.isFinite(val[r])) keep.push(k); });
    const pick = (a: Float32Array) => Float32Array.from(keep, k => a[k]);
    return {
      points: { x: pick(points.x), y: pick(points.y), z: pick(points.z) } as Points,
      values: Float32Array.from(keep, k => val[rows[k]]),
    };
  }

  // Non-geospatial fallback: Map numeric variables or row indices to X, Y, Z
  const otherVars = numVars.filter(v => v.name !== valVar.name);
  const xSrc = numVars.length > 1 ? (otherVars[0] || numVars[0]) : null;
  const ySrc = numVars.length > 2 ? (otherVars[1] || numVars[1]) : (otherVars[0] || numVars[0]);
  const zSrc = numVars.length > 3 ? (otherVars[2] || numVars[2]) : null;

  const gridSide = Math.ceil(Math.sqrt(n));

  const xArr = xSrc?.values ? xSrc.values : Float64Array.from({ length: n }, (_, i) => i % gridSide);
  const yArr = ySrc?.values ? ySrc.values : Float64Array.from({ length: n }, (_, i) => val[i]);
  const zArr = zSrc?.values ? zSrc.values : Float64Array.from({ length: n }, (_, i) => Math.floor(i / gridSide));

  const keep: number[] = [];
  for (let i = 0; i < n; i++) {
    if (Number.isFinite(xArr[i]) && Number.isFinite(yArr[i]) && Number.isFinite(zArr[i]) && Number.isFinite(val[i])) {
      keep.push(i);
    }
  }

  let minX = Infinity, maxX = -Infinity;
  let minY = Infinity, maxY = -Infinity;
  let minZ = Infinity, maxZ = -Infinity;
  for (const i of keep) {
    if (xArr[i] < minX) minX = xArr[i]; if (xArr[i] > maxX) maxX = xArr[i];
    if (yArr[i] < minY) minY = yArr[i]; if (yArr[i] > maxY) maxY = yArr[i];
    if (zArr[i] < minZ) minZ = zArr[i]; if (zArr[i] > maxZ) maxZ = zArr[i];
  }

  const spanX = Math.max(maxX - minX, 1e-6);
  const spanY = Math.max(maxY - minY, 1e-6);
  const spanZ = Math.max(maxZ - minZ, 1e-6);

  const numKeep = keep.length;
  const x = new Float32Array(numKeep);
  const y = new Float32Array(numKeep);
  const z = new Float32Array(numKeep);
  const values = new Float32Array(numKeep);

  keep.forEach((src, k) => {
    x[k] = ((xArr[src] - minX) / spanX) * 100;
    y[k] = ((yArr[src] - minY) / spanY) * 100;
    z[k] = ((zArr[src] - minZ) / spanZ) * 50;
    values[k] = val[src];
  });

  return {
    points: { x, y, z } as Points,
    values,
  };
}

// ---------- spatial hash (distances measured with z scaled by zScale) ----------

const BASE = 131072;
export class SpatialHash {
  private cells = new Map<number, number[]>();
  private cell: number;
  private p: Points;
  private zs: number;
  constructor(p: Points, cell: number, zScale: number) {
    this.p = p; this.cell = cell; this.zs = zScale;
    for (let i = 0; i < p.x.length; i++) {
      const k = this.key(Math.floor(p.x[i] / cell), Math.floor(p.y[i] / cell), Math.floor((p.z[i] * zScale) / cell));
      const a = this.cells.get(k);
      a ? a.push(i) : this.cells.set(k, [i]);
    }
  }
  private key(ix: number, iy: number, iz: number) {
    return ((ix + 65536) * BASE + (iy + 65536)) * BASE + (iz + 65536);
  }
  /** Calls fn(index, distance) for every point within r. fn may return true to stop early. */
  within(x: number, y: number, z: number, r: number, fn: (i: number, d: number) => boolean | void) {
    const c = this.cell, zz = z * this.zs, rc = Math.ceil(r / c);
    const cx = Math.floor(x / c), cy = Math.floor(y / c), cz = Math.floor(zz / c);
    for (let a = -rc; a <= rc; a++) for (let b = -rc; b <= rc; b++) for (let d = -rc; d <= rc; d++) {
      const list = this.cells.get(this.key(cx + a, cy + b, cz + d));
      if (!list) continue;
      for (const i of list) {
        const dx = this.p.x[i] - x, dy = this.p.y[i] - y, dz = (this.p.z[i] - z) * this.zs;
        const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);
        if (dist <= r && fn(i, dist) === true) return;
      }
    }
  }
}

export function bounds(p: Points) {
  let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < p.x.length; i++) {
    if (p.x[i] < minX) minX = p.x[i]; if (p.x[i] > maxX) maxX = p.x[i];
    if (p.y[i] < minY) minY = p.y[i]; if (p.y[i] > maxY) maxY = p.y[i];
    if (p.z[i] < minZ) minZ = p.z[i]; if (p.z[i] > maxZ) maxZ = p.z[i];
  }
  return { min: [minX, minY, minZ], max: [maxX, maxY, maxZ] };
}

/** Fraction of the bounding volume within `radiusKm` of any observation (sampled on a 16x16x16 test grid). */
export function estimateCoverage(p: Points, radiusKm: number, zScale: number, testGrid = 16): number {
  if (p.x.length === 0) return 0;
  const b = bounds(p);
  const hash = new SpatialHash(p, radiusKm, zScale);
  let hits = 0;
  const total = testGrid * testGrid * testGrid;
  for (let i = 0; i < testGrid; i++) {
    const x = b.min[0] + (b.max[0] - b.min[0]) * (testGrid > 1 ? i / (testGrid - 1) : 0.5);
    for (let j = 0; j < testGrid; j++) {
      const y = b.min[1] + (b.max[1] - b.min[1]) * (testGrid > 1 ? j / (testGrid - 1) : 0.5);
      for (let k = 0; k < testGrid; k++) {
        const z = b.min[2] + (b.max[2] - b.min[2]) * (testGrid > 1 ? k / (testGrid - 1) : 0.5);
        let near = false;
        hash.within(x, y, z, radiusKm, () => { near = true; return true; });
        if (near) hits++;
      }
    }
  }
  return hits / total;
}

/** Inverse-distance weighting with a hard radius cutoff: cells without nearby points stay NaN. */
export function boundedIDW(p: Points, v: Float32Array, radiusKm: number, zScale: number, size: [number, number, number]) {
  const b = bounds(p), [nx, ny, nz] = size;
  const grid = new Float32Array(nx * ny * nz).fill(NaN);
  const hash = new SpatialHash(p, radiusKm, zScale);
  const dx = nx > 1 ? (b.max[0] - b.min[0]) / (nx - 1) : 0;
  const dy = ny > 1 ? (b.max[1] - b.min[1]) / (ny - 1) : 0;
  const dz = nz > 1 ? (b.max[2] - b.min[2]) / (nz - 1) : 0;
  const eps = 1e-4;
  for (let i = 0; i < nx; i++) {
    const gx = b.min[0] + i * dx;
    for (let j = 0; j < ny; j++) {
      const gy = b.min[1] + j * dy;
      for (let k = 0; k < nz; k++) {
        const gz = b.min[2] + k * dz;
        let wSum = 0, vSum = 0, exact: number | undefined;
        hash.within(gx, gy, gz, radiusKm, (idx, d) => {
          if (d < eps) { exact = v[idx]; return true; }
          const w = 1 / (d * d);
          wSum += w; vSum += w * v[idx];
        });
        if (exact !== undefined) grid[(i * ny + j) * nz + k] = exact;
        else if (wSum > 0) grid[(i * ny + j) * nz + k] = vSum / wSum;
      }
    }
  }
  return { grid, size, min: b.min, max: b.max };
}

/** Keep all points if <=maxPoints; otherwise sample down while keeping spatial outliers. */
export function adaptiveSample(p: Points, maxPoints: number): Int32Array {
  const n = p.x.length;
  if (n <= maxPoints) return Int32Array.from({ length: n }, (_, i) => i);
  const step = Math.ceil(n / maxPoints);
  const out: number[] = [];
  for (let i = 0; i < n; i += step) out.push(i);
  return Int32Array.from(out);
}
