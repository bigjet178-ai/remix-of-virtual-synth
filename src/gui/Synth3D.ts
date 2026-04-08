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

  private raycaster: THREE.Raycaster;
  private pointer: THREE.Vector2;
  private previousPointerY: number = 0;

  private knobCount = 0;
  private activeInstanceId: number | null = null;
  private knobMeshes: THREE.Mesh[] = [];
  private dummy = new THREE.Object3D();
  private seqSwitch!: THREE.Mesh;
  private seqEnabled: boolean = false;
  private seqStepLEDs: THREE.Mesh[] = [];
  private currentSeqStep: number = -1;
  private scopeCanvas: HTMLCanvasElement;
  private scopeCtx: CanvasRenderingContext2D;
  private scopeTexture: THREE.CanvasTexture;
  private scopeMesh!: THREE.Mesh;
  private lcdCanvas: HTMLCanvasElement;
  private lcdCtx: CanvasRenderingContext2D;
  private lcdTexture: THREE.CanvasTexture;
  private lcdMesh!: THREE.Mesh;
  private wtCanvas: HTMLCanvasElement;
  private wtCtx: CanvasRenderingContext2D;
  private wtTexture: THREE.CanvasTexture;
  private wtMesh!: THREE.Mesh;
  private stochCanvas!: HTMLCanvasElement;
  private stochCtx!: CanvasRenderingContext2D;
  private stochTexture!: THREE.CanvasTexture;
  private stochMesh!: THREE.Mesh;
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
    this.scene.background = new THREE.Color(0x0a0a0a);

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
    this.scopeCanvas = document.createElement('canvas');
    this.scopeCanvas.width = 256;
    this.scopeCanvas.height = 128;
    this.scopeCtx = this.scopeCanvas.getContext('2d')!;
    this.scopeTexture = new THREE.CanvasTexture(this.scopeCanvas);

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

    // Stochastic Setup
    this.stochCanvas = document.createElement('canvas');
    this.stochCanvas.width = 256;
    this.stochCanvas.height = 128;
    this.stochCtx = this.stochCanvas.getContext('2d')!;
    this.stochTexture = new THREE.CanvasTexture(this.stochCanvas);

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
    this.scene.add(knobLight);

    try {
      const hdriUrl = 'https://raw.githubusercontent.com/mrdoob/three.js/r128/examples/textures/equirectangular/royal_esplanade_1k.hdr';
      const envMap = await this.textureManager.loadHDRI(hdriUrl, this.renderer);
      this.scene.environment = envMap;
      this.scene.environmentIntensity = 0.5;
    } catch (e) {
      console.warn("HDRI failed to load, using fallback lighting.");
    }
  }

  private createLabel(text: string, x: number, y: number, z: number, size: number = 36, color: string = '#aaaaaa') {
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
    this.scene.add(mesh);
  }

  private createSectionBox(x: number, z: number, width: number, height: number, title: string) {
    // Title
    this.createLabel(title, x, 0.02, z - height / 2 + 0.4, 42, '#00ff88');
  }

  private switches: Array<{ mesh: THREE.Mesh, paramIndex: number, value: number }> = [];

  private syncSwitches() {
    this.switches.forEach(s => {
      s.value = this.host.paramArray[s.paramIndex];
      (s.mesh.material as THREE.MeshStandardMaterial).emissiveIntensity = s.value > 0.5 ? 2.0 : 0;
    });
  }

  private createSwitch(label: string, x: number, z: number, paramIndex: number): THREE.Group {
    const group = new THREE.Group();
    const switchBaseGeo = new THREE.BoxGeometry(1, 0.2, 1.5);
    const switchBaseMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const switchBase = new THREE.Mesh(switchBaseGeo, switchBaseMat);
    group.add(switchBase);

    const switchGeo = new THREE.BoxGeometry(0.6, 0.4, 0.6);
    const switchMat = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x00ff88, emissiveIntensity: 0 });
    const sw = new THREE.Mesh(switchGeo, switchMat);
    sw.position.set(0, 0.3, 0);
    group.add(sw);
    this.createLabel(label, 0, 0.01, 1.1, 20);
    
    group.position.set(x, 0, z);
    this.switches.push({ mesh: sw, paramIndex, value: 0 });
    return group;
  }

  private buildUI() {
    // Main Chassis - Reduced width
    const panelGeo = new THREE.BoxGeometry(22, 0.8, 14);
    const panelMat = new THREE.MeshPhysicalMaterial({ 
      color: 0x444444, 
      roughness: 0.5, 
      metalness: 0.5
    });
    const panel = new THREE.Mesh(panelGeo, panelMat);
    panel.position.y = -0.4;
    this.scene.add(panel);

    // Sections - Compacted
    this.createSectionBox(-8, 0, 5, 11, "OSC");
    this.createSectionBox(-3.5, 0, 4, 11, "FILTER");
    this.createSectionBox(1, 0, 5, 11, "AMP ENV");
    this.createSectionBox(5.5, 0, 4, 11, "LFO");
    this.createSectionBox(9.5, 0, 3, 11, "FX");
    this.createSectionBox(5.5, 3.5, 4, 3, "WAVETABLE");
    this.createSectionBox(0, 7.5, 20, 3.5, "SEQUENCER");
    this.createSectionBox(-3.5, 3.5, 4, 3, "FILTER ENV");

    // CRT Oscilloscope
    const scopeGeo = new THREE.PlaneGeometry(3, 1.5);
    const scopeMat = new THREE.MeshBasicMaterial({ map: this.scopeTexture });
    this.scopeMesh = new THREE.Mesh(scopeGeo, scopeMat);
    this.scopeMesh.position.set(-8, 0.45, -4.5);
    this.scopeMesh.rotation.x = -Math.PI / 2;
    this.scene.add(this.scopeMesh);
    this.createLabel("OSCILLOSCOPE", -8, 0.01, -5.5, 24, "#00ff88");

    // LCD Display
    const lcdGeo = new THREE.PlaneGeometry(4, 1);
    const lcdMat = new THREE.MeshBasicMaterial({ map: this.lcdTexture });
    this.lcdMesh = new THREE.Mesh(lcdGeo, lcdMat);
    this.lcdMesh.position.set(0, 0.45, -4.5);
    this.lcdMesh.rotation.x = -Math.PI / 2;
    this.scene.add(this.lcdMesh);
    this.updateLCD("SYSTEM READY", "WAM-2.0 CORE");

    // Wavetable Display Window
    const wtDispGeo = new THREE.PlaneGeometry(3, 1.2);
    const wtDispMat = new THREE.MeshBasicMaterial({ map: this.wtTexture });
    this.wtMesh = new THREE.Mesh(wtDispGeo, wtDispMat);
    this.wtMesh.position.set(5.5, 0.45, 3.2);
    this.wtMesh.rotation.x = -Math.PI / 2;
    this.scene.add(this.wtMesh);
    this.createLabel("WAVETABLE", 5.5, 0.01, 2.4, 24, "#00ff88");

    // Stochastic Display Window
    const stochDispGeo = new THREE.PlaneGeometry(3, 1.2);
    const stochDispMat = new THREE.MeshBasicMaterial({ map: this.stochTexture });
    this.stochMesh = new THREE.Mesh(stochDispGeo, stochDispMat);
    this.stochMesh.position.set(9.5, 0.45, 3.2);
    this.stochMesh.rotation.x = -Math.PI / 2;
    this.scene.add(this.stochMesh);
    this.createLabel("STOCHASTIC", 9.5, 0.01, 2.4, 24, "#00ff88");


    const pbr = this.textureManager.generateFallbackPBR();
    const knobMat = new THREE.MeshPhysicalMaterial({
      color: 0x1a1a1a,
      roughness: 0.2,
      metalness: 0.8,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      emissive: 0x00ff88,
      emissiveIntensity: 0.05
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
      // OSC
      { name: 'W1', param: PARAMETERS.OSC1_WAVE, min: 0, max: 1, value: 0, x: -9, z: -2.5 },
      { name: 'M1', param: PARAMETERS.OSC1_MIX, min: 0, max: 1, value: 0.7, x: -7, z: -2.5, hasRing: true },
      { name: 'W2', param: PARAMETERS.OSC2_WAVE, min: 0, max: 1, value: 1, x: -9, z: 0.5 },
      { name: 'M2', param: PARAMETERS.OSC2_MIX, min: 0, max: 1, value: 0.7, x: -7, z: 0.5, hasRing: true },
      { name: 'DET', param: PARAMETERS.OSC2_DETUNE, min: -24, max: 24, value: 0, x: -9, z: 2.5 },
      { name: 'UNI', param: PARAMETERS.UNISON_DETUNE, min: 0, max: 1, value: 0, x: -7, z: 2.5 },
      { name: 'SUB', param: PARAMETERS.SUB_OSC_MIX, min: 0, max: 1, value: 0, x: -9, z: 4.5 },
      { name: 'NOISE', param: PARAMETERS.NOISE_MIX, min: 0, max: 1, value: 0, x: -7, z: 4.5 },
      
      // FILTER
      { name: 'CUT', param: PARAMETERS.FILTER_CUTOFF, min: 20, max: 20000, value: 1200, x: -4.5, z: -2.5, modParam: PARAMETERS.FILTER_LFO_AMT },
      { name: 'RES', param: PARAMETERS.FILTER_RES, min: 0, max: 0.99, value: 0.2, x: -2.5, z: -2.5 },
      { name: 'ENV', param: PARAMETERS.FILTER_ENV_DEPTH, min: 0, max: 10000, value: 2000, x: -4.5, z: 0.5 },
      { name: 'LFO', param: PARAMETERS.FILTER_LFO_AMT, min: 0, max: 5000, value: 0, x: -2.5, z: 0.5 },

      // FILTER ENV
      { name: 'FA', param: PARAMETERS.FILTER_ATTACK, min: 0.01, max: 5, value: 0.01, x: -4.5, z: 2.5 },
      { name: 'FD', param: PARAMETERS.FILTER_DECAY, min: 0.01, max: 5, value: 0.3, x: -2.5, z: 2.5 },
      { name: 'FS', param: PARAMETERS.FILTER_SUSTAIN, min: 0, max: 1, value: 0.4, x: -4.5, z: 4.5 },
      { name: 'FR', param: PARAMETERS.FILTER_RELEASE, min: 0.01, max: 5, value: 0.5, x: -2.5, z: 4.5 },
      
      // AMP ENV
      { name: 'A', param: PARAMETERS.ENV_ATTACK, min: 0.01, max: 5, value: 0.05, x: 0, z: -2.5 },
      { name: 'D', param: PARAMETERS.ENV_DECAY, min: 0.01, max: 5, value: 0.3, x: 2, z: -2.5 },
      { name: 'S', param: PARAMETERS.ENV_SUSTAIN, min: 0, max: 1, value: 0.5, x: 0, z: 0.5 },
      { name: 'R', param: PARAMETERS.ENV_RELEASE, min: 0.01, max: 5, value: 0.6, x: 2, z: 0.5 },
      
      // LFOs
      { name: 'L1 RATE', param: PARAMETERS.LFO_RATE, min: 0.1, max: 20, value: 2.0, x: 4.5, z: -2.5 },
      { name: 'L2 RATE', param: PARAMETERS.LFO2_RATE, min: 0.1, max: 20, value: 1.0, x: 6.5, z: -2.5 },
      { name: 'L2 AMT', param: PARAMETERS.LFO2_AMT, min: 0, max: 1, value: 0, x: 5.5, z: 0.5 },
      
      // FX
      { name: 'D TIME', param: PARAMETERS.DELAY_TIME, min: 0.01, max: 1, value: 0.3, x: 8.5, z: -2.5 },
      { name: 'D FDBK', param: PARAMETERS.DELAY_FEEDBACK, min: 0, max: 0.95, value: 0.4, x: 10.5, z: -2.5 },
      { name: 'D MIX', param: PARAMETERS.DELAY_MIX, min: 0, max: 1, value: 0.3, x: 8.5, z: -0.5 },
      { name: 'D WID', param: PARAMETERS.DELAY_WIDTH, min: 0, max: 1, value: 1.0, x: 10.5, z: -0.5 },

      { name: 'R DEC', param: PARAMETERS.REVERB_DECAY, min: 0.1, max: 0.99, value: 0.8, x: 8.5, z: 1.5 },
      { name: 'R MIX', param: PARAMETERS.REVERB_MIX, min: 0, max: 1, value: 0.2, x: 10.5, z: 1.5 },
      { name: 'R DMP', param: PARAMETERS.REVERB_DAMP, min: 0, max: 1, value: 0.2, x: 8.5, z: 3.5 },

      // WAVETABLE
      { name: 'MIX', param: PARAMETERS.WT_MIX, min: 0, max: 1, value: 0.5, x: 4.6, z: 4.2, scale: 0.6 },
      { name: 'POS', param: PARAMETERS.WT_POS, min: 0, max: 1, value: 0, x: 5.2, z: 4.2, scale: 0.6, modParam: PARAMETERS.WT_LFO_AMT },
      { name: 'DET', param: PARAMETERS.WT_DETUNE, min: -24, max: 24, value: 0, x: 5.8, z: 4.2, scale: 0.6 },
      { name: 'LFO', param: PARAMETERS.WT_LFO_AMT, min: 0, max: 1, value: 0.2, x: 6.4, z: 4.2, scale: 0.6 },

      { name: 'S1', param: PARAMETERS.SEQ_STEP_0, min: -12, max: 12, value: 0, x: -4.5, z: 7.5 },
      { name: 'S2', param: PARAMETERS.SEQ_STEP_1, min: -12, max: 12, value: 3, x: -2.5, z: 7.5 },
      { name: 'S3', param: PARAMETERS.SEQ_STEP_2, min: -12, max: 12, value: 7, x: -0.5, z: 7.5 },
      { name: 'S4', param: PARAMETERS.SEQ_STEP_3, min: -12, max: 12, value: 10, x: 1.5, z: 7.5 },
      { name: 'S5', param: PARAMETERS.SEQ_STEP_4, min: -12, max: 12, value: 0, x: 3.5, z: 7.5 },
      { name: 'S6', param: PARAMETERS.SEQ_STEP_5, min: -12, max: 12, value: 0, x: 5.5, z: 7.5 },
      { name: 'S7', param: PARAMETERS.SEQ_STEP_6, min: -12, max: 12, value: 0, x: 7.5, z: 7.5 },
      { name: 'S8', param: PARAMETERS.SEQ_STEP_7, min: -12, max: 12, value: 0, x: 9.5, z: 7.5 },
    ];

    // SEQ LEDs
    const ledGeo = new THREE.SphereGeometry(0.1, 16, 16);
    const ledMat = new THREE.MeshStandardMaterial({ color: 0x00ff88, emissive: 0x00ff88, emissiveIntensity: 0 });
    for (let i = 0; i < 8; i++) {
      const led = new THREE.Mesh(ledGeo, ledMat.clone());
      const x = -4.5 + i * 2.0;
      led.position.set(x, 0.1, 6.5);
      this.scene.add(led);
      this.seqStepLEDs.push(led);
    }

    // SEQ ON Switch (Separate from InstancedMesh for custom look)
    const switchBaseGeo = new THREE.BoxGeometry(1, 0.2, 1.5);
    const switchBaseMat = new THREE.MeshStandardMaterial({ color: 0x111111 });
    const switchBase = new THREE.Mesh(switchBaseGeo, switchBaseMat);
    switchBase.position.set(-9, 0, 7.5);
    this.scene.add(switchBase);

    const switchGeo = new THREE.BoxGeometry(0.6, 0.4, 0.6);
    const switchMat = new THREE.MeshStandardMaterial({ color: 0x333333, emissive: 0x00ff88, emissiveIntensity: 0 });
    this.seqSwitch = new THREE.Mesh(switchGeo, switchMat);
    this.seqSwitch.position.set(-9, 0.3, 7.5);
    this.scene.add(this.seqSwitch);
    this.createLabel("SEQ ON", -9, 0.01, 8.6, 20);

    // OSC1 Wave Switch
    const osc1Switch = this.createSwitch("OSC1 WAVE", -9, 4.5, PARAMETERS.OSC1_WAVE);
    this.scene.add(osc1Switch);

    // LFO Sync Switch
    const lfoSyncSwitch = this.createSwitch("LFO SYNC", 5.5, -4.5, PARAMETERS.LFO_SYNC_ENABLE);
    this.scene.add(lfoSyncSwitch);

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
      this.scene.add(knobGroup);
      
      this.updateKnobInstance(i);
      const labelSize = (config as any).scale ? 18 : 24;
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
    points.push(new THREE.Vector2(0.5, 0)); // Bottom outer
    points.push(new THREE.Vector2(0.5, 0.6)); // Side
    points.push(new THREE.Vector2(0.4, 0.8)); // Bevel
    points.push(new THREE.Vector2(0, 0.8)); // Top center
    const geo = new THREE.LatheGeometry(points, 32);
    
    const mat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      roughness: 0.4,
      metalness: 0.6,
      emissive: color,
      emissiveIntensity: 0.2
    });
    
    const knob = new THREE.Mesh(geo, mat);
    knob.position.y = 0;
    group.add(knob);
    this.knobData[index].knobMesh = knob;
    this.knobMeshes.push(knob);

    // Add indicator notch
    const notchGeo = new THREE.BoxGeometry(0.1, 0.9, 0.2);
    notchGeo.translate(0, 0, 0.4);
    const notch = new THREE.Mesh(notchGeo, notchMat);
    const s = (config as any).scale || 1.0;
    notch.scale.set(s, s, s);
    notch.position.set(0, 0.4, 0); 
    group.add(notch);
    this.knobData[index].notchMesh = notch;

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
    if (index < 7) return 'OSC';
    if (index < 11) return 'FILTER';
    if (index < 15) return 'FILTER_ENV';
    if (index < 19) return 'AMP_ENV';
    if (index < 22) return 'LFO';
    if (index < 29) return 'FX';
    if (index < 33) return 'WT';
    return 'SEQ';
  }

  private getSectionColor(section: string): number {
    switch (section) {
      case 'OSC': return 0x0088ff;
      case 'FILTER': return 0xff8800;
      case 'FILTER_ENV': return 0x00ff88;
      case 'AMP_ENV': return 0x00ff88;
      case 'LFO': return 0xff0088;
      case 'FX': return 0x8800ff;
      case 'WT': return 0xffff00;
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
          const lfoRate = this.host.paramArray[PARAMETERS.LFO_RATE];
          const pulse = Math.sin(Date.now() * 0.001 * lfoRate * 2 * Math.PI) * 0.5 + 0.5;
          targetEmissive += pulse * 2.0 * modAmt;
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
        points.push(new THREE.Vector3(Math.cos(angle) * 0.55, Math.sin(angle) * 0.55, 0));
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
    
    // Check for switch intersection
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
    
    // Check for sequencer switch
    const seqSwitchIntersects = this.raycaster.intersectObject(this.seqSwitch);
    if (seqSwitchIntersects.length > 0) {
      this.seqEnabled = !this.seqEnabled;
      this.host.setParameter(PARAMETERS.SEQ_ENABLE, this.seqEnabled ? 1 : 0);
      return;
    }

    const intersects = this.raycaster.intersectObjects(this.knobMeshes);

    if (intersects.length > 0) {
      this.activeInstanceId = this.knobMeshes.indexOf(intersects[0].object as THREE.Mesh);
      this.previousPointerY = event.clientY;
      document.body.style.cursor = 'ns-resize';
    }
  }

  private onPointerMove(event: PointerEvent) {
    const rect = this.container.getBoundingClientRect();
    this.pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    this.pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    this.raycaster.setFromCamera(this.pointer, this.camera);
    const intersects = this.raycaster.intersectObjects(this.knobMeshes);
    const hoveredIndex = intersects.length > 0 ? this.knobMeshes.indexOf(intersects[0].object as THREE.Mesh) : null;

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
    const valStr = data.paramIndex === PARAMETERS.FILTER_CUTOFF ? `${Math.round(data.targetValue)} HZ` : data.targetValue.toFixed(2);
    this.updateLCD(data.name, valStr);

    // Zero-latency write to Shared Memory
    this.host.setParameter(data.paramIndex, data.targetValue);
  }

  private onPointerUp() {
    this.activeInstanceId = null;
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

  public setSequencerStep(step: number) {
    this.currentSeqStep = step;
  }

  public updateScope(data: Float32Array) {
    const ctx = this.scopeCtx;
    const w = this.scopeCanvas.width;
    const h = this.scopeCanvas.height;

    ctx.fillStyle = '#050505';
    ctx.fillRect(0, 0, w, h);

    // Grid
    ctx.strokeStyle = '#00ff8822';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < w; i += 32) { ctx.moveTo(i, 0); ctx.lineTo(i, h); }
    for (let i = 0; i < h; i += 32) { ctx.moveTo(0, i); ctx.lineTo(w, i); }
    ctx.stroke();

    // Waveform
    ctx.strokeStyle = '#00ff88';
    ctx.lineWidth = 2;
    ctx.shadowBlur = 10;
    ctx.shadowColor = '#00ff88';
    ctx.beginPath();
    const sliceWidth = w / data.length;
    let x = 0;
    for (let i = 0; i < data.length; i++) {
      const v = data[i] * 0.5 + 0.5;
      const y = v * h;
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
      x += sliceWidth;
    }
    ctx.stroke();
    ctx.shadowBlur = 0;
    this.scopeTexture.needsUpdate = true;
  }

  private updateLCD(line1: string, line2: string) {
    const ctx = this.lcdCtx;
    const w = this.lcdCanvas.width;
    const h = this.lcdCanvas.height;

    ctx.fillStyle = '#0a0a0a';
    ctx.fillRect(0, 0, w, h);
    
    ctx.fillStyle = '#00ff88';
    ctx.font = 'bold 48px "JetBrains Mono", monospace';
    ctx.textAlign = 'center';
    ctx.fillText(line1.toUpperCase(), w / 2, 50);
    
    ctx.font = '32px "JetBrains Mono", monospace';
    ctx.fillStyle = '#00ff88aa';
    ctx.fillText(line2.toUpperCase(), w / 2, 90);

    // Bar graph
    const val = parseFloat(line2);
    if (!isNaN(val)) {
      ctx.fillStyle = '#00ff8844';
      ctx.fillRect(w / 4, 105, w / 2, 15);
      ctx.fillStyle = '#00ff88';
      ctx.fillRect(w / 4, 105, (w / 2) * Math.min(1, Math.max(0, val / 100)), 15);
    }
    
    this.lcdTexture.needsUpdate = true;
  }

  private updateWavetableDisplay() {
    const ctx = this.wtCtx;
    const w = this.wtCanvas.width;
    const h = this.wtCanvas.height;
    
    if (!this.host.paramArray) return;
    
    const wtPos = this.host.paramArray[PARAMETERS.WT_POS];
    const readIdx = this.host.paramArray[60]; // Last read index from processor

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
    const morph = wtPos;
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

    // Draw read position indicator
    const indicatorX = (readIdx * 2048 % 128) / 127 * w;
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(indicatorX, h / 2, 4, 0, Math.PI * 2);
    ctx.fill();

    this.wtTexture.needsUpdate = true;
  }

  public setCameraView(view: 'main' | 'osc' | 'filter' | 'seq' | 'fx') {
    const targets = {
      main: { pos: [0, 14, 16], look: [0, 0, 0] },
      osc: { pos: [-8, 8, 4], look: [-8, 0, 0] },
      filter: { pos: [-3, 8, 4], look: [-3, 0, 0] },
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
      const diff = data.targetValue - data.value;
      if (Math.abs(diff) > 0.0001 || this.activeInstanceId === i) {
        data.value += diff * 0.2; // Smooth lerp
        this.updateKnobInstance(i);
      }
    }

    // Animate Sequencer Switch
    const targetZ = this.seqEnabled ? 7.8 : 7.2;
    this.seqSwitch.position.z += (targetZ - this.seqSwitch.position.z) * 0.2;
    const mat = this.seqSwitch.material as THREE.MeshStandardMaterial;
    mat.emissiveIntensity += ((this.seqEnabled ? 2.0 : 0) - mat.emissiveIntensity) * 0.2;

    // Update Wavetable Display
    this.updateWavetableDisplay();

    this.renderer.render(this.scene, this.camera);
  };

  public dispose() {
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.container.removeChild(this.renderer.domElement);
    }
  }
}