/**
 * Night Vision (NVG) — Green phosphor post-processing shader
 *
 * Note: CesiumJS auto-injects czm_frameNumber as a built-in uniform.
 * We use it directly without declaring it.
 */
import * as Cesium from 'cesium';

export function createNVGStage() {
  return new Cesium.PostProcessStage({
    name: 'nvg',
    fragmentShader: `
      uniform sampler2D colorTexture;
      in vec2 v_textureCoordinates;

      // Film grain noise
      float rand(vec2 co) {
        return fract(sin(dot(co, vec2(12.9898, 78.233))) * 43758.5453);
      }

      void main() {
        vec4 color = texture(colorTexture, v_textureCoordinates);

        // Convert to luminance
        float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

        // Amplify and push into green channel
        float amplified = pow(lum, 0.8) * 1.4;
        vec3 nvg = vec3(amplified * 0.1, amplified * 1.0, amplified * 0.15);

        // Film grain — use texture coordinates for noise since czm_frameNumber
        // varies per frame giving us time-based variation
        float noise = rand(v_textureCoordinates * 500.0 + vec2(czm_frameNumber * 0.01)) * 0.08;
        nvg += vec3(noise * 0.3, noise, noise * 0.3);

        // Vignette
        vec2 center = v_textureCoordinates - 0.5;
        float vignette = 1.0 - dot(center, center) * 1.5;
        vignette = clamp(vignette, 0.0, 1.0);
        nvg *= vignette;

        // Subtle scanlines
        float scanline = sin(v_textureCoordinates.y * 800.0) * 0.04 + 0.96;
        nvg *= scanline;

        out_FragColor = vec4(nvg, 1.0);
      }
    `,
  });
}
