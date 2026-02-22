export const crtVertexShader = `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`;

export const crtFragmentShader = `
uniform sampler2D tDiffuse;
uniform vec2 resolution;
uniform float time;

// Bloom
uniform float bloom_strength;
uniform float bloom_threshold;
uniform float bloom_softness;
uniform float bloom_radius;

// Beam Dynamics
uniform float frame_rate;
uniform float beam_radius;
uniform float beam_softness;
uniform float phosphor_decay;
uniform float beam_deposit;

// Geometry 
uniform float virtual_height;
uniform float triad_pitch_x;
uniform float triad_pitch_y;
uniform float slot_pixel_pitch;
uniform float triad_row_shift;
uniform float row_brick_shift;
uniform float column_brick_shift;
uniform float dot_radius;
uniform float slot_width;
uniform float slot_height;
uniform float slot_exponent;
uniform float edge_softness;
uniform float triad_phase;

// Layout Strings (Mapped to integers for simplicity)
uniform int mask_type;      // 0: slot-grid, 1: shadow-mask, 2: aperture-grille
uniform int scan_mode;      // 0: persistence, 1: progressive, 2: interlaced
uniform int scan_direction; // 0: L->R, 1: R->L, 2: T->B, 3: B->T
uniform int beam_mode;      // 0: simulated, 1: hard, 2: soft

varying vec2 vUv;

// Simple pseudo-random for noise
float random(vec2 st) {
    return fract(sin(dot(st.xy, vec2(12.9898,78.233))) * 43758.5453123);
}

// Subpixel masks
vec3 getMask(vec2 pos) {
    vec3 mask = vec3(1.0);
    vec2 p = pos * resolution.xy;
    
    // Scale parameters based on standard coordinate space
    float px = triad_pitch_x * 10.0;
    float py = triad_pitch_y * 10.0;
    
    // Simple implementations based on mask_type
    if (mask_type == 0) { // slot-grid
        p.y += mod(floor(p.x / px), 2.0) * py * triad_row_shift;
        float rx = mod(p.x, px) / px;
        mask.r = smoothstep(0.0, edge_softness, rx) * smoothstep(1.0, 1.0 - edge_softness, rx);
        mask.g = smoothstep(0.0, edge_softness, mod(rx + 0.33, 1.0)) * smoothstep(1.0, 1.0 - edge_softness, mod(rx + 0.33, 1.0));
        mask.b = smoothstep(0.0, edge_softness, mod(rx + 0.66, 1.0)) * smoothstep(1.0, 1.0 - edge_softness, mod(rx + 0.66, 1.0));
    } else if (mask_type == 1) { // shadow-mask
        p.x += mod(floor(p.y / py), 2.0) * px * 0.5;
        float dist = distance(mod(p, vec2(px, py)), vec2(px, py) * 0.5);
        float d = smoothstep(dot_radius * 10.0, dot_radius * 10.0 - edge_softness, dist);
        mask = vec3(d);
    } else { // aperture-grille
        float rx = mod(p.x, px) / px;
        mask.r = step(0.0, rx) * step(rx, 0.33);
        mask.g = step(0.33, rx) * step(rx, 0.66);
        mask.b = step(0.66, rx) * step(rx, 1.0);
    }
    return clamp(mask, 0.0, 1.0);
}

// Scanline simulation
float getScanline(vec2 pos) {
    float y = pos.y * virtual_height;
    float scan = 0.5 + 0.5 * sin(y * 3.14159 * 2.0 + time * frame_rate);
    
    // Adjust based on beam_mode
    if (beam_mode == 1) scan = step(0.5, scan);
    else if (beam_mode == 2) scan = smoothstep(0.0, 1.0, scan);
    else scan = pow(scan, beam_deposit * 0.01);
    
    return scan * (beam_radius * 0.1);
}

void main() {
    vec2 p = vUv;
    
    // Curvature (slightly barrel distorted)
    vec2 cp = p * 2.0 - 1.0;
    float c = length(cp);
    p = p + (cp * (c * c) * 0.02); // Small distortion factor
    
    if(p.x < 0.0 || p.x > 1.0 || p.y < 0.0 || p.y > 1.0) {
        gl_FragColor = vec4(0.0, 0.0, 0.0, 1.0);
        return;
    }
    
    vec4 texColor = texture2D(tDiffuse, p);
    
    // Scanlines
    float scanline = getScanline(p);
    
    // Mask
    vec3 mask = getMask(p);
    
    // Combine base with scanlines and mask
    vec3 color = texColor.rgb * mask * scanline;
    
    // Basic Bloom Simulation
    vec4 blurred = texture2D(tDiffuse, p + vec2(bloom_radius / resolution.x, bloom_radius / resolution.y) * 0.005);
    float brightness = max(max(blurred.r, blurred.g), blurred.b);
    if(brightness > bloom_threshold) {
        color += blurred.rgb * bloom_strength * 0.1;
    }
    
    // Noise/decay (Phosphor decay simulation)
    float noise = random(p * time) * phosphor_decay * 0.01;
    color += noise;
    
    gl_FragColor = vec4(color, 1.0);
}
`;
