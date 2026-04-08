/**
 * Low Frequency Oscillator (LFO)
 * 
 * Generates a control signal for modulation (e.g., vibrato, filter sweeps).
 */
export class LFO {
  private phase: number = 0;
  private sampleRate: number;
  
  public rate: number = 1.0; // Hz
  public shape: number = 0; // 0: Sine, 1: Triangle, 2: Saw, 3: Square

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  public process(): number {
    this.phase += this.rate / this.sampleRate;
    if (this.phase >= 1.0) {
      this.phase -= 1.0;
    }
    
    switch (Math.floor(this.shape)) {
      case 0: // Sine
        return Math.sin(this.phase * Math.PI * 2);
      case 1: // Triangle
        return 2 * Math.abs(2 * this.phase - 1) - 1;
      case 2: // Saw
        return 2 * this.phase - 1;
      case 3: // Square
        return this.phase < 0.5 ? 1.0 : -1.0;
      default:
        return Math.sin(this.phase * Math.PI * 2);
    }
  }
}
