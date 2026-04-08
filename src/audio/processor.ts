import { PolyBLEPOscillator } from './dsp/PolyBLEP';
import { ZDFLadderFilter } from './dsp/ZDFLadder';
import { PingPongDelay } from './dsp/PingPongDelay';
import { Reverb } from './dsp/Reverb';
import { ADSR } from './dsp/ADSR';
import { LFO } from './dsp/LFO';
import { WavetableOscillator } from './dsp/WavetableOscillator';
import { PARAMETERS, EVENTS, EventRingBuffer } from './SharedState';

declare const sampleRate: number;
declare class AudioWorkletProcessor {
  readonly port: MessagePort;
}
declare function registerProcessor(name: string, processor: any): void;

// @ts-ignore
class Voice {
  public osc1: PolyBLEPOscillator;
  public osc1UnisonL: PolyBLEPOscillator;
  public osc1UnisonR: PolyBLEPOscillator;
  public osc2: PolyBLEPOscillator;
  public subOsc: PolyBLEPOscillator;
  public wtOsc: WavetableOscillator;
  public filter: ZDFLadderFilter;
  public adsr: ADSR;
  public filterAdsr: ADSR;
  public note: number = -1;
  public freq: number = 0;
  public isActive: boolean = false;
  public startTime: number = 0;

  constructor(sampleRate: number) {
    this.osc1 = new PolyBLEPOscillator(sampleRate);
    this.osc1UnisonL = new PolyBLEPOscillator(sampleRate);
    this.osc1UnisonR = new PolyBLEPOscillator(sampleRate);
    this.osc2 = new PolyBLEPOscillator(sampleRate);
    this.subOsc = new PolyBLEPOscillator(sampleRate);
    this.wtOsc = new WavetableOscillator(sampleRate);
    this.filter = new ZDFLadderFilter(sampleRate);
    this.adsr = new ADSR(sampleRate);
    this.filterAdsr = new ADSR(sampleRate);
  }

  trigger(note: number, freq: number, time: number) {
    this.note = note;
    this.freq = freq;
    this.isActive = true;
    this.startTime = time;
    this.adsr.trigger();
    this.filterAdsr.trigger();
  }

  release() {
    this.adsr.releaseNote();
    this.filterAdsr.releaseNote();
  }

