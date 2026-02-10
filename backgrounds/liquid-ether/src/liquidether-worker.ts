import * as THREE from 'three';

interface SimOptions {
  iterations_poisson: number;
  iterations_viscous: number;
  mouse_force: number;
  resolution: number;
  cursor_size: number;
  viscous: number;
  isBounce: boolean;
  dt: number;
  isViscous: boolean;
  BFECC: boolean;
}

// Shader sources
const face_vert = `
  attribute vec3 position;
  uniform vec2 px;
  uniform vec2 boundarySpace;
  varying vec2 uv;
  precision highp float;
  void main(){
    vec3 pos = position;
    vec2 scale = 1.0 - boundarySpace * 2.0;
    pos.xy = pos.xy * scale;
    uv = vec2(0.5)+(pos.xy)*0.5;
    gl_Position = vec4(pos, 1.0);
  }
`;

const line_vert = `
  attribute vec3 position;
  uniform vec2 px;
  precision highp float;
  varying vec2 uv;
  void main(){
    vec3 pos = position;
    uv = 0.5 + pos.xy * 0.5;
    vec2 n = sign(pos.xy);
    pos.xy = abs(pos.xy) - px * 1.0;
    pos.xy *= n;
    gl_Position = vec4(pos, 1.0);
  }
`;

const mouse_vert = `
  precision highp float;
  attribute vec3 position;
  attribute vec2 uv;
  uniform vec2 center;
  uniform vec2 scale;
  uniform vec2 px;
  varying vec2 vUv;
  void main(){
    vec2 pos = position.xy * scale * 2.0 * px + center;
    vUv = uv;
    gl_Position = vec4(pos, 0.0, 1.0);
  }
`;

const advection_frag = `
  precision highp float;
  uniform sampler2D velocity;
  uniform float dt;
  uniform bool isBFECC;
  uniform vec2 fboSize;
  uniform vec2 px;
  varying vec2 uv;
  void main(){
    vec2 ratio = max(fboSize.x, fboSize.y) / fboSize;
    if(isBFECC == false){
      vec2 vel = texture2D(velocity, uv).xy;
      vec2 uv2 = uv - vel * dt * ratio;
      vec2 newVel = texture2D(velocity, uv2).xy;
      gl_FragColor = vec4(newVel, 0.0, 0.0);
    } else {
      vec2 spot_new = uv;
      vec2 vel_old = texture2D(velocity, uv).xy;
      vec2 spot_old = spot_new - vel_old * dt * ratio;
      vec2 vel_new1 = texture2D(velocity, spot_old).xy;
      vec2 spot_new2 = spot_old + vel_new1 * dt * ratio;
      vec2 error = spot_new2 - spot_new;
      vec2 spot_new3 = spot_new - error / 2.0;
      vec2 vel_2 = texture2D(velocity, spot_new3).xy;
      vec2 spot_old2 = spot_new3 - vel_2 * dt * ratio;
      vec2 newVel2 = texture2D(velocity, spot_old2).xy;
      gl_FragColor = vec4(newVel2, 0.0, 0.0);
    }
  }
`;

const color_frag = `
  precision highp float;
  uniform sampler2D velocity;
  uniform sampler2D palette;
  uniform vec4 bgColor;
  varying vec2 uv;
  void main(){
    vec2 vel = texture2D(velocity, uv).xy;
    float lenv = clamp(length(vel), 0.0, 1.0);
    vec3 c = texture2D(palette, vec2(lenv, 0.5)).rgb;
    vec3 outRGB = mix(bgColor.rgb, c, lenv);
    float outA = mix(bgColor.a, 1.0, lenv);
    gl_FragColor = vec4(outRGB, outA);
  }
`;

const divergence_frag = `
  precision highp float;
  uniform sampler2D velocity;
  uniform float dt;
  uniform vec2 px;
  varying vec2 uv;
  void main(){
    float x0 = texture2D(velocity, uv-vec2(px.x, 0.0)).x;
    float x1 = texture2D(velocity, uv+vec2(px.x, 0.0)).x;
    float y0 = texture2D(velocity, uv-vec2(0.0, px.y)).y;
    float y1 = texture2D(velocity, uv+vec2(0.0, px.y)).y;
    float divergence = (x1 - x0 + y1 - y0) / 2.0;
    gl_FragColor = vec4(divergence / dt);
  }
`;

