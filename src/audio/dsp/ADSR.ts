/**
 * ADSR Envelope Generator
 * 
 * Generates a control signal for amplitude or filter modulation.
 */
export class ADSR {
  private state: 'idle' | 'attack' | 'decay' | 'sustain' | 'release' = 'idle';
  private value: number = 0;
  private sampleRate: number;
  
  public attack: number = 0.01; // seconds
  public decay: number = 0.1;   // seconds
  public sustain: number = 0.5; // level (0.0 to 1.0)
  public release: number = 0.5; // seconds

  public get isIdle(): boolean {
    return this.state === 'idle';
  }

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
  }

  public trigger(): void {
    this.state = 'attack';
    this.value = 0;
  }

  public releaseNote(): void {
    if (this.state !== 'idle') {
      this.state = 'release';
    }
  }

  public process(): number {
    switch (this.state) {
      case 'attack':
        this.value += 1.0 / (this.attack * this.sampleRate + 1);
        if (this.value >= 1.0) {
          this.value = 1.0;
          this.state = 'decay';
        }
        break;
      case 'decay':
        const decayDelta = (1.0 - this.sustain) / (this.decay * this.sampleRate + 1);
        this.value -= decayDelta; 
        if (this.value <= this.sustain + 0.0001) {
          this.value = this.sustain;
          this.state = 'sustain';
        }
        break;
      case 'sustain':
        this.value = this.sustain;
        break;
      case 'release':
        const releaseDelta = 1.0 / (this.release * this.sampleRate + 1);
        this.value -= releaseDelta; 
        if (this.value <= 0.0001) {
          this.value = 0.0;
          this.state = 'idle';
        }
        break;
    }
    return this.value;
  }
}
