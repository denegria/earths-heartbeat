/**
 * FLIR Thermal — White-hot thermal imaging post-processing shader
 */
import * as Cesium from 'cesium';

export function createFLIRStage() {
    return new Cesium.PostProcessStage({
        name: 'flir',
        fragmentShader: `
      uniform sampler2D colorTexture;
      in vec2 v_textureCoordinates;

      // Thermal gradient: black → deep blue → purple → orange → yellow → white
      vec3 thermalGradient(float t) {
        if (t < 0.15) return mix(vec3(0.0), vec3(0.05, 0.0, 0.2), t / 0.15);
        if (t < 0.3) return mix(vec3(0.05, 0.0, 0.2), vec3(0.4, 0.0, 0.5), (t - 0.15) / 0.15);
        if (t < 0.5) return mix(vec3(0.4, 0.0, 0.5), vec3(0.8, 0.2, 0.0), (t - 0.3) / 0.2);
        if (t < 0.7) return mix(vec3(0.8, 0.2, 0.0), vec3(1.0, 0.6, 0.0), (t - 0.5) / 0.2);
        if (t < 0.85) return mix(vec3(1.0, 0.6, 0.0), vec3(1.0, 0.9, 0.3), (t - 0.7) / 0.15);
        return mix(vec3(1.0, 0.9, 0.3), vec3(1.0, 1.0, 1.0), (t - 0.85) / 0.15);
      }

      void main() {
        vec4 color = texture(colorTexture, v_textureCoordinates);

        // Convert to luminance (thermal intensity)
        float lum = dot(color.rgb, vec3(0.299, 0.587, 0.114));

        // Apply contrast curve
        float thermal = pow(lum, 0.9);

        // Map to thermal gradient
        vec3 flir = thermalGradient(thermal);

        // Edge detection for structure outlines
        float px = 1.0 / 1920.0;
        float py = 1.0 / 1080.0;
        float lumL = dot(texture(colorTexture, v_textureCoordinates + vec2(-px, 0.0)).rgb, vec3(0.3, 0.6, 0.1));
        float lumR = dot(texture(colorTexture, v_textureCoordinates + vec2(px, 0.0)).rgb, vec3(0.3, 0.6, 0.1));
        float lumU = dot(texture(colorTexture, v_textureCoordinates + vec2(0.0, py)).rgb, vec3(0.3, 0.6, 0.1));
        float lumD = dot(texture(colorTexture, v_textureCoordinates + vec2(0.0, -py)).rgb, vec3(0.3, 0.6, 0.1));
        float edge = abs(lumL - lumR) + abs(lumU - lumD);
        edge = smoothstep(0.02, 0.08, edge);

        // Blend edges as white outlines
        flir = mix(flir, vec3(1.0), edge * 0.3);

        out_FragColor = vec4(flir, 1.0);
      }
    `,
    });
}
