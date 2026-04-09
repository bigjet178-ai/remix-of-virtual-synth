import { PARAMETERS } from './SharedState';

export interface Preset {
  name: string;
  params: Record<number, number>;
}

export interface PresetCategory {
  category: string;
  presets: Preset[];
}

export const PRESET_CATEGORIES: PresetCategory[] = [
  {
    category: "Atmospheric Pads",
    presets: [
      {
        name: "Nebula Drift",
        params: {
          [PARAMETERS.WT_MIX]: 0.9, [PARAMETERS.WT_POS]: 0.4, [PARAMETERS.WT_LFO_AMT]: 0.6,
          [PARAMETERS.LFO_RATE]: 0.15, [PARAMETERS.UNISON_DETUNE]: 0.45,
          [PARAMETERS.ENV_ATTACK]: 4.0, [PARAMETERS.ENV_RELEASE]: 5.0,
          [PARAMETERS.FILTER_CUTOFF]: 800, [PARAMETERS.FILTER_RES]: 0.3,
          [PARAMETERS.REVERB_MIX]: 0.7, [PARAMETERS.REVERB_DECAY]: 0.92,
          [PARAMETERS.DELAY_MIX]: 0.4, [PARAMETERS.DELAY_TIME]: 0.6,
          [PARAMETERS.LFO1_MORPH]: 0.5, [PARAMETERS.CHAOS_AMT]: 0.02
        }
      },
      {
        name: "Void Echoes",
        params: {
          [PARAMETERS.OSC1_MIX]: 0.6, [PARAMETERS.OSC2_MIX]: 0.5, [PARAMETERS.OSC2_DETUNE]: 0.08,
          [PARAMETERS.SUB_OSC_MIX]: 0.4, [PARAMETERS.SUB_OSC_WAVE]: 2,
          [PARAMETERS.FILTER_CUTOFF]: 450, [PARAMETERS.FILTER_RES]: 0.6,
          [PARAMETERS.FILTER_LFO_AMT]: 1200, [PARAMETERS.LFO_RATE]: 0.08,
          [PARAMETERS.ENV_ATTACK]: 3.5, [PARAMETERS.ENV_RELEASE]: 6.0,
          [PARAMETERS.REVERB_MIX]: 0.8, [PARAMETERS.REVERB_DECAY]: 0.98,
          [PARAMETERS.TS_MIX]: 0.15, [PARAMETERS.TS_DRIVE]: 0.4
        }
      },
      {
        name: "Solar Flare",
        params: {
          [PARAMETERS.OSC_FM_AMT]: 0.3, [PARAMETERS.OSC1_MIX]: 0.7, [PARAMETERS.OSC2_MIX]: 0.6,
          [PARAMETERS.OSC2_DETUNE]: 12.02, [PARAMETERS.WT_MIX]: 0.5,
          [PARAMETERS.FILTER_CUTOFF]: 1500, [PARAMETERS.FILTER_ENV_DEPTH]: 3000,
          [PARAMETERS.FILTER_ATTACK]: 2.0, [PARAMETERS.FILTER_DECAY]: 4.0,
          [PARAMETERS.ENV_ATTACK]: 2.5, [PARAMETERS.ENV_RELEASE]: 4.0,
          [PARAMETERS.REVERB_MIX]: 0.5, [PARAMETERS.DELAY_MIX]: 0.3,
          [PARAMETERS.LFO2_MORPH]: 2.0, [PARAMETERS.LFO2_RATE]: 0.4
        }
      },
      {
        name: "Deep Sea Drone",
        params: {
          [PARAMETERS.LOW_SHELF_ENABLE]: 1, [PARAMETERS.LOW_SHELF_FREQ]: 120, [PARAMETERS.LOW_SHELF_GAIN]: 12,
          [PARAMETERS.SUB_OSC_MIX]: 0.9, [PARAMETERS.NOISE_MIX]: 0.2,
          [PARAMETERS.FILTER_CUTOFF]: 300, [PARAMETERS.FILTER_RES]: 0.5,
          [PARAMETERS.ENV_ATTACK]: 5.0, [PARAMETERS.ENV_RELEASE]: 8.0,
          [PARAMETERS.REVERB_MIX]: 0.6, [PARAMETERS.REVERB_DAMP]: 0.8,
          [PARAMETERS.CHAOS_AMT]: 0.05, [PARAMETERS.LFO1_MORPH]: 4.0
        }
      },
      {
        name: "Prism Shimmer",
        params: {
          [PARAMETERS.WT_MIX]: 0.8, [PARAMETERS.WT_DETUNE]: 24.03, [PARAMETERS.WT_POS]: 0.7,
          [PARAMETERS.OSC1_MIX]: 0.4, [PARAMETERS.UNISON_DETUNE]: 0.7,
          [PARAMETERS.FILTER_CUTOFF]: 3500, [PARAMETERS.FILTER_RES]: 0.2,
          [PARAMETERS.ENV_ATTACK]: 2.0, [PARAMETERS.ENV_RELEASE]: 3.5,
          [PARAMETERS.REVERB_MIX]: 0.7, [PARAMETERS.DELAY_MIX]: 0.5,
          [PARAMETERS.DELAY_TIME]: 0.4, [PARAMETERS.DELAY_WIDTH]: 1.0
        }
      },
      {
        name: "Ghost Machine",
        params: {
          [PARAMETERS.DPW_MIX]: 0.6, [PARAMETERS.DPW_DETUNE]: 0.15, [PARAMETERS.OSC_FM_AMT]: 0.2,
          [PARAMETERS.FILTER_CUTOFF]: 1200, [PARAMETERS.FILTER_LFO_AMT]: 2500,
          [PARAMETERS.LFO_RATE]: 0.1, [PARAMETERS.LFO1_MORPH]: 3.5,
          [PARAMETERS.ENV_ATTACK]: 3.0, [PARAMETERS.ENV_RELEASE]: 4.5,
          [PARAMETERS.REVERB_MIX]: 0.5, [PARAMETERS.TS_MIX]: 0.2,
          [PARAMETERS.TS_TONE]: 0.8, [PARAMETERS.CHAOS_AMT]: 0.03
        }
      }
    ]
  },
  {
    category: "Cutting Leads",
    presets: [
      {
        name: "Plasma Cutter",
        params: {
          [PARAMETERS.DPW_MIX]: 0.9, [PARAMETERS.DPW_DETUNE]: 0.05, [PARAMETERS.TS_MIX]: 0.6,
          [PARAMETERS.TS_DRIVE]: 0.8, [PARAMETERS.FILTER_CUTOFF]: 4000,
          [PARAMETERS.FILTER_RES]: 0.4, [PARAMETERS.FILTER_ENV_DEPTH]: 2000,
          [PARAMETERS.ENV_ATTACK]: 0.01, [PARAMETERS.ENV_DECAY]: 0.4,
          [PARAMETERS.ENV_SUSTAIN]: 0.5, [PARAMETERS.DELAY_MIX]: 0.3
        }
      },
      {
        name: "Sync Ripper",
        params: {
          [PARAMETERS.OSC_SYNC_ENABLE]: 1, [PARAMETERS.OSC1_MIX]: 0.8, [PARAMETERS.OSC2_MIX]: 0.9,
          [PARAMETERS.OSC2_DETUNE]: 12.1, [PARAMETERS.FILTER_CUTOFF]: 2000,
          [PARAMETERS.FILTER_ENV_DEPTH]: 6000, [PARAMETERS.FILTER_ATTACK]: 0.05,
          [PARAMETERS.ENV_ATTACK]: 0.02, [PARAMETERS.ENV_DECAY]: 0.5,
          [PARAMETERS.REVERB_MIX]: 0.3, [PARAMETERS.TS_MIX]: 0.4
        }
      },
      {
        name: "Warped Circuit",
        params: {
          [PARAMETERS.WT_MIX]: 1.0, [PARAMETERS.WT_POS]: 0.3, [PARAMETERS.WT_LFO_AMT]: 0.7,
          [PARAMETERS.LFO_RATE]: 6.0, [PARAMETERS.CHAOS_AMT]: 0.1,
          [PARAMETERS.FILTER_CUTOFF]: 2500, [PARAMETERS.FILTER_RES]: 0.7,
          [PARAMETERS.ENV_ATTACK]: 0.01, [PARAMETERS.ENV_DECAY]: 0.3,
          [PARAMETERS.DELAY_MIX]: 0.4, [PARAMETERS.DELAY_FEEDBACK]: 0.6
        }
      },
      {
        name: "FM Shred",
        params: {
          [PARAMETERS.OSC_FM_AMT]: 0.7, [PARAMETERS.OSC1_MIX]: 0.5, [PARAMETERS.OSC2_MIX]: 0.8,
          [PARAMETERS.OSC2_DETUNE]: 7.0, [PARAMETERS.FILTER_CUTOFF]: 3000,
          [PARAMETERS.FILTER_RES]: 0.3, [PARAMETERS.ENV_ATTACK]: 0.01,
          [PARAMETERS.ENV_DECAY]: 0.4, [PARAMETERS.TS_MIX]: 0.3, [PARAMETERS.TS_DRIVE]: 0.6
        }
      },
      {
        name: "Unison Power",
        params: {
          [PARAMETERS.OSC1_MIX]: 0.8, [PARAMETERS.UNISON_DETUNE]: 0.4, [PARAMETERS.OSC2_MIX]: 0.6,
          [PARAMETERS.OSC2_DETUNE]: 0.2, [PARAMETERS.FILTER_CUTOFF]: 4000,
          [PARAMETERS.FILTER_RES]: 0.2, [PARAMETERS.ENV_ATTACK]: 0.05,
          [PARAMETERS.ENV_DECAY]: 0.5, [PARAMETERS.REVERB_MIX]: 0.4
        }
      }
    ]
  },
  {
    category: "Foundation Basses",
    presets: [
      {
        name: "Tectonic Sub",
        params: {
          [PARAMETERS.SUB_OSC_MIX]: 1.0, [PARAMETERS.SUB_OSC_WAVE]: 3,
          [PARAMETERS.LOW_SHELF_ENABLE]: 1, [PARAMETERS.LOW_SHELF_FREQ]: 80,
          [PARAMETERS.LOW_SHELF_GAIN]: 18, [PARAMETERS.FILTER_CUTOFF]: 150,
          [PARAMETERS.ENV_ATTACK]: 0.05, [PARAMETERS.ENV_DECAY]: 0.8,
          [PARAMETERS.TS_MIX]: 0.2, [PARAMETERS.TS_DRIVE]: 0.3
        }
      },
      {
        name: "Industrial Growl",
        params: {
          [PARAMETERS.DPW_MIX]: 0.8, [PARAMETERS.OSC_FM_AMT]: 0.4, [PARAMETERS.TS_MIX]: 0.7,
          [PARAMETERS.TS_DRIVE]: 0.9, [PARAMETERS.FILTER_CUTOFF]: 400,
          [PARAMETERS.FILTER_RES]: 0.6, [PARAMETERS.FILTER_ENV_DEPTH]: 4000,
          [PARAMETERS.ENV_ATTACK]: 0.01, [PARAMETERS.ENV_DECAY]: 0.5
        }
      },
      {
        name: "Acid Storm",
        params: {
          [PARAMETERS.SEQ_ENABLE]: 1, [PARAMETERS.SEQ_TEMPO]: 132, [PARAMETERS.DPW_MIX]: 1.0,
          [PARAMETERS.FILTER_CUTOFF]: 300, [PARAMETERS.FILTER_RES]: 0.85,
          [PARAMETERS.FILTER_ENV_DEPTH]: 5000, [PARAMETERS.SEQ_STEP_0]: 0,
          [PARAMETERS.SEQ_STEP_1]: 0, [PARAMETERS.SEQ_STEP_2]: 12, [PARAMETERS.SEQ_STEP_3]: 0,
          [PARAMETERS.SEQ_STEP_4]: 7, [PARAMETERS.SEQ_STEP_5]: 0, [PARAMETERS.SEQ_STEP_6]: 3,
          [PARAMETERS.SEQ_STEP_7]: 0
        }
      },
      {
        name: "Wavetable Bass",
        params: {
          [PARAMETERS.WT_MIX]: 1.0, [PARAMETERS.WT_POS]: 0.1, [PARAMETERS.FILTER_CUTOFF]: 500,
          [PARAMETERS.FILTER_RES]: 0.4, [PARAMETERS.FILTER_ENV_DEPTH]: 2000,
          [PARAMETERS.ENV_ATTACK]: 0.01, [PARAMETERS.ENV_DECAY]: 0.5,
          [PARAMETERS.TS_MIX]: 0.3, [PARAMETERS.TS_DRIVE]: 0.5
        }
      },
      {
        name: "Dirty Unison",
        params: {
          [PARAMETERS.OSC1_MIX]: 0.9, [PARAMETERS.UNISON_DETUNE]: 0.15, [PARAMETERS.SUB_OSC_MIX]: 0.7,
          [PARAMETERS.FILTER_CUTOFF]: 400, [PARAMETERS.FILTER_RES]: 0.3,
          [PARAMETERS.ENV_ATTACK]: 0.05, [PARAMETERS.ENV_DECAY]: 0.6,
          [PARAMETERS.TS_MIX]: 0.4, [PARAMETERS.TS_DRIVE]: 0.6
        }
      }
    ]
  },
  {
    category: "Percussive Plucks",
    presets: [
      {
        name: "Crystal Pluck",
        params: {
          [PARAMETERS.WT_MIX]: 0.9, [PARAMETERS.WT_DETUNE]: 12, [PARAMETERS.WT_POS]: 0.4,
          [PARAMETERS.FILTER_CUTOFF]: 4000, [PARAMETERS.FILTER_RES]: 0.1,
          [PARAMETERS.ENV_ATTACK]: 0.01, [PARAMETERS.ENV_DECAY]: 0.4,
          [PARAMETERS.ENV_SUSTAIN]: 0.0, [PARAMETERS.REVERB_MIX]: 0.4
        }
      },
      {
        name: "DPW Snap",
        params: {
          [PARAMETERS.DPW_MIX]: 1.0, [PARAMETERS.DPW_DETUNE]: 0.1, [PARAMETERS.FILTER_CUTOFF]: 1500,
          [PARAMETERS.FILTER_ENV_DEPTH]: 5000, [PARAMETERS.FILTER_DECAY]: 0.05,
          [PARAMETERS.ENV_ATTACK]: 0.01, [PARAMETERS.ENV_DECAY]: 0.1,
          [PARAMETERS.ENV_SUSTAIN]: 0.0, [PARAMETERS.DELAY_MIX]: 0.2
        }
      },
      {
        name: "Digital Harp",
        params: {
          [PARAMETERS.WT_MIX]: 0.8, [PARAMETERS.WT_POS]: 0.2, [PARAMETERS.ENV_ATTACK]: 0.01,
          [PARAMETERS.ENV_DECAY]: 1.2, [PARAMETERS.ENV_SUSTAIN]: 0.0,
          [PARAMETERS.REVERB_MIX]: 0.6, [PARAMETERS.DELAY_MIX]: 0.3
        }
      },
      {
        name: "Noise Perc",
        params: {
          [PARAMETERS.NOISE_MIX]: 0.9, [PARAMETERS.FILTER_CUTOFF]: 5000, [PARAMETERS.FILTER_RES]: 0.8,
          [PARAMETERS.ENV_ATTACK]: 0.01, [PARAMETERS.ENV_DECAY]: 0.05,
          [PARAMETERS.ENV_SUSTAIN]: 0.0, [PARAMETERS.TS_MIX]: 0.2
        }
      }
    ]
  },
  {
    category: "Retro Keys",
    presets: [
      {
        name: "Tine Piano",
        params: {
          [PARAMETERS.WT_MIX]: 0.7, [PARAMETERS.WT_POS]: 0.4, [PARAMETERS.OSC1_WAVE]: 1,
          [PARAMETERS.OSC1_MIX]: 0.3, [PARAMETERS.FILTER_CUTOFF]: 1200,
          [PARAMETERS.ENV_ATTACK]: 0.01, [PARAMETERS.ENV_DECAY]: 1.5,
          [PARAMETERS.ENV_SUSTAIN]: 0.0, [PARAMETERS.REVERB_MIX]: 0.4
        }
      },
      {
        name: "Digital Organ",
        params: {
          [PARAMETERS.OSC1_MIX]: 0.6, [PARAMETERS.OSC2_MIX]: 0.4, [PARAMETERS.OSC2_DETUNE]: 12,
          [PARAMETERS.FILTER_CUTOFF]: 3000, [PARAMETERS.ENV_ATTACK]: 0.05,
          [PARAMETERS.ENV_SUSTAIN]: 0.8, [PARAMETERS.ENV_RELEASE]: 0.2,
          [PARAMETERS.REVERB_MIX]: 0.3
        }
      },
      {
        name: "Vintage DPW",
        params: {
          [PARAMETERS.DPW_MIX]: 0.6, [PARAMETERS.LOW_SHELF_ENABLE]: 1, [PARAMETERS.LOW_SHELF_FREQ]: 300,
          [PARAMETERS.LOW_SHELF_GAIN]: 6, [PARAMETERS.FILTER_CUTOFF]: 1500,
          [PARAMETERS.ENV_ATTACK]: 0.05, [PARAMETERS.ENV_DECAY]: 1.0,
          [PARAMETERS.REVERB_MIX]: 0.3
        }
      }
    ]
  },
  {
    category: "Chaos & Glitch",
    presets: [
      {
        name: "Circuit Bend",
        params: {
          [PARAMETERS.CHAOS_AMT]: 0.6, [PARAMETERS.OSC1_MIX]: 0.7, [PARAMETERS.OSC2_MIX]: 0.7,
          [PARAMETERS.LFO1_MORPH]: 4.0, [PARAMETERS.LFO_RATE]: 12,
          [PARAMETERS.FILTER_LFO_AMT]: 3000, [PARAMETERS.ENV_ATTACK]: 0.01,
          [PARAMETERS.DELAY_MIX]: 0.5, [PARAMETERS.DELAY_TIME]: 0.05
        }
      },
      {
        name: "Alien Radio",
        params: {
          [PARAMETERS.WT_MIX]: 1.0, [PARAMETERS.WT_POS]: 0.5, [PARAMETERS.WT_LFO_AMT]: 0.9,
          [PARAMETERS.LFO_RATE]: 15.0, [PARAMETERS.NOISE_MIX]: 0.4,
          [PARAMETERS.FILTER_CUTOFF]: 2000, [PARAMETERS.FILTER_RES]: 0.6,
          [PARAMETERS.DELAY_MIX]: 0.6, [PARAMETERS.REVERB_MIX]: 0.4
        }
      },
      {
        name: "Stochastic Rain",
        params: {
          [PARAMETERS.STOCH_DIST]: 1, [PARAMETERS.STOCH_TIME]: 0.02, [PARAMETERS.STOCH_AMP]: 0.8,
          [PARAMETERS.WT_MIX]: 0.5, [PARAMETERS.REVERB_MIX]: 0.7,
          [PARAMETERS.ENV_ATTACK]: 0.01, [PARAMETERS.ENV_RELEASE]: 0.5
        }
      }
    ]
  },
  {
    category: "Rhythmic Motion",
    presets: [
      {
        name: "Techno Pulse",
        params: {
          [PARAMETERS.SEQ_ENABLE]: 1, [PARAMETERS.SEQ_TEMPO]: 128, [PARAMETERS.DPW_MIX]: 0.8,
          [PARAMETERS.FILTER_CUTOFF]: 1000, [PARAMETERS.FILTER_RES]: 0.4,
          [PARAMETERS.SEQ_STEP_0]: 0, [PARAMETERS.SEQ_STEP_1]: 0, [PARAMETERS.SEQ_STEP_2]: 7,
          [PARAMETERS.SEQ_STEP_3]: 0, [PARAMETERS.SEQ_STEP_4]: 12, [PARAMETERS.SEQ_STEP_5]: 0,
          [PARAMETERS.SEQ_STEP_6]: 5, [PARAMETERS.SEQ_STEP_7]: 0
        }
      },
      {
        name: "Evolving Seq",
        params: {
          [PARAMETERS.SEQ_ENABLE]: 1, [PARAMETERS.SEQ_TEMPO]: 110, [PARAMETERS.WT_MIX]: 0.7,
          [PARAMETERS.WT_POS]: 0.3, [PARAMETERS.WT_LFO_AMT]: 0.5, [PARAMETERS.LFO_RATE]: 0.2,
          [PARAMETERS.FILTER_CUTOFF]: 1500, [PARAMETERS.REVERB_MIX]: 0.5,
          [PARAMETERS.SEQ_STEP_0]: 0, [PARAMETERS.SEQ_STEP_1]: 3, [PARAMETERS.SEQ_STEP_2]: 5,
          [PARAMETERS.SEQ_STEP_3]: 7, [PARAMETERS.SEQ_STEP_4]: 10, [PARAMETERS.SEQ_STEP_5]: 12,
          [PARAMETERS.SEQ_STEP_6]: 7, [PARAMETERS.SEQ_STEP_7]: 5
        }
      }
    ]
  }
];