  process(p: Float32Array, lfo1Val: number, lfo2Val: number): number {
    if (!this.isActive) return 0;

    const envVal = this.adsr.process();
    const filterEnvVal = this.filterAdsr.process();

    if (this.adsr.isIdle && envVal < 0.0001) {
      this.isActive = false;
      return 0;
    }

    const osc1Wave = p[PARAMETERS.OSC1_WAVE];
    const osc1Mix = p[PARAMETERS.OSC1_MIX];
    const osc2Detune = p[PARAMETERS.OSC2_DETUNE];
    const osc2Wave = p[PARAMETERS.OSC2_WAVE];
    const osc2Mix = p[PARAMETERS.OSC2_MIX];

    // LFO2 can modulate Pitch
    const lfo2Amt = p[PARAMETERS.LFO2_AMT] || 0;
    const pitchMod = Math.pow(2, (lfo1Val * 0.1 + lfo2Val * lfo2Amt) / 12);

    this.osc1.setFrequency(this.freq * pitchMod);
    const s1 = osc1Wave < 0.5 ? this.osc1.processSaw() : this.osc1.processPulse(0.5);
    
    const osc2Freq = this.freq * Math.pow(2, osc2Detune / 12) * pitchMod;
    this.osc2.setFrequency(osc2Freq);
    const s2 = osc2Wave < 0.5 ? this.osc2.processSaw() : this.osc2.processPulse(0.5);

    // New additions
    const unisonDetune = p[PARAMETERS.UNISON_DETUNE] || 0;
    const subMix = p[PARAMETERS.SUB_OSC_MIX] || 0;
    const noiseMix = p[PARAMETERS.NOISE_MIX] || 0;

    // Unison (on OSC1)
    let unisonSignal = 0;
    if (unisonDetune > 0) {
      // Slight detune for unison copies
      this.osc1UnisonL.setFrequency(this.freq * pitchMod * Math.pow(2, -unisonDetune * 0.05));
      this.osc1UnisonR.setFrequency(this.freq * pitchMod * Math.pow(2, unisonDetune * 0.05));
      const uL = osc1Wave < 0.5 ? this.osc1UnisonL.processSaw() : this.osc1UnisonL.processPulse(0.5);
      const uR = osc1Wave < 0.5 ? this.osc1UnisonR.processSaw() : this.osc1UnisonR.processPulse(0.5);
      unisonSignal = (uL + uR) * 0.5 * osc1Mix;
    }

    // Sub Osc (1 octave down)
    this.subOsc.setFrequency(this.freq * pitchMod * 0.5);
    const subSignal = this.subOsc.processPulse(0.5) * subMix;

    // Noise
    const noiseSignal = (Math.random() * 2 - 1) * noiseMix;

    // Wavetable Osc
    const wtMix = p[PARAMETERS.WT_MIX] || 0;
    const wtPos = p[PARAMETERS.WT_POS] || 0;
    const wtLfoAmt = p[PARAMETERS.WT_LFO_AMT] || 0;
    const wtDetune = p[PARAMETERS.WT_DETUNE] || 0;
    
    // Scrub index with LFO1
    const scrub = Math.max(0, Math.min(1, wtPos + lfo1Val * wtLfoAmt));
    const wtFreq = this.freq * Math.pow(2, wtDetune / 12) * pitchMod;
    this.wtOsc.setFrequency(wtFreq);
    const wtSignal = this.wtOsc.process(scrub) * wtMix;

    // Report read index to a shared parameter slot (using slot 60 for visualization)
    // Only the first active voice reports to avoid flickering if multiple voices are active,
    // or we could average them, but usually showing one is enough for UI.
    p[60] = this.wtOsc.lastReadIndex;

    const mixed = (s1 * osc1Mix + s2 * osc2Mix + unisonSignal + subSignal + noiseSignal + wtSignal) * envVal;

    // Filter Modulation
    const targetCutoff = p[PARAMETERS.FILTER_CUTOFF];
    const filterRes = p[PARAMETERS.FILTER_RES];
    const envAmt = p[PARAMETERS.FILTER_ENV_DEPTH] || 0;
    const lfo1Amt = p[PARAMETERS.FILTER_LFO_AMT];
    
    let modCutoff = targetCutoff + (filterEnvVal * envAmt) + (lfo1Val * lfo1Amt);
    modCutoff = Math.max(20, Math.min(20000, modCutoff));
    this.filter.setParameters(modCutoff, filterRes);

    return this.filter.process(mixed);
  }
}

// @ts-ignore
class SynthProcessor extends AudioWorkletProcessor {
  private voices: Voice[] = [];
  private maxVoices: number = 8;
  private delay: PingPongDelay;
  private reverb: Reverb;
  private lfo1: LFO;
  private lfo2: LFO;

  private paramArray: Float32Array | null = null;
  private eventBuffer: EventRingBuffer | null = null;
  private eventOut: Float32Array = new Float32Array(2);
  private useSAB: boolean = false;
  private eventQueue: Array<{type: number, value: number}> = [];
  private frameCount: number = 0;

  // Recording
  private isRecording: boolean = false;
  private isStopping: boolean = false;
  private stopTailFrames: number = 0;
  private recordBuffer: Float32Array[] = [];
  private recordPtr: number = 0;
  private maxRecordFrames: number = 48000 * 60 * 5; // 5 minutes max

  // Sequencer
  private seqStep: number = 0;
  private seqFrameCounter: number = 0;
  private seqNotes: number[] = new Array(8).fill(-1); // Track notes triggered by sequencer
  private lastSentStep: number = -1;

