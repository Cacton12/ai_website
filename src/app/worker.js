import { pipeline, env, RawImage } from '@huggingface/transformers';

// Defensive env configuration - guard against broken env objects during module eval
try {
  if (env && typeof env === 'object') {
    try {
      env.allowLocalModels = false;
      env.useBrowserCache = true;
    } catch (err) {
      console.warn('Worker: Failed to set env flags:', err);
    }
  }
} catch (err) {
  console.warn('Worker: Unexpected error while accessing env:', err);
}

class PipelineSingleton {
  static task = 'background-removal';
  static model = 'Xenova/modnet';
  static instance = null;

  static async getInstance(progress_callback = null) {
    if (!this.instance) {
      try {
        this.instance = await pipeline(this.task, this.model, { progress_callback });
      } catch (err) {
        console.error('Worker: Failed to create pipeline:', err);
        self.postMessage({ status: 'error', message: 'Failed to load model pipeline: ' + (err?.message || String(err)) });
        throw err;
      }
    }
    return this.instance;
  }
}
self.onmessage = async (event) => {
  try {
    const { imageURL } = event.data;
    if (!imageURL) throw new Error('No imageURL received');

    // Notify UI we're starting work so progress shows for every invocation
    self.postMessage({ status: 'loading', progress: { stage: 'Starting...' } });

    const segmenter = await PipelineSingleton.getInstance((progress) => {
      self.postMessage({ status: 'loading', progress });
    });

    // Load RawImage from URL
    const rawImage = await RawImage.fromURL(imageURL);

    // Run pipeline (returns array of RawImage)
    const output = await segmenter(rawImage);


    // Convert output to ImageData via canvas
    const canvas = new OffscreenCanvas(output[0].width, output[0].height);
    const ctx = canvas.getContext('2d');

    // Draw the background-removed image onto canvas
    const blob = await output[0].toBlob();
    const imgBitmap = await createImageBitmap(blob);
    ctx.drawImage(imgBitmap, 0, 0);

    const imageData = ctx.getImageData(0, 0, output[0].width, output[0].height);

    self.postMessage(
      {
        status: 'complete',
        imageData,
        width: output[0].width,
        height: output[0].height,
      },
      [imageData.data.buffer]
    );
  } catch (err) {
    self.postMessage({ status: 'error', message: err.message });
  }
};
