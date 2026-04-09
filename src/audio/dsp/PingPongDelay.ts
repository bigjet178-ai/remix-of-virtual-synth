/**
 * Ping Pong Delay
 * 
 * A stereo delay where the echoes bounce back and forth between the left and right channels.
 */
export class PingPongDelay {
  private bufferL: Float32Array;
  private bufferR: Float32Array;
  private writeIdx: number = 0;
  private sampleRate: number;
  
  public time: number = 0.3;
  public feedback: number = 0.4;
  public mix: number = 0.0;
  public width: number = 1.0; // 0.0 (mono) to 1.0 (full ping-pong)
  
  public outL: number = 0;
  public outR: number = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    // 2 seconds max delay
    this.bufferL = new Float32Array(sampleRate * 2);
    this.bufferR = new Float32Array(sampleRate * 2);
  }

  public clear(): void {
    this.bufferL.fill(0);
    this.bufferR.fill(0);
  }

  public process(input: number): void {
    const delaySamples = Math.floor(this.time * this.sampleRate);
    let readIdx = this.writeIdx - delaySamples;
    if (readIdx < 0) readIdx += this.bufferL.length;

    const delayedL = this.bufferL[readIdx];
    const delayedR = this.bufferR[readIdx];

    // Ping pong: Left feeds Right, Right feeds Left
    // Width controls how much of the cross-feedback happens
    const crossL = delayedR * this.feedback * this.width;
    const crossR = delayedL * this.feedback * this.width;
    const selfL = delayedL * this.feedback * (1 - this.width);
    const selfR = delayedR * this.feedback * (1 - this.width);

    const inL = input + crossL + selfL;
    const inR = input + crossR + selfR;

    this.bufferL[this.writeIdx] = inL;
    this.bufferR[this.writeIdx] = inR;

    this.writeIdx++;
    if (this.writeIdx >= this.bufferL.length) this.writeIdx = 0;

    this.outL = input * (1 - this.mix) + delayedL * this.mix;
    this.outR = input * (1 - this.mix) + delayedR * this.mix;
  }
}
