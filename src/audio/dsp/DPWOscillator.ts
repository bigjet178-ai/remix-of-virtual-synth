export class DPWOscillator {
  private sampleRate: number;
  private phase: number = 0.0;
  private z1: number = 0.0;
  private smoothedFreq: number = 440;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  process(frequency: number): number {
    // Safety check
    if (frequency <= 0) return 0;
    
    // Smooth frequency for scaling factor to prevent wobble
    this.smoothedFreq += (frequency - this.smoothedFreq) * 0.01;

    if (frequency > this.sampleRate / 4) {
      // DPW breaks down near Nyquist; fallback to a simple sine wave
      const phaseInc = frequency / this.sampleRate;
      this.phase += phaseInc;
      if (this.phase >= 1.0) this.phase -= 1.0;
      return Math.sin(this.phase * 2 * Math.PI); 
    }

    // 1. Generation
    const phaseInc = frequency / this.sampleRate;
    this.phase += phaseInc;
    if (this.phase >= 1.0) this.phase -= 1.0;
    
    const trivialSaw = 2.0 * this.phase - 1.0;

    // 2. Squaring
    const squared = trivialSaw * trivialSaw;

    // 3. Differentiation
    const diff = squared - this.z1;
    this.z1 = squared;

    // 4. Scaling
    const scalingFactor = this.sampleRate / (4.0 * this.smoothedFreq);
    
    return diff * scalingFactor;
  }
}