const externalForce_frag = `
  precision highp float;
  uniform vec2 force;
  uniform vec2 center;
  uniform vec2 scale;
  uniform vec2 px;
  varying vec2 vUv;
  void main(){
    vec2 circle = (vUv - 0.5) * 2.0;
    float d = 1.0 - min(length(circle), 1.0);
    d *= d;
    gl_FragColor = vec4(force * d, 0.0, 1.0);
  }
`;

const poisson_frag = `
  precision highp float;
  uniform sampler2D pressure;
  uniform sampler2D divergence;
  uniform vec2 px;
  varying vec2 uv;
  void main(){
    float p0 = texture2D(pressure, uv + vec2(px.x * 2.0, 0.0)).r;
    float p1 = texture2D(pressure, uv - vec2(px.x * 2.0, 0.0)).r;
    float p2 = texture2D(pressure, uv + vec2(0.0, px.y * 2.0)).r;
    float p3 = texture2D(pressure, uv - vec2(0.0, px.y * 2.0)).r;
    float div = texture2D(divergence, uv).r;
    float newP = (p0 + p1 + p2 + p3) / 4.0 - div;
    gl_FragColor = vec4(newP);
  }
`;

const pressure_frag = `
  precision highp float;
  uniform sampler2D pressure;
  uniform sampler2D velocity;
  uniform vec2 px;
  uniform float dt;
  varying vec2 uv;
  void main(){
    float step = 1.0;
    float p0 = texture2D(pressure, uv + vec2(px.x * step, 0.0)).r;
    float p1 = texture2D(pressure, uv - vec2(px.x * step, 0.0)).r;
    float p2 = texture2D(pressure, uv + vec2(0.0, px.y * step)).r;
    float p3 = texture2D(pressure, uv - vec2(0.0, px.y * step)).r;
    vec2 v = texture2D(velocity, uv).xy;
    vec2 gradP = vec2(p0 - p1, p2 - p3) * 0.5;
    v = v - gradP * dt;
    gl_FragColor = vec4(v, 0.0, 1.0);
  }
`;

const viscous_frag = `
  precision highp float;
  uniform sampler2D velocity;
  uniform sampler2D velocity_new;
  uniform float v;
  uniform vec2 px;
  uniform float dt;
  varying vec2 uv;
  void main(){
    vec2 old = texture2D(velocity, uv).xy;
    vec2 new0 = texture2D(velocity_new, uv + vec2(px.x * 2.0, 0.0)).xy;
    vec2 new1 = texture2D(velocity_new, uv - vec2(px.x * 2.0, 0.0)).xy;
    vec2 new2 = texture2D(velocity_new, uv + vec2(0.0, px.y * 2.0)).xy;
    vec2 new3 = texture2D(velocity_new, uv - vec2(0.0, px.y * 2.0)).xy;
    vec2 newv = 4.0 * old + v * dt * (new0 + new1 + new2 + new3);
    newv /= 4.0 * (1.0 + v * dt);
    gl_FragColor = vec4(newv, 0.0, 0.0);
  }
`;

// State
let canvas: OffscreenCanvas | null = null;
let renderer: THREE.WebGLRenderer | null = null;
let running = false;
let rafId: number | null = null;
let isVisible = true;

// Common state
const common = {
  width: 1,
  height: 1,
  aspect: 1,
  pixelRatio: 1,
  time: 0,
  delta: 0,
  lastTime: performance.now()
};

// Mouse state
const mouse = {
  coords: new THREE.Vector2(0, 0),
  coords_old: new THREE.Vector2(0, 0),
  diff: new THREE.Vector2(0, 0),
  mouseMoved: false,
  isHoverInside: false,
  hasUserControl: false,
  isAutoActive: false,
  autoIntensity: 2.0,
  takeoverActive: false,
  takeoverStartTime: 0,
  takeoverDuration: 0.25,
  takeoverFrom: new THREE.Vector2(),
  takeoverTo: new THREE.Vector2()
};

