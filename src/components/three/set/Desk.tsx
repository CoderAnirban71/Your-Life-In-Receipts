import { MeshReflectorMaterial } from '@react-three/drei'
import { DESK_Y } from './shared'

/**
 * The desk: a dark, faintly reflective surface. Every receipt in the story is
 * mirrored in it — the reflections are what make the room feel like a place.
 */
export function Desk({ reflect }: { reflect: boolean }) {
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, DESK_Y, -2]} receiveShadow>
      <planeGeometry args={[80, 60]} />
      {reflect ? (
        <MeshReflectorMaterial
          blur={[400, 120]}
          resolution={512}
          mixBlur={1}
          mixStrength={14}
          roughness={0.9}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.6}
          color="#120f16"
          metalness={0.35}
          mirror={0.35}
        />
      ) : (
        <meshStandardMaterial color="#120f16" roughness={0.95} metalness={0.2} />
      )}
    </mesh>
  )
}
