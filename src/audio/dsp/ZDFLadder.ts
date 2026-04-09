/**
 * Zero-Delay Feedback (ZDF) Topology Preserving Transform (TPT) 4-Pole Moog Ladder Filter
 * 
 * Utilizes the Bilinear Transform (trapezoidal integration) to solve the delay-free
 * feedback loop algebraically, preserving the phase response and resonance tuning
 * up to the Nyquist frequency.
 */

export class ZDFLadderFilter {
  private sampleRate: number = 44100;
  
  // 1-pole stage states
  private s1: number = 0.0;
  private s2: number = 0.0;
  private s3: number = 0.0;
  private s4: number = 0.0;

  // Pre-calculated coefficients
  private g: number = 0.0;
  private G: number = 0.0;
  private k: number = 0.0; // Resonance (0 to 4)

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  public setSampleRate(sampleRate: number): void {
    this.sampleRate = sampleRate;
  }

  public setParameters(cutoff: number, resonance: number): void {
    // Prewarp the cutoff frequency for the Bilinear Transform
    const wd = 2.0 * Math.PI * cutoff;
    const T = 1.0 / this.sampleRate;
    const wa = (2.0 / T) * Math.tan(wd * T / 2.0);
    
    this.g = wa * T / 2.0;
    this.G = this.g / (1.0 + this.g);
    
    // Resonance maps 0..1 to 0..4
    this.k = resonance * 4.0;
  }

  public reset(): void {
    this.s1 = 0;
    this.s2 = 0;
    this.s3 = 0;
    this.s4 = 0;
  }

  public process(input: number): number {
    // Calculate the delay-free feedback loop algebraically
    const G2 = this.G * this.G;
    const G3 = G2 * this.G;
    const G4 = G2 * G2;

    const S1 = this.s1 / (1.0 + this.g);
    const S2 = this.s2 / (1.0 + this.g);
    const S3 = this.s3 / (1.0 + this.g);
    const S4 = this.s4 / (1.0 + this.g);

    // Estimate the output of the 4th stage to resolve the loop
    const y4_estimate = (G4 * input + G3 * S1 + G2 * S2 + this.G * S3 + S4) / (1.0 + this.k * G4);

    // Inject non-linear hyperbolic tangent (tanh) saturation to emulate analog overdrive
    // We apply tanh to the input minus the feedback
    const u = Math.tanh(input - this.k * y4_estimate);

    // Process Stage 1
    const v1 = (u - this.s1) * this.G;
    const y1 = v1 + this.s1;
    this.s1 = y1 + v1; // Update state

    // Process Stage 2
    const v2 = (y1 - this.s2) * this.G;
    const y2 = v2 + this.s2;
    this.s2 = y2 + v2; // Update state

    // Process Stage 3
    const v3 = (y2 - this.s3) * this.G;
    const y3 = v3 + this.s3;
    this.s3 = y3 + v3; // Update state

    // Process Stage 4
    const v4 = (y3 - this.s4) * this.G;
    const y4 = v4 + this.s4;
    this.s4 = y4 + v4; // Update state

    return y4;
  }
}