// Auto driver state
const autoDriver = {
  enabled: true,
  speed: 0.5,
  resumeDelay: 1000,
  rampDurationMs: 600,
  active: false,
  current: new THREE.Vector2(0, 0),
  target: new THREE.Vector2(),
  lastTime: performance.now(),
  activationTime: 0,
  margin: 0.2
};

let lastUserInteraction = performance.now();

// Simulation
let simulation: Simulation | null = null;
let outputScene: THREE.Scene | null = null;
let outputCamera: THREE.Camera | null = null;
let outputMesh: THREE.Mesh | null = null;
let paletteTexture: THREE.DataTexture | null = null;
const bgVec4 = new THREE.Vector4(0, 0, 0, 0);

type Uniforms = Record<string, { value: any }>;

class ShaderPass {
  props: any;
  uniforms?: Uniforms;
  scene: THREE.Scene | null = null;
  camera: THREE.Camera | null = null;
  material: THREE.RawShaderMaterial | null = null;
  geometry: THREE.BufferGeometry | null = null;
  plane: THREE.Mesh | null = null;

  constructor(props: any) {
    this.props = props || {};
    this.uniforms = this.props.material?.uniforms;
  }

  init() {
    this.scene = new THREE.Scene();
    this.camera = new THREE.Camera();
    if (this.uniforms) {
      this.material = new THREE.RawShaderMaterial(this.props.material);
      this.geometry = new THREE.PlaneGeometry(2, 2);
      this.plane = new THREE.Mesh(this.geometry, this.material);
      this.scene.add(this.plane);
    }
  }

  update() {
    if (!renderer || !this.scene || !this.camera) return;
    renderer.setRenderTarget(this.props.output || null);
    renderer.render(this.scene, this.camera);
    renderer.setRenderTarget(null);
  }
}

class Advection extends ShaderPass {
  line!: THREE.LineSegments;

  constructor(simProps: any) {
    super({
      material: {
        vertexShader: face_vert,
        fragmentShader: advection_frag,
        uniforms: {
          boundarySpace: { value: simProps.cellScale },
          px: { value: simProps.cellScale },
          fboSize: { value: simProps.fboSize },
          velocity: { value: simProps.src.texture },
          dt: { value: simProps.dt },
          isBFECC: { value: true }
        }
      },
      output: simProps.dst
    });
    this.uniforms = this.props.material.uniforms;
    this.init();
  }

  init() {
    super.init();
    this.createBoundary();
  }

  createBoundary() {
    const boundaryG = new THREE.BufferGeometry();
    const vertices_boundary = new Float32Array([
      -1, -1, 0, -1, 1, 0, -1, 1, 0, 1, 1, 0, 1, 1, 0, 1, -1, 0, 1, -1, 0, -1, -1, 0
    ]);
    boundaryG.setAttribute('position', new THREE.BufferAttribute(vertices_boundary, 3));
    const boundaryM = new THREE.RawShaderMaterial({
      vertexShader: line_vert,
      fragmentShader: advection_frag,
      uniforms: this.uniforms!
    });
    this.line = new THREE.LineSegments(boundaryG, boundaryM);
    this.scene!.add(this.line);
  }

  update(args?: { dt?: number; isBounce?: boolean; BFECC?: boolean }) {
    const { dt, isBounce, BFECC } = args || {};
    if (!this.uniforms) return;
    if (typeof dt === 'number') this.uniforms.dt.value = dt;
    if (typeof isBounce === 'boolean') this.line.visible = isBounce;
    if (typeof BFECC === 'boolean') this.uniforms.isBFECC.value = BFECC;
    super.update();
  }
}

class ExternalForce extends ShaderPass {
  mouse!: THREE.Mesh;

  constructor(simProps: any) {
    super({ output: simProps.dst });
    this.initMouse(simProps);
  }

