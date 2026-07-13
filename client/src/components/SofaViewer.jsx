import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, OrbitControls, RoundedBox } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { ACESFilmicToneMapping, MeshStandardMaterial, TOUCH, Vector3 } from "three";
import { useSofaMaterial } from "../materials/useSofaMaterial.js";
import { easePremium, resolveViewerMotion } from "../motion/premiumMotion.js";
import {
  calculateCameraFraming,
  calculateCushionLayout,
  calculateProceduralDimensions,
  resolveLegFinish,
} from "../viewer/proceduralSofa.js";

function UpholsteredPart({ args, material, radius = 0.08, ...props }) {
  return <RoundedBox args={args} radius={radius} smoothness={2} bevelSegments={2} castShadow receiveShadow {...props}>
    <primitive object={material} attach="material" />
  </RoundedBox>;
}

function PresentationMotion({ signature, reducedMotion, children }) {
  const group = useRef(null);
  const progress = useRef(reducedMotion ? 1 : 0);
  const motion = resolveViewerMotion(reducedMotion);

  useEffect(() => {
    progress.current = reducedMotion ? 1 : 0;
  }, [reducedMotion, signature]);

  useFrame((_, delta) => {
    if (!group.current) return;
    progress.current = motion.revealDuration === 0
      ? 1
      : Math.min(1, progress.current + delta / motion.revealDuration);
    const eased = easePremium(progress.current);
    const scale = 0.99 + eased * 0.01;
    group.current.scale.setScalar(scale);
    group.current.position.y = motion.settleDistance * (1 - eased);
  });

  return <group ref={group}>{children}</group>;
}

const ProceduralSofa = memo(function ProceduralSofa({
  color,
  fabricId,
  legs,
  cushions,
  type,
  size,
  material: materialMetadata,
  texture,
  reducedMotion,
  onTextureStatusChange,
}) {
  const dimensions = useMemo(() => calculateProceduralDimensions({ size, type }), [size, type]);
  const cushionLayout = useMemo(
    () => calculateCushionLayout({ width: dimensions.width, cushions, chaise: dimensions.chaise }),
    [cushions, dimensions],
  );
  const { material, status } = useSofaMaterial({ color, fabricId, material: materialMetadata, texture });
  const legFinish = useMemo(() => resolveLegFinish(legs), [legs]);
  const legMaterial = useMemo(() => new MeshStandardMaterial(legFinish), [legFinish]);
  const baseMaterial = useMemo(() => new MeshStandardMaterial({ color: "#4a372d", roughness: 0.42, metalness: 0 }), []);
  const halfWidth = dimensions.width / 2;
  const innerWidth = dimensions.width - 0.7;
  const signature = `${size}:${type}:${cushions}`;

  useEffect(() => onTextureStatusChange(status), [onTextureStatusChange, status]);
  useEffect(() => () => legMaterial.dispose(), [legMaterial]);
  useEffect(() => () => baseMaterial.dispose(), [baseMaterial]);

  const legPositions = [
    [-halfWidth + 0.28, 0.19, 0.53, -0.06],
    [halfWidth - 0.28, 0.19, 0.53, 0.06],
    [-halfWidth + 0.28, 0.19, -0.52, -0.04],
    [halfWidth - 0.28, 0.19, -0.52, 0.04],
  ];

  return <PresentationMotion signature={signature} reducedMotion={reducedMotion}>
    <group rotation={[0, -0.16, 0]}>
      <RoundedBox args={[dimensions.width - 0.18, 0.16, 1.27]} radius={0.045} smoothness={2} bevelSegments={2} position={[0, 0.43, -0.02]} castShadow receiveShadow>
        <primitive object={baseMaterial} attach="material" />
      </RoundedBox>
      <UpholsteredPart args={[dimensions.width, 0.4, 1.48]} radius={0.1} position={[0, 0.67, -0.02]} material={material} />
      <UpholsteredPart args={[innerWidth, 0.82, 0.24]} radius={0.095} position={[0, 1.34, -0.67]} rotation={[-0.06, 0, 0]} material={material} />
      <UpholsteredPart args={[0.34, 0.72, 1.48]} radius={0.13} position={[-halfWidth + 0.17, 1.03, -0.01]} rotation={[0, 0, 0.035]} material={material} />
      <UpholsteredPart args={[0.34, 0.72, 1.48]} radius={0.13} position={[halfWidth - 0.17, 1.03, -0.01]} rotation={[0, 0, -0.035]} material={material} />

      {dimensions.chaise && <UpholsteredPart
        args={[cushionLayout.at(-1).width + 0.08, 0.38, 2.12]}
        radius={0.11}
        position={[cushionLayout.at(-1).x, 0.68, 0.45]}
        material={material}
      />}

      {cushionLayout.map((cushion) => <group key={cushion.id}>
        <UpholsteredPart
          args={[cushion.width, 0.27, cushion.seatDepth]}
          radius={0.105}
          position={[cushion.x, 0.94, cushion.seatZ]}
          rotation={[0, cushion.seatRotation, 0]}
          scale={[0.99, 1.04, 0.99]}
          material={material}
        />
        <UpholsteredPart
          args={[cushion.width * 0.96, 0.72, 0.24]}
          radius={0.105}
          position={[cushion.x, 1.39, -0.48]}
          rotation={[-0.14, cushion.backRotation, 0]}
          scale={[0.99, 1.02, 1]}
          material={material}
        />
      </group>)}

      {legPositions.map(([x, y, z, rotation], index) => <mesh
        key={index}
        position={[x, y, z]}
        rotation={[z > 0 ? 0.035 : -0.035, 0, rotation]}
        castShadow
        receiveShadow
      >
        <cylinderGeometry args={[0.062, 0.046, 0.38, 12]} />
        <primitive object={legMaterial} attach="material" />
      </mesh>)}
    </group>
  </PresentationMotion>;
});

