export type VideoOptions = {
  url: string;
  name: string;
  width: number;
  height: number;
};

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

const waitForPlaythrough = async (videoElement: HTMLVideoElement) => {
  return new Promise<void>((resolve, reject) => {
    const handler = () => {
      videoElement.removeEventListener('canplaythrough', handler);
      resolve();
    };
    videoElement.addEventListener('canplaythrough', handler);
    videoElement.addEventListener('error', reject);
  });
};

const MAX_FRAMES = 620;
const FRAMES_PR_SECOND = 12;
const PLAYBACK_RATE = 1;

type FileUpload = {
  name: string;
  url: string;
  dynamicUrl?: string;
};
/**
 * Unpacks frames by playing the video and pauses with await functions, and takes screenshots in every interval
 * Uses requestAnimationFrame
 * Returns the array of frames
 * @param options
 * @returns
 */
export const unpackFrames = async (
  file: File,
  uploadFile: (file: string, filename: string) => Promise<FileUpload>,
  progressCb: (progress: number, frame: string) => void,
): Promise<string[]> => {
  const videoElement = document.createElement('video');
  videoElement.crossOrigin = 'Anonymous';
  videoElement.preload = 'metadata';
  videoElement.src = URL.createObjectURL(file);
  videoElement.muted = true;
  videoElement.loop = false;
  videoElement.playbackRate = PLAYBACK_RATE;
  await waitForPlaythrough(videoElement);

  const width = videoElement.videoWidth;
  const height = videoElement.videoHeight;
  const { duration } = videoElement;
  const imageCount = Math.floor(Math.min(duration * FRAMES_PR_SECOND, MAX_FRAMES));
  const snapshotInterval = Math.floor((duration * 1000) / imageCount); // in milliseconds

  console.log(`Unpacking frames:${imageCount} Snapshot interval:${snapshotInterval}`);
  const offscreenCanvasElement = new OffscreenCanvas(width, height);

  const context = offscreenCanvasElement.getContext('2d');
  if (!context) return [];
  context.imageSmoothingEnabled = true;
  context.imageSmoothingQuality = 'high';

  const imageUploadPromises: Promise<FileUpload>[] = [];

  videoElement.play();
  // Play video for 200ms to increase change of not black frame
  let frameIndex = 0;
  let imageDoneCount = 0;
  console.log(imageCount, videoElement.duration);
  while ((frameIndex + 1) * snapshotInterval < duration * 1000) {
    await sleep(10);

    const time = videoElement.currentTime;

    if (time * 1000 > frameIndex * snapshotInterval) {
      console.log(
        `Progress: ${Math.round(
          (frameIndex / imageCount) * 100,
        )}% Frame:${frameIndex} / ${imageCount} Time:${Math.round(time * 1000)} frameIndexTime:${
          frameIndex * snapshotInterval
        }`,
      );
      frameIndex++;
      // pause videoElement here to get snapshots
      videoElement.pause();
      // const progress = videoElement.currentTime / videoElement.duration;

      const base64Snapshot = await createScreenshot(videoElement, context, width, height);
      imageUploadPromises.push(
        uploadFile(base64Snapshot, `frame-${frameIndex}.jpg`).then((file) => {
          imageDoneCount++;
          progressCb(imageDoneCount / imageCount, base64Snapshot);
          return file;
        }),
      );

      // push into the list
      videoElement.play();
    }
  }
  const images = await Promise.all(imageUploadPromises);
  return images.map((image) => image.dynamicUrl || image.url);
};

async function createScreenshot(
  videoElement: HTMLVideoElement,
  context: OffscreenCanvasRenderingContext2D,
  width: number,
  height: number,
): Promise<string> {
  context.drawImage(videoElement, 0, 0, width, height);

  // create blob
  const blob = await context.canvas.convertToBlob({
    type: 'image/jpeg',
    quality: 100,
  });

  return blobToBase64(blob);
}

const blobToBase64 = (blob: Blob): Promise<string> => {
  const reader = new FileReader();
  reader.readAsDataURL(blob);
  return new Promise((resolve) => {
    reader.onloadend = () => {
      resolve(reader.result as string);
    };
  });
};
