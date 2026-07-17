import { memo, Suspense, useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, OrbitControls, RoundedBox, useGLTF } from "@react-three/drei";
import { useReducedMotion } from "framer-motion";
import { ACESFilmicToneMapping, Color, MeshStandardMaterial, TOUCH, Vector3 } from "three";
import {
  getInternalReviewProductionAsset,
  getPreferredProductionVariant,
} from "../assets/productionAssets.js";
import { useSofaMaterial } from "../materials/useSofaMaterial.js";
import { easePremium, resolveViewerMotion } from "../motion/premiumMotion.js";
import { DEFAULT_ROOM_SCENE_ID, getRoomScene, ROOM_SCENES } from "../viewer/roomScenes.js";
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

function tint(color, lightnessDelta) {
  const value = new Color(color);
  value.offsetHSL(0, 0, lightnessDelta);
  return value;
}

function requestedWidthMetres(exactSize, fallback) {
  const widthCm = Number.parseInt(String(exactSize ?? "").match(/\d+/)?.[0] ?? "", 10);
  return Number.isFinite(widthCm) && widthCm >= 100 ? widthCm / 100 : fallback;
}

function calculateProductionDimensions(variant, exactSize) {
  const bounds = variant.expectedBoundsMetres;
  const width = requestedWidthMetres(exactSize, bounds.x);
  return {
    width,
    depth: bounds.z,
    height: bounds.y,
    targetY: bounds.y * 0.48,
    cameraDistanceMin: 2.92,
    cameraXFactor: 0.62,
    cameraY: 1.4,
    cameraZoomMin: 2.58,
    seatTop: 0.45,
    armWidth: 0.075,
    groundClearance: 0.2,
    chaise: false,
  };
}

const ProductionSofa = memo(function ProductionSofa({
  asset,
  variant,
  color,
  fabricId,
  legs,
  exactSize,
  material: materialMetadata,
  texture,
  reducedMotion,
  onTextureStatusChange,
}) {
  const { scene } = useGLTF(variant.assetUri);
  const { material: selectedMaterial, status } = useSofaMaterial({
    color,
    fabricId,
    material: materialMetadata,
    texture,
  });
  const sourceMaterials = useMemo(() => {
    const roles = {};
    scene.traverse((object) => {
      if (!object.isMesh) return;
      const objectMaterials = Array.isArray(object.material) ? object.material : [object.material];
      for (const material of objectMaterials) {
        if (material?.name && asset.materialRoles.includes(material.name)) roles[material.name] = material;
      }
    });
    return roles;
  }, [asset.materialRoles, scene]);
  const materials = useMemo(() => {
    const upholstery = selectedMaterial.clone();
    const approvedFabric = sourceMaterials.upholstery_primary;
    const isVelvet = fabricId === "brushed-velvet";
    upholstery.name = "upholstery_primary";
    upholstery.map = selectedMaterial.map ?? approvedFabric?.map ?? null;
    upholstery.normalMap = selectedMaterial.normalMap;
    upholstery.roughnessMap = approvedFabric?.roughnessMap ?? selectedMaterial.roughnessMap;
    upholstery.aoMap = approvedFabric?.aoMap ?? null;
    upholstery.normalScale = selectedMaterial.normalScale.clone().setScalar(isVelvet ? 0.1 : 0.18);
    upholstery.aoMapIntensity = 0.68;
    upholstery.color.set(color);
    if (isVelvet) {
      upholstery.roughness = Math.max(0.54, selectedMaterial.roughness);
      upholstery.sheen = 0.3;
      upholstery.sheenRoughness = 0.8;
      upholstery.specularIntensity = 0.28;
      upholstery.envMapIntensity = 0.52;
    }
    upholstery.needsUpdate = true;

    const piping = new MeshStandardMaterial({
      name: "piping",
      color: tint(color, 0.075),
      roughness: 0.76,
      metalness: 0,
    });
    const stitching = new MeshStandardMaterial({
      name: "stitching",
      color: tint(color, -0.11),
      roughness: 0.84,
      metalness: 0,
    });
    const legsMaterial = new MeshStandardMaterial({
      name: "legs_matte_black",
      ...resolveLegFinish(legs),
    });
    return { upholstery_primary: upholstery, piping, stitching, legs_matte_black: legsMaterial };
  }, [color, fabricId, legs, selectedMaterial, sourceMaterials]);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    clone.traverse((object) => {
      if (!object.isMesh) return;
      object.castShadow = true;
      object.receiveShadow = true;
      const resolveMaterial = (material) => materials[material?.name] ?? material;
      object.material = Array.isArray(object.material)
        ? object.material.map(resolveMaterial)
        : resolveMaterial(object.material);
    });
    return clone;
  }, [materials, scene]);
  const scaleX = requestedWidthMetres(exactSize, variant.expectedBoundsMetres.x)
    / variant.expectedBoundsMetres.x;
  const signature = `${asset.id}:${asset.version}:${exactSize}:${fabricId}:${color}:${legs}`;

  useEffect(() => onTextureStatusChange(status), [onTextureStatusChange, status]);
  useEffect(() => () => Object.values(materials).forEach((material) => material.dispose()), [materials]);

  return <PresentationMotion signature={signature} reducedMotion={reducedMotion}>
    <group rotation={[0, -0.16, 0]} scale={[scaleX, 1, 1]}>
      <primitive object={model} />
    </group>
  </PresentationMotion>;
});

