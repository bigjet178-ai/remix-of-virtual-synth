import * as THREE from 'three';
import { SynthHost } from '../host/SynthHost';
import { TextureManager } from './TextureManager';
import { PARAMETERS } from '../audio/SharedState';

/**
 * 3D Skeuomorphic Front-End UI
 * Realistic Software Synthesizer Interface
 */
export class Synth3D {
  private container: HTMLElement;
  private host: SynthHost;
  
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private textureManager: TextureManager;
  private uiGroup: THREE.Group;

  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private previousPointerY: number = 0;

  private knobCount = 0;
  private activeInstanceId: number | null = null;
  private knobMeshes: THREE.Mesh[] = [];
  private panelMesh: THREE.Mesh | null = null;
  private dummy = new THREE.Object3D();
  private seqSwitch!: THREE.Mesh;
  private seqRandomButton!: THREE.Mesh;
  private seqEnabled: boolean = false;
  private seqStepLEDs: THREE.Mesh[] = [];
  private currentSeqStep: number = -1;
  // private scopeCanvas: HTMLCanvasElement;
  // private scopeCtx: CanvasRenderingContext2D;
  // private scopeTexture: THREE.CanvasTexture;
  // private scopeMesh!: THREE.Mesh;
  private lcdCanvas: HTMLCanvasElement;
  private lcdCtx: CanvasRenderingContext2D;
  private lcdTexture: THREE.CanvasTexture;
  private lcdMesh!: THREE.Mesh;
  private wtCanvas: HTMLCanvasElement;
  private wtCtx: CanvasRenderingContext2D;
  private wtTexture: THREE.CanvasTexture;
  private wtMesh!: THREE.Mesh;
  private lfoCanvas: HTMLCanvasElement;
  private lfoCtx: CanvasRenderingContext2D;
  private lfoTexture: THREE.CanvasTexture;
  private lfoMesh!: THREE.Mesh;
  private seqMatrixCanvas: HTMLCanvasElement;
  private seqMatrixCtx: CanvasRenderingContext2D;
  private seqMatrixTexture: THREE.CanvasTexture;
  private seqMatrixMesh!: THREE.Mesh;
  private adsrCanvas: HTMLCanvasElement;
  private adsrCtx: CanvasRenderingContext2D;
  private adsrTexture: THREE.CanvasTexture;
  private adsrMesh!: THREE.Mesh;
  private filterGraphCanvas: HTMLCanvasElement;
  private filterGraphCtx: CanvasRenderingContext2D;
  private filterGraphTexture: THREE.CanvasTexture;
  private filterGraphMesh!: THREE.Mesh;
  private modMatrixCanvas: HTMLCanvasElement;
  private modMatrixCtx: CanvasRenderingContext2D;
  private modMatrixTexture: THREE.CanvasTexture;
  private modMatrixMesh!: THREE.Mesh;
  private modSources = ["L1", "L2", "F-ENV", "A-ENV", "VEL", "CHAO"];
  private modTargets = ["PIT", "CUT", "WT", "FX", "RES", "RAT"];
  private modParams = [
    [100, 101, 102, 103, 104, 105],
    [106, 107, 108, 109, 110, 111],
    [112, 113, 114, 115, 116, 117],
    [118, 119, 120, 121, 122, 123],
    [124, 125, 126, 127, 128, 129],
    [130, 131, 132, 133, 134, 135]
  ];
  private sectionTitles: Array<{ mesh: THREE.Mesh, view: string }> = [];
  private lfo1Val: number = 0;
  private lfo2Val: number = 0;
  private lfoHistory1: number[] = new Array(100).fill(0);
  private lfoHistory2: number[] = new Array(100).fill(0);
  private lcdLine1: string = "SYSTEM READY";
  private lcdLine2: string = "WAM-2.0 CORE";
  private knobData: Array<{ 
    name: string,
    paramIndex: number, 
    min: number, 
    max: number, 
    value: number, 
    targetValue: number, // For smooth animation
    x: number, 
    z: number,
    notchMesh?: THREE.Mesh,
    ringMesh?: THREE.Mesh,
    knobMesh?: THREE.Mesh,
    scale?: number,
    modParam?: number
  }> = [];

  constructor(container: HTMLElement, host: SynthHost) {
    this.container = container;
    this.host = host;
    this.textureManager = new TextureManager();

    this.scene = new THREE.Scene();
    this.scene.background = null;

    this.uiGroup = new THREE.Group();
    this.scene.add(this.uiGroup);

    this.camera = new THREE.PerspectiveCamera(40, container.clientWidth / container.clientHeight, 0.1, 100);
    this.camera.position.set(0, 14, 16);
    this.camera.lookAt(0, 0, 0);

    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true, 
      powerPreference: 'high-performance',
      alpha: true 
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.0;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    
    container.appendChild(this.renderer.domElement);

    this.raycaster = new THREE.Raycaster();
    this.pointer = new THREE.Vector2();

    // Scope Setup
    // this.scopeCanvas = document.createElement('canvas');
    // this.scopeCanvas.width = 256;
    // this.scopeCanvas.height = 128;
    // this.scopeCtx = this.scopeCanvas.getContext('2d')!;
    // this.scopeTexture = new THREE.CanvasTexture(this.scopeCanvas);

    // LCD Setup
    this.lcdCanvas = document.createElement('canvas');
    this.lcdCanvas.width = 512;
    this.lcdCanvas.height = 128;
    this.lcdCtx = this.lcdCanvas.getContext('2d')!;
    this.lcdTexture = new THREE.CanvasTexture(this.lcdCanvas);

    // Wavetable Display Setup
    this.wtCanvas = document.createElement('canvas');
    this.wtCanvas.width = 256;
    this.wtCanvas.height = 128;
    this.wtCtx = this.wtCanvas.getContext('2d')!;
    this.wtTexture = new THREE.CanvasTexture(this.wtCanvas);

    // LFO Visualizer Setup
    this.lfoCanvas = document.createElement('canvas');
    this.lfoCanvas.width = 256;
    this.lfoCanvas.height = 128;
    this.lfoCtx = this.lfoCanvas.getContext('2d')!;
    this.lfoTexture = new THREE.CanvasTexture(this.lfoCanvas);

    // Sequencer Matrix Setup
    this.seqMatrixCanvas = document.createElement('canvas');
    this.seqMatrixCanvas.width = 512;
    this.seqMatrixCanvas.height = 128;
    this.seqMatrixCtx = this.seqMatrixCanvas.getContext('2d')!;
    this.seqMatrixTexture = new THREE.CanvasTexture(this.seqMatrixCanvas);

    // ADSR Setup
    this.adsrCanvas = document.createElement('canvas');
    this.adsrCanvas.width = 256;
    this.adsrCanvas.height = 128;
    this.adsrCtx = this.adsrCanvas.getContext('2d')!;
    this.adsrTexture = new THREE.CanvasTexture(this.adsrCanvas);

    // Filter Graph Setup
    this.filterGraphCanvas = document.createElement('canvas');
    this.filterGraphCanvas.width = 256;
    this.filterGraphCanvas.height = 128;
    this.filterGraphCtx = this.filterGraphCanvas.getContext('2d')!;
    this.filterGraphTexture = new THREE.CanvasTexture(this.filterGraphCanvas);

    // Modulation Matrix Setup
    this.modMatrixCanvas = document.createElement('canvas');
    this.modMatrixCanvas.width = 256;
    this.modMatrixCanvas.height = 256;
    this.modMatrixCtx = this.modMatrixCanvas.getContext('2d')!;
    this.modMatrixTexture = new THREE.CanvasTexture(this.modMatrixCanvas);

    this.initEnvironment();
    this.buildUI();
    this.bindEvents();
    this.animate();
  }

