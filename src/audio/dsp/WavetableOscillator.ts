/**
 * Wavetable Oscillator
 * 
 * Iterates over a pre-loaded array of 2048 samples.
 * Implements linear interpolation for smooth transitions.
 */

export class WavetableOscillator {
  private phase: number = 0.0;
  private phaseInc: number = 0.0;
  private sampleRate: number = 44100;
  private table: Float32Array;
  private tableSize: number = 2048;
  
  // For visualization
  public lastReadIndex: number = 0;

  constructor(sampleRate: number) {
    this.sampleRate = sampleRate;
    this.table = new Float32Array(this.tableSize);
    this.generateDefaultTable();
  }

  private generateDefaultTable() {
    const numWaves = 16;
    const waveSize = 128;
    
    for (let w = 0; w < numWaves; w++) {
      const morph = w / (numWaves - 1);
      const offset = w * waveSize;
      
      for (let i = 0; i < waveSize; i++) {
        const t = i / waveSize;
        const phase = t * Math.PI * 2;
        
        // Morph from Sine -> Triangle -> Saw -> Square
        let val = 0;
        if (morph < 0.33) {
          // Sine to Triangle
          const m = morph / 0.33;
          const sine = Math.sin(phase);
          const tri = 2.0 * Math.abs(2.0 * t - 1.0) - 1.0;
          val = sine * (1 - m) + tri * m;
        } else if (morph < 0.66) {
          // Triangle to Saw
          const m = (morph - 0.33) / 0.33;
          const tri = 2.0 * Math.abs(2.0 * t - 1.0) - 1.0;
          const saw = 2.0 * t - 1.0;
          val = tri * (1 - m) + saw * m;
        } else {
          // Saw to Square
          const m = (morph - 0.66) / 0.34;
          const saw = 2.0 * t - 1.0;
          const sqr = t < 0.5 ? 1.0 : -1.0;
          val = saw * (1 - m) + sqr * m;
        }
        
        this.table[offset + i] = val * 0.8; // Leave some headroom
      }
    }
  }

  public setFrequency(freq: number): void {
    this.phaseInc = freq / this.sampleRate;
  }

  public setSampleRate(sampleRate: number): void {
    this.sampleRate = sampleRate;
  }

  /**
   * Process the oscillator
   * @param position 0.0 to 1.0, scrubs the start index of the lookup if we had multiple tables,
   * but the prompt says "a pre-loaded array of 2048 samples".
   * Usually "scrubbing" in a single wavetable means shifting the phase or 
   * if it's a multi-wavetable (2D), scrubbing between tables.
   * 
   * Re-reading prompt: "iterate over a pre-loaded array of 2048 samples... 
   * Use a LFO to dynamically scrub the index of the wavetable."
   * 
   * If it's a single 2048 array, "scrubbing the index" might mean an offset to the phase
   * or perhaps the wavetable is actually a collection of smaller cycles?
   * 
   * Standard wavetable synthesis: 
   * A "wavetable" is often a 2D array (N tables of M samples).
   * If it's just ONE array of 2048 samples, and we "scrub the index", 
   * it implies we are looking at a window or the array contains multiple cycles.
   * 
   * However, "iterate over a pre-loaded array of 2048 samples" usually means 
   * 2048 is the length of ONE cycle.
   * 
   * Let's assume the 2048 samples represent multiple cycles or a single cycle 
   * that we can "scrub" (offset).
   * 
   * Actually, a common interpretation for "scrubbing a wavetable" is 
   * moving between different waveforms stored in that 2048 buffer 
   * (e.g. 32 waveforms of 64 samples each).
   * 
   * But 2048 is a standard size for ONE high-quality cycle.
   * 
   * Let's implement it as a single cycle oscillator where "position" 
   * might modulate the waveform shape if we had multiple, 
   * but since we have one, I'll make the 2048 buffer contain a "morphing" wave 
   * if I can, or just implement the lookup with an offset.
   * 
   * Wait, "scrub the index" usually means the LFO controls WHERE in the wavetable we are reading.
   * If we are reading at a frequency, we are already "scrubbing" (iterating).
   * 
   * Maybe the user means the LFO modulates the *starting point* or *window*?
   * 
   * Let's look at the prompt again: "Use a LFO to dynamically scrub the index of the wavetable."
   * 
   * I will implement it such that the LFO adds an offset to the phase lookup, 
   * or better: the 2048 samples are treated as a "landscape" and we read a cycle from it.
   * 
   * Actually, the most likely meaning is that the 2048 samples is the TOTAL buffer, 
   * and we read a smaller window (e.g. 256 samples) as a cycle, and "scrubbing" 
   * moves that window.
   * 
   * OR, it's just a single 2048 cycle and "scrubbing" is a bit of a misnomer for 
   * something else, OR the 2048 samples are indeed multiple waveforms.
   * 
   * Let's go with: 2048 samples = 16 waveforms of 128 samples each.
   * Scrubbing (0-1) selects which waveform (or interpolates between them).
   */
  public process(scrub: number): number {
    // We'll treat the 2048 samples as 16 waveforms of 128 samples each.
    // Scrub (0-1) will interpolate between these waveforms.
    
    const numWaves = 16;
    const waveSize = 128; // 16 * 128 = 2048
    
    const scrubPos = scrub * (numWaves - 1);
    const waveIdx1 = Math.floor(scrubPos);
    const waveIdx2 = Math.min(waveIdx1 + 1, numWaves - 1);
    const waveInterpolation = scrubPos - waveIdx1;

    // Phase lookup within the 128-sample waveform
    const lookupPos = this.phase * waveSize;
    const i1 = Math.floor(lookupPos);
    const i2 = (i1 + 1) % waveSize;
    const frac = lookupPos - i1;

    // Linear interpolation between samples in wave 1
    const s1w1 = this.table[waveIdx1 * waveSize + i1];
    const s2w1 = this.table[waveIdx1 * waveSize + i2];
    const sample1 = s1w1 + (s2w1 - s1w1) * frac;

    // Linear interpolation between samples in wave 2
    const s1w2 = this.table[waveIdx2 * waveSize + i1];
    const s2w2 = this.table[waveIdx2 * waveSize + i2];
    const sample2 = s1w2 + (s2w2 - s1w2) * frac;

    // Linear interpolation between the two waves (scrubbing)
    const finalSample = sample1 + (sample2 - sample1) * waveInterpolation;

    // Store read index for visualization (normalized 0-1)
    this.lastReadIndex = (waveIdx1 * waveSize + i1) / this.tableSize;

    // Advance phase
    this.phase += this.phaseInc;
    if (this.phase >= 1.0) this.phase -= 1.0;

    return finalSample;
  }

  // Helper to fill the table with something interesting (morphing from sine to square-ish)
  public fillTable(data: Float32Array) {
    if (data.length === this.tableSize) {
      this.table.set(data);
    }
  }
  
  public getTable(): Float32Array {
    return this.table;
  }
}
