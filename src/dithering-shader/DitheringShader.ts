/**
 * Dithering shader implementation
 * Applies a dithering effect to the rendered scene
 *
 * Credits:
 * Original dithering pattern: https://www.shadertoy.com/view/ltSSzW
 */

const ditheringShader = /*glsl*/`
uniform float ditheringEnabled;
uniform vec2 resolution;
uniform float gridSize;
uniform float luminanceMethod;
uniform float invertColor;
uniform float pixelSizeRatio;
uniform float grayscaleOnly;
uniform float patternType;
uniform float colorMode;
uniform vec3 darkColor;
uniform vec3 lightColor;

float bayer4Threshold(vec2 pos) {
  vec2 pixel = floor(mod(pos.xy / gridSize, 4.0));
  int x = int(pixel.x);
  int y = int(pixel.y);
  if (x == 0) {
    if (y == 0) return 16.0 / 17.0;
    if (y == 1) return  5.0 / 17.0;
    if (y == 2) return 13.0 / 17.0;
    return 1.0 / 17.0;
  } else if (x == 1) {
    if (y == 0) return  8.0 / 17.0;
    if (y == 1) return 12.0 / 17.0;
    if (y == 2) return  4.0 / 17.0;
    return 9.0 / 17.0;
  } else if (x == 2) {
    if (y == 0) return 14.0 / 17.0;
    if (y == 1) return  2.0 / 17.0;
    if (y == 2) return 15.0 / 17.0;
    return 3.0 / 17.0;
  } else {
    if (y == 0) return  6.0 / 17.0;
    if (y == 1) return 10.0 / 17.0;
    if (y == 2) return  7.0 / 17.0;
    return 11.0 / 17.0;
  }
}

float bayer2Threshold(vec2 pos) {
  vec2 pixel = floor(mod(pos.xy / gridSize, 2.0));
  int x = int(pixel.x);
  int y = int(pixel.y);
  // 0 2 / 3 1, threshold = (v+1)/5
  if (x == 0 && y == 0) return 1.0 / 5.0;
  if (x == 1 && y == 0) return 3.0 / 5.0;
  if (x == 0 && y == 1) return 4.0 / 5.0;
  return 2.0 / 5.0;
}

float bayer8Threshold(vec2 pos) {
  vec2 pixel = floor(mod(pos.xy / gridSize, 8.0));
  int idx = int(pixel.y) * 8 + int(pixel.x);
  // Standard 8x8 Bayer (values 0..63), threshold = (v+1)/65
  float v = 0.0;
  if      (idx ==  0) v =  0.0; else if (idx ==  1) v = 32.0;
  else if (idx ==  2) v =  8.0; else if (idx ==  3) v = 40.0;
  else if (idx ==  4) v =  2.0; else if (idx ==  5) v = 34.0;
  else if (idx ==  6) v = 10.0; else if (idx ==  7) v = 42.0;
  else if (idx ==  8) v = 48.0; else if (idx ==  9) v = 16.0;
  else if (idx == 10) v = 56.0; else if (idx == 11) v = 24.0;
  else if (idx == 12) v = 50.0; else if (idx == 13) v = 18.0;
  else if (idx == 14) v = 58.0; else if (idx == 15) v = 26.0;
  else if (idx == 16) v = 12.0; else if (idx == 17) v = 44.0;
  else if (idx == 18) v =  4.0; else if (idx == 19) v = 36.0;
  else if (idx == 20) v = 14.0; else if (idx == 21) v = 46.0;
  else if (idx == 22) v =  6.0; else if (idx == 23) v = 38.0;
  else if (idx == 24) v = 60.0; else if (idx == 25) v = 28.0;
  else if (idx == 26) v = 52.0; else if (idx == 27) v = 20.0;
  else if (idx == 28) v = 62.0; else if (idx == 29) v = 30.0;
  else if (idx == 30) v = 54.0; else if (idx == 31) v = 22.0;
  else if (idx == 32) v =  3.0; else if (idx == 33) v = 35.0;
  else if (idx == 34) v = 11.0; else if (idx == 35) v = 43.0;
  else if (idx == 36) v =  1.0; else if (idx == 37) v = 33.0;
  else if (idx == 38) v =  9.0; else if (idx == 39) v = 41.0;
  else if (idx == 40) v = 51.0; else if (idx == 41) v = 19.0;
  else if (idx == 42) v = 59.0; else if (idx == 43) v = 27.0;
  else if (idx == 44) v = 49.0; else if (idx == 45) v = 17.0;
  else if (idx == 46) v = 57.0; else if (idx == 47) v = 25.0;
  else if (idx == 48) v = 15.0; else if (idx == 49) v = 47.0;
  else if (idx == 50) v =  7.0; else if (idx == 51) v = 39.0;
  else if (idx == 52) v = 13.0; else if (idx == 53) v = 45.0;
  else if (idx == 54) v =  5.0; else if (idx == 55) v = 37.0;
  else if (idx == 56) v = 63.0; else if (idx == 57) v = 31.0;
  else if (idx == 58) v = 55.0; else if (idx == 59) v = 23.0;
  else if (idx == 60) v = 61.0; else if (idx == 61) v = 29.0;
  else if (idx == 62) v = 53.0; else                v = 21.0;
  return (v + 1.0) / 65.0;
}

float clustered4Threshold(vec2 pos) {
  vec2 pixel = floor(mod(pos.xy / gridSize, 4.0));
  int x = int(pixel.x);
  int y = int(pixel.y);
  // Clustered-dot 4x4 (dots grow outward from cell center as it darkens)
  // 12  5  6 13
  //  4  0  1  7
  // 11  3  2  8
  // 15 10  9 14
  if (x == 0) {
    if (y == 0) return 13.0 / 17.0;
    if (y == 1) return  5.0 / 17.0;
    if (y == 2) return 12.0 / 17.0;
    return 16.0 / 17.0;
  } else if (x == 1) {
    if (y == 0) return  6.0 / 17.0;
    if (y == 1) return  1.0 / 17.0;
    if (y == 2) return  4.0 / 17.0;
    return 11.0 / 17.0;
  } else if (x == 2) {
    if (y == 0) return  7.0 / 17.0;
    if (y == 1) return  2.0 / 17.0;
    if (y == 2) return  3.0 / 17.0;
    return 10.0 / 17.0;
  } else {
    if (y == 0) return 14.0 / 17.0;
    if (y == 1) return  8.0 / 17.0;
    if (y == 2) return  9.0 / 17.0;
    return 15.0 / 17.0;
  }
}

bool halftoneValue(float brightness, vec2 pos) {
  // Distance from cell center; draw black if within radius proportional to darkness
  vec2 cellPos = mod(pos, gridSize) - vec2(gridSize * 0.5);
  float d = length(cellPos) / (gridSize * 0.5);
  float b = clamp(brightness, 0.0, 1.0);
  return d < (1.0 - b);
}

bool getValue(float brightness, vec2 pos) {
  // patternType: 0=Bayer 4x4, 1=Bayer 8x8, 2=Bayer 2x2, 3=Halftone, 4=Clustered 4x4
  if (patternType < 2.5) {
    if (brightness > 16.0 / 17.0) return false;
    if (brightness <  1.0 / 17.0) return true;
  }
  if (patternType < 0.5) {
    return brightness < bayer4Threshold(pos);
  } else if (patternType < 1.5) {
    return brightness < bayer8Threshold(pos);
  } else if (patternType < 2.5) {
    return brightness < bayer2Threshold(pos);
  } else if (patternType < 3.5) {
    return halftoneValue(brightness, pos);
  } else {
    return brightness < clustered4Threshold(pos);
  }
}

void mainImage(const in vec4 inputColor, const in vec2 uv, out vec4 outputColor) {
  vec2 fragCoord = uv * resolution;
  vec3 baseColor;

  // Apply pixelation effect based on grid size and ratio
  float pixelSize = gridSize * pixelSizeRatio;
  vec2 pixelatedUV = floor(fragCoord / pixelSize) * pixelSize / resolution;
  baseColor = texture2D(inputBuffer, pixelatedUV).rgb;

  // Calculate luminance for each pixel (original implementation)
  float luminance = dot(baseColor, vec3(1.,1.,1.));

  // Apply grayscale if enabled (only meaningful when not replacing color with palette)
  if (grayscaleOnly > 0.0 && colorMode < 0.5) {
    baseColor = vec3(luminance);
  }

  vec3 finalColor;
  if (colorMode > 1.5) {
    // Per-channel dither: threshold R, G, B independently between palette colors
    bool rDither = getValue(baseColor.r, fragCoord);
    bool gDither = getValue(baseColor.g, fragCoord);
    bool bDither = getValue(baseColor.b, fragCoord);
    finalColor = vec3(
      rDither ? darkColor.r : lightColor.r,
      gDither ? darkColor.g : lightColor.g,
      bDither ? darkColor.b : lightColor.b
    );
  } else if (colorMode > 0.5) {
    // Two-tone palette
    bool dithered = getValue(luminance, fragCoord);
    finalColor = dithered ? darkColor : lightColor;
  } else {
    // Original: ink black stamped on the pixelated scene color
    bool dithered = getValue(luminance, fragCoord);
    finalColor = dithered ? vec3(0.0) : baseColor;
  }

  // Invert color if requested
  if (invertColor > 0.0) {
    finalColor = 1.0 - finalColor;
  }

  // Output final color preserving alpha
  outputColor = vec4(finalColor, inputColor.a);
}`;

export default ditheringShader;