  initMouse(simProps: any) {
    super.init();
    const mouseG = new THREE.PlaneGeometry(1, 1);
    const mouseM = new THREE.RawShaderMaterial({
      vertexShader: mouse_vert,
      fragmentShader: externalForce_frag,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      uniforms: {
        px: { value: simProps.cellScale },
        force: { value: new THREE.Vector2(0, 0) },
        center: { value: new THREE.Vector2(0, 0) },
        scale: { value: new THREE.Vector2(simProps.cursor_size, simProps.cursor_size) }
      }
    });
    this.mouse = new THREE.Mesh(mouseG, mouseM);
    this.scene!.add(this.mouse);
  }

  update(props: { mouse_force?: number; cellScale?: THREE.Vector2; cursor_size?: number }) {
    const forceX = (mouse.diff.x / 2) * (props.mouse_force || 0);
    const forceY = (mouse.diff.y / 2) * (props.mouse_force || 0);
    const cellScale = props.cellScale || new THREE.Vector2(1, 1);
    const cursorSize = props.cursor_size || 0;
    const cursorSizeX = cursorSize * cellScale.x;
    const cursorSizeY = cursorSize * cellScale.y;
    const centerX = Math.min(
      Math.max(mouse.coords.x, -1 + cursorSizeX + cellScale.x * 2),
      1 - cursorSizeX - cellScale.x * 2
    );
    const centerY = Math.min(
      Math.max(mouse.coords.y, -1 + cursorSizeY + cellScale.y * 2),
      1 - cursorSizeY - cellScale.y * 2
    );
    const uniforms = (this.mouse.material as THREE.RawShaderMaterial).uniforms;
    uniforms.force.value.set(forceX, forceY);
    uniforms.center.value.set(centerX, centerY);
    uniforms.scale.value.set(cursorSize, cursorSize);
    super.update();
  }
}

class Viscous extends ShaderPass {
  constructor(simProps: any) {
    super({
      material: {
        vertexShader: face_vert,
        fragmentShader: viscous_frag,
        uniforms: {
          boundarySpace: { value: simProps.boundarySpace },
          velocity: { value: simProps.src.texture },
          velocity_new: { value: simProps.dst_.texture },
          v: { value: simProps.viscous },
          px: { value: simProps.cellScale },
          dt: { value: simProps.dt }
        }
      },
      output: simProps.dst,
      output0: simProps.dst_,
      output1: simProps.dst
    });
    this.init();
  }

  update(args?: { viscous?: number; iterations?: number; dt?: number }) {
    const { viscous, iterations, dt } = args || {};
    if (!this.uniforms) return null;
    let fbo_in: any, fbo_out: any;
    if (typeof viscous === 'number') this.uniforms.v.value = viscous;
    const iter = iterations ?? 0;
    for (let i = 0; i < iter; i++) {
      if (i % 2 === 0) {
        fbo_in = this.props.output0;
        fbo_out = this.props.output1;
      } else {
        fbo_in = this.props.output1;
        fbo_out = this.props.output0;
      }
      this.uniforms.velocity_new.value = fbo_in.texture;
      this.props.output = fbo_out;
      if (typeof dt === 'number') this.uniforms.dt.value = dt;
      super.update();
    }
    return fbo_out;
  }
}

class Divergence extends ShaderPass {
  constructor(simProps: any) {
    super({
      material: {
        vertexShader: face_vert,
        fragmentShader: divergence_frag,
        uniforms: {
          boundarySpace: { value: simProps.boundarySpace },
          velocity: { value: simProps.src.texture },
          px: { value: simProps.cellScale },
          dt: { value: simProps.dt }
        }
      },
      output: simProps.dst
    });
    this.init();
  }

  update(args?: { vel?: any }) {
    const { vel } = args || {};
    if (this.uniforms && vel) {
      this.uniforms.velocity.value = vel.texture;
    }
    super.update();
  }
}

class Poisson extends ShaderPass {
  constructor(simProps: any) {
    super({
      material: {
        vertexShader: face_vert,
        fragmentShader: poisson_frag,
        uniforms: {
          boundarySpace: { value: simProps.boundarySpace },
          pressure: { value: simProps.dst_.texture },
          divergence: { value: simProps.src.texture },
          px: { value: simProps.cellScale }
        }
      },
      output: simProps.dst,
      output0: simProps.dst_,
      output1: simProps.dst
    });
    this.init();
  }