  private async initEnvironment() {
    // Add default lights immediately so UI is visible
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
    this.scene.add(ambientLight);

    const hemiLight = new THREE.HemisphereLight(0xffffff, 0x444444, 1.0);
    this.scene.add(hemiLight);

    const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
    dirLight.position.set(5, 10, 7.5);
    dirLight.castShadow = true;
    this.scene.add(dirLight);

    const knobLight = new THREE.PointLight(0xffffff, 5.0, 50);
    knobLight.position.set(0, 10, 0);
    this.uiGroup.add(knobLight);

    try {
      const hdriUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/equirectangular/royal_esplanade_1k.hdr';
      const envMap = await this.textureManager.loadHDRI(hdriUrl, this.renderer);
      this.scene.environment = envMap;
      this.scene.environmentIntensity = 0.5;
    } catch (e) {
      console.warn("HDRI failed to load, using fallback lighting.");
    }

    // Apply requested shift: up by 100px (~2 units), left by 60px (~1.2 units)
    this.uiGroup.position.set(-1.2, 0, -2.0);
  }

  private createLabel(text: string, x: number, y: number, z: number, size: number = 36, color: string = '#aaaaaa'): THREE.Mesh {
    const canvas = document.createElement('canvas');
    canvas.width = 512; // Higher res for sharper text
    canvas.height = 128;
    const ctx = canvas.getContext('2d')!;
    ctx.clearRect(0, 0, 512, 128);
    ctx.fillStyle = color;
    ctx.font = `bold ${size * 2}px "JetBrains Mono", monospace`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, 256, 64);
    
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearMipmapLinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.anisotropy = 16;
    
    const material = new THREE.MeshBasicMaterial({ 
      map: texture, 
      transparent: true, 
      depthWrite: false,
      side: THREE.DoubleSide
    });
    
