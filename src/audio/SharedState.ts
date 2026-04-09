export const PARAMETERS = {
  OSC1_WAVE: 0,      // 0: Saw, 1: Pulse
  OSC1_MIX: 1,       // 0.0 to 1.0
  OSC2_DETUNE: 2,    // -24 to +24 semitones
  OSC2_WAVE: 3,      // 0: Saw, 1: Pulse
  OSC2_MIX: 4,       // 0.0 to 1.0
  FILTER_CUTOFF: 5,  // 20 to 20000 Hz
  FILTER_RES: 6,     // 0.0 to 1.0
  FILTER_LFO_AMT: 8, // 0 to 5000 Hz
  ENV_ATTACK: 9,     // 0.01 to 5.0 s
  ENV_DECAY: 10,     // 0.01 to 5.0 s
  ENV_SUSTAIN: 11,   // 0.0 to 1.0
  ENV_RELEASE: 12,   // 0.01 to 5.0 s
  LFO_RATE: 13,      // 0.1 to 20.0 Hz
  DELAY_TIME: 14,    // 0.01 to 1.0 s
  DELAY_FEEDBACK: 15,// 0.0 to 0.95
  DELAY_MIX: 16,     // 0.0 to 1.0
  REVERB_DECAY: 17,  // 0.1 to 0.99
  REVERB_MIX: 18,    // 0.0 to 1.0
  MASTER_VOL: 19,    // 0.0 to 1.0
  LFO2_RATE: 20,     // 0.1 to 20.0 Hz
  LFO2_AMT: 21,      // 0.0 to 1.0 (Modulation depth)
  SEQ_ENABLE: 22,    // 0: Off, 1: On
  SEQ_TEMPO: 23,     // 40 to 240 BPM
  SEQ_STEP_COUNT: 24,// 1 to 16
  SEQ_STEP_0: 25,    // -12 to +12 semitones
  SEQ_STEP_1: 26,
  SEQ_STEP_2: 27,
  SEQ_STEP_3: 28,
  SEQ_STEP_4: 29,
  SEQ_STEP_5: 30,
  SEQ_STEP_6: 31,
  SEQ_STEP_7: 32,
  FILTER_ATTACK: 33,
  FILTER_DECAY: 34,
  FILTER_SUSTAIN: 35,
  FILTER_RELEASE: 36,
  FILTER_ENV_DEPTH: 37,
  DELAY_WIDTH: 38,   // 0.0 to 1.0
  REVERB_DAMP: 39,    // 0.0 to 1.0
  UNISON_DETUNE: 40,  // 0.0 to 1.0
  SUB_OSC_MIX: 41,    // 0.0 to 1.0
  NOISE_MIX: 42,       // 0.0 to 1.0
  WT_MIX: 43,         // 0.0 to 1.0
  WT_POS: 44,         // 0.0 to 1.0 (Scrub position)
  WT_LFO_AMT: 45,      // 0.0 to 1.0 (LFO modulation depth)
  WT_DETUNE: 46,       // -24 to +24 semitones
  STOCH_DIST: 52,      // 0: uniform, 1: gaussian, 2: cauchy
  STOCH_TIME: 53,      // 0.001 to 0.1 s
  STOCH_AMP: 54,        // 0.0 to 1.0
  LFO_SYNC_ENABLE: 55,  // 0: Off, 1: On
  LOW_SHELF_ENABLE: 56, // 0: Off, 1: On
  LOW_SHELF_FREQ: 57,   // 20 to 1000 Hz
  LOW_SHELF_GAIN: 58,    // -24 to +24 dB
  SUB_OSC_WAVE: 59,     // 0: Pulse, 1: Saw, 2: Triangle, 3: Sine
  DPW_MIX: 60,          // 0.0 to 1.0
  DPW_DETUNE: 61,       // -24 to +24 semitones
  TS_DRIVE: 62,         // 0.0 to 1.0
  TS_TONE: 63,          // 0.0 to 1.0
  TS_LEVEL: 64,         // 0.0 to 1.0
  TS_MIX: 65,            // 0.0 to 1.0
  FX_SRC_OSC1: 68,      // 0: Off, 1: On
  FX_SRC_OSC2: 69,      // 0: Off, 1: On
  FX_SRC_WT: 70,        // 0: Off, 1: On
  FX_ENV_FOLLOW: 71,    // 0: Off, 1: On
  OSC_FM_AMT: 72,       // 0.0 to 1.0
  OSC_SYNC_ENABLE: 73,  // 0: Off, 1: On
  LFO1_MORPH: 74,       // 0.0 to 4.0 (Sine -> Tri -> Saw -> Sqr -> Rand)
  LFO1_FADE: 75,        // 0.0 to 5.0 s
  LFO2_MORPH: 76,       // 0.0 to 4.0
  LFO2_FADE: 77,        // 0.0 to 5.0 s
  CHAOS_AMT: 78,        // 0.0 to 1.0
  FX_TRAIL_MODE: 79,    // 0: Off (No trail), 1: On (Trail)
  SEQ_VEL_0: 80,
  SEQ_VEL_1: 81,
  SEQ_VEL_2: 82,
  SEQ_VEL_3: 83,
  SEQ_VEL_4: 84,
  SEQ_VEL_5: 85,
  SEQ_VEL_6: 86,
  SEQ_VEL_7: 87,
  SEQ_GATE_0: 88,
  SEQ_GATE_1: 89,
  SEQ_GATE_2: 90,
  SEQ_GATE_3: 91,
  SEQ_GATE_4: 92,
  SEQ_GATE_5: 93,
  SEQ_GATE_6: 94,
  SEQ_GATE_7: 95,
  SEQ_TRANSPOSE: 96,

  // Modulation Matrix (6x6)
  // Sources: LFO1, LFO2, Filter Env, Amp Env, Velocity, Chaos
  // Targets: Pitch, Cutoff, WT Pos, FX Mix, Resonance, LFO Rate
  MOD_L1_PITCH: 100,
  MOD_L1_CUTOFF: 101,
  MOD_L1_WT: 102,
  MOD_L1_FX: 103,
  MOD_L1_RES: 104,
  MOD_L1_RATE: 105,

  MOD_L2_PITCH: 106,
  MOD_L2_CUTOFF: 107,
  MOD_L2_WT: 108,
  MOD_L2_FX: 109,
  MOD_L2_RES: 110,
  MOD_L2_RATE: 111,

  MOD_FE_PITCH: 112,
  MOD_FE_CUTOFF: 113,
  MOD_FE_WT: 114,
  MOD_FE_FX: 115,
  MOD_FE_RES: 116,
  MOD_FE_RATE: 117,

  MOD_AE_PITCH: 118,
  MOD_AE_CUTOFF: 119,
  MOD_AE_WT: 120,
  MOD_AE_FX: 121,
  MOD_AE_RES: 122,
  MOD_AE_RATE: 123,

  MOD_VEL_PITCH: 124,
  MOD_VEL_CUTOFF: 125,
  MOD_VEL_WT: 126,
  MOD_VEL_FX: 127,
  MOD_VEL_RES: 128,
  MOD_VEL_RATE: 129,

  MOD_CH_PITCH: 130,
  MOD_CH_CUTOFF: 131,
  MOD_CH_WT: 132,
  MOD_CH_FX: 133,
  MOD_CH_RES: 134,
  MOD_CH_RATE: 135,
};

