const image = new Image();
image.src =
  "https://static.vecteezy.work/system/resources/previews/007/842/943/non_2x/one-clean-soap-bubble-flying-in-the-air-blue-sky-photo.jpg";
image.crossOrigin = "Anonymous";

const handleFilter = (canvas, filters) => {
  const ctx = canvas.getContext("2d");
  const filterValues = Object.values(filters).filter(
    (val) => typeof val !== "number"
  );
  const filterString = filterValues.join(" ");

  ctx.filter = filterString;
  ctx.drawImage(image, 0, 0, 750, 500);

  const glCanvas = document.getElementById("side-canvas");
  if (!glCanvas) return;
  const gl =
    glCanvas.getContext("webgl") || glCanvas.getContext("experimental-webgl");

  if (!gl) return;
  // Vertex shader
  var vsSource = `
    attribute vec2 a_position;
    varying vec2 v_texCoord;

    void main() {
        gl_Position = vec4(a_position, 0.0, 1.0);
        v_texCoord = (a_position + 1.0) / 2.0;
    }
`;

  // Fragment shader
  var fsSource = `
precision mediump float;
uniform sampler2D u_image;
uniform mat4 u_brightnessMatrix;
uniform float u_brightness;
uniform float u_darknessMultiplier;
uniform float u_contrast;
uniform float u_highlight;
uniform float u_saturation;
uniform float u_hue;
uniform float u_blurRadius;
uniform float u_temperature;

varying vec2 v_texCoord;

vec3 adjustContrast(vec3 color, float contrast) {
  vec3 resultColor = 0.5 + (contrast + 1.0) * (color - 0.5);
  return clamp(resultColor, 0.0, 1.0);
}

float levelChannel(float color, float inBlack, float inGamma, float inWhite, float outBlack, float outWhite) {
  return (pow(((color * 255.0) - inBlack) / (inWhite - inBlack), inGamma) * (outWhite - outBlack) + outBlack) / 255.0;
}

vec3 adjustLevels(vec4 color, float inBlack, float inGamma, float inWhite, float outBlack, float outWhite) {
  vec3 adjustedColor = vec3(1.0);
  adjustedColor.r = levelChannel(color.r, inBlack, inGamma, inWhite, outBlack, outWhite);
  adjustedColor.g = levelChannel(color.g, inBlack, inGamma, inWhite, outBlack, outWhite);
  adjustedColor.b = levelChannel(color.b, inBlack, inGamma, inWhite, outBlack, outWhite);
  return adjustedColor.rgb;
}

vec4 brightnessContrast(vec4 inColor, float brightness, float contrast)
{
  return vec4((inColor.rgb - 0.5) * contrast + 0.5 + brightness, inColor.a);
}

vec3 adjustHighlight(vec3 color, float highlight) {
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return color + vec3(highlight) * (1.0 - luminance);
}

vec3 adjustShadow(vec3 color, float shadow) {
  float luminance = dot(color, vec3(0.2126, 0.7152, 0.0722));
  return color - vec3(shadow) * luminance;
}

vec3 adjustTemperature(vec3 color, float temperature) {
  // Scale the temperature value to a usable range
  float scaledTemperature = temperature;

  // Apply the temperature as a simple color balance
  color.r += scaledTemperature;
  color.b -= scaledTemperature;

  // Clamp the color to ensure it stays within the valid range
  color = clamp(color, 0.0, 1.0);

  return color;
}

vec3 adjustHue(vec3 color, float dhue) {
  float s = sin(dhue);
  float c = cos(dhue);
  return (color * c) + (color * s) * mat3(
    vec3(0.167444, 0.329213, -0.496657),
    vec3(-0.327948, 0.035669, 0.292279),
    vec3(1.250268, -1.047561, -0.202707)
  ) + dot(vec3(0.299, 0.587, 0.114), color) * (1.0 - c);
}

vec3 adjustSaturation(vec3 color, float saturation) {
  // WCAG 2.1 relative luminance base
  const vec3 luminanceWeighting = vec3(0.2126, 0.7152, 0.0722);
  vec3 grayscaleColor = vec3(dot(color, luminanceWeighting));
  return mix(grayscaleColor, color, 1.0 + saturation);
}

vec3 adjustBrightness(vec4 color, mat4 colorMatrix, float brightness) {
  vec4 adjustedColor = colorMatrix * color;
  adjustedColor.rgb = mix(adjustedColor.rgb, vec3(1.0), brightness);
  return adjustedColor.rgb;
}

void main() {
  vec4 color = texture2D(u_image, v_texCoord);

  color.rgb = adjustHue(color.rgb, u_hue);
  color.rgb = adjustContrast(color.rgb, u_contrast);
  color.rgb = adjustSaturation(color.rgb, u_saturation);

  color.rgb = adjustTemperature(color.rgb, u_temperature);
  color.rgb = adjustBrightness(color, u_brightnessMatrix, u_brightness);
  color.rgb = adjustLevels(color, 0.0, 1.0, 255.0, u_darknessMultiplier, u_highlight);

  gl_FragColor = color;
}
`;

  function compileShader(source, type) {
    const shader = gl.createShader(type);
    if (!shader) return null;
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error("Shader compilation error:", gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  // Create and compile shaders
  const vertexShader = compileShader(vsSource, gl.VERTEX_SHADER);
  const fragmentShader = compileShader(fsSource, gl.FRAGMENT_SHADER);

  const shaderProgram = gl.createProgram();
  if (!shaderProgram || !vertexShader || !fragmentShader) return;
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    console.error(
      "Shader program linking error:",
      gl.getProgramInfoLog(shaderProgram)
    );
  }

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(
    gl.ARRAY_BUFFER,
    new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
    gl.STATIC_DRAW
  );

  const positionLocation = gl.getAttribLocation(shaderProgram, "a_position");
  // Get all var positions
  const highlightLocation = gl.getUniformLocation(shaderProgram, "u_highlight");
  const multiplierLocation = gl.getUniformLocation(
    shaderProgram,
    "u_darknessMultiplier"
  );
  const contrastLocation = gl.getUniformLocation(shaderProgram, "u_contrast");
  const brightnessLocation = gl.getUniformLocation(
    shaderProgram,
    "u_brightness"
  );
  const brightnessMatrixLocation = gl.getUniformLocation(
    shaderProgram,
    "u_brightnessMatrix"
  );
  const saturationLocation = gl.getUniformLocation(
    shaderProgram,
    "u_saturation"
  );
  const temperatureLocation = gl.getUniformLocation(
    shaderProgram,
    "u_temperature"
  );
  const hueLocation = gl.getUniformLocation(shaderProgram, "u_hue");
  const blurLocation = gl.getUniformLocation(shaderProgram, "u_blurRadius");
  const imageLocation = gl.getUniformLocation(shaderProgram, "u_image");

  // Create texture
  const texture = gl.createTexture();
  gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
  // Use image as texture
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  gl.useProgram(shaderProgram);
  gl.enableVertexAttribArray(positionLocation);
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.vertexAttribPointer(positionLocation, 2, gl.FLOAT, false, 0, 0);
  gl.uniform1i(imageLocation, 0);

  // Adjust the brightness as needed
  if (filters.highlight !== 0) {
    gl.uniform1f(highlightLocation, filters.highlight);
  }
  if (filters.shadows !== 0) {
    gl.uniform1f(multiplierLocation, filters.shadows);
  }
  if (filters.contrast !== 0) {
    gl.uniform1f(contrastLocation, filters.contrast / 100);
  }

  const lighteningColorMatrix = [
    1,
    0,
    0,
    1, // Red channel
    0,
    1,
    0,
    1, // Green channel
    0,
    0,
    1,
    1, // Blue channel
    0,
    0,
    0,
    1, // Alpha channel
  ];

  gl.uniformMatrix4fv(
    brightnessMatrixLocation,
    false,
    new Float32Array(lighteningColorMatrix)
  );
  gl.uniform1f(brightnessLocation, filters.brightness / 100);

  if (filters.saturation !== 0) {
    gl.uniform1f(saturationLocation, filters.saturation / 100);
  }
  if (filters.hue !== 0) {
    gl.uniform1f(hueLocation, (filters.hue * Math.PI) / 180);
  }
  if (filters.temperature !== 0) {
    gl.uniform1f(temperatureLocation, filters.temperature / 100);
  }

  // Apply Gaussian blur filter
  if (filters.blur !== 0) {
    gl.uniform1f(blurLocation, filters.blur);
  }

  gl.clear(gl.COLOR_BUFFER_BIT); // Clear the canvas

  gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

  ctx.drawImage(glCanvas, 0, 0);
};

document.addEventListener("DOMContentLoaded", function () {
  // Get the range input element
  const canvas = document.getElementById("main-canvas");
  const glCanvas = document.getElementById("side-canvas");
  const downloadBtn = document.getElementById("export-button");

  const ctx = canvas?.getContext("2d");
  canvas.width = 750;
  canvas.height = 500;
  glCanvas.width = 750;
  glCanvas.height = 500;

  image.onload = () => {
    ctx?.drawImage(image, 0, 0, 750, 500);
  };

  downloadBtn.onclick = () => {
    const thumbnailLink = document.createElement("a");
    const settingsLink = document.createElement("a");
    thumbnailLink.download = "image.png";
    thumbnailLink.href = canvas.toDataURL();
    const settingsUrl = `data:text/plain;charset=utf-8,${encodeURIComponent(
      JSON.stringify(filtersObj)
    )}`;
    settingsLink.download = "settings.json";
    settingsLink.href = settingsUrl;

    thumbnailLink.click();
    settingsLink.click();
  };

  const sliders = [
    "blur",
    "contrast",
    "brightness",
    "saturation",
    "hue",
    "highlight",
    "shadows",
    "temperature",
  ];
  const filtersObj = {
    blur: "",
    contrast: "",
    brightness: "",
    saturation: "",
    hue: "",
    highlight: "",
    shadows: "",
    temperature: "",
  };

  const updateFilter = (filter, value) => {
    filtersObj[filter] = value;

    return filtersObj;
  };

  sliders.forEach(function (attr) {
    const slider = document.getElementById(attr);
    if (!slider) return;
    updateFilter(attr, parseFloat(slider.value));

    function update() {
      // console.time(attr);
      const newFilters = updateFilter(attr, parseFloat(slider.value));
      handleFilter(canvas, newFilters);
      // console.timeEnd(attr);
    }

    slider.oninput = update;
    update();
  });
});