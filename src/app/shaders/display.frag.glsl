uniform sampler2D uTexture;
varying vec2 vUv;

void main() {
  float v = texture2D(uTexture, vUv).r;
  // Map value to green channel, keep dark background
  vec3 color = vec3(0.0, v, 0.0);
  gl_FragColor = vec4(color, 1.0);
}


