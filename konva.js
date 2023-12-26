const HighlightsFilter = (imageData) => {
    var adjust = Math.pow((this.contrast() + 100) / 100, 2);
  
    var data = imageData.data,
      nPixels = data.length,
      red = 150,
      green = 150,
      blue = 150,
      i;
  
    for (i = 0; i < nPixels; i += 4) {
      red = data[i];
      green = data[i + 1];
      blue = data[i + 2];
  
      //Red channel
      red /= 255;
      red -= 0.5;
      red *= adjust;
      red += 0.5;
      red *= 255;
  
      //Green channel
      green /= 255;
      green -= 0.5;
      green *= adjust;
      green += 0.5;
      green *= 255;
  
      //Blue channel
      blue /= 255;
      blue -= 0.5;
      blue *= adjust;
      blue += 0.5;
      blue *= 255;
  
      red = red < 0 ? 0 : red;
      green = green < 0 ? 0 : green;
      blue = blue < 0 ? 0 : blue;
  
      data[i] = red;
      data[i + 1] = green;
      data[i + 2] = blue;
    }

    // Konva.Factory.addGetterSetter(
    //   Konva.Node,
    //   'highlight',
    //   0,
    //   Konva.getNumberValidator(),
    //   Konva.Factory.afterSetFilter
    // )
}

Konva.Image.fromURL('https://static.vecteezy.work/system/resources/previews/007/842/943/non_2x/one-clean-soap-bubble-flying-in-the-air-blue-sky-photo.jpg', function (bubble) {
        const stage = new Konva.Stage({
          container: 'container',
          width: 850,
          height: 600,
        });

        const layer = new Konva.Layer();
        const bubbleWidth = bubble.width()
        const bubbleHeight = bubble.height()
        const aspectRatio = bubbleWidth / bubbleHeight

        bubble.position({
          x: 50,
          y: 50,
        });
        bubble.width(500 * aspectRatio)
        bubble.height(500)
        bubble.cache();
        bubble.setAttr('highlight', 0)
        bubble.filters([Konva.Filters.Contrast, Konva.Filters.Blur, Konva.Filters.HSL, Konva.Filters.Brighten]);
        layer.add(bubble);
        stage.add(layer);

        const sliders = ['contrast', 'blurRadius', 'saturation', 'brightness', 'hue'];
        sliders.forEach(function (attr) {
          const slider = document.getElementById(attr);
          function update() {
            console.time(attr)
              bubble[attr](parseFloat(slider.value));
            console.timeEnd(attr)
          }
          slider.oninput = update;
          update();
        });
      });