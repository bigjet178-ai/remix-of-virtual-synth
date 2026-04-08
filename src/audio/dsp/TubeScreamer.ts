export class TubeScreamer {
  private sampleRate: number;
  private drive: number = 0.5;
  private tone: number = 0.5;
  private level: number = 0.5;

  // Filters for pre-emphasis and tone stage
  private preHP_L: Biquad;
  private preHP_R: Biquad;
  private toneLP_L: Biquad;
  private toneLP_R: Biquad;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.preHP_L = new Biquad(sampleRate);
    this.preHP_R = new Biquad(sampleRate);
    this.toneLP_L = new Biquad(sampleRate);
    this.toneLP_R = new Biquad(sampleRate);

    // Pre-emphasis: High-pass around 720Hz to create the "mid-hump"
    this.preHP_L.setHighPass(720, 0.707);
    this.preHP_R.setHighPass(720, 0.707);
  }

  setParameters(drive: number, tone: number, level: number) {
    this.drive = drive;
    this.tone = tone;
    this.level = level;

    // Tone stage: Low-pass filter from ~1kHz to ~10kHz
    const toneFreq = 1000 + (tone * 9000);
    this.toneLP_L.setLowPass(toneFreq, 0.5);
    this.toneLP_R.setLowPass(toneFreq, 0.5);
  }

  process(inputL: number, inputR: number): [number, number] {
    // 1. Pre-emphasis
    let xL = this.preHP_L.process(inputL);
    let xR = this.preHP_R.process(inputR);

    // 2. Non-linear Core (Clipping)
    // Gain stage before clipping
    const gain = 1.0 + this.drive * 50.0;
    xL *= gain;
    xR *= gain;

    // Symmetrical soft clipping (simulating antiparallel diodes)
    // We use a soft-knee approximation of the diode equation
    xL = this.softClip(xL);
    xR = this.softClip(xR);

    // 3. Tone Stage
    xL = this.toneLP_L.process(xL);
    xR = this.toneLP_R.process(xR);

    // 4. Output Level
    return [xL * this.level, xR * this.level];
  }

  private softClip(x: number): number {
    // Soft clipping function: x / (1 + |x|)
    // This provides a smooth saturation curve
    if (Math.abs(x) < 1) {
        return x - (x * x * x) / 3; // Cubic approximation for small values
    }
    return x > 0 ? 2/3 : -2/3; // Hard limit for large values (simplified)
    
    // Better approximation:
    // return Math.tanh(x);
  }
}

// Simple Biquad Filter for the TS9 stages
class Biquad {
  private b0: number = 1;
  private b1: number = 0;
  private b2: number = 0;
  private a1: number = 0;
  private a2: number = 0;
  private x1: number = 0;
  private x2: number = 0;
  private y1: number = 0;
  private y2: number = 0;
  private sampleRate: number;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  setHighPass(freq: number, q: number) {
    const w0 = 2 * Math.PI * freq / this.sampleRate;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw0 = Math.cos(w0);
    const a0 = 1 + alpha;
    this.b0 = (1 + cosw0) / 2 / a0;
    this.b1 = -(1 + cosw0) / a0;
    this.b2 = (1 + cosw0) / 2 / a0;
    this.a1 = -2 * cosw0 / a0;
    this.a2 = (1 - alpha) / a0;
  }

  setLowPass(freq: number, q: number) {
    const w0 = 2 * Math.PI * freq / this.sampleRate;
    const alpha = Math.sin(w0) / (2 * q);
    const cosw0 = Math.cos(w0);
    const a0 = 1 + alpha;
    this.b0 = (1 - cosw0) / 2 / a0;
    this.b1 = (1 - cosw0) / a0;
    this.b2 = (1 - cosw0) / 2 / a0;
    this.a1 = -2 * cosw0 / a0;
    this.a2 = (1 - alpha) / a0;
  }

  process(x: number): number {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1;
    this.x1 = x;
    this.y2 = this.y1;
    this.y1 = y;
    return y;
  }
}
