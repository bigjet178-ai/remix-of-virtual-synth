import * as THREE from 'three';

export class TextureManager {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;

  constructor() {
    this.canvas = document.createElement('canvas');
    this.canvas.width = 512;
    this.canvas.height = 512;
    this.ctx = this.canvas.getContext('2d')!;
  }

  public createKnobTexture(label: string, value: string): THREE.CanvasTexture {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Background
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Outer ring
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(256, 256, 200, 0, Math.PI * 2);
    ctx.stroke();

    // Markings
    ctx.strokeStyle = '#ffb3b5';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 10; i++) {
      const angle = (i / 10) * (Math.PI * 1.5) + Math.PI * 0.75;
      const x1 = 256 + Math.cos(angle) * 210;
      const y1 = 256 + Math.sin(angle) * 210;
      const x2 = 256 + Math.cos(angle) * 230;
      const y2 = 256 + Math.sin(angle) * 230;
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
    }

    // Label
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 48px Inter';
    ctx.textAlign = 'center';
    ctx.fillText(label.toUpperCase(), 256, 480);

    // Value
    ctx.fillStyle = '#ffb3b5';
    ctx.font = '32px JetBrains Mono';
    ctx.fillText(value, 256, 30);

    return new THREE.CanvasTexture(canvas);
  }

  public createKnurlingNormalMap(): THREE.CanvasTexture {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = '#8080ff'; // Neutral normal color (flat)
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    
    // Draw cross-hatch
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 2;
    for (let i = 0; i < canvas.width; i += 10) {
      ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, canvas.height); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(canvas.width, i); ctx.stroke();
    }
    return new THREE.CanvasTexture(canvas);
  }

  public createPanelTexture(): THREE.CanvasTexture {
    const { ctx, canvas } = this;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Brushed metal effect
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height);
    gradient.addColorStop(0, '#121212');
    gradient.addColorStop(0.5, '#1a1a1a');
    gradient.addColorStop(1, '#121212');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Noise for texture
    for (let i = 0; i < 10000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const alpha = Math.random() * 0.05;
      ctx.fillStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.fillRect(x, y, 1, 1);
    }

    return new THREE.CanvasTexture(canvas);
  }

  public async loadHDRI(url: string, renderer: THREE.WebGLRenderer): Promise<THREE.Texture> {
    // Fallback if RGBELoader is not available or fails
    // In a real app we'd import RGBELoader from 'three/examples/jsm/loaders/RGBELoader'
    // But for this environment, we'll return a generated cube map or similar if possible.
    const pmremGenerator = new THREE.PMREMGenerator(renderer);
    pmremGenerator.compileEquirectangularShader();
    
    // Create a procedural environment map as fallback
    const scene = new THREE.Scene();
    const light = new THREE.PointLight(0xffffff, 100);
    light.position.set(5, 5, 5);
    scene.add(light);
    const envMap = pmremGenerator.fromScene(scene).texture;
    return envMap;
  }

  public generateFallbackPBR() {
    return {
      roughness: 0.5,
      metalness: 0.5
    };
  }
}
