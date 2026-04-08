/**
 * Polynomial Bandlimited Step (PolyBLEP) Oscillator
 * 
 * Generates mathematically accurate, aliasing-reduced waveforms.
 * Instead of generating infinite harmonics (which alias above Nyquist),
 * we generate a naive waveform and subtract a polynomial residual 
 * at the points of discontinuity.
 */

export class PolyBLEPOscillator {
  private phase: number = 0.0;
  private phaseInc: number = 0.0;
  private sampleRate: number = 44100;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  public setFrequency(freq: number): void {
    this.phaseInc = freq / this.sampleRate;
  }

  public setSampleRate(sampleRate: number): void {
    this.sampleRate = sampleRate;
  }

  // The PolyBLEP residual function
  private polyBlep(t: number, dt: number): number {
    // 0 <= t < 1
    if (t < dt) {
      t /= dt;
      return t + t - t * t - 1.0;
    }
    // -1 < t < 0
    else if (t > 1.0 - dt) {
      t = (t - 1.0) / dt;
      return t * t + t + t + 1.0;
    }
    return 0.0;
  }

  public processSine(): number {
    const val = Math.sin(this.phase * Math.PI * 2.0);
    this.phase += this.phaseInc;
    if (this.phase >= 1.0) this.phase -= 1.0;
    return val;
  }

  public processTriangle(): number {
    let t = this.phase;
    const dt = this.phaseInc;
    
    // Naive triangle
    let naive = 2.0 * Math.abs(2.0 * t - 1.0) - 1.0;
    
    // Advance phase
    this.phase += dt;
    if (this.phase >= 1.0) this.phase -= 1.0;
    
    return naive;
  }

  public processSaw(): number {
    let t = this.phase;
    const dt = this.phaseInc;

    // Naive sawtooth: 0 to 1 -> -1 to 1
    let naive = 2.0 * t - 1.0;

    // Subtract PolyBLEP residual
    naive -= this.polyBlep(t, dt);

    // Advance phase
    this.phase += dt;
    if (this.phase >= 1.0) {
      this.phase -= 1.0;
    }

    return naive;
  }

  public processPulse(pulseWidth: number): number {
    let t = this.phase;
    const dt = this.phaseInc;

    // Naive pulse
    let naive = t < pulseWidth ? 1.0 : -1.0;

    // PolyBLEP on the rising edge (at phase 0)
    naive += this.polyBlep(t, dt);

    // PolyBLEP on the falling edge (at phase = pulseWidth)
    let t2 = t - pulseWidth;
    if (t2 < 0.0) t2 += 1.0;
    naive -= this.polyBlep(t2, dt);

    // Advance phase
    this.phase += dt;
    if (this.phase >= 1.0) {
      this.phase -= 1.0;
    }

    return naive;
  }
}
