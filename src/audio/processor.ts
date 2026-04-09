import { PolyBLEPOscillator } from './dsp/PolyBLEP';
import { ZDFLadderFilter } from './dsp/ZDFLadder';
import { PingPongDelay } from './dsp/PingPongDelay';
import { Reverb } from './dsp/Reverb';
import { ADSR } from './dsp/ADSR';
import { LFO } from './dsp/LFO';
import { WavetableOscillator } from './dsp/WavetableOscillator';
import { DPWOscillator } from './dsp/DPWOscillator';
import { LowShelfFilter } from './dsp/LowShelf';
import { TubeScreamer } from './dsp/TubeScreamer';
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
  public dpwOsc: DPWOscillator;
  public wtOsc: WavetableOscillator;
  public filter: ZDFLadderFilter;
  public filterFX: ZDFLadderFilter;
  public adsr: ADSR;
  public filterAdsr: ADSR;
  public note: number = -1;
  public freq: number = 0;
  public isActive: boolean = false;
  public startTime: number = 0;
  public currentEnv: number = 0;
  public velocity: number = 1.0;
  private chaosOffset: number = 0;
  private lfoFadeCounter: number = 0;

  constructor(sampleRate: number) {
    this.osc1 = new PolyBLEPOscillator(sampleRate);
    this.osc1UnisonL = new PolyBLEPOscillator(sampleRate);
    this.osc1UnisonR = new PolyBLEPOscillator(sampleRate);
    this.osc2 = new PolyBLEPOscillator(sampleRate);
    this.subOsc = new PolyBLEPOscillator(sampleRate);
    this.dpwOsc = new DPWOscillator(sampleRate);
    this.wtOsc = new WavetableOscillator(sampleRate);
    this.filter = new ZDFLadderFilter(sampleRate);
    this.filterFX = new ZDFLadderFilter(sampleRate);
    this.adsr = new ADSR(sampleRate);
    this.filterAdsr = new ADSR(sampleRate);
  }

  trigger(note: number, freq: number, time: number, chaosAmt: number, velocity: number = 1.0) {
    this.note = note;
    this.freq = freq;
    this.velocity = velocity;
    this.isActive = true;
    this.startTime = time;
    this.adsr.trigger();
    this.filterAdsr.trigger();
    this.filter.reset();
    this.filterFX.reset();
    this.osc1.reset();
    this.osc1UnisonL.reset();
    this.osc1UnisonR.reset();
    this.osc2.reset();
    this.subOsc.reset();
    this.chaosOffset = (Math.random() * 2 - 1) * chaosAmt;
    this.lfoFadeCounter = 0;
  }

  release() {
    this.adsr.releaseNote();
    this.filterAdsr.releaseNote();
  }

  process(p: Float32Array, lfo1Val: number, lfo2Val: number): { dry: number, fx: number, modFX: number, modRate: number } {
    if (!this.isActive) return { dry: 0, fx: 0, modFX: 0, modRate: 0 };

    const envVal = this.adsr.process();
    this.currentEnv = envVal;
    const filterEnvVal = this.filterAdsr.process();

    if (this.adsr.isIdle && envVal < 0.0001) {
      this.isActive = false;
      return { dry: 0, fx: 0, modFX: 0, modRate: 0 };
    }

    const osc1Wave = Math.round(p[PARAMETERS.OSC1_WAVE] || 0);
    const osc1Mix = p[PARAMETERS.OSC1_MIX];
    const osc2Detune = p[PARAMETERS.OSC2_DETUNE];
    const osc2Wave = Math.round(p[PARAMETERS.OSC2_WAVE] || 0);
    const osc2Mix = p[PARAMETERS.OSC2_MIX];

    // Chaos
    const chaosFreq = this.freq * Math.pow(2, this.chaosOffset / 12);

    // LFO Fade
    const lfo1FadeTime = p[PARAMETERS.LFO1_FADE] || 0;
    const lfo2FadeTime = p[PARAMETERS.LFO2_FADE] || 0;
    this.lfoFadeCounter += 1 / sampleRate;
    
    const lfo1Fade = lfo1FadeTime > 0 ? Math.min(1, this.lfoFadeCounter / lfo1FadeTime) : 1;
    const lfo2Fade = lfo2FadeTime > 0 ? Math.min(1, this.lfoFadeCounter / lfo2FadeTime) : 1;

    const vLfo1 = lfo1Val * lfo1Fade;
    const vLfo2 = lfo2Val * lfo2Fade;

    // Modulation Matrix Logic (6x6)
    // Sources: vLfo1, vLfo2, filterEnvVal, envVal, this.velocity, this.chaosOffset
    const sources = [vLfo1, vLfo2, filterEnvVal, envVal, this.velocity, this.chaosOffset];
    
    let modPitch = 0;
    let modCutoff = 0;
    let modWT = 0;
    let modFX = 0;
    let modRes = 0;
    let modRate = 0;

    for (let s = 0; s < 6; s++) {
      modPitch += sources[s] * p[100 + s * 6 + 0];
      modCutoff += sources[s] * p[100 + s * 6 + 1];
      modWT += sources[s] * p[100 + s * 6 + 2];
      modFX += sources[s] * p[100 + s * 6 + 3];
      modRes += sources[s] * p[100 + s * 6 + 4];
      modRate += sources[s] * p[100 + s * 6 + 5];
    }

    // LFO2 can modulate Pitch (legacy)
    const lfo2Amt = p[PARAMETERS.LFO2_AMT] || 0;
    const pitchMod = Math.pow(2, (vLfo1 * 0.1 + vLfo2 * lfo2Amt + modPitch * 12) / 12);

    // FM and Sync
    const fmAmt = p[PARAMETERS.OSC_FM_AMT] || 0;
    const syncEnabled = p[PARAMETERS.OSC_SYNC_ENABLE] > 0.5;

    this.osc1.setFrequency(chaosFreq * pitchMod);
    let s1 = 0;
    if (osc1Wave === 0) s1 = this.osc1.processPulse(0.5);
    else if (osc1Wave === 1) s1 = this.osc1.processSaw();
    else if (osc1Wave === 2) s1 = this.osc1.processTriangle();
    else s1 = this.osc1.processSine();
    
    if (syncEnabled && this.osc1.didWrap) {
      this.osc2.phase = 0;
    }

    const fmMod = 1.0 + s1 * fmAmt;
    const osc2Freq = chaosFreq * Math.pow(2, osc2Detune / 12) * pitchMod * fmMod;
    this.osc2.setFrequency(osc2Freq);
    let s2 = 0;
    if (osc2Wave === 0) s2 = this.osc2.processPulse(0.5);
    else if (osc2Wave === 1) s2 = this.osc2.processSaw();
    else if (osc2Wave === 2) s2 = this.osc2.processTriangle();
    else s2 = this.osc2.processSine();

    // New additions
    const unisonDetune = p[PARAMETERS.UNISON_DETUNE] || 0;
    const subMix = p[PARAMETERS.SUB_OSC_MIX] || 0;
    const noiseMix = p[PARAMETERS.NOISE_MIX] || 0;

    // Unison (on OSC1)
    let unisonSignal = 0;
    if (unisonDetune > 0) {
      // Slight detune for unison copies
      this.osc1UnisonL.setFrequency(chaosFreq * pitchMod * Math.pow(2, -unisonDetune * 0.05));
      this.osc1UnisonR.setFrequency(chaosFreq * pitchMod * Math.pow(2, unisonDetune * 0.05));
      
      let uL = 0, uR = 0;
      if (osc1Wave === 0) { uL = this.osc1UnisonL.processPulse(0.5); uR = this.osc1UnisonR.processPulse(0.5); }
      else if (osc1Wave === 1) { uL = this.osc1UnisonL.processSaw(); uR = this.osc1UnisonR.processSaw(); }
      else if (osc1Wave === 2) { uL = this.osc1UnisonL.processTriangle(); uR = this.osc1UnisonR.processTriangle(); }
      else { uL = this.osc1UnisonL.processSine(); uR = this.osc1UnisonR.processSine(); }
      
      unisonSignal = (uL + uR) * 0.5 * osc1Mix;
    }

    // Sub Osc (1 octave down)
    const subWave = Math.round(p[PARAMETERS.SUB_OSC_WAVE] || 0);
    this.subOsc.setFrequency(chaosFreq * pitchMod * 0.5);
    let subSignal = 0;
    if (subWave === 0) subSignal = this.subOsc.processPulse(0.5);
    else if (subWave === 1) subSignal = this.subOsc.processSaw();
    else if (subWave === 2) subSignal = this.subOsc.processTriangle();
    else subSignal = this.subOsc.processSine();
    subSignal *= subMix;

    // DPW Osc
    const dpwMix = p[PARAMETERS.DPW_MIX] || 0;
    const dpwDetune = p[PARAMETERS.DPW_DETUNE] || 0;
    const dpwFreq = chaosFreq * Math.pow(2, dpwDetune / 12) * pitchMod;
    const dpwSignal = this.dpwOsc.process(dpwFreq) * dpwMix;

    // Noise
    const noiseSignal = (Math.random() * 2 - 1) * noiseMix;

    // Wavetable Osc
    const wtMix = p[PARAMETERS.WT_MIX] || 0;
    const wtPos = p[PARAMETERS.WT_POS] || 0;
    const wtLfoAmt = p[PARAMETERS.WT_LFO_AMT] || 0;
    const wtDetune = p[PARAMETERS.WT_DETUNE] || 0;
    
    // Scrub index with LFO1
    const scrub = Math.max(0, Math.min(1, wtPos + vLfo1 * wtLfoAmt + modWT));
    const wtFreq = chaosFreq * Math.pow(2, wtDetune / 12) * pitchMod;
    this.wtOsc.setFrequency(wtFreq);
    const wtSignal = this.wtOsc.process(scrub) * wtMix;

    p[66] = this.wtOsc.lastReadIndex;

    // Routing Logic
    const routeOsc1 = p[PARAMETERS.FX_SRC_OSC1] > 0.5;
    const routeOsc2 = p[PARAMETERS.FX_SRC_OSC2] > 0.5;
    const routeWT = p[PARAMETERS.FX_SRC_WT] > 0.5;

    let sigFX = 0;
    let sigDry = subSignal + dpwSignal + noiseSignal;

    const osc1Sig = (s1 * osc1Mix + unisonSignal);
    const osc2Sig = (s2 * osc2Mix);
    const wtSig = wtSignal;

    if (routeOsc1) sigFX += osc1Sig; else sigDry += osc1Sig;
    if (routeOsc2) sigFX += osc2Sig; else sigDry += osc2Sig;
    if (routeWT) sigFX += wtSig; else sigDry += wtSig;

    // Apply envelope
    sigFX *= envVal * this.velocity;
    sigDry *= envVal * this.velocity;

    // Filter Modulation
    const targetCutoff = p[PARAMETERS.FILTER_CUTOFF];
    const filterRes = Math.max(0, Math.min(0.99, p[PARAMETERS.FILTER_RES] + modRes));
    const envAmt = p[PARAMETERS.FILTER_ENV_DEPTH] || 0;
    const lfo1Amt = p[PARAMETERS.FILTER_LFO_AMT];
    
    let finalCutoff = targetCutoff + (filterEnvVal * envAmt) + (vLfo1 * lfo1Amt) + (modCutoff * 10000);
    finalCutoff = Math.max(20, Math.min(20000, finalCutoff));
    
    this.filter.setParameters(finalCutoff, filterRes);
    this.filterFX.setParameters(finalCutoff, filterRes);

    return {
      dry: this.filter.process(sigDry),
      fx: this.filterFX.process(sigFX),
      modFX,
      modRate
    };
  }
}

