/**
 * Algorithmic Reverb (Freeverb-lite)
 * 
 * Uses parallel comb filters and series allpass filters to simulate room acoustics.
 */

class CombFilter {
  private buffer: Float32Array;
  private idx: number = 0;
  public feedback: number = 0.84;
  public filterStore: number = 0;
  public damp: number = 0.2;

  constructor(size: number) {
    this.buffer = new Float32Array(size);
  }

  public process(input: number): number {
    const output = this.buffer[this.idx];
    this.filterStore = (output * (1 - this.damp)) + (this.filterStore * this.damp);
    this.buffer[this.idx] = input + (this.filterStore * this.feedback);
    this.idx = (this.idx + 1) % this.buffer.length;
    return output;
  }
}

class AllpassFilter {
  private buffer: Float32Array;
  private idx: number = 0;
  
  constructor(size: number) {
    this.buffer = new Float32Array(size);
  }

  public process(input: number): number {
    const delayed = this.buffer[this.idx];
    const output = -input + delayed;
    this.buffer[this.idx] = input + (delayed * 0.5);
    this.idx = (this.idx + 1) % this.buffer.length;
    return output;
  }
}

export class Reverb {
  private combsL: CombFilter[] = [];
  private combsR: CombFilter[] = [];
  private allpassesL: AllpassFilter[] = [];
  private allpassesR: AllpassFilter[] = [];
  
  public mix: number = 0.2;
  public decay: number = 0.8;
  public damp: number = 0.2;
  
  public outL: number = 0;
  public outR: number = 0;

  constructor(sampleRate: number) {
    // Tuning for 44100Hz
    const r = sampleRate / 44100;
    const combSizes = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map(s => Math.floor(s * r));
    const allpassSizes = [225, 341, 441, 556].map(s => Math.floor(s * r));
    const stereoSpread = Math.floor(23 * r);

    for (let i = 0; i < 8; i++) {
      this.combsL.push(new CombFilter(combSizes[i]));
      this.combsR.push(new CombFilter(combSizes[i] + stereoSpread));
    }
    for (let i = 0; i < 4; i++) {
      this.allpassesL.push(new AllpassFilter(allpassSizes[i]));
      this.allpassesR.push(new AllpassFilter(allpassSizes[i] + stereoSpread));
    }
  }

  public process(inL: number, inR: number): void {
    let outL = 0;
    let outR = 0;
    
    // Parallel combs
    for (let i = 0; i < 8; i++) {
      this.combsL[i].feedback = this.decay;
      this.combsR[i].feedback = this.decay;
      this.combsL[i].damp = this.damp;
      this.combsR[i].damp = this.damp;
      outL += this.combsL[i].process(inL);
      outR += this.combsR[i].process(inR);
    }
    
    // Series allpasses
    for (let i = 0; i < 4; i++) {
      outL = this.allpassesL[i].process(outL);
      outR = this.allpassesR[i].process(outR);
    }

    // Mix (0.15 scaling to prevent clipping from the comb accumulation)
    this.outL = inL * (1 - this.mix) + outL * this.mix * 0.15;
    this.outR = inR * (1 - this.mix) + outR * this.mix * 0.15;
  }
}
