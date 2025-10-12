uniform float gridSize;   // texture dimension (N)
uniform float innerR;     // inner radius (e.g. 2.0)
uniform float outerR;     // outer radius (e.g. 4.0)
uniform float alpha_m;    // sigmoid sharpness for inner
uniform float alpha_n;    // sigmoid sharpness for outer
uniform float b1, b2;     // birth thresholds (e.g. 0.257, 0.336)
uniform float d1, d2;     // death thresholds (e.g. 0.365, 0.549)
uniform float dt;         // integration step (e.g. 0.1)

float sigma(float x, float a, float alpha) {
    return 1.0 / (1.0 + exp(-(x - a) * 4.0 / alpha));
}

float sigmoid(float x, float a, float b, float alpha) {
    return sigma(x, a, alpha) * (1.0 - sigma(x, b, alpha));
}

void main() {
    vec2 uv = gl_FragCoord.xy / gridSize;

    float innerSum = 0.0;
    float innerCount = 0.0;
    float outerSum = 0.0;
    float outerCount = 0.0;

    // Sample neighborhood
    for (int dy = -6; dy <= 6; ++dy) {
        for (int dx = -6; dx <= 6; ++dx) {
            vec2 offset = vec2(float(dx), float(dy));
            float dist = length(offset);
            if (dist <= outerR) {
                vec2 sampleUV = fract(uv + offset / gridSize);
                float v = texture2D(textureState, sampleUV).r;
                if (dist <= innerR) {
                    innerSum += v;
                    innerCount += 1.0;
                } else {
                    outerSum += v;
                    outerCount += 1.0;
                }
            }
        }
    }

    float m = (innerCount == 0.0) ? 0.0 : innerSum / innerCount; // inner mean
    float n = (outerCount == 0.0) ? 0.0 : outerSum / outerCount; // outer mean

    // Rafler's smooth transition functions
    float birth = sigmoid(n, b1, b2, alpha_n);
    float death = sigmoid(n, d1, d2, alpha_n);

    float s = birth * (1.0 - sigma(m, 0.5, alpha_m))
            + death  * sigma(m, 0.5, alpha_m);

    float current = texture2D(textureState, uv).r;
    float nextVal = clamp(current + dt * (2.0 * s - 1.0), 0.0, 1.0);

    gl_FragColor = vec4(nextVal, nextVal, nextVal, 1.0);
}