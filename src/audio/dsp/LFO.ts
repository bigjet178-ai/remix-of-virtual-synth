/**
 * Low Frequency Oscillator (LFO)
 * 
 * Generates a control signal for modulation (e.g., vibrato, filter sweeps).
 */
export class LFO {
  private phase: number = 0;
  private sampleRate: number;
  private lastRand: number = 0;
  private nextRand: number = 0;
  
  public rate: number = 1.0; // Hz
  public morph: number = 0; // 0: Sine, 1: Triangle, 2: Saw, 3: Square, 4: Random

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.lastRand = Math.random() * 2 - 1;
    this.nextRand = Math.random() * 2 - 1;
  }

  public reset(): void {
    this.phase = 0;
  }

  private getShape(shapeIdx: number, phase: number): number {
    switch (shapeIdx) {
      case 0: // Sine
        return Math.sin(phase * Math.PI * 2);
      case 1: // Triangle
        return 2 * Math.abs(2 * phase - 1) - 1;
      case 2: // Saw
        return 2 * phase - 1;
      case 3: // Square
        return phase < 0.5 ? 1.0 : -1.0;
      case 4: // Random (Sample & Hold)
        return this.lastRand;
      default:
        return 0;
    }
  }

  public process(): number {
    const prevPhase = this.phase;
    this.phase += this.rate / this.sampleRate;
    
    if (this.phase >= 1.0) {
      this.phase -= 1.0;
      this.lastRand = this.nextRand;
      this.nextRand = Math.random() * 2 - 1;
    }

    const m = Math.max(0, Math.min(4, this.morph));
    const idx1 = Math.floor(m);
    const idx2 = Math.min(4, idx1 + 1);
    const frac = m - idx1;

    const v1 = this.getShape(idx1, this.phase);
    const v2 = this.getShape(idx2, this.phase);

    return v1 * (1 - frac) + v2 * frac;
  }
}
