const loadImage = async (url: string, parentLocation: string) => {
  const isRelativeAsset = !/^(https?)?:\/\//.test(url);
  try {
    const fetchUrl = isRelativeAsset
      ? parentLocation + (!url.startsWith('/') ? `/${url}` : url)
      : url;

    const response = await fetch(fetchUrl);
    const fileBlob = await response.blob();
    // fileBlob.type says the MIME-type is png, but it is image/webp
    if (fileBlob.type.startsWith('image/') || isRelativeAsset)
      return URL.createObjectURL(fileBlob);
  } catch (e) {
    return null;
  }
};
const send = (url: string, index: number) => {
  postMessage({ url, index });
};

const heapIndexMap = (arr: number[], res: number[]) => {
  if (arr.length >= 1) {
    res.push(arr[0]);
  }
  if (arr.length >= 2) {
    res.push(arr[arr.length - 1]);
  }

  if (arr.length >= 3) {
    const middle = Math.floor(arr.length / 2);
    res.push(arr[middle]);
    heapIndexMap(arr.slice(1, middle), res);
    heapIndexMap(arr.slice(middle + 1, arr.length - 1), res);
  }

  return res;
};

self.addEventListener('message', async (e) => {
  const { images, screenWidth, parentLocation } = e.data as {
    images: string[];
    screenWidth: number;
    parentLocation: string;
  };

  const indexes = heapIndexMap(
    images.map((_, index) => index),
    [],
  );

  const startLoad = async (): Promise<void> => {
    if (!images.length || !indexes.length) return;
    const index = indexes.shift() || 0;
    let url = images[index];

    if (url) {
      const width = screenWidth <= 1024 ? 1024 : 1600;
      url = url.replace(
        'cdn-cgi/image/f=auto,q=82,w=1920',
        `cdn-cgi/image/f=auto,q=87,w=${width}`,
      );
      const blobUrl = await loadImage(url, parentLocation);
      if (blobUrl) send(blobUrl, index);
      startLoad();
    }
  };

  // Start 10 parallel loads
  for (let i = 0; i < 10; i++) startLoad();
});