export const EVENTS = {
  NOTE_ON: 1,
  NOTE_OFF: 2,
  START_RECORD: 3,
  STOP_RECORD: 4
};

export const MAX_PARAMETERS = 160;

/**
 * Lock-free Single-Producer Single-Consumer (SPSC) Ring Buffer
 * Utilizes SharedArrayBuffer and Atomics for zero-latency event passing.
 */
export class EventRingBuffer {
  private header: Int32Array;
  private data: Float32Array;
  private capacity: number;
  private useSAB: boolean;

  constructor(sab: SharedArrayBuffer | ArrayBuffer, capacityElements: number, useSAB: boolean = true) {
    this.capacity = capacityElements;
    this.useSAB = useSAB;
    this.header = new Int32Array(sab, 0, 2); 
    this.data = new Float32Array(sab, 8); 
  }

  public push(type: number, value: number): boolean {
    if (this.useSAB) {
      const writePtr = Atomics.load(this.header, 0);
      const readPtr = Atomics.load(this.header, 1);
      const nextWritePtr = (writePtr + 2) % this.capacity;

      if (nextWritePtr === readPtr) return false;

      this.data[writePtr] = type;
      this.data[writePtr + 1] = value;
      Atomics.store(this.header, 0, nextWritePtr);
      return true;
    } else {
      // Fallback for non-SAB (though usually handled by postMessage in SynthHost)
      return false;
    }
  }

  public pop(out: Float32Array): boolean {
    if (this.useSAB) {
      const writePtr = Atomics.load(this.header, 0);
      const readPtr = Atomics.load(this.header, 1);

      if (writePtr === readPtr) return false;

      out[0] = this.data[readPtr];
      out[1] = this.data[readPtr + 1];
      
      const nextReadPtr = (readPtr + 2) % this.capacity;
      Atomics.store(this.header, 1, nextReadPtr);
      return true;
    } else {
      return false;
    }
  }
}