  update(args?: { iterations?: number }) {
    const { iterations } = args || {};
    let p_in: any, p_out: any;
    const iter = iterations ?? 0;
    for (let i = 0; i < iter; i++) {
      if (i % 2 === 0) {
        p_in = this.props.output0;
        p_out = this.props.output1;
      } else {
        p_in = this.props.output1;
        p_out = this.props.output0;
      }
      if (this.uniforms) this.uniforms.pressure.value = p_in.texture;
      this.props.output = p_out;
      super.update();
    }
    return p_out;
  }
}

class Pressure extends ShaderPass {
  constructor(simProps: any) {
    super({
      material: {
        vertexShader: face_vert,
        fragmentShader: pressure_frag,
        uniforms: {
          boundarySpace: { value: simProps.boundarySpace },
          pressure: { value: simProps.src_p.texture },
          velocity: { value: simProps.src_v.texture },
          px: { value: simProps.cellScale },
          dt: { value: simProps.dt }
        }
      },
      output: simProps.dst
    });
    this.init();
  }

  update(args?: { vel?: any; pressure?: any }) {
    const { vel, pressure } = args || {};
    if (this.uniforms && vel && pressure) {
      this.uniforms.velocity.value = vel.texture;
      this.uniforms.pressure.value = pressure.texture;
    }
    super.update();
  }
}

class Simulation {
  options: SimOptions;
  fbos: Record<string, THREE.WebGLRenderTarget | null> = {
    vel_0: null,
    vel_1: null,
    vel_viscous0: null,
    vel_viscous1: null,
    div: null,
    pressure_0: null,
    pressure_1: null
  };
  fboSize = new THREE.Vector2();
  cellScale = new THREE.Vector2();
  boundarySpace = new THREE.Vector2();
  advection!: Advection;
  externalForce!: ExternalForce;
  viscous!: Viscous;
  divergence!: Divergence;
  poisson!: Poisson;
  pressure!: Pressure;

  constructor(options?: Partial<SimOptions>) {
    this.options = {
      iterations_poisson: 32,
      iterations_viscous: 32,
      mouse_force: 20,
      resolution: 0.5,
      cursor_size: 100,
      viscous: 30,
      isBounce: false,
      dt: 0.014,
      isViscous: false,
      BFECC: true,
      ...options
    };
    this.init();
  }

  init() {
    this.calcSize();
    this.createAllFBO();
    this.createShaderPass();
  }

  getFloatType() {
    return THREE.FloatType;
  }

  createAllFBO() {
    const type = this.getFloatType();
    const opts = {
      type,
      depthBuffer: false,
      stencilBuffer: false,
      minFilter: THREE.LinearFilter,
      magFilter: THREE.LinearFilter,
      wrapS: THREE.ClampToEdgeWrapping,
      wrapT: THREE.ClampToEdgeWrapping
    } as const;
    for (const key in this.fbos) {
      this.fbos[key] = new THREE.WebGLRenderTarget(this.fboSize.x, this.fboSize.y, opts);
    }
  }

  createShaderPass() {
    this.advection = new Advection({
      cellScale: this.cellScale,
      fboSize: this.fboSize,
      dt: this.options.dt,
      src: this.fbos.vel_0,
      dst: this.fbos.vel_1
    });
    this.externalForce = new ExternalForce({
      cellScale: this.cellScale,
      cursor_size: this.options.cursor_size,
      dst: this.fbos.vel_1
    });
    this.viscous = new Viscous({
      cellScale: this.cellScale,
      boundarySpace: this.boundarySpace,
      viscous: this.options.viscous,
      src: this.fbos.vel_1,
      dst: this.fbos.vel_viscous1,
      dst_: this.fbos.vel_viscous0,
      dt: this.options.dt
    });
    this.divergence = new Divergence({
      cellScale: this.cellScale,
      boundarySpace: this.boundarySpace,
      src: this.fbos.vel_viscous0,
      dst: this.fbos.div,
      dt: this.options.dt
    });
    this.poisson = new Poisson({
      cellScale: this.cellScale,
      boundarySpace: this.boundarySpace,
      src: this.fbos.div,
      dst: this.fbos.pressure_1,
      dst_: this.fbos.pressure_0
    });
    this.pressure = new Pressure({
      cellScale: this.cellScale,
      boundarySpace: this.boundarySpace,
      src_p: this.fbos.pressure_0,
      src_v: this.fbos.vel_viscous0,
      dst: this.fbos.vel_0,
      dt: this.options.dt
    });
  }