    const geo = new THREE.PlaneGeometry(2.0, 0.5);
    const mesh = new THREE.Mesh(geo, material);
    mesh.position.set(x, y, z);
    mesh.rotation.x = -Math.PI / 2;
    this.uiGroup.add(mesh);
    return mesh;
  }

  private createSectionBox(x: number, z: number, width: number, height: number, title: string, view?: string) {
    // Title
    const label = this.createLabel(title, x, 0.02, z - height / 2 + 0.4, 42, '#00ff88');
    if (view) {
      this.sectionTitles.push({ mesh: label, view });
    }

    // Subtle Frame
    const frameGeo = new THREE.EdgesGeometry(new THREE.PlaneGeometry(width - 0.2, height - 0.2));
    const frameMat = new THREE.LineBasicMaterial({ color: 0x333333, transparent: true, opacity: 0.5 });
    const frame = new THREE.LineSegments(frameGeo, frameMat);
    frame.position.set(x, 0.01, z);
    frame.rotation.x = -Math.PI / 2;
    this.uiGroup.add(frame);
  }

  private switches: Array<{ mesh: THREE.Mesh, paramIndex: number, value: number }> = [];

  private syncSwitches() {
    this.switches.forEach(s => {
      s.value = this.host.paramArray[s.paramIndex];
      (s.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = s.value > 0.5 ? 2.0 : 0;
    });
  }

  private createSwitch(label: string, x: number, z: number, paramIndex: number, scale: number = 1.0): THREE.Group {
    const group = new THREE.Group();
    const switchBaseGeo = new THREE.BoxGeometry(1 * scale, 0.2 * scale, 1.5 * scale);
    const switchBaseMat = new THREE.MeshPhysicalMaterial({ 
      color: 0x111111,
      roughness: 0.2,
      metalness: 0.8
    });
    const switchBase = new THREE.Mesh(switchBaseGeo, switchBaseMat);
    group.add(switchBase);

    const switchGeo = new THREE.BoxGeometry(0.6 * scale, 0.4 * scale, 0.6 * scale);
    const switchMat = new THREE.MeshPhysicalMaterial({ 
      color: 0x333333, 
      emissive: 0x00ff88, 
      emissiveIntensity: 0,
      roughness: 0.1,
      metalness: 0.9
    });
    const sw = new THREE.Mesh(switchGeo, switchMat);
    sw.position.set(0, 0.3 * scale, 0);
    group.add(sw);
    this.createLabel(label, x, 0.01, z + 1.1 * scale, 20 * scale);
    
    group.position.set(x, 0, z);
    this.switches.push({ mesh: sw, paramIndex, value: 0 });
    return group;
  }

  private buildUI() {
    // Main Chassis
    const panelGeo = new THREE.BoxGeometry(24, 0.8, 20);
    const panelTexture = this.textureManager.createPanelTexture();
    const panelMat = new THREE.MeshPhysicalMaterial({ 
      map: panelTexture,
      roughness: 0.3, 
      metalness: 0.7,
      clearcoat: 0.1
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.set(0, -0.4, 1.5); // Shifted to center the controls
    this.uiGroup.add(panel);
    this.panelMesh = panel;

    // Wood Side Panels
    const sidePanelGeo = new THREE.BoxGeometry(0.6, 1.2, 20.2);
    const woodTexture = this.textureManager.createWoodTexture();
    const woodMat = new THREE.MeshPhysicalMaterial({
      map: woodTexture,
      roughness: 0.6,
      metalness: 0.1
    });
    
    const leftPanel = new THREE.Mesh(sidePanelGeo, woodMat);
    leftPanel.position.set(-12.3, -0.2, 1.5);
    this.uiGroup.add(leftPanel);
    
    const rightPanel = new THREE.Mesh(sidePanelGeo, woodMat);
    rightPanel.position.set(12.3, -0.2, 1.5);
    this.uiGroup.add(rightPanel);

    // Sections - Rearranged
    this.createSectionBox(-9.5, -2, 5, 6, "OSC", "osc");
    this.createSectionBox(-5, -2, 4, 6, "FILTER", "filter");
    this.createSectionBox(-1, -2, 4, 6, "AMP ENV", "amp");
    this.createSectionBox(3, -2, 4, 6, "LFO");
    this.createSectionBox(7, -2, 4, 6, "FX", "fx");
    this.createSectionBox(10.5, -2, 3, 6, "MASTER");

    this.createSectionBox(-8.5, 3.5, 5, 4, "MOD MATRIX");
    this.createSectionBox(-4, 3.5, 4, 4, "DISTORTION");
    this.createSectionBox(0.5, 3.5, 5, 4, "WAVETABLE");
    this.createSectionBox(5.5, 3.5, 5, 4, "FILTER ENV");
    this.createSectionBox(10, 3.5, 4, 4, "EQ");

    // Sequencer Background with Carbon Fiber
    const seqBgGeo = new THREE.PlaneGeometry(22, 4);
    const carbonTexture = this.textureManager.createCarbonFiberTexture();
    const seqBgMat = new THREE.MeshPhysicalMaterial({
      map: carbonTexture,
      roughness: 0.4,
      metalness: 0.6
    });
    const seqBg = new THREE.Mesh(seqBgGeo, seqBgMat);
    seqBg.position.set(0, 0.01, 8.5);
    seqBg.rotation.x = -Math.PI / 2;
    this.uiGroup.add(seqBg);
    
    this.createSectionBox(0, 8.5, 16, 3, "SEQUENCER", "seq");
    // Removed redundant FILTER ENV box call here as it's moved up

    // // CRT Oscilloscope
    // const scopeGeo = new THREE.PlaneGeometry(3, 1.5);
    // const scopeMat = new THREE.MeshBasicMaterial({ map: this.scopeTexture });
    // this.scopeMesh = new THREE.Mesh(scopeGeo, scopeMat);
    // this.scopeMesh.position.set(-9, 0.01, -7);
    // this.scopeMesh.rotation.x = -Math.PI / 2;
    // this.uiGroup.add(this.scopeMesh);
    // this.createLabel("OSCILLOSCOPE", -9, 0.01, -8, 24, "#00ff88");

    // LCD Display
    const lcdGeo = new THREE.PlaneGeometry(4, 1);
    const lcdMat = new THREE.MeshBasicMaterial({ map: this.lcdTexture });
    this.lcdMesh = new THREE.Mesh(lcdGeo, lcdMat);
    this.lcdMesh.position.set(-4, 0.01, -7);
    this.lcdMesh.rotation.x = -Math.PI / 2;
    this.uiGroup.add(this.lcdMesh);
    this.updateLCD("SYSTEM READY", "WAM-2.0 CORE");

    // Wavetable Display Window
    const wtDispGeo = new THREE.PlaneGeometry(3, 1.2);
    const wtDispMat = new THREE.MeshBasicMaterial({ map: this.wtTexture });
    this.wtMesh = new THREE.Mesh(wtDispGeo, wtDispMat);
    this.wtMesh.position.set(0.5, 0.01, 2.8);
    this.wtMesh.rotation.x = -Math.PI / 2;
    this.uiGroup.add(this.wtMesh);
    // this.createLabel("WAVETABLE", 0.5, 0.01, 1.8, 24, "#00ff88");

    // LFO Visualizer
    const lfoGeo = new THREE.PlaneGeometry(3, 1.5);
    const lfoMat = new THREE.MeshBasicMaterial({ map: this.lfoTexture });
    this.lfoMesh = new THREE.Mesh(lfoGeo, lfoMat);
    this.lfoMesh.position.set(9, 0.01, -7);
    this.lfoMesh.rotation.x = -Math.PI / 2;
    this.uiGroup.add(this.lfoMesh);
    this.createLabel("LFO MODULATION", 9, 0.01, -8, 24, "#ff0088");

    // Sequencer Matrix Display
    const seqMatrixGeo = new THREE.PlaneGeometry(16, 1.8);
    const seqMatrixMat = new THREE.MeshBasicMaterial({ map: this.seqMatrixTexture, transparent: true, opacity: 0.9 });
    this.seqMatrixMesh = new THREE.Mesh(seqMatrixGeo, seqMatrixMat);
    this.seqMatrixMesh.position.set(0, 0.02, 8.5);
    this.seqMatrixMesh.rotation.x = -Math.PI / 2;
    this.uiGroup.add(this.seqMatrixMesh);

    // ADSR Graph
    const adsrGeo = new THREE.PlaneGeometry(3, 1.5);
    const adsrMat = new THREE.MeshBasicMaterial({ map: this.adsrTexture });
    this.adsrMesh = new THREE.Mesh(adsrGeo, adsrMat);
    this.adsrMesh.position.set(5, 0.01, -7);
    this.adsrMesh.rotation.x = -Math.PI / 2;
    this.uiGroup.add(this.adsrMesh);
    this.createLabel("AMP ENVELOPE", 5, 0.01, -8, 24, "#00ff88");

    // Filter Graph
    const filterGraphGeo = new THREE.PlaneGeometry(3, 1.5);
    const filterGraphMat = new THREE.MeshBasicMaterial({ map: this.filterGraphTexture });
    this.filterGraphMesh = new THREE.Mesh(filterGraphGeo, filterGraphMat);
    this.filterGraphMesh.position.set(1, 0.01, -7);
    this.filterGraphMesh.rotation.x = -Math.PI / 2;
    this.uiGroup.add(this.filterGraphMesh);
    this.createLabel("FILTER RESPONSE", 1, 0.01, -8, 24, "#00ff88");

    // Modulation Matrix
    const modMatrixGeo = new THREE.PlaneGeometry(4.5, 3.5);
    const modMatrixMat = new THREE.MeshBasicMaterial({ map: this.modMatrixTexture, transparent: true });
    this.modMatrixMesh = new THREE.Mesh(modMatrixGeo, modMatrixMat);
    this.modMatrixMesh.position.set(-8.5, 0.01, 3.7);
    this.modMatrixMesh.rotation.x = -Math.PI / 2;
    this.uiGroup.add(this.modMatrixMesh);
    // this.createLabel("MOD MATRIX", -8.5, 0.01, 1.9, 24, "#00ff88");

    const knobCapTexture = this.textureManager.createKnobCapTexture();
    const knobMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a1a,
      roughness: 0.2,
      metalness: 0.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      emissive: 0x00ff88,
      emissiveIntensity: 0.05,
      map: knobCapTexture
    });

    const geo = new THREE.CylinderGeometry(0.4, 0.45, 0.6, 64);
    const notchGeo = new THREE.BoxGeometry(0.06, 0.62, 0.3);
    notchGeo.translate(0, 0, 0.2);
    const notchMat = new THREE.MeshStandardMaterial({ 
      color: 0x00ff88,
      emissive: 0x00ff88,
      emissiveIntensity: 2.0
    });
    
    const knobConfigs = [
      // OSC (3 columns x 4 rows to fit in box)
      { name: 'FM', param: PARAMETERS.OSC_FM_AMT, min: 0, max: 1, value: 0, x: -11, z: -4, scale: 0.6 },
      { name: 'W1', param: PARAMETERS.OSC1_WAVE, min: 0, max: 3, value: 0, x: -9.5, z: -4 },
      { name: 'M1', param: PARAMETERS.OSC1_MIX, min: 0, max: 1, value: 0.7, x: -8, z: -4, hasRing: true },
      
      { name: 'W2', param: PARAMETERS.OSC2_WAVE, min: 0, max: 3, value: 1, x: -11, z: -3 },
      { name: 'M2', param: PARAMETERS.OSC2_MIX, min: 0, max: 1, value: 0.7, x: -9.5, z: -3, hasRing: true },
      { name: 'DET', param: PARAMETERS.OSC2_DETUNE, min: -24, max: 24, value: 0, x: -8, z: -3 },
      
      { name: 'UNI', param: PARAMETERS.UNISON_DETUNE, min: 0, max: 1, value: 0, x: -11, z: -2 },
      { name: 'SUB', param: PARAMETERS.SUB_OSC_MIX, min: 0, max: 1, value: 0, x: -9.5, z: -2 },
      { name: 'S WAV', param: PARAMETERS.SUB_OSC_WAVE, min: 0, max: 3, value: 0, x: -8, z: -2 },
      
      { name: 'NOISE', param: PARAMETERS.NOISE_MIX, min: 0, max: 1, value: 0, x: -11, z: -1 },
      { name: 'DPW', param: PARAMETERS.DPW_MIX, min: 0, max: 1, value: 0, x: -9.5, z: -1 },
      { name: 'DPW D', param: PARAMETERS.DPW_DETUNE, min: -24, max: 24, value: 0, x: -8, z: -1 },
      
      // FILTER
      { name: 'CUT', param: PARAMETERS.FILTER_CUTOFF, min: 20, max: 20000, value: 1200, x: -6, z: -3.5, modParam: PARAMETERS.FILTER_LFO_AMT },
      { name: 'RES', param: PARAMETERS.FILTER_RES, min: 0, max: 0.99, value: 0.2, x: -4, z: -3.5 },
      { name: 'ENV', param: PARAMETERS.FILTER_ENV_DEPTH, min: 0, max: 10000, value: 2000, x: -6, z: -1.5 },
      { name: 'LFO', param: PARAMETERS.FILTER_LFO_AMT, min: 0, max: 5000, value: 0, x: -4, z: -1.5 },

      // FILTER ENV (Now in lower section)
      { name: 'FA', param: PARAMETERS.FILTER_ATTACK, min: 0.01, max: 5, value: 0.01, x: 4, z: 3 },
      { name: 'FD', param: PARAMETERS.FILTER_DECAY, min: 0.01, max: 5, value: 0.3, x: 7, z: 3 },
      { name: 'FS', param: PARAMETERS.FILTER_SUSTAIN, min: 0, max: 1, value: 0.4, x: 4, z: 4.5 },
      { name: 'FR', param: PARAMETERS.FILTER_RELEASE, min: 0.01, max: 5, value: 0.5, x: 7, z: 4.5 },
      
      // AMP ENV
      { name: 'A', param: PARAMETERS.ENV_ATTACK, min: 0.01, max: 5, value: 0.05, x: -2, z: -3.5 },
      { name: 'D', param: PARAMETERS.ENV_DECAY, min: 0.01, max: 5, value: 0.3, x: 0, z: -3.5 },
      { name: 'S', param: PARAMETERS.ENV_SUSTAIN, min: 0, max: 1, value: 0.5, x: -2, z: -1.5 },
      { name: 'R', param: PARAMETERS.ENV_RELEASE, min: 0.01, max: 5, value: 0.6, x: 0, z: -1.5 },
      
      // LFOs
      { name: 'L1 RATE', param: PARAMETERS.LFO_RATE, min: 0.1, max: 20, value: 2.0, x: 2, z: -3.5 },
      { name: 'L2 RATE', param: PARAMETERS.LFO2_RATE, min: 0.1, max: 20, value: 1.0, x: 4, z: -3.5 },
      { name: 'L2 AMT', param: PARAMETERS.LFO2_AMT, min: 0, max: 1, value: 0, x: 3, z: -1.5 },
      
      // FX
      { name: 'D TIME', param: PARAMETERS.DELAY_TIME, min: 0.01, max: 1, value: 0.3, x: 6, z: -3.5, scale: 0.7 },
      { name: 'D FDBK', param: PARAMETERS.DELAY_FEEDBACK, min: 0, max: 0.95, value: 0.4, x: 8, z: -3.5, scale: 0.7 },
      { name: 'D MIX', param: PARAMETERS.DELAY_MIX, min: 0, max: 1, value: 0.3, x: 6, z: -1.5, scale: 0.7 },
      { name: 'D WID', param: PARAMETERS.DELAY_WIDTH, min: 0, max: 1, value: 1.0, x: 8, z: -1.5, scale: 0.7 },

      { name: 'R DEC', param: PARAMETERS.REVERB_DECAY, min: 0.1, max: 0.99, value: 0.8, x: 6, z: 0.5, scale: 0.7 },
      { name: 'R MIX', param: PARAMETERS.REVERB_MIX, min: 0, max: 1, value: 0.2, x: 8, z: 0.5, scale: 0.7 },
      { name: 'R DMP', param: PARAMETERS.REVERB_DAMP, min: 0, max: 1, value: 0.2, x: 7, z: 0.5, scale: 0.7 },

      // LOW SHELF
      { name: 'LS FREQ', param: PARAMETERS.LOW_SHELF_FREQ, min: 20, max: 1000, value: 200, x: 9, z: 3.5, scale: 0.7 },
      { name: 'LS GAIN', param: PARAMETERS.LOW_SHELF_GAIN, min: -24, max: 24, value: 0, x: 11, z: 3.5, scale: 0.7 },

      // TUBE SCREAMER
      { name: 'TS DRV', param: PARAMETERS.TS_DRIVE, min: 0, max: 1, value: 0.5, x: -5, z: 3, scale: 0.7 },
      { name: 'TS TON', param: PARAMETERS.TS_TONE, min: 0, max: 1, value: 0.5, x: -3, z: 3, scale: 0.7 },
      { name: 'TS LVL', param: PARAMETERS.TS_LEVEL, min: 0, max: 1, value: 0.5, x: -5, z: 4.5, scale: 0.7 },
      { name: 'TS MIX', param: PARAMETERS.TS_MIX, min: 0, max: 1, value: 0, x: -3, z: 4.5, scale: 0.7 },

      // WAVETABLE
      { name: 'MIX', param: PARAMETERS.WT_MIX, min: 0, max: 1, value: 0.5, x: -1, z: 4.6, scale: 0.6 },
      { name: 'POS', param: PARAMETERS.WT_POS, min: 0, max: 1, value: 0, x: 0, z: 4.6, scale: 0.6, modParam: PARAMETERS.WT_LFO_AMT },
      { name: 'DET', param: PARAMETERS.WT_DETUNE, min: -24, max: 24, value: 0, x: 1, z: 4.6, scale: 0.6 },
      { name: 'LFO', param: PARAMETERS.WT_LFO_AMT, min: 0, max: 1, value: 0.2, x: 2, z: 4.6, scale: 0.6 },

      { name: 'S1', param: PARAMETERS.SEQ_STEP_0, min: -12, max: 12, value: 0, x: -7, z: 10.0, scale: 0.6 },
      { name: 'S2', param: PARAMETERS.SEQ_STEP_1, min: -12, max: 12, value: 3, x: -6, z: 10.0, scale: 0.6 },
      { name: 'S3', param: PARAMETERS.SEQ_STEP_2, min: -12, max: 12, value: 7, x: -5, z: 10.0, scale: 0.6 },
      { name: 'S4', param: PARAMETERS.SEQ_STEP_3, min: -12, max: 12, value: 10, x: -4, z: 10.0, scale: 0.6 },
      { name: 'S5', param: PARAMETERS.SEQ_STEP_4, min: -12, max: 12, value: 0, x: -3, z: 10.0, scale: 0.6 },
      { name: 'S6', param: PARAMETERS.SEQ_STEP_5, min: -12, max: 12, value: 0, x: -2, z: 10.0, scale: 0.6 },
      { name: 'S7', param: PARAMETERS.SEQ_STEP_6, min: -12, max: 12, value: 0, x: -1, z: 10.0, scale: 0.6 },
      { name: 'S8', param: PARAMETERS.SEQ_STEP_7, min: -12, max: 12, value: 0, x: 0, z: 10.0, scale: 0.6 },
      { name: 'S9', param: PARAMETERS.SEQ_STEP_8, min: -12, max: 12, value: 0, x: 1, z: 10.0, scale: 0.6 },
      { name: 'S10', param: PARAMETERS.SEQ_STEP_9, min: -12, max: 12, value: 0, x: 2, z: 10.0, scale: 0.6 },
      { name: 'S11', param: PARAMETERS.SEQ_STEP_10, min: -12, max: 12, value: 0, x: 3, z: 10.0, scale: 0.6 },
      { name: 'S12', param: PARAMETERS.SEQ_STEP_11, min: -12, max: 12, value: 0, x: 4, z: 10.0, scale: 0.6 },
      { name: 'S13', param: PARAMETERS.SEQ_STEP_12, min: -12, max: 12, value: 0, x: 5, z: 10.0, scale: 0.6 },
      { name: 'S14', param: PARAMETERS.SEQ_STEP_13, min: -12, max: 12, value: 0, x: 6, z: 10.0, scale: 0.6 },
      { name: 'S15', param: PARAMETERS.SEQ_STEP_14, min: -12, max: 12, value: 0, x: 7, z: 10.0, scale: 0.6 },
      { name: 'S16', param: PARAMETERS.SEQ_STEP_15, min: -12, max: 12, value: 0, x: 8, z: 10.0, scale: 0.6 },
      
      { name: 'TEMPO', param: PARAMETERS.SEQ_TEMPO, min: 40, max: 240, value: 120, x: -9, z: 10.0, scale: 0.6 },

      // EXPERIMENTAL
      { name: 'CHAOS', param: PARAMETERS.CHAOS_AMT, min: 0, max: 1, value: 0, x: -10.5, z: 8.5, scale: 0.6 },
      
      { name: 'L1 MORPH', param: PARAMETERS.LFO1_MORPH, min: 0, max: 4, value: 0, x: 2, z: -1.5, scale: 0.6 },
      { name: 'L1 FADE', param: PARAMETERS.LFO1_FADE, min: 0, max: 5, value: 0, x: 2, z: 0.5, scale: 0.6 },
      { name: 'L2 MORPH', param: PARAMETERS.LFO2_MORPH, min: 0, max: 4, value: 0, x: 4, z: -1.5, scale: 0.6 },
      { name: 'L2 FADE', param: PARAMETERS.LFO2_FADE, min: 0, max: 5, value: 0, x: 4, z: 0.5, scale: 0.6 },

      // MASTER
      { name: 'VOL', param: PARAMETERS.MASTER_VOL, min: 0, max: 1, value: 0.7, x: 10.5, z: -3.5, hasRing: true },
    ];

    // SEQ LEDs
    const ledGeo = new THREE.SphereGeometry(0.08, 16, 16);
    const ledMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0 });
    for (let i = 0; i < 16; i++) {
      const led = new THREE.Mesh(ledGeo, ledMat.clone());
      const x = -7 + i * 1.0;
      led.position.set(x, 0.1, 8.0);
      this.uiGroup.add(led);
      this.seqStepLEDs.push(led);
    }

    // SEQ ON Switch (Separate from InstancedMesh for custom look)
    const switchBaseGeo = new THREE.BoxGeometry(0.8, 0.2, 1.2);
    const switchBaseMat = new THREE.MeshPhysicalMaterial({ 
      color: 0x111111,
      roughness: 0.2,
      metalness: 0.8
    });
    const switchBase = new THREE.Mesh(switchBaseGeo, switchBaseMat);
    switchBase.position.set(-9.5, 0, 8.5);
    this.uiGroup.add(switchBase);

    const switchGeo = new THREE.BoxGeometry(0.5, 0.4, 0.5);
    const switchMat = new THREE.MeshPhysicalMaterial({ 
      color: 0x333333, 
      emissive: 0x00ff88, 
      emissiveIntensity: 0,
      roughness: 0.1,
      metalness: 0.9
    });
    this.seqSwitch = new THREE.Mesh(switchGeo, switchMat);
    this.seqSwitch.position.set(-9.5, 0.3, 8.5);
    this.uiGroup.add(this.seqSwitch);
    this.createLabel("SEQ ON", -9.5, 0.01, 9.4, 16);

    // SEQ Random Button
    const randBtnGeo = new THREE.CylinderGeometry(0.25, 0.25, 0.2, 32);
    const randBtnMat = new THREE.MeshPhysicalMaterial({
      color: 0xff8800,
      emissive: 0xff8800,
      emissiveIntensity: 0.5,
      roughness: 0.2,
      metalness: 0.8
    });
    this.seqRandomButton = new THREE.Mesh(randBtnGeo, randBtnMat);
    this.seqRandomButton.position.set(-9.5, 0.1, 7.5);
    this.uiGroup.add(this.seqRandomButton);
    this.createLabel("RAND", -9.5, 0.01, 7.8, 14, "#ff8800");

    // Removed OSC1 Wave Switch - now a knob

    // LFO Sync Switch
    const lfoSyncSwitch = this.createSwitch("LFO SYNC", 3, -3.8, PARAMETERS.LFO_SYNC_ENABLE);
    this.uiGroup.add(lfoSyncSwitch);

    // Low Shelf Switch
    const lsSwitch = this.createSwitch("LS ON", 10.4, 3.0, PARAMETERS.LOW_SHELF_ENABLE, 0.6);
    this.uiGroup.add(lsSwitch);

    // FX Routing Switches
    const fxOsc1Switch = this.createSwitch("FX OSC1", 7.2, -2.5, PARAMETERS.FX_SRC_OSC1, 0.6);
    this.uiGroup.add(fxOsc1Switch);
    const fxOsc2Switch = this.createSwitch("FX OSC2", 7.2, -0.8, PARAMETERS.FX_SRC_OSC2, 0.6);
    this.uiGroup.add(fxOsc2Switch);
    const fxWTSwitch = this.createSwitch("FX WT", 7.2, 0.9, PARAMETERS.FX_SRC_WT, 0.6);
    this.uiGroup.add(fxWTSwitch);
    const fxEnvSwitch = this.createSwitch("FX ENV", 7.2, 2.6, PARAMETERS.FX_ENV_FOLLOW, 0.6);
    this.uiGroup.add(fxEnvSwitch);

    // Sync Switch
    const syncSwitch = this.createSwitch("SYNC", -10.8, 0.5, PARAMETERS.OSC_SYNC_ENABLE, 0.6);
    this.uiGroup.add(syncSwitch);

    this.syncSwitches();

    this.knobCount = knobConfigs.length;

    for (let i = 0; i < this.knobCount; i++) {
      const config = knobConfigs[i];
      
      this.knobData.push({ 
        name: config.name,
        paramIndex: config.param, 
        min: config.min, 
        max: config.max, 
        value: config.value, 
        targetValue: config.value,
        x: config.x, 
        z: config.z,
        scale: (config as any).scale || 1.0,
        modParam: (config as any).modParam
      });
      
      const knobGroup = this.createKnob(config, i, knobMat, notchMat);
      knobGroup.position.set(config.x, 0, config.z);
      this.uiGroup.add(knobGroup);
      
      this.updateKnobInstance(i);
      const labelSize = (config as any).scale ? 12 : 16;
      const labelOffset = (config as any).scale ? 0.7 : 1.1;
      this.createLabel(config.name, config.x, 0.01, config.z + labelOffset, labelSize);
    }
  }

  private createKnob(config: any, index: number, knobMat: THREE.Material, notchMat: THREE.Material): THREE.Group {
    const group = new THREE.Group();
    const section = this.getSection(index);
    const color = this.getSectionColor(section);

    // Solid Knob Geometry
    const points = [];
    points.push(new THREE.Vector2(0, 0)); // Bottom center
    points.push(new THREE.Vector2(0.35, 0)); // Bottom outer
    points.push(new THREE.Vector2(0.35, 0.45)); // Side
    points.push(new THREE.Vector2(0.28, 0.6)); // Bevel
    points.push(new THREE.Vector2(0, 0.6)); // Top center
    const geo = new THREE.LatheGeometry(points, 32);
    
    // Use the passed knobMat but clone it to set section-specific emissive color
    const mat = (knobMat as THREE.MeshPhysicalMaterial).clone();
    mat.emissive.setHex(color);
    mat.emissiveIntensity = 0.1;
    
    const knob = new THREE.Mesh(geo, mat);
    knob.position.y = 0.3;
    knob.userData.knobIndex = index;
    group.add(knob);
    this.knobData[index].knobMesh = knob;
    this.knobMeshes.push(knob);

    // Add indicator notch
    const notchGeo = new THREE.BoxGeometry(0.08, 0.7, 0.15);
    notchGeo.translate(0, 0, 0.28);
    const notch = new THREE.Mesh(notchGeo, notchMat);
    const s = (config as any).scale || 1.0;
    notch.scale.set(s, s, s);
    notch.position.set(0, 0.7, 0); 
    notch.userData.knobIndex = index;
    group.add(notch);
    this.knobData[index].notchMesh = notch;
    this.knobMeshes.push(notch);

    // Add ring indicator
    if ((config as any).hasRing) {
      const ringGeo = new THREE.BufferGeometry();
      const ringMat = new THREE.LineBasicMaterial({ color: 0x00ff88, transparent: true, opacity: 0.5 });
      const ring = new THREE.Line(ringGeo, ringMat);
      ring.rotation.x = Math.PI / 2;
      ring.position.set(0, 0.1, 0); // Relative to group
      group.add(ring);
      this.knobData[index].ringMesh = ring;
    }

    return group;
  }

  private getSection(index: number): string {
    if (index < 9) return 'OSC';
    if (index < 11) return 'OSC'; // DPW is also OSC
    if (index < 15) return 'FILTER';
    if (index < 19) return 'FILTER_ENV';
    if (index < 23) return 'AMP_ENV';
    if (index < 26) return 'LFO';
    if (index < 33) return 'FX';
    if (index < 35) return 'EQ';
    if (index < 39) return 'DIST';
    if (index < 43) return 'WT';
    if (index < 44) return 'SEQ';
    return 'MASTER';
  }

  private getSectionColor(section: string): number {
    switch (section) {
      case 'OSC': return 0x0088ff;
      case 'FILTER': return 0xff8800;
      case 'FILTER_ENV': return 0x00ff88;
      case 'AMP_ENV': return 0x00ff88;
      case 'LFO': return 0xff0088;
      case 'FX': return 0x8800ff;
      case 'EQ': return 0x00ffff;
      case 'DIST': return 0xff0000;
      case 'WT': return 0xffff00;
      case 'MASTER': return 0xffffff;
      default: return 0xaaaaaa;
    }
  }

  private updateKnobInstance(index: number) {
    const data = this.knobData[index];
    const normalized = (data.value - data.min) / (data.max - data.min);
    // Map 0 to 12 o'clock (Math.PI) and increase clockwise over 300 degrees
    const angle = Math.PI + (normalized * 300) * (Math.PI / 180);

    if (data.knobMesh) {
      data.knobMesh.rotation.y = -angle;
      const s = data.scale || 1.0;
      data.knobMesh.scale.set(s, s, s);
    }

    if (data.notchMesh) {
      data.notchMesh.rotation.y = -angle;
      
      // Dynamic glow based on activity
      const isActive = this.activeInstanceId === index;
      let targetEmissive = isActive ? 4.0 : 1.5;
      
      // Pulse if modulated
      if (data.modParam !== undefined) {
        const modAmt = this.host.paramArray[data.modParam];
        if (modAmt > 0) {
          // Use real-time LFO value from DSP
          const pulse = (this.lfo1Val * 0.5 + 0.5);
          targetEmissive += pulse * 3.0 * modAmt;
        }
      }

      const mat = data.notchMesh.material as THREE.MeshStandardMaterial;
      mat.emissiveIntensity += (targetEmissive - mat.emissiveIntensity) * 0.2;
      
      // Subtle scale up when active
      const s = data.scale || 1.0;
      const targetScale = isActive ? s * 1.1 : s;
      data.notchMesh.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2);
    }

    if (data.ringMesh) {
      const normalized = (data.value - data.min) / (data.max - data.min);
      const points = [];
      const segments = 64;
      for (let i = 0; i <= segments * normalized; i++) {
        const angle = Math.PI / 2 - (i / segments) * 2 * Math.PI;
        points.push(new THREE.Vector3(Math.cos(angle) * 0.42, Math.sin(angle) * 0.42, 0));
      }
      (data.ringMesh as THREE.Line).geometry.setFromPoints(points);
    }
  }

  private bindEvents() {
    this.container.addEventListener('pointerdown', this.onPointerDown.bind(this));
    window.addEventListener('pointermove', this.onPointerMove.bind(this));
    window.addEventListener('pointerup', this.onPointerUp.bind(this));
    window.addEventListener('resize', this.onResize.bind(this));
  }

  private onPointerDown(event: PointerEvent) {
    event.preventDefault();
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;

    this.raycaster.setFromCamera(this.pointer, this.camera);
    
    // 1. Check for section title intersection (Camera Focus)
    const titleMeshes = this.sectionTitles.map(t => t.mesh).filter(m => m !== undefined);
    const titleIntersects = this.raycaster.intersectObjects(titleMeshes);
    if (titleIntersects.length > 0) {
      const titleData = this.sectionTitles.find(t => t.mesh === titleIntersects[0].object);
      if (titleData) {
        this.setCameraView(titleData.view as any);
        return;
      }
    }

    // 2. Check for interactive UI elements (Matrix, Switches, Knobs)
    
    // Sequencer Matrix
    const seqMatrixIntersects = this.raycaster.intersectObject(this.seqMatrixMesh);
    if (seqMatrixIntersects.length > 0) {
      this.handleSeqMatrixInteraction(seqMatrixIntersects[0].uv!);
      this.isDraggingSeqMatrix = true;
      return;
    }

    // Modulation Matrix
    const modMatrixIntersects = this.raycaster.intersectObject(this.modMatrixMesh);
    if (modMatrixIntersects.length > 0) {
      this.handleModMatrixInteraction(modMatrixIntersects[0].uv!);
      return;
    }

    // Switches
    const switchIntersects = this.raycaster.intersectObjects(this.switches.map(s => s.mesh));
    if (switchIntersects.length > 0) {
      const swData = this.switches.find(s => s.mesh === switchIntersects[0].object);
      if (swData) {
        swData.value = swData.value > 0.5 ? 0 : 1;
        this.host.setParameter(swData.paramIndex, swData.value);
        (swData.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = swData.value > 0.5 ? 2.0 : 0;
      }
      return;
    }
    
    // Sequencer Switch
    const seqSwitchIntersects = this.raycaster.intersectObject(this.seqSwitch);
    if (seqSwitchIntersects.length > 0) {
      this.seqEnabled = !this.seqEnabled;
      this.host.setParameter(PARAMETERS.SEQ_ENABLE, this.seqEnabled ? 1 : 0);
      if (!this.seqEnabled) {
        this.host.setParameter(PARAMETERS.SEQ_TRANSPOSE, 0);
      }
      return;
    }

    // Sequencer Random Button
    const seqRandIntersects = this.raycaster.intersectObject(this.seqRandomButton);
    if (seqRandIntersects.length > 0) {
      this.host.randomizeSequencer();
      // Visual feedback
      (this.seqRandomButton.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 2.0;
      setTimeout(() => {
        (this.seqRandomButton.material as THREE.MeshPhysicalMaterial).emissiveIntensity = 0.5;
      }, 100);
      return;
    }

    // Knobs
    const knobIntersects = this.raycaster.intersectObjects(this.knobMeshes);
    if (knobIntersects.length > 0) {
      const hitObject = knobIntersects[0].object;
      this.activeInstanceId = hitObject.userData.knobIndex;
      this.previousPointerY = event.clientY;
      document.body.style.cursor = 'ns-resize';
      return;
    }

    // 3. Check for panel background click to reset camera (ONLY if nothing else hit)
    if (this.panelMesh) {
      const panelIntersects = this.raycaster.intersectObject(this.panelMesh);
      if (panelIntersects.length > 0) {
        this.setCameraView('main');
      }
    }
  }

  private isDraggingSeqMatrix: boolean = false;

  private handleSeqMatrixInteraction(uv: THREE.Vector2) {
    const step = Math.floor(uv.x * 16);
    const y = uv.y;
    
    // Top half is Velocity, Bottom half is Gate
    if (y > 0.5) {
      const vel = (y - 0.5) * 2;
      this.host.setParameter(PARAMETERS.SEQ_VEL_0 + step, vel);
    } else {
      const gate = y * 2;
      this.host.setParameter(PARAMETERS.SEQ_GATE_0 + step, gate);
    }
  }

  private handleModMatrixInteraction(uv: THREE.Vector2) {
    const cellSize = 1 / 7;
    const col = Math.floor(uv.x / cellSize);
    const row = Math.floor((1 - uv.y) / cellSize);

    if (col >= 1 && col <= 6 && row >= 1 && row <= 6) {
      const sourceIdx = row - 1;
      const targetIdx = col - 1;
      const paramIdx = this.modParams[sourceIdx][targetIdx];
      
      // Toggle or cycle value
      let currentVal = this.host.paramArray[paramIdx] || 0;
      let newVal = 0;
      if (currentVal === 0) newVal = 0.5;
      else if (currentVal === 0.5) newVal = 1.0;
      else newVal = 0;
      
      this.host.setParameter(paramIdx, newVal);
    }
  }

  private onPointerMove(event: PointerEvent) {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);

    if (this.isDraggingSeqMatrix) {
      const intersects = this.raycaster.intersectObject(this.seqMatrixMesh);
      if (intersects.length > 0) {
        this.handleSeqMatrixInteraction(intersects[0].uv!);
      }
      return;
    }

    const knobIntersects = this.raycaster.intersectObjects(this.knobMeshes);
    const hoveredIndex = knobIntersects.length > 0 ? knobIntersects[0].object.userData.knobIndex : null;

    if (this.activeInstanceId === null) {
      // Hover effect
      this.knobData.forEach((data, i) => {
        const isHovered = hoveredIndex === i;
        if (data.knobMesh) {
          const s = (data.scale || 1.0) * (isHovered ? 1.1 : 1.0);
          data.knobMesh.scale.lerp(new THREE.Vector3(s, s, s), 0.2);
          (data.knobMesh.material as THREE.MeshPhysicalMaterial).emissiveIntensity = isHovered ? 0.2 : 0.05;
        }
      });
      return;
    }

    const deltaY = this.previousPointerY - event.clientY;
    this.previousPointerY = event.clientY;

    const data = this.knobData[this.activeInstanceId];
    const range = data.max - data.min;
    const step = range * 0.005; 
    
    data.targetValue += deltaY * step;
    data.targetValue = Math.max(data.min, Math.min(data.max, data.targetValue));
    
    // Update LCD
    let valStr = data.targetValue.toFixed(2);
    
    // Custom formatting based on parameter type
    if (data.paramIndex === PARAMETERS.FILTER_CUTOFF || data.paramIndex === PARAMETERS.LOW_SHELF_FREQ) {
      valStr = `${Math.round(data.targetValue)} HZ`;
    } else if (data.paramIndex === PARAMETERS.SUB_OSC_WAVE || data.paramIndex === PARAMETERS.OSC1_WAVE || data.paramIndex === PARAMETERS.OSC2_WAVE) {
      const waveIdx = Math.round(data.targetValue);
      const waves = ['PULSE', 'SAW', 'TRI', 'SINE'];
      valStr = waves[waveIdx] || 'PULSE';
    } else if (data.name.includes('RATE')) {
      valStr = `${data.targetValue.toFixed(1)} HZ`;
    } else if (data.name.includes('DET') || data.name.startsWith('S') && data.name.length <= 2) {
      valStr = `${data.targetValue > 0 ? '+' : ''}${Math.round(data.targetValue)} SEMI`;
    } else if (data.paramIndex === PARAMETERS.SEQ_TEMPO) {
      valStr = `${Math.round(data.targetValue)} BPM`;
    } else if (data.max === 1 && data.min === 0) {
      valStr = `${Math.round(data.targetValue * 100)}%`;
    } else if (data.max === 5) {
      valStr = `${data.targetValue.toFixed(2)} SEC`;
    } else if (data.paramIndex === PARAMETERS.LOW_SHELF_GAIN) {
      valStr = `${data.targetValue > 0 ? '+' : ''}${data.targetValue.toFixed(1)} DB`;
    }
    
    this.updateLCD(data.name, valStr);

    // Zero-latency write to Shared Memory
    this.host.setParameter(data.paramIndex, data.targetValue);
  }

  private onPointerUp() {
    this.activeInstanceId = null;
    this.isDraggingSeqMatrix = false;
    document.body.style.cursor = 'default';
  }

  public onResize() {
    if (!this.container) return;
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    if (width === 0 || height === 0) return;

    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }

  public updateSeqStep(step: number) {
    this.currentSeqStep = step;
  }

  public updateLFOs(lfo1: number, lfo2: number) {
    this.lfo1Val = lfo1;
    this.lfo2Val = lfo2;
    
    this.lfoHistory1.push(lfo1);
    if (this.lfoHistory1.length > 100) this.lfoHistory1.shift();
    
    this.lfoHistory2.push(lfo2);
    if (this.lfoHistory2.length > 100) this.lfoHistory2.shift();

    this.drawLFOVisualizer();
  }

  private drawLFOVisualizer() {
    const ctx = this.lfoCtx;
    const w = this.lfoCanvas.width;
    const h = this.lfoCanvas.height;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#ff008822';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < w; i += 32) { ctx.moveTo(i, 0); ctx.lineTo(i, h); }
    for (let i = 0; i < h; i += 32) { ctx.moveTo(0, i); ctx.lineTo(w, i); }
    ctx.stroke();

    // LFO 1 (Cyan/Green)
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < this.lfoHistory1.length; i++) {
      const x = (i / 100) * w;
      const y = (this.lfoHistory1[i] * 0.4 + 0.5) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // LFO 2 (Magenta)
    ctx.strokeStyle = '#ff0088';
    ctx.lineWidth = 2;
    ctx.beginPath();
    for (let i = 0; i < this.lfoHistory2.length; i++) {
      const x = (i / 100) * w;
      const y = (this.lfoHistory2[i] * 0.4 + 0.5) * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    // Current Values (dots)
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(w - 5, (this.lfo1Val * 0.4 + 0.5) * h, 4, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = '#00ff00';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(w - 5, (this.lfo2Val * 0.4 + 0.5) * h, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;

    this.lfoTexture.needsUpdate = true;
  }

  public updateLCD(line1: string, line2: string) {
    this.lcdLine1 = line1;
    this.lcdLine2 = line2;
  }

  private drawLCD() {
    const ctx = this.lcdCtx;
    const w = this.lcdCanvas.width;
    const h = this.lcdCanvas.height;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);
    
    ctx.fillStyle = '#00ff00';
    ctx.font = 'bold 48px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(this.lcdLine1.toUpperCase(), w / 2, 50);
    
    ctx.font = '32px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00ff00aa';
    ctx.fillText(this.lcdLine2.toUpperCase(), w / 2, 90);

    // Bar graph
    const val = parseFloat(this.lcdLine2);
    if (!isNaN(val)) {
      ctx.fillStyle = '#00ff0044';
      ctx.fillRect(w / 4, 105, w / 2, 15);
      ctx.fillStyle = '#00ff00';
      ctx.fillRect(w / 4, 105, (w / 2) * Math.min(1, Math.max(0, val / 100)), 15);
    }

    // LFO Visualizer
    const lfoSize = 40;
    const lfoX = w - lfoSize - 20;
    const lfoY = 20;
    ctx.strokeStyle = '#00ff0022';
    ctx.strokeRect(lfoX, lfoY, lfoSize, lfoSize);
    
    // LFO 1
    ctx.fillStyle = '#00ff00';
    ctx.beginPath();
    ctx.arc(lfoX + lfoSize/2 + this.lfo1Val * (lfoSize/2 - 5), lfoY + lfoSize/3, 4, 0, Math.PI * 2);
    ctx.fill();
    
    // LFO 2
    ctx.fillStyle = '#00ff00';
    ctx.globalAlpha = 0.5;
    ctx.beginPath();
    ctx.arc(lfoX + lfoSize/2 + this.lfo2Val * (lfoSize/2 - 5), lfoY + (lfoSize*2)/3, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.globalAlpha = 1.0;
    ctx.fill();
    
    this.lcdTexture.needsUpdate = true;
  }

  private updateWavetableDisplay() {
    const ctx = this.wtCtx;
    const w = this.wtCanvas.width;
    const h = this.wtCanvas.height;
    
    if (!this.host.paramArray) return;
    
    const wtPos = this.host.paramArray[PARAMETERS.WT_POS];
    const wtLfoAmt = this.host.paramArray[PARAMETERS.WT_LFO_AMT] || 0;
    const readIdx = this.host.paramArray[66] || 0; // Last read index from processor
    const isPlaying = this.host.paramArray[67] > 0.5;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);

    // Draw the current interpolated waveform
    ctx.strokeStyle = '#00ff8844';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(0, h / 2);
    ctx.lineTo(w, h / 2);
    ctx.stroke();

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // We'll approximate the morphing wave for display
    // Sine -> Triangle -> Saw -> Square
    // Only morph with LFO if sound is playing
    const morph = isPlaying ? Math.max(0, Math.min(1, wtPos + this.lfo1Val * wtLfoAmt)) : wtPos;
    for (let i = 0; i < w; i++) {
      const t = i / w;
      const phase = t * Math.PI * 2;
      let val = 0;
      
      if (morph < 0.33) {
        const m = morph / 0.33;
        val = Math.sin(phase) * (1 - m) + (2.0 * Math.abs(2.0 * t - 1.0) - 1.0) * m;
      } else if (morph < 0.66) {
        const m = (morph - 0.33) / 0.33;
        val = (2.0 * Math.abs(2.0 * t - 1.0) - 1.0) * (1 - m) + (2.0 * t - 1.0) * m;
      } else {
        const m = (morph - 0.66) / 0.34;
        val = (2.0 * t - 1.0) * (1 - m) + (t < 0.5 ? 1.0 : -1.0) * m;
      }

      const y = (val * 0.4 + 0.5) * h;
      if (i === 0) ctx.moveTo(i, y);
      else ctx.lineTo(i, y);
    }
    ctx.stroke();

    // Draw read position indicator only if playing
    if (isPlaying) {
      const indicatorX = (readIdx * 2048 % 128) / 127 * w;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(indicatorX, h / 2, 4, 0, Math.PI * 2);
      ctx.fill();
    }

    this.wtTexture.needsUpdate = true;
  }

  private drawSequencerMatrix() {
    const ctx = this.seqMatrixCtx;
    const w = this.seqMatrixCanvas.width;
    const h = this.seqMatrixCanvas.height;

    ctx.clearRect(0, 0, w, h);
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);

    const cols = 16;
    const stepWidth = w / cols;
    
    // Draw grid
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 1;
    for (let i = 0; i <= cols; i++) {
        ctx.beginPath();
        ctx.moveTo(i * stepWidth, 0);
        ctx.lineTo(i * stepWidth, h);
        ctx.stroke();
    }

    for (let i = 0; i < cols; i++) {
      const vel = this.host.paramArray[PARAMETERS.SEQ_VEL_0 + i] ?? 1.0;
      const gate = this.host.paramArray[PARAMETERS.SEQ_GATE_0 + i] ?? 0.5;
      const isCurrent = i === this.currentSeqStep && this.seqEnabled;

      // Draw active step highlight
      if (isCurrent) {
          ctx.fillStyle = '#ffffff22';
          ctx.fillRect(i * stepWidth, 0, stepWidth, h);
      }

      // Draw step (Piano roll style)
      ctx.fillStyle = gate > 0.5 ? '#ff0088' : '#333';
      const barHeight = vel * (h - 10);
      ctx.fillRect(i * stepWidth + 2, h - barHeight - 5, stepWidth - 4, barHeight);
    }

    this.seqMatrixTexture.needsUpdate = true;
  }

  private drawADSRGraph() {
    const ctx = this.adsrCtx;
    const w = this.adsrCanvas.width;
    const h = this.adsrCanvas.height;

    const a = this.host.paramArray[PARAMETERS.ENV_ATTACK];
    const d = this.host.paramArray[PARAMETERS.ENV_DECAY];
    const s = this.host.paramArray[PARAMETERS.ENV_SUSTAIN];
    const r = this.host.paramArray[PARAMETERS.ENV_RELEASE];

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#00ff8844';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < w; i += 32) { ctx.moveTo(i, 0); ctx.lineTo(i, h); }
    for (let i = 0; i < h; i += 32) { ctx.moveTo(0, i); ctx.lineTo(w, i); }
    ctx.stroke();

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.beginPath();
    
    const totalTime = a + d + 1.0 + r; // 1.0 for sustain hold
    const scale = w / totalTime;

    ctx.moveTo(0, h);
    ctx.lineTo(a * scale, 0); // Attack
    ctx.lineTo((a + d) * scale, (1 - s) * h); // Decay
    ctx.lineTo((a + d + 1.0) * scale, (1 - s) * h); // Sustain
    ctx.lineTo((a + d + 1.0 + r) * scale, h); // Release
    ctx.stroke();

    this.adsrTexture.needsUpdate = true;
  }

  private drawFilterGraph() {
    const ctx = this.filterGraphCtx;
    const w = this.filterGraphCanvas.width;
    const h = this.filterGraphCanvas.height;

    const cutoff = this.host.paramArray[PARAMETERS.FILTER_CUTOFF];
    const res = this.host.paramArray[PARAMETERS.FILTER_RES];

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);

    ctx.strokeStyle = '#00ff8822';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < w; i += 32) { ctx.moveTo(i, 0); ctx.lineTo(i, h); }
    for (let i = 0; i < h; i += 32) { ctx.moveTo(0, i); ctx.lineTo(w, i); }
    ctx.stroke();

    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 3;
    ctx.beginPath();

    const cutoffNorm = Math.log2(cutoff / 20) / Math.log2(20000 / 20);
    const peakX = cutoffNorm * w;
    
    ctx.moveTo(0, h * 0.9);
    for (let i = 0; i < w; i++) {
      const x = i;
      const dist = Math.abs(x - peakX);
      const resonance = Math.exp(-dist * 0.05) * res * h * 0.5;
      let y = h * 0.9;
      if (x < peakX) {
        y -= resonance;
      } else {
        const falloff = Math.exp(-(x - peakX) * 0.1);
        y = h * 0.9 - (resonance * falloff);
        y += (1 - falloff) * h * 0.1;
      }
      ctx.lineTo(x, y);
    }
    ctx.stroke();

    this.filterGraphTexture.needsUpdate = true;
  }

  public setCameraView(view: 'main' | 'osc' | 'filter' | 'amp' | 'seq' | 'fx') {
    const targets = {
      main: { pos: [0, 14, 16], look: [0, 0, 0] },
      osc: { pos: [-8, 8, 4], look: [-8, 0, 0] },
      filter: { pos: [-3, 8, 4], look: [-3, 0, 0] },
      amp: { pos: [1, 8, 4], look: [1, 0, 0] },
      seq: { pos: [0, 8, 10], look: [0, 0, 7.5] },
      fx: { pos: [9, 8, 4], look: [9, 0, 0] }
    };

    const target = targets[view];
    // We'll animate these in the animate loop
    this.targetCameraPos.set(target.pos[0], target.pos[1], target.pos[2]);
    this.targetCameraLook.set(target.look[0], target.look[1], target.look[2]);
  }

  private targetCameraPos = new THREE.Vector3(0, 14, 16);
  private targetCameraLook = new THREE.Vector3(0, 0, 0);
  private currentCameraLook = new THREE.Vector3(0, 0, 0);

  private animate = () => {
    requestAnimationFrame(this.animate);
    
    // Camera Animation
    this.camera.position.lerp(this.targetCameraPos, 0.05);
    this.currentCameraLook.lerp(this.targetCameraLook, 0.05);
    this.camera.lookAt(this.currentCameraLook);

    // Update LEDs
    for (let i = 0; i < 8; i++) {
      const led = this.seqStepLEDs[i];
      const mat = led.material as THREE.MeshStandardMaterial;
      const targetIntensity = (i === this.currentSeqStep && this.seqEnabled) ? 5.0 : 0.1;
      mat.emissiveIntensity += (targetIntensity - mat.emissiveIntensity) * 0.3;
      
      const targetScale = (i === this.currentSeqStep && this.seqEnabled) ? 1.5 : 1.0;
      led.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.2);
    }

    // Smoothly animate all knobs towards their target values
    for (let i = 0; i < this.knobCount; i++) {
      const data = this.knobData[i];
      
      // Sync targetValue from host if not actively dragging
      if (this.activeInstanceId !== i) {
        data.targetValue = this.host.paramArray[data.paramIndex];
      }

      const diff = data.targetValue - data.value;
      if (Math.abs(diff) > 0.0001 || this.activeInstanceId === i) {
        data.value += diff * 0.2; // Smooth lerp
        this.updateKnobInstance(i);
      }
    }

    // Sync seqEnabled from host
    this.seqEnabled = this.host.paramArray[PARAMETERS.SEQ_ENABLE] > 0.5;

    // Animate Sequencer Switch
    const targetZ = this.seqEnabled ? 8.5 : 7.9;
    this.seqSwitch.position.z += (targetZ - this.seqSwitch.position.z) * 0.2;
    const mat = this.seqSwitch.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity += ((this.seqEnabled ? 2.0 : 0) - mat.emissiveIntensity) * 0.2;

    // Update Wavetable Display
    this.updateWavetableDisplay();

    // Update LCD Realtime
    this.drawLCD();
    this.drawLFOVisualizer();
    this.drawSequencerMatrix();
    this.drawADSRGraph();
    this.drawFilterGraph();
    this.drawModMatrix();

    this.renderer.render(this.scene, this.camera);
  };

  private drawModMatrix() {
    const ctx = this.modMatrixCtx;
    const w = this.modMatrixCanvas.width;
    const h = this.modMatrixCanvas.height;

    ctx.clearRect(0, 0, w, h);
    
    // Background
    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);

    const cellSize = w / 7;

    // Draw Labels
    ctx.fillStyle = '#ffffffaa';
    ctx.font = 'bold 12px monospace';
    ctx.textAlign = 'center';
    
    // Sources (Y axis)
    for (let i = 0; i < 6; i++) {
      ctx.fillText(this.modSources[i], cellSize / 2, (i + 1) * cellSize + cellSize / 2 + 5);
    }
    
    // Targets (X axis)
    for (let j = 0; j < 6; j++) {
      ctx.fillText(this.modTargets[j], (j + 1) * cellSize + cellSize / 2, cellSize / 2 + 5);
    }

    // Draw Grid and Connections
    for (let i = 0; i < 6; i++) {
      for (let j = 0; j < 6; j++) {
        const x = (j + 1) * cellSize;
        const y = (i + 1) * cellSize;
        const paramIdx = this.modParams[i][j];
        const val = this.host.paramArray[paramIdx] || 0;

        // Cell background
        ctx.fillStyle = '#111';
        ctx.fillRect(x + 2, y + 2, cellSize - 4, cellSize - 4);

        if (val > 0) {
          // Active connection
          ctx.fillStyle = '#00ff88';
          const r = (cellSize - 10) * val * 0.5;
          ctx.beginPath();
          ctx.arc(x + cellSize / 2, y + cellSize / 2, Math.max(2, r), 0, Math.PI * 2);
          ctx.fill();
          
          // Glow
          ctx.shadowBlur = 10;
          ctx.shadowColor = '#00ff88';
          ctx.stroke();
          ctx.shadowBlur = 0;
        }

        // Border
        ctx.strokeStyle = '#333';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, cellSize, cellSize);
      }
    }

    this.modMatrixTexture.needsUpdate = true;
  }

  public dispose() {
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}