function CameraRig({ dimensions, controls, resetSignal, reducedMotion }) {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const transition = useMemo(() => ({
    active: false,
    elapsed: 0,
    fromPosition: new Vector3(),
    toPosition: new Vector3(),
    fromTarget: new Vector3(),
    toTarget: new Vector3(),
  }), []);
  const framing = useMemo(
    () => calculateCameraFraming(dimensions, size.width / size.height),
    [dimensions, size.height, size.width],
  );
  const cameraDuration = resolveViewerMotion(reducedMotion).cameraDuration;

  useEffect(() => {
    const orbitControls = controls.current;
    if (!orbitControls || cameraDuration === 0) {
      camera.position.set(...framing.position);
      orbitControls?.target.set(...framing.target);
      orbitControls?.update();
      transition.active = false;
      return;
    }

    transition.active = true;
    transition.elapsed = 0;
    transition.fromPosition.copy(camera.position);
    transition.toPosition.set(...framing.position);
    transition.fromTarget.copy(orbitControls.target);
    transition.toTarget.set(...framing.target);
  }, [camera, cameraDuration, controls, framing, resetSignal, transition]);

  useFrame((_, delta) => {
    if (!transition.active || !controls.current) return;
    transition.elapsed = Math.min(cameraDuration, transition.elapsed + delta);
    const progress = cameraDuration === 0 ? 1 : transition.elapsed / cameraDuration;
    const eased = easePremium(progress);
    camera.position.lerpVectors(transition.fromPosition, transition.toPosition, eased);
    controls.current.target.lerpVectors(transition.fromTarget, transition.toTarget, eased);
    controls.current.update();
    if (progress === 1) transition.active = false;
  });

  return <OrbitControls
    ref={controls}
    enableDamping={!reducedMotion}
    dampingFactor={0.075}
    enablePan={false}
    minDistance={framing.minDistance}
    maxDistance={framing.maxDistance}
    minPolarAngle={0.88}
    maxPolarAngle={1.38}
    rotateSpeed={0.62}
    zoomSpeed={0.72}
    touches={{ ONE: TOUCH.ROTATE, TWO: TOUCH.DOLLY_ROTATE }}
    onStart={() => { transition.active = false; }}
  />;
}

export default function SofaViewer(props) {
  const [canvasReady, setCanvasReady] = useState(false);
  const [textureStatus, setTextureStatus] = useState("ready");
  const [resetSignal, setResetSignal] = useState(0);
  const controls = useRef(null);
  const reducedMotion = Boolean(useReducedMotion());
  const dimensions = useMemo(
    () => calculateProceduralDimensions({ size: props.size, type: props.type }),
    [props.size, props.type],
  );
  const framing = useMemo(() => calculateCameraFraming(dimensions), [dimensions]);
  const handleCreated = useCallback(({ gl }) => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1;
    setCanvasReady(true);
  }, []);
  const handleTextureStatusChange = useCallback((status) => setTextureStatus(status), []);
  const statusMessage = !canvasReady
    ? "Preparing illustrative 3D preview…"
    : textureStatus === "loading"
      ? "Refining material preview…"
      : textureStatus === "error" ? "Texture unavailable — showing colour preview" : null;

  return <div className={`viewer-canvas-wrap${canvasReady ? " is-ready" : ""}`}>
    <Canvas
      shadows
      camera={{ position: framing.position, fov: 32, near: 0.1, far: 60 }}
      dpr={[1, 1.75]}
      onCreated={handleCreated}
      aria-label={`Interactive illustrative 3D preview of ${props.fabricName ?? "the selected sofa"}`}
    >
      <color attach="background" args={["#dfe1dd"]} />
      <hemisphereLight args={["#f7f8f5", "#8b8f8a", 0.95]} />
      <directionalLight
        castShadow
        position={[4.5, 6.5, 5]}
        intensity={1.75}
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.00035}
        shadow-normalBias={0.035}
        shadow-camera-left={-5}
        shadow-camera-right={5}
        shadow-camera-top={4}
        shadow-camera-bottom={-2}
      />
      <directionalLight position={[-4, 3.5, 2]} intensity={0.34} color="#e4e7e4" />
      <Suspense fallback={null}>
        <Environment preset="studio" environmentIntensity={0.44} />
      </Suspense>
      <ProceduralSofa {...props} reducedMotion={reducedMotion} onTextureStatusChange={handleTextureStatusChange} />
      <ContactShadows key={`${props.size}:${props.type}:${props.cushions}`} position={[0, 0.005, 0]} opacity={0.28} scale={9} blur={3} far={1.25} resolution={512} frames={reducedMotion ? 1 : 40} />
      <CameraRig dimensions={dimensions} controls={controls} resetSignal={resetSignal} reducedMotion={reducedMotion} />
    </Canvas>
    {statusMessage && <div className="viewer-loading" role="status">{statusMessage}</div>}
    <button type="button" className="viewer-reset" onClick={() => setResetSignal((value) => value + 1)}>Reset view</button>
  </div>;
}