  calcSize() {
    const width = Math.max(1, Math.round(this.options.resolution * common.width));
    const height = Math.max(1, Math.round(this.options.resolution * common.height));
    this.cellScale.set(1 / width, 1 / height);
    this.fboSize.set(width, height);
  }

  resize() {
    this.calcSize();
    for (const key in this.fbos) {
      this.fbos[key]!.setSize(this.fboSize.x, this.fboSize.y);
    }
  }

  update() {
    if (this.options.isBounce) this.boundarySpace.set(0, 0);
    else this.boundarySpace.copy(this.cellScale);

    this.advection.update({
      dt: this.options.dt,
      isBounce: this.options.isBounce,
      BFECC: this.options.BFECC
    });

    this.externalForce.update({
      cursor_size: this.options.cursor_size,
      mouse_force: this.options.mouse_force,
      cellScale: this.cellScale
    });

    let vel: any = this.fbos.vel_1;
    if (this.options.isViscous) {
      vel = this.viscous.update({
        viscous: this.options.viscous,
        iterations: this.options.iterations_viscous,
        dt: this.options.dt
      });
    }

    this.divergence.update({ vel });
    const pressure = this.poisson.update({ iterations: this.options.iterations_poisson });
    this.pressure.update({ vel, pressure });
  }
}

function makePaletteTexture(stops: string[]): THREE.DataTexture {
  let arr: string[];
  if (Array.isArray(stops) && stops.length > 0) {
    arr = stops.length === 1 ? [stops[0], stops[0]] : stops;
  } else {
    arr = ['#ffffff', '#ffffff'];
  }
  const w = arr.length;
  const data = new Uint8Array(w * 4);
  for (let i = 0; i < w; i++) {
    const c = new THREE.Color(arr[i]);
    data[i * 4 + 0] = Math.round(c.r * 255);
    data[i * 4 + 1] = Math.round(c.g * 255);
    data[i * 4 + 2] = Math.round(c.b * 255);
    data[i * 4 + 3] = 255;
  }
  const tex = new THREE.DataTexture(data, w, 1, THREE.RGBAFormat);
  tex.magFilter = THREE.LinearFilter;
  tex.minFilter = THREE.LinearFilter;
  tex.wrapS = THREE.ClampToEdgeWrapping;
  tex.wrapT = THREE.ClampToEdgeWrapping;
  tex.generateMipmaps = false;
  tex.needsUpdate = true;
  return tex;
}

function initRenderer(offscreen: OffscreenCanvas) {
  canvas = offscreen;
  renderer = new THREE.WebGLRenderer({
    canvas: offscreen as any,
    antialias: true,
    alpha: true
  });
  renderer.autoClear = false;
  renderer.setClearColor(new THREE.Color(0x000000), 0);
  renderer.setPixelRatio(common.pixelRatio);
}

function initSimulation(colors: string[]) {
  paletteTexture = makePaletteTexture(colors);
  simulation = new Simulation();

  outputScene = new THREE.Scene();
  outputCamera = new THREE.Camera();
  outputMesh = new THREE.Mesh(
    new THREE.PlaneGeometry(2, 2),
    new THREE.RawShaderMaterial({
      vertexShader: face_vert,
      fragmentShader: color_frag,
      transparent: true,
      depthWrite: false,
      uniforms: {
        velocity: { value: simulation.fbos.vel_0!.texture },
        boundarySpace: { value: new THREE.Vector2() },
        palette: { value: paletteTexture },
        bgColor: { value: bgVec4 }
      }
    })
  );
  outputScene.add(outputMesh);
}

