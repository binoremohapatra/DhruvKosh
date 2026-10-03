import React, { useRef, useMemo, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html } from '@react-three/drei';
import * as THREE from 'three';
import * as topojson from 'topojson-client';
import land110m from 'world-atlas/land-110m.json';
import { stations } from '../data/stations';

const R = 1.0;

const INDIAN_ACTIVE_IDS = new Set(['maitri', 'bharati', 'himadri']);

function latLonToVector3(lat, lon, radius = R) {
  const phi   = (90 - lat) * (Math.PI / 180);   // colatitude
  const theta = lon         * (Math.PI / 180);   // standard east-positive longitude
  return new THREE.Vector3(
    radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

function pointInPolygon(point, vs) {
  let x = point[0], y = point[1];
  let inside = false;
  for (let i = 0, j = vs.length - 1; i < vs.length; j = i++) {
    let xi = vs[i][0], yi = vs[i][1];
    let xj = vs[j][0], yj = vs[j][1];
    let intersect = ((yi > y) !== (yj > y)) && (x < (xj - xi) * (y - yi) / (yj - yi) + xi);
    if (intersect) inside = !inside;
  }
  return inside;
}

const { landPoints, icePoints, coastlineVertices, graticuleVertices } = (() => {
  const fc = topojson.feature(land110m, land110m.objects.land);
  const polygons = fc.features[0].geometry.coordinates.map(polygon => {
    let minLon = 180, maxLon = -180, minLat = 90, maxLat = -90;
    polygon[0].forEach(([lon, lat]) => {
      if (lon < minLon) minLon = lon; if (lon > maxLon) maxLon = lon;
      if (lat < minLat) minLat = lat; if (lat > maxLat) maxLat = lat;
    });
    return { polygon, minLon, maxLon, minLat, maxLat };
  });

  const isLand = (lon, lat) => {
    for (const { polygon, minLon, maxLon, minLat, maxLat } of polygons) {
      if (lon < minLon || lon > maxLon || lat < minLat || lat > maxLat) continue;
      if (pointInPolygon([lon, lat], polygon[0])) {
        let inHole = false;
        for (let i = 1; i < polygon.length; i++) {
          if (pointInPolygon([lon, lat], polygon[i])) { inHole = true; break; }
        }
        if (!inHole) return true;
      }
    }
    return false;
  };

  const normPoints = [];
  const iPoints = [];
  const spacing = 1.2;
  for (let lat = -90; lat <= 90; lat += spacing) {
    const r = Math.cos(lat * Math.PI / 180);
    const lonSpacing = spacing / Math.max(0.1, r);
    for (let lon = -180; lon < 180; lon += lonSpacing) {
      if (isLand(lon, lat)) {
        const v = latLonToVector3(lat, lon, R);
        if (lat < -60 || lat > 70) iPoints.push(v.x, v.y, v.z);
        else normPoints.push(v.x, v.y, v.z);
      }
    }
  }

  const mesh = topojson.mesh(land110m, land110m.objects.land);
  const coast = [];
  mesh.coordinates.forEach(line => {
    for (let i = 0; i < line.length - 1; i++) {
      const v1 = latLonToVector3(line[i][1], line[i][0], R * 1.001);
      const v2 = latLonToVector3(line[i+1][1], line[i+1][0], R * 1.001);
      coast.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
    }
  });

  const grats = [];
  for (let lon = -180; lon < 180; lon += 15) {
    for (let lat = -90; lat <= 90; lat += 2) {
      if (lat < 90) {
        const v1 = latLonToVector3(lat, lon, R * 1.001);
        const v2 = latLonToVector3(lat + 2, lon, R * 1.001);
        grats.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    }
  }
  for (let lat = -75; lat <= 75; lat += 15) {
    for (let lon = -180; lon <= 180; lon += 2) {
      if (lon < 180) {
        const v1 = latLonToVector3(lat, lon, R * 1.001);
        const v2 = latLonToVector3(lat, lon + 2, R * 1.001);
        grats.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    }
  }
  [-80, -70, -60, -50, 80, 70, 60, 50].forEach(lat => {
    for (let lon = -180; lon <= 180; lon += 2) {
      if (lon < 180) {
        const v1 = latLonToVector3(lat, lon, R * 1.001);
        const v2 = latLonToVector3(lat, lon + 2, R * 1.001);
        grats.push(v1.x, v1.y, v1.z, v2.x, v2.y, v2.z);
      }
    }
  });

  return {
    landPoints: new Float32Array(normPoints),
    icePoints: new Float32Array(iPoints),
    coastlineVertices: new Float32Array(coast),
    graticuleVertices: new Float32Array(grats)
  };
})();

const OceanSphere = () => {
  const shaderArgs = useMemo(() => ({
    uniforms: {
      colorCenter: { value: new THREE.Color() },
      colorEdge: { value: new THREE.Color() },
    },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      uniform vec3 colorCenter;
      uniform vec3 colorEdge;
      void main() {
        float intensity = max(0.0, dot(vNormal, vec3(0.0, 0.0, 1.0)));
        intensity = pow(intensity, 0.6);
        gl_FragColor = vec4(mix(colorEdge, colorCenter, intensity), 1.0);
      }
    `
  }), []);

  const matRef = useRef();
  useFrame(() => {
    if (matRef.current) {
      matRef.current.uniforms.colorCenter.value.lerp(new THREE.Color('#0E2747'), 0.1);
      matRef.current.uniforms.colorEdge.value.lerp(new THREE.Color('#050D1A'), 0.1);
    }
  });

  return (
    <mesh>
      <sphereGeometry args={[R * 0.995, 64, 64]} />
      <shaderMaterial ref={matRef} args={[shaderArgs]} />
    </mesh>
  );
};

const Atmosphere = () => {
  const shaderArgs = useMemo(() => ({
    uniforms: { glowColor: { value: new THREE.Color() } },
    vertexShader: `
      varying vec3 vNormal;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vNormal;
      uniform vec3 glowColor;
      void main() {
        float intensity = 1.0 - max(0.0, dot(abs(vNormal), vec3(0.0, 0.0, 1.0)));
        intensity = pow(intensity, 3.0);
        gl_FragColor = vec4(glowColor, intensity * 0.4);
      }
    `,
    transparent: true,
    blending: THREE.AdditiveBlending,
    side: THREE.BackSide,
    depthWrite: false
  }), []);

  const matRef = useRef();
  useFrame(() => {
    if (matRef.current) {
      matRef.current.uniforms.glowColor.value.lerp(new THREE.Color('#7FE7F5'), 0.1);
    }
  });

  return (
    <mesh scale={1.15}>
      <sphereGeometry args={[R, 64, 64]} />
      <shaderMaterial ref={matRef} args={[shaderArgs]} />
    </mesh>
  );
};

const LandDots = ({ vertices, darkColor, darkOpacity }) => {
  const geomRef = useRef();
  const matRef = useRef();
  useEffect(() => {
    if (geomRef.current) {
      geomRef.current.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    }
  }, [vertices]);
  
  useFrame(() => {
    if (matRef.current) {
      matRef.current.color.lerp(new THREE.Color(darkColor), 0.1);
      matRef.current.opacity += (darkOpacity - matRef.current.opacity) * 0.1;
    }
  });

  return (
    <points>
      <bufferGeometry ref={geomRef} />
      <pointsMaterial ref={matRef} size={0.015} transparent sizeAttenuation />
    </points>
  );
};

const Lines = ({ vertices, darkColor, darkOpacity }) => {
  const geomRef = useRef();
  const matRef = useRef();
  useEffect(() => {
    if (geomRef.current) {
      geomRef.current.setAttribute('position', new THREE.BufferAttribute(vertices, 3));
    }
  }, [vertices]);
  
  useFrame(() => {
    if (matRef.current) {
      matRef.current.color.lerp(new THREE.Color(darkColor), 0.1);
      matRef.current.opacity += (darkOpacity - matRef.current.opacity) * 0.1;
    }
  });

  return (
    <lineSegments>
      <bufferGeometry ref={geomRef} />
      <lineBasicMaterial ref={matRef} transparent depthWrite={false} />
    </lineSegments>
  );
};

const StationMarker = ({ pos, station, isHovered, isDimmed, onHover, onLeave, onSelect }) => {
  const ref = useRef();
  const ringRef = useRef();
  const [isVisible, setIsVisible] = useState(true);
  
  useFrame(({ camera, clock }) => {
     const camDir = camera.position.clone().normalize();
     const dot = camDir.dot(pos.clone().normalize());
     const visible = dot > 0.12; 
     
     if (visible !== isVisible) {
       setIsVisible(visible);
     }
     
     if (ref.current) ref.current.visible = visible;
     
     if (ringRef.current && visible) {
        const t = clock.elapsedTime;
        if (station.status === 'active') {
           const phase = (t * 0.35 + Math.abs(pos.x * 2.0)) % 1.0;
           const s = 1.0 + phase * 1.5;
           ringRef.current.scale.set(s, s, s);
           ringRef.current.material.opacity = (1.0 - phase) * 0.85;
        } else if (station.status === 'planned') {
           const phase = (t * 0.15 + Math.abs(pos.x * 2.0)) % 1.0;
           const s = 1.0 + phase * 0.6;
           ringRef.current.scale.set(s, s, s);
           ringRef.current.material.opacity = (1.0 - phase) * 0.5;
        } else {
           ringRef.current.scale.set(1, 1, 1);
           ringRef.current.material.opacity = 0.3;
        }
     }
  });
  
  const color = station.status === 'active' 
    ? '#F2B441' 
    : (station.status === 'planned' ? '#7FE7F5' : '#94A3B8');

  const isIndianActive = INDIAN_ACTIVE_IDS.has(station.id);
  const showLabel = isIndianActive && !isDimmed;

  return (
    <group
      position={pos}
      ref={ref}
      onPointerOver={(e) => {
        e.stopPropagation();
        onHover && onHover(station, { x: e.clientX, y: e.clientY });
      }}
      onPointerOut={() => {
        onLeave && onLeave();
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect && onSelect(station, { x: e.clientX, y: e.clientY });
      }}
    >
       {station.status !== 'decommissioned' ? (
         <mesh>
           <sphereGeometry args={[0.020, 16, 16]} />
           <meshBasicMaterial color={color} transparent opacity={isDimmed ? 0.2 : (isHovered ? 1 : 0.95)} />
         </mesh>
       ) : (
         <mesh>
           <ringGeometry args={[0.012, 0.020, 16]} />
           <meshBasicMaterial color={color} transparent opacity={isDimmed ? 0.2 : 0.75} />
         </mesh>
       )}
       
       <mesh ref={ringRef}>
         <ringGeometry args={[0.022, 0.030, 24]} />
         <meshBasicMaterial color={color} transparent depthWrite={false} />
       </mesh>
       
       {/* High-contrast, clean 12px pill label ONLY for Indian active stations */}
       {showLabel && isVisible && (
         <Html 
           center={false} 
           distanceFactor={1.7}
           className="pointer-events-auto cursor-pointer select-none"
           style={{ 
             opacity: isDimmed ? 0.2 : 0.95,
             transition: 'opacity 0.2s ease, transform 0.2s ease'
           }}
         >
            <div 
              onClick={(e) => {
                e.stopPropagation();
                onSelect && onSelect(station, { x: e.clientX, y: e.clientY });
              }}
              onMouseEnter={(e) => {
                onHover && onHover(station, { x: e.clientX, y: e.clientY });
              }}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-md border shadow-lg backdrop-blur-md whitespace-nowrap text-[12px] font-mono tracking-wider uppercase transform -translate-x-1/2 translate-y-3 bg-[#05080F]/90 border-white/25 text-[#EAF0F8] hover:border-[#7FE7F5] hover:bg-[#0D1422] hover:scale-105 transition-all duration-150"
            >
               <span 
                 className="w-2 h-2 rounded-full flex-shrink-0"
                 style={{ backgroundColor: color }}
               />
               <span className="font-semibold">{station.name}</span>
            </div>
         </Html>
       )}
    </group>
  );
};

const ViewController = ({ polarView }) => {
  const { camera, controls } = useThree();
  const azimuthLockedRef = useRef(false);
  const lastViewRef = useRef(null);

  // phi = polar elevation angle (0 = north pole, PI = south pole)
  const targetPolar = polarView === 'antarctic'
    ? Math.PI * 0.82          // show South Pole region prominently
    : polarView === 'arctic'
      ? Math.PI * 0.18        // show North Pole region prominently
      : Math.PI * 0.42;       // Himalayas — mid-northern tilt

  // ── Azimuth (Three.js Spherical theta) ─────────────────────────────────
  //
  // Our latLonToVector3: x = sin(phi)*cos(lon), z = sin(phi)*sin(lon)
  // Three.js Spherical.setFromVector3: theta = atan2(x, z) = atan2(cos(lon), sin(lon))
  //                                          = (90° - lon) × π/180
  //
  // So to face a real longitude L°E, set Three.js theta = (90 - L) × π/180
  //
  // Indian stations:
  //   Antarctica — midpoint Maitri(11.7°E) + Bharati(76.2°E) = 44°E
  //                → theta = (90-44) × π/180 = 46° = 0.803 rad
  //   Arctic     — Himadri, Ny-Ålesund lon 11.9°E
  //                → theta = (90-11.9) × π/180 = 78.1° = 1.363 rad
  //   Himalayas  — Himansh, Lahaul-Spiti lon 77.6°E
  //                → theta = (90-77.6) × π/180 = 12.4° = 0.216 rad
  const TARGET_AZ = {
    antarctic: 0.803,   // faces lon 44°E  (Maitri+Bharati midpoint)
    arctic:    1.363,   // faces lon 11.9°E (Himadri, Svalbard)
    himalayas: 0.216,   // faces lon 77.6°E (Himansh, Lahaul-Spiti)
  };
  const targetAzimuth = TARGET_AZ[polarView] ?? TARGET_AZ.antarctic;

  useFrame((state, delta) => {
    if (!controls) return;

    // When the polar view changes, snap-animate azimuth to face Indian stations
    const viewChanged = lastViewRef.current !== polarView;
    if (viewChanged) {
      lastViewRef.current = polarView;
      azimuthLockedRef.current = true;  // re-lock on view switch
    }

    const sph = new THREE.Spherical().setFromVector3(camera.position);
    let changed = false;

    // Always animate the polar tilt (phi)
    if (Math.abs(sph.phi - targetPolar) > 0.005) {
      sph.phi += (targetPolar - sph.phi) * Math.min(delta * 2.0, 1.0);
      changed = true;
    }

    // Animate azimuth only until we reach the target (then let auto-rotate take over)
    if (azimuthLockedRef.current) {
      const diff = targetAzimuth - sph.theta;
      if (Math.abs(diff) > 0.02) {
        sph.theta += diff * Math.min(delta * 1.5, 1.0);
        changed = true;
      } else {
        azimuthLockedRef.current = false; // reached target — unlock so auto-rotate works
      }
    }

    if (changed) {
      sph.makeSafe();
      camera.position.setFromSpherical(sph);
      camera.lookAt(0, 0, 0);
    }
  });
  return null;
};

const ParallaxGroup = ({ children }) => {
  const groupRef = useRef();
  useFrame(({ mouse }) => {
    if (groupRef.current) {
      const targetRotX = mouse.y * 0.05;
      const targetRotY = mouse.x * 0.05;
      groupRef.current.rotation.x += (targetRotX - groupRef.current.rotation.x) * 0.1;
      groupRef.current.rotation.y += (targetRotY - groupRef.current.rotation.y) * 0.1;
    }
  });
  return <group ref={groupRef}>{children}</group>;
};

export default function PolarGlobe3D({ polarView, activeStation, onHoverStation, onLeaveStation, onSelectStation }) {
  const filteredStations = stations.filter(s =>
    polarView === 'antarctic' ? s.region === 'Antarctica' || s.region === 'Southern Ocean' :
    polarView === 'arctic'    ? s.region === 'Arctic' :
                                s.region === 'Himalayas'
  );

  return (
    <Canvas
      dpr={[1, 1.5]}
      camera={{
        // Pre-positioned facing Maitri+Bharati midpoint (lon≈44°E, lat≈-70°S)
        // In Three.js Spherical: phi=0.84π≈151° (deep-south tilt), theta≈0.803 rad (=46°)
        // x = r·sin(phi)·sin(theta), y = r·cos(phi), z = r·sin(phi)·cos(theta)
        // r≈4.58, sin(0.84π)=0.484, cos(0.84π)=-0.875, sin(0.803)=0.720, cos(0.803)=0.694
        position: [1.60, -4.01, 1.54],
        fov: 35
      }}
      style={{ width: '100%', height: '100%', pointerEvents: 'auto' }}
    >
      <ambientLight intensity={1} />
      
      <ParallaxGroup>
        <OceanSphere />
        <Atmosphere />
        
        <LandDots vertices={landPoints} darkColor="#3C5F8F" darkOpacity={0.7} />
        <LandDots vertices={icePoints} darkColor="#DDF3FF" darkOpacity={0.25} />
        
        <Lines vertices={coastlineVertices} darkColor="#7FE7F5" darkOpacity={0.35} />
        <Lines vertices={graticuleVertices} darkColor="#FFFFFF" darkOpacity={0.08} />
        
        {filteredStations.map(station => (
          <StationMarker 
            key={station.id} 
            pos={latLonToVector3(station.lat, station.lon, R * 1.002)} 
            station={station} 
            isHovered={activeStation?.id === station.id}
            isDimmed={activeStation !== null && activeStation?.id !== station.id}
            onHover={onHoverStation}
            onLeave={onLeaveStation}
            onSelect={onSelectStation}
          />
        ))}
      </ParallaxGroup>

      <ViewController polarView={polarView} />
      <OrbitControls 
        enablePan={false}
        enableZoom={false}
        minPolarAngle={Math.PI * 0.1}
        maxPolarAngle={Math.PI * 0.9}
        autoRotate={!activeStation}
        autoRotateSpeed={0.4}
        enableDamping
        dampingFactor={0.05}
        makeDefault
      />
    </Canvas>
  );
}
