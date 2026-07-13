import { Canvas } from "@react-three/fiber";
import { Environment, OrbitControls, ContactShadows } from "@react-three/drei";

function Part({ position, scale, color, material }) { return <mesh position={position} scale={scale} castShadow receiveShadow><boxGeometry args={[1, 1, 1]} /><meshStandardMaterial color={color} roughness={material.roughness} metalness={material.metalness} /></mesh>; }
function Sofa({ color, legs, cushions, type, size, material }) {
 const width = size === "Compact" ? 3.1 : size === "Grand" ? 4.7 : 3.9;
 const chaise = type === "Chaise";
 return <group position={[0, -.58, 0]} rotation={[0, -.22, 0]}>
  <Part position={[0, .28, 0]} scale={[width, .48, 1.1]} color={color} material={material} />
  <Part position={[0, 1.12, .42]} scale={[width, 1.3, .28]} color={color} material={material} />
  <Part position={[-width / 2 + .18, .63, 0]} scale={[.45, .92, 1.15]} color={color} material={material} /> <Part position={[width / 2 - .18, .63, 0]} scale={[.45, .92, 1.15]} color={color} material={material} />
  {Array.from({ length: cushions }).map((_, i) => <Part key={i} position={[(i - (cushions - 1) / 2) * (width / cushions), .68, -.05]} scale={[width / cushions - .08, .24, .85]} color={color} material={material} />)}
  {chaise && <Part position={[width / 2 + .6, .17, .18]} scale={[1.35, .34, 1.85]} color={color} material={material} />}
  {[[-width / 2 + .28, -.2], [width / 2 - .28, -.2], [-width / 2 + .28, .4], [width / 2 - .28, .4]].map(([x,z], i) => <mesh key={i} position={[x, -.32, z]}><cylinderGeometry args={[.055, .075, .42, 12]} /><meshStandardMaterial color={legs === "Oak" ? "#9b7148" : legs === "Brass" ? "#a67d36" : "#22201d"} roughness={.5} /></mesh>)}
 </group>;
}
export default function SofaViewer(props) { return <Canvas shadows camera={{ position: [5.2, 3.1, 6.8], fov: 34 }} dpr={[1, 2]}><color attach="background" args={["#eee9e1"]} /><ambientLight intensity={1.4} /><directionalLight castShadow position={[3, 6, 4]} intensity={2.2} shadow-mapSize={[1024,1024]} /><Sofa {...props} /><ContactShadows position={[0,-.93,0]} opacity={.24} scale={9} blur={2.3} far={2} /><Environment preset="apartment" /><OrbitControls enablePan={false} minDistance={5} maxDistance={9} minPolarAngle={.8} maxPolarAngle={1.45} /></Canvas>; }