  constructor() {
    super();
    for (let i = 0; i < this.maxVoices; i++) {
      this.voices.push(new Voice(sampleRate));
    }
    this.delay = new PingPongDelay(sampleRate);
    this.reverb = new Reverb(sampleRate);
    this.lfo1 = new LFO(sampleRate);
    this.lfo2 = new LFO(sampleRate);

    this.port.onmessage = (e) => {
      if (e.data.type === 'init') {
        this.useSAB = e.data.useSAB;
        this.paramArray = new Float32Array(e.data.paramSab);
        this.eventBuffer = new EventRingBuffer(e.data.eventSab, 1024, this.useSAB);
      } else if (e.data.type === 'param') {
        if (this.paramArray) this.paramArray[e.data.index] = e.data.value;
      } else if (e.data.type === 'event') {
        this.eventQueue.push({ type: e.data.eventType, value: e.data.value });
      }
    };
  }

  private processEvent(type: number, value: number) {
    if (type === EVENTS.NOTE_ON) {
      const note = value;
      const freq = 440 * Math.pow(2, (note - 69) / 12);
      
      // Find free voice or steal oldest
      let voice = this.voices.find(v => !v.isActive);
      if (!voice) {
        voice = this.voices.reduce((oldest, current) => 
          current.startTime < oldest.startTime ? current : oldest
        );
      }
      
      voice.trigger(note, freq, this.frameCount);
    } else if (type === EVENTS.NOTE_OFF) {
      const note = value;
      this.voices.forEach(v => {
        if (v.isActive && v.note === note) {
          v.release();
        }
      });
    } else if (type === EVENTS.START_RECORD) {
      this.isRecording = true;
      this.recordBuffer = [new Float32Array(this.maxRecordFrames), new Float32Array(this.maxRecordFrames)];
      this.recordPtr = 0;
    } else if (type === EVENTS.STOP_RECORD) {
      this.isStopping = true;
      this.stopTailFrames = sampleRate * 2; // 2 seconds tail
    }
  }