// @ts-ignore
class SynthProcessor extends AudioWorkletProcessor {
  private voices: Voice[] = [];
  private maxVoices: number = 8;
  private delay: PingPongDelay;
  private reverb: Reverb;
  private lowShelf: LowShelfFilter;
  private tubeScreamer: TubeScreamer;
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
  private seqNotes: number[] = new Array(16).fill(-1); // Track notes triggered by sequencer
  private lastSentStep: number = -1;
  private lastModRate: number = 0;

  constructor() {
    super();
    for (let i = 0; i < this.maxVoices; i++) {
      this.voices.push(new Voice(sampleRate));
    }
    this.delay = new PingPongDelay(sampleRate);
    this.reverb = new Reverb(sampleRate);
    this.lowShelf = new LowShelfFilter(sampleRate);
    this.tubeScreamer = new TubeScreamer(sampleRate);
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

  private processEvent(type: number, value: number, velocity: number = 1.0) {
    const p = this.paramArray;
    if (!p) return;

    if (type === EVENTS.NOTE_ON) {
      const note = value;
      const freq = 440 * Math.pow(2, (note - 69) / 12);
      const chaosAmt = p[PARAMETERS.CHAOS_AMT] || 0;
      
      // Find free voice or steal oldest
      let voice = this.voices.find(v => !v.isActive);
      if (!voice) {
        voice = this.voices.reduce((oldest, current) => 
          current.startTime < oldest.startTime ? current : oldest
        );
      }
      
      voice.trigger(note, freq, this.frameCount, chaosAmt, velocity);
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

    const stepParams = [
      PARAMETERS.SEQ_STEP_0, PARAMETERS.SEQ_STEP_1, PARAMETERS.SEQ_STEP_2, PARAMETERS.SEQ_STEP_3,
      PARAMETERS.SEQ_STEP_4, PARAMETERS.SEQ_STEP_5, PARAMETERS.SEQ_STEP_6, PARAMETERS.SEQ_STEP_7,
      PARAMETERS.SEQ_STEP_8, PARAMETERS.SEQ_STEP_9, PARAMETERS.SEQ_STEP_10, PARAMETERS.SEQ_STEP_11,
      PARAMETERS.SEQ_STEP_12, PARAMETERS.SEQ_STEP_13, PARAMETERS.SEQ_STEP_14, PARAMETERS.SEQ_STEP_15
    ];
    const velParams = [
      PARAMETERS.SEQ_VEL_0, PARAMETERS.SEQ_VEL_1, PARAMETERS.SEQ_VEL_2, PARAMETERS.SEQ_VEL_3,
      PARAMETERS.SEQ_VEL_4, PARAMETERS.SEQ_VEL_5, PARAMETERS.SEQ_VEL_6, PARAMETERS.SEQ_VEL_7,
      PARAMETERS.SEQ_VEL_8, PARAMETERS.SEQ_VEL_9, PARAMETERS.SEQ_VEL_10, PARAMETERS.SEQ_VEL_11,
      PARAMETERS.SEQ_VEL_12, PARAMETERS.SEQ_VEL_13, PARAMETERS.SEQ_VEL_14, PARAMETERS.SEQ_VEL_15
    ];
    const gateParams = [
      PARAMETERS.SEQ_GATE_0, PARAMETERS.SEQ_GATE_1, PARAMETERS.SEQ_GATE_2, PARAMETERS.SEQ_GATE_3,
      PARAMETERS.SEQ_GATE_4, PARAMETERS.SEQ_GATE_5, PARAMETERS.SEQ_GATE_6, PARAMETERS.SEQ_GATE_7,
      PARAMETERS.SEQ_GATE_8, PARAMETERS.SEQ_GATE_9, PARAMETERS.SEQ_GATE_10, PARAMETERS.SEQ_GATE_11,
      PARAMETERS.SEQ_GATE_12, PARAMETERS.SEQ_GATE_13, PARAMETERS.SEQ_GATE_14, PARAMETERS.SEQ_GATE_15
    ];

    for (let i = 0; i < numFrames; ++i) {
      this.frameCount++;
      
      if (seqEnabled) {
        this.seqFrameCounter++;

        // Gate logic
        const currentGate = p[gateParams[this.seqStep]] ?? 0.5;
        const gateFrames = Math.floor(framesPerStep * currentGate);
        if (this.seqFrameCounter === gateFrames) {
          if (this.seqNotes[this.seqStep] !== -1) {
            this.processEvent(EVENTS.NOTE_OFF, this.seqNotes[this.seqStep]);
          }
        }

        if (this.seqFrameCounter >= framesPerStep) {
          // Release previous step note if it's still on
          const prevStep = this.seqStep;
          if (this.seqNotes[prevStep] !== -1) {
            this.processEvent(EVENTS.NOTE_OFF, this.seqNotes[prevStep]);
            this.seqNotes[prevStep] = -1;
          }

          this.seqFrameCounter = 0;
          this.seqStep = (this.seqStep + 1) % 16;
          const stepOffset = p[stepParams[this.seqStep]];
          const velocity = p[velParams[this.seqStep]] ?? 1.0;
          const transpose = p[PARAMETERS.SEQ_TRANSPOSE] || 0;
          const note = 60 + stepOffset + transpose;
          this.seqNotes[this.seqStep] = note;
          this.processEvent(EVENTS.NOTE_ON, note, velocity);
        }
      }

      // Send step to UI if changed
      if (this.seqStep !== this.lastSentStep) {
        this.lastSentStep = this.seqStep;
        this.port.postMessage({ type: 'seq-step', step: this.seqStep });
      }

      // Global Modulators
      const modRateFactor = Math.pow(2, this.lastModRate);
      if (lfoSyncEnabled) {
        // Sync LFO rate to tempo (e.g., 1 LFO cycle per beat)
        this.lfo1.rate = (tempo / 60) * modRateFactor;
      } else {
        this.lfo1.rate = Math.max(0.1, p[PARAMETERS.LFO_RATE] * modRateFactor);
      }
      this.lfo1.morph = p[PARAMETERS.LFO1_MORPH] || 0;
      this.lfo2.rate = Math.max(0.1, p[PARAMETERS.LFO2_RATE] * modRateFactor);
      this.lfo2.morph = p[PARAMETERS.LFO2_MORPH] || 0;

      const lfo1Val = this.lfo1.process();
      const lfo2Val = this.lfo2.process();

      let mixedDry = 0;
      let mixedFX = 0;
      let totalModFX = 0;
      let totalModRate = 0;
      let anyVoiceActive = false;
      let maxEnv = 0;
      for (const v of this.voices) {
        const out = v.process(p, lfo1Val, lfo2Val) as any;
        mixedDry += out.dry;
        mixedFX += out.fx;
        totalModFX += out.modFX || 0;
        totalModRate += out.modRate || 0;
        if (v.isActive) {
          anyVoiceActive = true;
          maxEnv = Math.max(maxEnv, v.currentEnv);
        }
      }
      p[67] = anyVoiceActive ? 1 : 0;
      this.lastModRate = totalModRate / this.maxVoices;

      // Effects
      this.delay.time += (p[PARAMETERS.DELAY_TIME] - this.delay.time) * 0.005;
      this.delay.feedback += (p[PARAMETERS.DELAY_FEEDBACK] - this.delay.feedback) * 0.005;
      
      let delayMix = p[PARAMETERS.DELAY_MIX];
      let reverbMix = p[PARAMETERS.REVERB_MIX] + (totalModFX / this.maxVoices);
      let tsMix = p[PARAMETERS.TS_MIX] || 0;

      // Envelope following for FX
      if (p[PARAMETERS.FX_ENV_FOLLOW] > 0.5) {
        delayMix *= maxEnv;
        reverbMix *= maxEnv;
        tsMix *= maxEnv;
      }

      this.delay.mix += (delayMix - this.delay.mix) * 0.005;
      this.delay.width += (p[PARAMETERS.DELAY_WIDTH] - this.delay.width) * 0.005;
      this.reverb.decay += (p[PARAMETERS.REVERB_DECAY] - this.reverb.decay) * 0.005;
      this.reverb.mix += (reverbMix - this.reverb.mix) * 0.005;
      this.reverb.damp += (p[PARAMETERS.REVERB_DAMP] - this.reverb.damp) * 0.005;

      // Apply effects ONLY to mixedFX path
      this.delay.process(mixedFX);
      this.reverb.process(this.delay.outL, this.delay.outR);
      
      let outL = (this.reverb.outL + mixedDry) * masterVol;
      let outR = (this.reverb.outR + mixedDry) * masterVol;

      // Low Shelf Filter (Global)
      const lowShelfEnabled = p[PARAMETERS.LOW_SHELF_ENABLE] > 0.5;
      if (lowShelfEnabled) {
        const freq = p[PARAMETERS.LOW_SHELF_FREQ] || 200;
        const gain = p[PARAMETERS.LOW_SHELF_GAIN] || 0;
        this.lowShelf.setParameters(freq, gain);
        outL = this.lowShelf.processL(outL);
        outR = this.lowShelf.processR(outR);
      }

      // Tube Screamer
      if (tsMix > 0) {
        const drive = p[PARAMETERS.TS_DRIVE] || 0.5;
        const tone = p[PARAMETERS.TS_TONE] || 0.5;
        const level = p[PARAMETERS.TS_LEVEL] || 0.5;
        this.tubeScreamer.setParameters(drive, tone, level);
        const [tsL, tsR] = this.tubeScreamer.process(outL, outR);
        outL = outL * (1 - tsMix) + tsL * tsMix;
        outR = outR * (1 - tsMix) + tsR * tsMix;
      }

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
        this.port.postMessage({ 
          type: 'scope', 
          data: output[0].slice(0, 128),
          lfo1: lfo1Val,
          lfo2: lfo2Val
        });
      }
    }

    return true;
  }
}

// @ts-ignore
registerProcessor('synth-processor', SynthProcessor);