function resize(width: number, height: number) {
  common.width = Math.max(1, width);
  common.height = Math.max(1, height);
  common.aspect = common.width / common.height;

  if (renderer) {
    renderer.setSize(common.width, common.height, false);
  }
  if (simulation) {
    simulation.resize();
  }
}

function updateMouse() {
  // Handle takeover transition
  if (mouse.takeoverActive) {
    const t = (performance.now() - mouse.takeoverStartTime) / (mouse.takeoverDuration * 1000);
    if (t >= 1) {
      mouse.takeoverActive = false;
      mouse.coords.copy(mouse.takeoverTo);
      mouse.coords_old.copy(mouse.coords);
      mouse.diff.set(0, 0);
    } else {
      const k = t * t * (3 - 2 * t);
      mouse.coords.copy(mouse.takeoverFrom).lerp(mouse.takeoverTo, k);
    }
  }

  mouse.diff.subVectors(mouse.coords, mouse.coords_old);
  mouse.coords_old.copy(mouse.coords);

  if (mouse.coords_old.x === 0 && mouse.coords_old.y === 0) {
    mouse.diff.set(0, 0);
  }

  if (mouse.isAutoActive && !mouse.takeoverActive) {
    mouse.diff.multiplyScalar(mouse.autoIntensity);
  }
}

function updateAutoDriver() {
  if (!autoDriver.enabled) return;

  const now = performance.now();
  const idle = now - lastUserInteraction;

  if (idle < autoDriver.resumeDelay) {
    if (autoDriver.active) {
      autoDriver.active = false;
      mouse.isAutoActive = false;
    }
    return;
  }

  if (mouse.isHoverInside) {
    if (autoDriver.active) {
      autoDriver.active = false;
      mouse.isAutoActive = false;
    }
    return;
  }

  if (!autoDriver.active) {
    autoDriver.active = true;
    autoDriver.current.copy(mouse.coords);
    autoDriver.lastTime = now;
    autoDriver.activationTime = now;
    pickNewTarget();
  }

  mouse.isAutoActive = true;

  let dtSec = (now - autoDriver.lastTime) / 1000;
  autoDriver.lastTime = now;
  if (dtSec > 0.2) dtSec = 0.016;

  const dir = new THREE.Vector2().subVectors(autoDriver.target, autoDriver.current);
  const dist = dir.length();

  if (dist < 0.01) {
    pickNewTarget();
    return;
  }

  dir.normalize();

  let ramp = 1;
  if (autoDriver.rampDurationMs > 0) {
    const t = Math.min(1, (now - autoDriver.activationTime) / autoDriver.rampDurationMs);
    ramp = t * t * (3 - 2 * t);
  }

  const step = autoDriver.speed * dtSec * ramp;
  const move = Math.min(step, dist);
  autoDriver.current.addScaledVector(dir, move);

  mouse.coords.set(autoDriver.current.x, autoDriver.current.y);
  mouse.mouseMoved = true;
}

function pickNewTarget() {
  const r = Math.random;
  autoDriver.target.set(
    (r() * 2 - 1) * (1 - autoDriver.margin),
    (r() * 2 - 1) * (1 - autoDriver.margin)
  );
}

function render() {
  if (!renderer || !simulation || !outputScene || !outputCamera) return;

  const now = performance.now();
  common.delta = Math.min((now - common.lastTime) / 1000, 0.1);
  common.lastTime = now;
  common.time += common.delta;

  updateAutoDriver();
  updateMouse();

  simulation.update();

  renderer.setRenderTarget(null);
  renderer.render(outputScene, outputCamera);
}

function loop() {
  if (!running || !isVisible) return;
  render();
  rafId = requestAnimationFrame(loop);
}

function start() {
  if (running) return;
  running = true;
  common.lastTime = performance.now();
  loop();
}

function stop() {
  running = false;
  if (rafId !== null) {
    cancelAnimationFrame(rafId);
    rafId = null;
  }
}

