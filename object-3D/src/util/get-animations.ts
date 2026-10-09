const GLB_MAGIC = 0x46546c67; // 'glTF'
const GLB_HEADER_LENGTH = 20; // 12-byte file header + 8-byte header of the JSON chunk

const cache = new Map<string, Promise<string[]>>();

/**
 * Get all animation names of a gltf/glb file.
 *
 * Reads only the JSON part of the file. For .glb, it first tries HTTP range requests, so a large
 * model is not downloaded only to fill a dropdown. Results are cached per URL.
 */
export function getAnimations(url: string): Promise<string[]> {
  if (!url) return Promise.resolve([]);

  let names = cache.get(url);
  if (!names) {
    names = readGltfJson(url)
      .then((json) => {
        // Same fallback name as GLTFLoader, so the names match the loaded clips
        return (json.animations || []).map(
          (animation: { name?: string }, index: number) => animation.name || `animation_${index}`,
        );
      })
      .catch((error) => {
        console.error('Object3D: could not read animations', error);
        cache.delete(url);
        return [];
      });
    cache.set(url, names);
  }

  return names;
}

async function fetchBytes(url: string, start?: number, end?: number) {
  const init = start === undefined ? undefined : { headers: { Range: `bytes=${start}-${end}` } };
  const response = await fetch(url, init);
  if (!response.ok) throw new Error(`HTTP ${response.status}`);
  return { buffer: await response.arrayBuffer(), partial: response.status === 206 };
}

async function fetchHead(url: string) {
  try {
    return await fetchBytes(url, 0, GLB_HEADER_LENGTH - 1);
  } catch {
    // The server or CORS policy rejected the range request
    return fetchBytes(url);
  }
}

async function readGltfJson(url: string) {
  const head = await fetchHead(url);
  const view = new DataView(head.buffer);
  const isGlb =
    head.buffer.byteLength >= GLB_HEADER_LENGTH && view.getUint32(0, true) === GLB_MAGIC;

  if (!isGlb) {
    const { buffer } = head.partial ? await fetchBytes(url) : head;
    return JSON.parse(new TextDecoder().decode(buffer));
  }

  const jsonLength = view.getUint32(12, true);
  const end = GLB_HEADER_LENGTH + jsonLength;
  let source = head;
  if (head.partial) source = await fetchBytes(url, GLB_HEADER_LENGTH, end - 1);
  // A partial response holds only the JSON chunk. A full response holds the whole file.
  const jsonBytes = source.partial ? source.buffer : source.buffer.slice(GLB_HEADER_LENGTH, end);

  return JSON.parse(new TextDecoder().decode(jsonBytes));
}
