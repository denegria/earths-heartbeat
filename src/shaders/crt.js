/**
 * CRT Monitor — Retro scan line + barrel distortion shader
 *
 * Note: CesiumJS auto-injects czm_frameNumber as a built-in uniform.
 * We use it directly without declaring it.
 */
import * as Cesium from 'cesium';

export function createCRTStage() {
  return new Cesium.PostProcessStage({
    name: 'crt',
    fragmentShader: `
      uniform sampler2D colorTexture;
      in vec2 v_textureCoordinates;

      // Barrel distortion
      vec2 distort(vec2 uv) {
        vec2 center = uv - 0.5;
        float d = dot(center, center);
        float strength = 0.15;
        return uv + center * d * strength;
      }

      void main() {
        // Apply barrel distortion
        vec2 uv = distort(v_textureCoordinates);

        // Out of bounds = black
        if (uv.x < 0.0 || uv.x > 1.0 || uv.y < 0.0 || uv.y > 1.0) {
          out_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
          return;
        }

        // Chromatic aberration (RGB split)
        float offset = 0.002;
        float r = texture(colorTexture, uv + vec2(offset, 0.0)).r;
        float g = texture(colorTexture, uv).g;
        float b = texture(colorTexture, uv - vec2(offset, 0.0)).b;
        vec3 color = vec3(r, g, b);

        // Scan lines
        float scanline = sin(uv.y * 600.0) * 0.08 + 0.92;
        color *= scanline;

        // Horizontal scan line (moving)
        float movingScan = 1.0 - smoothstep(0.0, 0.005, abs(sin(uv.y * 2.0 + czm_frameNumber * 0.02) - 0.5)) * 0.15;
        color *= movingScan;

        // Screen flicker
        float flicker = 0.97 + 0.03 * sin(czm_frameNumber * 0.5);
        color *= flicker;

        // Vignette (stronger for CRT)
        vec2 center = v_textureCoordinates - 0.5;
        float vignette = 1.0 - dot(center, center) * 2.0;
        vignette = clamp(vignette, 0.0, 1.0);
        vignette = pow(vignette, 0.8);
        color *= vignette;

        // Slight green tint
        color.g *= 1.05;

        // Brightness boost
        color *= 1.1;

        out_FragColor = vec4(color, 1.0);
      }
    `,
  });
}
