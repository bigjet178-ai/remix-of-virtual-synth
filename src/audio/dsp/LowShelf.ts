export class LowShelfFilter {
  private sampleRate: number;
  private freq: number = 200;
  private gain: number = 0; // dB

  private b0: number = 1;
  private b1: number = 0;
  private b2: number = 0;
  private a1: number = 0;
  private a2: number = 0;

  private x1L: number = 0;
  private x2L: number = 0;
  private y1L: number = 0;
  private y2L: number = 0;

  private x1R: number = 0;
  private x2R: number = 0;
  private y1R: number = 0;
  private y2R: number = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.calculateCoefficients();
  }

  setParameters(freq: number, gain: number) {
    if (this.freq !== freq || this.gain !== gain) {
      this.freq = freq;
      this.gain = gain;
      this.calculateCoefficients();
    }
  }

  private calculateCoefficients() {
    const A = Math.pow(10, this.gain / 40);
    const w0 = 2 * Math.PI * this.freq / this.sampleRate;
    const cosW0 = Math.cos(w0);
    const sinW0 = Math.sin(w0);
    // S = 1 (slope)
    const alpha = (sinW0 / 2) * Math.sqrt(2);

    const b0 = A * ((A + 1) - (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha);
    const b1 = 2 * A * ((A - 1) - (A + 1) * cosW0);
    const b2 = A * ((A + 1) - (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha);
    const a0 = (A + 1) + (A - 1) * cosW0 + 2 * Math.sqrt(A) * alpha;
    const a1 = -2 * ((A - 1) + (A + 1) * cosW0);
    const a2 = (A + 1) + (A - 1) * cosW0 - 2 * Math.sqrt(A) * alpha;

    this.b0 = b0 / a0;
    this.b1 = b1 / a0;
    this.b2 = b2 / a0;
    this.a1 = a1 / a0;
    this.a2 = a2 / a0;
  }

  processL(input: number): number {
    const output = this.b0 * input + this.b1 * this.x1L + this.b2 * this.x2L - this.a1 * this.y1L - this.a2 * this.y2L;
    this.x2L = this.x1L;
    this.x1L = input;
    this.y2L = this.y1L;
    this.y1L = output;
    return output;
  }

  processR(input: number): number {
    const output = this.b0 * input + this.b1 * this.x1R + this.b2 * this.x2R - this.a1 * this.y1R - this.a2 * this.y2R;
    this.x2R = this.x1R;
    this.x1R = input;
    this.y2R = this.y1R;
    this.y1R = output;
    return output;
  }
}