const RoomEnvironment = memo(function RoomEnvironment({ scene }) {
  return <group name={`room-${scene.id}`}>
    <mesh position={[0, -0.012, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[14, 14]} />
      <meshStandardMaterial color={scene.floor} roughness={0.9} metalness={0} />
    </mesh>
    <mesh position={[0, 2.6, -2.35]} receiveShadow>
      <planeGeometry args={[14, 5.2]} />
      <meshStandardMaterial color={scene.wall} roughness={0.94} metalness={0} />
    </mesh>
    <mesh position={[-4.8, 2.6, 0]} rotation={[0, Math.PI / 2, 0]} receiveShadow>
      <planeGeometry args={[7, 5.2]} />
      <meshStandardMaterial color={scene.wall} roughness={0.94} metalness={0} />
    </mesh>
    <mesh position={[0, 0.002, 0.08]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={[3.75, 2.65]} />
      <meshStandardMaterial color={scene.rug} roughness={1} metalness={0} />
    </mesh>
    <mesh position={[0, 0.065, -2.29]} receiveShadow>
      <boxGeometry args={[14, 0.13, 0.09]} />
      <meshStandardMaterial color={scene.accent} roughness={0.78} metalness={0} />
    </mesh>

    {scene.id === "warm-showroom" && <group>
      <mesh position={[0, 1.63, -2.3]} receiveShadow>
        <boxGeometry args={[3.5, 2.72, 0.055]} />
        <meshStandardMaterial color="#dfd2c1" roughness={0.9} />
      </mesh>
      <group position={[-1.45, 1.63, -2.25]}>
      {Array.from({ length: 12 }, (_, index) => <mesh key={index} position={[index * 0.265, 0, 0]}>
        <boxGeometry args={[0.032, 2.62, 0.045]} />
        <meshStandardMaterial color={scene.accent} roughness={0.62} />
      </mesh>)}
      </group>
    </group>}

    {scene.id === "stone-gallery" && <group position={[0, 1.82, -2.29]}>
      {[-1.18, 0, 1.18].map((x, index) => <group key={x} position={[x, 0, 0]}>
        <mesh receiveShadow>
        <boxGeometry args={[0.82, 1.36, 0.045]} />
        <meshStandardMaterial color={scene.accent} roughness={0.96} />
        </mesh>
        <mesh position={[0, 0, 0.03]}>
          <boxGeometry args={[0.66, 1.18, 0.025]} />
          <meshStandardMaterial color={index === 1 ? "#b7b8b3" : "#deded9"} roughness={0.92} />
        </mesh>
      </group>)}
    </group>}

    {scene.id === "evening-lounge" && <group>
      <mesh position={[0, 1.62, -2.3]} receiveShadow>
        <boxGeometry args={[3.55, 2.72, 0.055]} />
        <meshStandardMaterial color="#242721" roughness={0.9} />
      </mesh>
      {[-1.28, 1.28].map((x) => <group key={x}>
        <mesh position={[x, 1.68, -2.24]}>
          <boxGeometry args={[0.055, 0.48, 0.075]} />
          <meshStandardMaterial color={scene.accent} emissive={scene.accent} emissiveIntensity={1.7} roughness={0.42} />
        </mesh>
        <pointLight position={[x, 1.66, -1.82]} color={scene.keyColor} intensity={1.65} distance={3} decay={2} />
      </group>)}
    </group>}
  </group>;
});

function RoomLighting({ scene }) {
  return <>
    <hemisphereLight args={[scene.sky, scene.ground, scene.hemisphereIntensity]} />
    <directionalLight
      castShadow
      position={[4.8, 6.8, 5.2]}
      intensity={scene.keyIntensity}
      color={scene.keyColor}
      shadow-mapSize={[2048, 2048]}
      shadow-bias={-0.00035}
      shadow-normalBias={0.035}
      shadow-camera-left={-5}
      shadow-camera-right={5}
      shadow-camera-top={4}
      shadow-camera-bottom={-2}
    />
    <directionalLight position={[-4.2, 3.2, 2.4]} intensity={scene.fillIntensity} color={scene.fillColor} />
    <directionalLight position={[0.5, 4.2, -4.5]} intensity={scene.rimIntensity} color={scene.rimColor} />
  </>;
}

const StudioEnvironment = memo(function StudioEnvironment({ scene }) {
  return <Environment resolution={128} environmentIntensity={scene.environmentIntensity}>
    <Lightformer form="rect" intensity={2.4} color={scene.keyColor} position={[0, 5, -4]} scale={[8, 4, 1]} />
    <Lightformer form="rect" intensity={1.4} color={scene.fillColor} position={[-5, 2, 1]} rotation={[0, Math.PI / 2, 0]} scale={[5, 3, 1]} />
    <Lightformer form="rect" intensity={1.8} color={scene.rimColor} position={[4, 3, -2]} rotation={[0, -Math.PI / 2, 0]} scale={[4, 2, 1]} />
    <Lightformer form="ring" intensity={0.65} color={scene.sky} position={[0, 4, 4]} scale={3} />
  </Environment>;
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
  const productionAsset = useMemo(
    () => getInternalReviewProductionAsset(props.modelId),
    [props.modelId],
  );
  const productionVariant = useMemo(
    () => getPreferredProductionVariant(productionAsset),
    [productionAsset],
  );
  const [resetSignal, setResetSignal] = useState(0);
  const [roomSceneId, setRoomSceneId] = useState(DEFAULT_ROOM_SCENE_ID);
  const roomScene = useMemo(() => getRoomScene(roomSceneId), [roomSceneId]);
  const controls = useRef(null);
  const reducedMotion = Boolean(useReducedMotion());
  const dimensions = useMemo(
    () => productionVariant
      ? calculateProductionDimensions(productionVariant, props.exactSize)
      : calculateProceduralDimensions({ size: props.size, type: props.type }),
    [productionVariant, props.exactSize, props.size, props.type],
  );
  const framing = useMemo(() => calculateCameraFraming(dimensions), [dimensions]);
  const handleCreated = useCallback(({ gl }) => {
    gl.toneMapping = ACESFilmicToneMapping;
    gl.toneMappingExposure = 1;
    setCanvasReady(true);
  }, []);
  const handleTextureStatusChange = useCallback((status) => setTextureStatus(status), []);
  const statusMessage = !canvasReady
    ? "Preparing interactive 3D preview…"
    : textureStatus === "loading"
      ? "Refining material preview…"
      : textureStatus === "error" ? "Texture unavailable — showing colour preview" : null;

  return <div className={`viewer-canvas-wrap${canvasReady ? " is-ready" : ""}`}>
    <Canvas
      shadows="percentage"
      camera={{ position: framing.position, fov: 32, near: 0.1, far: 60 }}
      dpr={[1, 1.75]}
      onCreated={handleCreated}
      aria-label={`Interactive 3D preview of ${props.fabricName ?? "the selected sofa"}`}
    >
      <color attach="background" args={[roomScene.background]} />
      <RoomEnvironment scene={roomScene} />
      <RoomLighting scene={roomScene} />
      <Suspense fallback={null}>
        <StudioEnvironment scene={roomScene} />
      </Suspense>
      <Suspense fallback={null}>
        {productionAsset && productionVariant
          ? <ProductionSofa
              {...props}
              asset={productionAsset}
              variant={productionVariant}
              reducedMotion={reducedMotion}
              onTextureStatusChange={handleTextureStatusChange}
            />
          : <ProceduralSofa {...props} reducedMotion={reducedMotion} onTextureStatusChange={handleTextureStatusChange} />}
      </Suspense>
      <ContactShadows key={`${roomScene.id}:${productionAsset?.version ?? "procedural"}:${props.size}:${props.type}:${props.cushions}`} position={[0, 0.006, 0]} opacity={productionVariant ? roomScene.shadowOpacity : 0.28} scale={productionVariant ? 5 : 9} blur={2.6} far={1.2} resolution={512} frames={reducedMotion ? 1 : 28} />
      <CameraRig dimensions={dimensions} controls={controls} resetSignal={resetSignal} reducedMotion={reducedMotion} />
    </Canvas>
    {statusMessage && <div className="viewer-loading" role="status">{statusMessage}</div>}
    <div className="room-scene-switcher" role="group" aria-label="Room environment">
      <span>Room</span>
      {ROOM_SCENES.map((scene) => <button
        key={scene.id}
        type="button"
        className={scene.id === roomScene.id ? "selected" : ""}
        aria-pressed={scene.id === roomScene.id}
        aria-label={`${scene.description} environment`}
        onClick={() => setRoomSceneId(scene.id)}
      >{scene.label}</button>)}
    </div>
    <button type="button" className="viewer-reset" onClick={() => setResetSignal((value) => value + 1)}>Reset view</button>
  </div>;
}
