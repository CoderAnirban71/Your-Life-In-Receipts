import { Bloom, EffectComposer, Noise, Vignette } from '@react-three/postprocessing'
import { BlendFunction } from 'postprocessing'

/**
 * The film look: bloom on the lamp, the LEDs and the constellation; a little grain;
 * a vignette that keeps the eye on the desk. Skipped on weak devices (store.fx).
 */
export function Effects() {
  return (
    <EffectComposer multisampling={0} enableNormalPass={false}>
      <Bloom luminanceThreshold={0.9} luminanceSmoothing={0.25} intensity={0.85} mipmapBlur radius={0.7} />
      <Noise opacity={0.045} blendFunction={BlendFunction.SOFT_LIGHT} />
      <Vignette eskil={false} offset={0.22} darkness={0.8} />
    </EffectComposer>
  )
}