function cleanup() {
  stop();
  if (renderer) {
    renderer.dispose();
    renderer = null;
  }
  simulation = null;
  outputScene = null;
  outputCamera = null;
  outputMesh = null;
  paletteTexture = null;
  canvas = null;
}

// Message handler
self.onmessage = (e: MessageEvent) => {
  const { type, data } = e.data;

  switch (type) {
    case 'init':
      common.pixelRatio = data.dpr || 1;
      initRenderer(data.canvas);
      initSimulation(data.colors || ['#5227FF', '#FF9FFC', '#B19EEF']);
      self.postMessage({ type: 'ready' });
      break;

    case 'start':
      start();
      break;

    case 'stop':
      stop();
      break;

    case 'resize':
      resize(data.width, data.height);
      break;

    case 'visibility':
      isVisible = data.visible;
      if (isVisible && running) {
        common.lastTime = performance.now();
        loop();
      }
      break;

    case 'pointer':
      lastUserInteraction = performance.now();
      if (autoDriver.active) {
        autoDriver.active = false;
        mouse.isAutoActive = false;
      }

      if (mouse.isAutoActive && !mouse.hasUserControl && !mouse.takeoverActive) {
        mouse.takeoverFrom.copy(mouse.coords);
        mouse.takeoverTo.set(data.x, data.y);
        mouse.takeoverStartTime = performance.now();
        mouse.takeoverActive = true;
        mouse.hasUserControl = true;
        mouse.isAutoActive = false;
      } else {
        mouse.coords.set(data.x, data.y);
        mouse.mouseMoved = true;
        mouse.hasUserControl = true;
      }
      break;

    case 'pointerInside':
      mouse.isHoverInside = data.inside;
      if (!data.inside) {
        mouse.hasUserControl = false;
      }
      break;

    case 'props':
      if (simulation) {
        const sim = simulation;
        if (typeof data.mouseForce !== 'undefined') sim.options.mouse_force = data.mouseForce;
        if (typeof data.cursorSize !== 'undefined') sim.options.cursor_size = data.cursorSize;
        if (typeof data.isViscous !== 'undefined') sim.options.isViscous = data.isViscous;
        if (typeof data.viscous !== 'undefined') sim.options.viscous = data.viscous;
        if (typeof data.iterationsViscous !== 'undefined') sim.options.iterations_viscous = data.iterationsViscous;
        if (typeof data.iterationsPoisson !== 'undefined') sim.options.iterations_poisson = data.iterationsPoisson;
        if (typeof data.dt !== 'undefined') sim.options.dt = data.dt;
        if (typeof data.BFECC !== 'undefined') sim.options.BFECC = data.BFECC;
        if (typeof data.isBounce !== 'undefined') sim.options.isBounce = data.isBounce;

        if (typeof data.resolution !== 'undefined' && data.resolution !== sim.options.resolution) {
          sim.options.resolution = data.resolution;
          sim.resize();
        }
      }

      if (typeof data.autoDemo !== 'undefined') autoDriver.enabled = data.autoDemo;
      if (typeof data.autoSpeed !== 'undefined') autoDriver.speed = data.autoSpeed;
      if (typeof data.autoResumeDelay !== 'undefined') autoDriver.resumeDelay = data.autoResumeDelay;
      if (typeof data.autoRampDuration !== 'undefined') autoDriver.rampDurationMs = data.autoRampDuration * 1000;
      if (typeof data.autoIntensity !== 'undefined') mouse.autoIntensity = data.autoIntensity;
      if (typeof data.takeoverDuration !== 'undefined') mouse.takeoverDuration = data.takeoverDuration;
      break;

    case 'palette':
      if (outputMesh && data.colors) {
        const newPalette = makePaletteTexture(data.colors);
        const uniforms = (outputMesh.material as THREE.RawShaderMaterial).uniforms;
        if (uniforms && uniforms.palette) {
          uniforms.palette.value = newPalette;
        }
        if (paletteTexture) {
          paletteTexture.dispose();
        }
        paletteTexture = newPalette;
      }
      break;

    case 'cleanup':
      cleanup();
      break;
  }
};