  process(inputs: Float32Array[][], outputs: Float32Array[][], parameters: Record<string, Float32Array>): boolean {
    const output = outputs[0];
    if (!output || !this.paramArray || !this.eventBuffer) return true;

    const channelCount = output.length;
    const numFrames = output[0].length;

    // 1. Process discrete events
    if (this.useSAB) {
      while (this.eventBuffer.pop(this.eventOut)) {
        this.processEvent(this.eventOut[0], this.eventOut[1]);
      }
    } else {
      while (this.eventQueue.length > 0) {
        const ev = this.eventQueue.shift()!;
        this.processEvent(ev.type, ev.value);
      }
    }

    // 2. Read parameters
    const p = this.paramArray;
    
    // Update Global Modulators
    this.lfo1.rate = p[PARAMETERS.LFO_RATE];
    this.lfo2.rate = p[PARAMETERS.LFO2_RATE] || 1.0;

    // Update per-voice params (ADSR & Filter ADSR)
    for (const v of this.voices) {
      v.adsr.attack = p[PARAMETERS.ENV_ATTACK];
      v.adsr.decay = p[PARAMETERS.ENV_DECAY];
      v.adsr.sustain = p[PARAMETERS.ENV_SUSTAIN];
      v.adsr.release = p[PARAMETERS.ENV_RELEASE];

      v.filterAdsr.attack = p[PARAMETERS.FILTER_ATTACK] || 0.01;
      v.filterAdsr.decay = p[PARAMETERS.FILTER_DECAY] || 0.1;
      v.filterAdsr.sustain = p[PARAMETERS.FILTER_SUSTAIN] || 0.5;
      v.filterAdsr.release = p[PARAMETERS.FILTER_RELEASE] || 0.5;
    }

    const masterVol = p[PARAMETERS.MASTER_VOL];

    // Sequencer Logic
    const seqEnabled = p[PARAMETERS.SEQ_ENABLE] > 0.5;
    const tempo = p[PARAMETERS.SEQ_TEMPO] || 120;
    const framesPerStep = Math.floor((60 / tempo) * sampleRate / 4); // 16th notes
    const lfoSyncEnabled = p[PARAMETERS.LFO_SYNC_ENABLE] > 0.5;

    for (let i = 0; i < numFrames; ++i) {
      this.frameCount++;
      
      if (seqEnabled) {
        this.seqFrameCounter++;
        if (this.seqFrameCounter >= framesPerStep) {
          // Release previous step note using the stored note number
          const prevStep = this.seqStep;
          if (this.seqNotes[prevStep] !== -1) {
            this.processEvent(EVENTS.NOTE_OFF, this.seqNotes[prevStep]);
            this.seqNotes[prevStep] = -1;
          }

          this.seqFrameCounter = 0;
          this.seqStep = (this.seqStep + 1) % 8;
          const stepOffset = p[PARAMETERS.SEQ_STEP_0 + this.seqStep];
          const note = 60 + stepOffset;
          this.seqNotes[this.seqStep] = note;
          this.processEvent(EVENTS.NOTE_ON, note);
        }
      }

      // Send step to UI if changed
      if (this.seqStep !== this.lastSentStep) {
        this.lastSentStep = this.seqStep;
        this.port.postMessage({ type: 'seq-step', step: this.seqStep });
      }

      // Global Modulators
      if (lfoSyncEnabled) {
        // Sync LFO rate to tempo (e.g., 1 LFO cycle per beat)
        this.lfo1.rate = (tempo / 60);
      } else {
        this.lfo1.rate = p[PARAMETERS.LFO_RATE];
      }
      const lfo1Val = this.lfo1.process();
      const lfo2Val = this.lfo2.process();

      // Process all voices
      let mixed = 0;
      for (const v of this.voices) {
        mixed += v.process(p, lfo1Val, lfo2Val);
      }

      // Effects
      this.delay.time += (p[PARAMETERS.DELAY_TIME] - this.delay.time) * 0.005;
      this.delay.feedback += (p[PARAMETERS.DELAY_FEEDBACK] - this.delay.feedback) * 0.005;
      this.delay.mix += (p[PARAMETERS.DELAY_MIX] - this.delay.mix) * 0.005;
      this.delay.width += (p[PARAMETERS.DELAY_WIDTH] - this.delay.width) * 0.005;
      this.reverb.decay += (p[PARAMETERS.REVERB_DECAY] - this.reverb.decay) * 0.005;
      this.reverb.mix += (p[PARAMETERS.REVERB_MIX] - this.reverb.mix) * 0.005;
      this.reverb.damp += (p[PARAMETERS.REVERB_DAMP] - this.reverb.damp) * 0.005;

      this.delay.process(mixed);
      this.reverb.process(this.delay.outL, this.delay.outR);
      
      const outL = this.reverb.outL * masterVol;
      const outR = this.reverb.outR * masterVol;

      // Recording
      if (this.isRecording && this.recordPtr < this.maxRecordFrames) {
        this.recordBuffer[0][this.recordPtr] = outL;
        this.recordBuffer[1][this.recordPtr] = outR;
        this.recordPtr++;

        if (this.isStopping) {
          this.stopTailFrames--;
          if (this.stopTailFrames <= 0) {
            this.isRecording = false;
            this.isStopping = false;
            this.port.postMessage({ 
              type: 'record-done', 
              buffer: [
                this.recordBuffer[0].slice(0, this.recordPtr),
                this.recordBuffer[1].slice(0, this.recordPtr)
              ] 
            });
          }
        }
      }

      // Output
      if (channelCount > 1) {
        output[0][i] = outL;
        output[1][i] = outR;
      } else {
        output[0][i] = (outL + outR) * 0.5;
      }

      // Scope reporting (every ~21ms at 48kHz)
      if (this.frameCount % 1024 === 0) {
        this.port.postMessage({ type: 'scope', data: output[0].slice(0, 128) });
      }
    }

    return true;
  }
}

// @ts-ignore
registerProcessor('synth-processor', SynthProcessor);