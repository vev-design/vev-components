import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type Frame = { callback: (ts: number) => void; id: number };

const glCalls = {
  drawArrays: 0,
  viewport: 0,
};

let frames: Frame[] = [];
let nextFrameId = 1;
let canvasSize = { height: 0, width: 0 };
let posted: any[] = [];
let contextListeners: Record<string, EventListener[]> = {};

const createGlStub = () =>
  new Proxy(
    {
      createBuffer: () => ({}),
      createProgram: () => ({}),
      createShader: () => ({}),
      drawArrays: () => {
        glCalls.drawArrays += 1;
      },
      getAttribLocation: () => 0,
      getExtension: () => null,
      getProgramParameter: () => true,
      getShaderParameter: () => true,
      getUniformLocation: () => ({}),
      viewport: () => {
        glCalls.viewport += 1;
      },
    } as Record<string, unknown>,
    {
      get(target, prop: string) {
        if (prop in target) return target[prop];
        // Any other member is either an unused GL constant or a setter we can
        // safely ignore in these tests.
        return typeof prop === 'string' && prop.toUpperCase() === prop ? 1 : () => undefined;
      },
    }
  );

const createCanvasStub = () => ({
  addEventListener: (type: string, listener: EventListener) => {
    contextListeners[type] = [...(contextListeners[type] || []), listener];
  },
  getContext: () => createGlStub(),
  removeEventListener: () => undefined,
  set height(value: number) {
    canvasSize.height = value;
  },
  get height() {
    return canvasSize.height;
  },
  set width(value: number) {
    canvasSize.width = value;
  },
  get width() {
    return canvasSize.width;
  },
});

const flush = (ts: number) => {
  const pending = frames;
  frames = [];
  for (const frame of pending) frame.callback(ts);
};

const send = (type: string, data?: unknown) => {
  (globalThis as any).self.onmessage({ data: { data, type } } as MessageEvent);
};

const loadWorker = async () => {
  const scope = globalThis as any;
  scope.self = globalThis;
  scope.postMessage = (message: unknown) => posted.push(message);
  scope.requestAnimationFrame = (callback: (ts: number) => void) => {
    const id = nextFrameId++;
    frames.push({ callback, id });
    return id;
  };
  scope.cancelAnimationFrame = (id: number) => {
    frames = frames.filter((frame) => frame.id !== id);
  };
  vi.resetModules();
  await import('../src/lightpillar-worker');
};

const start = async (cssSize = { cssHeight: 1440, cssWidth: 2560 }) => {
  await loadWorker();
  send('init', { canvas: createCanvasStub() });
  send('props', { pillarWidth: 10 });
  send('resize', cssSize);
  send('start');
};

beforeEach(() => {
  frames = [];
  nextFrameId = 1;
  posted = [];
  contextListeners = {};
  canvasSize = { height: 0, width: 0 };
  glCalls.drawArrays = 0;
  glCalls.viewport = 0;
});

afterEach(() => {
  const scope = globalThis as any;
  delete scope.self;
  delete scope.postMessage;
  delete scope.requestAnimationFrame;
  delete scope.cancelAnimationFrame;
});

describe('lightpillar worker', () => {
  it('reports ready and sizes the drawing buffer below the element size', async () => {
    await start();
    expect(posted.some((message) => message.type === 'ready')).toBe(true);
    expect(canvasSize.width).toBeGreaterThan(0);
    expect(canvasSize.width).toBeLessThan(2560);
    expect(canvasSize.width * canvasSize.height).toBeLessThan(1440 * 810);
  });

  it('keeps at most one animation frame pending', async () => {
    await start();
    expect(frames.length).toBe(1);

    let ts = 0;
    for (let i = 0; i < 20; i++) {
      ts += 1000 / 60;
      flush(ts);
      expect(frames.length).toBe(1);
    }
    expect(glCalls.drawArrays).toBe(20);
  });

  // A visibility pair arriving between two frames used to leave the previous
  // self-scheduling loop alive alongside the new one, doubling the loop each
  // time the hero crossed an intersection threshold.
  it('does not multiply the loop when visibility flaps between frames', async () => {
    await start();

    for (let i = 0; i < 16; i++) {
      send('visibility', { visible: false });
      send('visibility', { visible: true });
      expect(frames.length).toBeLessThanOrEqual(1);
    }

    glCalls.drawArrays = 0;
    flush(1000 / 60);
    expect(glCalls.drawArrays).toBe(1);
    expect(frames.length).toBe(1);
  });

  it('stops scheduling frames while off-screen and resumes afterwards', async () => {
    await start();
    send('visibility', { visible: false });
    expect(frames.length).toBe(0);

    send('visibility', { visible: true });
    expect(frames.length).toBe(1);
  });

  it('only reallocates the drawing buffer when the rendered size changes', async () => {
    await start();
    const allocations = glCalls.viewport;

    send('resize', { cssHeight: 1440, cssWidth: 2560 });
    send('resize', { cssHeight: 1440, cssWidth: 2560 });
    expect(glCalls.viewport).toBe(allocations);

    // Any hero above the pixel budget renders at the same size, so growing one
    // is free; dropping below the budget is what actually resizes the buffer.
    send('resize', { cssHeight: 2160, cssWidth: 3840 });
    expect(glCalls.viewport).toBe(allocations);

    send('resize', { cssHeight: 450, cssWidth: 800 });
    expect(glCalls.viewport).toBe(allocations + 1);
  });

  it('renders a single frame and stops when the visitor prefers reduced motion', async () => {
    await start();
    flush(1000 / 60);
    send('motion', { reduced: true });

    glCalls.drawArrays = 0;
    flush(2 * 1000 / 60);
    expect(glCalls.drawArrays).toBe(1);
    expect(frames.length).toBe(0);
  });

  it('drops resolution when frames come in slowly', async () => {
    await start();
    const before = canvasSize.width * canvasSize.height;

    let ts = 0;
    for (let i = 0; i < 4; i++) {
      ts += 400;
      flush(ts);
    }

    expect(canvasSize.width * canvasSize.height).toBeLessThan(before);
    expect(posted.some((message) => message.type === 'quality')).toBe(true);
  });

  it('stops animating after repeated near-hang frames', async () => {
    await start();

    let ts = 0;
    for (let i = 0; i < 3; i++) {
      ts += 1500;
      flush(ts);
    }

    expect(frames.length).toBe(0);
    const quality = posted.filter((message) => message.type === 'quality').pop();
    expect(quality.data.frozen).toBe(true);
  });

  it('recovers from a lost webgl context at the cheapest quality', async () => {
    await start();
    const event = { preventDefault: vi.fn(), type: 'webglcontextlost' } as unknown as Event;

    contextListeners.webglcontextlost.forEach((listener) => listener(event));
    expect(event.preventDefault).toHaveBeenCalled();
    expect(frames.length).toBe(0);

    contextListeners.webglcontextrestored.forEach((listener) => listener({} as Event));
    expect(frames.length).toBe(1);

    glCalls.drawArrays = 0;
    flush(1000 / 60);
    expect(glCalls.drawArrays).toBe(1);
  });

  it('stops the loop on cleanup', async () => {
    await start();
    send('cleanup');
    expect(frames.length).toBe(0);

    glCalls.drawArrays = 0;
    flush(1000 / 60);
    expect(glCalls.drawArrays).toBe(0);
  });
});
