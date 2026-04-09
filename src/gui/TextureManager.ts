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

    // Base color
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Brushed metal effect (horizontal streaks)
    for (let i = 0; i < 2000; i++) {
      const x = Math.random() * canvas.width;
      const y = Math.random() * canvas.height;
      const length = 20 + Math.random() * 100;
      const alpha = 0.02 + Math.random() * 0.05;
      
      const grad = ctx.createLinearGradient(x, y, x + length, y);
      grad.addColorStop(0, `rgba(255, 255, 255, 0)`);
      grad.addColorStop(0.5, `rgba(255, 255, 255, ${alpha})`);
      grad.addColorStop(1, `rgba(255, 255, 255, 0)`);
      
      ctx.fillStyle = grad;
      ctx.fillRect(x, y, length, 1);
    }

    // Add some subtle vertical variations
    const grad2 = ctx.createLinearGradient(0, 0, 0, canvas.height);
    grad2.addColorStop(0, 'rgba(0,0,0,0.2)');
    grad2.addColorStop(0.5, 'rgba(255,255,255,0.05)');
    grad2.addColorStop(1, 'rgba(0,0,0,0.2)');
    ctx.fillStyle = grad2;
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    return texture;
  }

  public createCarbonFiberTexture(): THREE.CanvasTexture {
    const { ctx, canvas } = this;
    const size = 32;
    canvas.width = size;
    canvas.height = size;
    
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, size, size);
    
    ctx.fillStyle = '#1a1a1a';
    ctx.fillRect(0, 0, size / 2, size / 2);
    ctx.fillRect(size / 2, size / 2, size / 2, size / 2);
    
    ctx.fillStyle = '#222';
    ctx.fillRect(size / 2, 0, size / 2, size / 2);
    ctx.fillRect(0, size / 2, size / 2, size / 2);

    const texture = new THREE.CanvasTexture(canvas);
    texture.wrapS = THREE.RepeatWrapping;
    texture.wrapT = THREE.RepeatWrapping;
    texture.repeat.set(16, 16);
    return texture;
  }

  public createWoodTexture(): THREE.CanvasTexture {
    const { ctx, canvas } = this;
    canvas.width = 512;
    canvas.height = 512;
    
    // Base wood color
    ctx.fillStyle = '#4a2c1a';
    ctx.fillRect(0, 0, 512, 512);
    
    // Grain
    for (let i = 0; i < 1000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const w = 1 + Math.random() * 3;
      const h = 50 + Math.random() * 200;
      const alpha = 0.05 + Math.random() * 0.1;
      
      ctx.fillStyle = `rgba(30, 15, 5, ${alpha})`;
      ctx.beginPath();
      ctx.ellipse(x, y, w, h, Math.random() * 0.1, 0, Math.PI * 2);
      ctx.fill();
    }
    
    // Knots
    for (let i = 0; i < 5; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const r = 10 + Math.random() * 20;
      const grad = ctx.createRadialGradient(x, y, 0, x, y, r);
      grad.addColorStop(0, 'rgba(20, 10, 5, 0.5)');
      grad.addColorStop(1, 'rgba(74, 44, 26, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, Math.PI * 2);
      ctx.fill();
    }

    return new THREE.CanvasTexture(canvas);
  }

  public createKnobCapTexture(): THREE.CanvasTexture {
    const { ctx, canvas } = this;
    canvas.width = 256;
    canvas.height = 256;
    ctx.clearRect(0, 0, 256, 256);
    
    // Radial brushed effect
    const centerX = 128;
    const centerY = 128;
    
    ctx.fillStyle = '#222';
    ctx.beginPath();
    ctx.arc(centerX, centerY, 120, 0, Math.PI * 2);
    ctx.fill();
    
    for (let i = 0; i < 360; i += 0.5) {
      const angle = (i * Math.PI) / 180;
      const length = 100 + Math.random() * 20;
      const alpha = 0.05 + Math.random() * 0.1;
      
      ctx.strokeStyle = `rgba(255, 255, 255, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY);
      ctx.lineTo(centerX + Math.cos(angle) * length, centerY + Math.sin(angle) * length);
      ctx.stroke();
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
