import { PARAMETERS, MAX_PARAMETERS, EventRingBuffer, EVENTS } from '../audio/SharedState';

export class SynthHost {
  private ctx: AudioContext;
  private node: AudioWorkletNode | null = null;
  
  private paramSab: SharedArrayBuffer | ArrayBuffer;
  public paramArray: Float32Array;
  private eventSab: SharedArrayBuffer | ArrayBuffer;
  private eventBuffer: EventRingBuffer;
  private useSAB: boolean;

  constructor() {
    this.ctx = new AudioContext({ latencyHint: 'interactive' });
    
    this.useSAB = typeof SharedArrayBuffer !== 'undefined';
    const BufferType = this.useSAB ? SharedArrayBuffer : ArrayBuffer;
    
    this.paramSab = new BufferType(MAX_PARAMETERS * 4);
    this.paramArray = new Float32Array(this.paramSab);
    
    this.eventSab = new BufferType(8 + 1024 * 4);
    this.eventBuffer = new EventRingBuffer(this.eventSab, 1024, this.useSAB);

    // Set full synth default parameters
    this.setParameter(PARAMETERS.OSC1_WAVE, 0.0); // Saw
    this.setParameter(PARAMETERS.OSC1_MIX, 0.7);
    this.setParameter(PARAMETERS.OSC2_DETUNE, 0.0);
    this.setParameter(PARAMETERS.OSC2_WAVE, 1.0); // Pulse
    this.setParameter(PARAMETERS.OSC2_MIX, 0.3);
    
    this.setParameter(PARAMETERS.FILTER_CUTOFF, 1200.0);
    this.setParameter(PARAMETERS.FILTER_RES, 0.2);
    this.setParameter(PARAMETERS.FILTER_ENV_DEPTH, 2000.0);
    this.setParameter(PARAMETERS.FILTER_LFO_AMT, 0.0);
    
    this.setParameter(PARAMETERS.FILTER_ATTACK, 0.01);
    this.setParameter(PARAMETERS.FILTER_DECAY, 0.3);
    this.setParameter(PARAMETERS.FILTER_SUSTAIN, 0.4);
    this.setParameter(PARAMETERS.FILTER_RELEASE, 0.5);
    
    this.setParameter(PARAMETERS.ENV_ATTACK, 0.05);
    this.setParameter(PARAMETERS.ENV_DECAY, 0.3);
    this.setParameter(PARAMETERS.ENV_SUSTAIN, 0.5);
    this.setParameter(PARAMETERS.ENV_RELEASE, 0.6);
    
    this.setParameter(PARAMETERS.LFO_RATE, 2.0);
    
    this.setParameter(PARAMETERS.DELAY_TIME, 0.3);
    this.setParameter(PARAMETERS.DELAY_FEEDBACK, 0.4);
    this.setParameter(PARAMETERS.DELAY_MIX, 0.3);
    this.setParameter(PARAMETERS.DELAY_WIDTH, 1.0);
    
    this.setParameter(PARAMETERS.REVERB_DECAY, 0.8);
    this.setParameter(PARAMETERS.REVERB_MIX, 0.2);
    this.setParameter(PARAMETERS.REVERB_DAMP, 0.2);
    
    this.setParameter(PARAMETERS.UNISON_DETUNE, 0.0);
    this.setParameter(PARAMETERS.SUB_OSC_MIX, 0.0);
    this.setParameter(PARAMETERS.NOISE_MIX, 0.0);
    
    this.setParameter(PARAMETERS.WT_MIX, 0.5);
    this.setParameter(PARAMETERS.WT_POS, 0.0);
    this.setParameter(PARAMETERS.WT_LFO_AMT, 0.2);
    this.setParameter(PARAMETERS.WT_DETUNE, 0.0);
    
    this.setParameter(PARAMETERS.STOCH_DIST, 0.0);
    this.setParameter(PARAMETERS.STOCH_TIME, 0.05);
    this.setParameter(PARAMETERS.STOCH_AMP, 0.5);
    
    this.setParameter(PARAMETERS.SEQ_ENABLE, 0.0);
    this.setParameter(PARAMETERS.SEQ_TEMPO, 120.0);
    this.setParameter(PARAMETERS.SEQ_STEP_0, 0.0);
    this.setParameter(PARAMETERS.SEQ_STEP_1, 3.0);
    this.setParameter(PARAMETERS.SEQ_STEP_2, 7.0);
    this.setParameter(PARAMETERS.SEQ_STEP_3, 10.0);
    this.setParameter(PARAMETERS.SEQ_STEP_4, 0.0);
    this.setParameter(PARAMETERS.SEQ_STEP_5, 0.0);
    this.setParameter(PARAMETERS.SEQ_STEP_6, 0.0);
    this.setParameter(PARAMETERS.SEQ_STEP_7, 0.0);

    this.setParameter(PARAMETERS.SUB_OSC_WAVE, 0.0);
    this.setParameter(PARAMETERS.DPW_MIX, 0.0);
    this.setParameter(PARAMETERS.DPW_DETUNE, 0.0);
    this.setParameter(PARAMETERS.TS_DRIVE, 0.5);
    this.setParameter(PARAMETERS.TS_TONE, 0.5);
    this.setParameter(PARAMETERS.TS_LEVEL, 0.5);
    this.setParameter(PARAMETERS.TS_MIX, 0.0);

    this.setParameter(PARAMETERS.MASTER_VOL, 0.7);
  }

  public async initialize(): Promise<void> {
    if (this.ctx.state === 'suspended') {
      await this.ctx.resume();
    }

    const processorUrl = new URL('../audio/processor.ts', import.meta.url);
    await this.ctx.audioWorklet.addModule(processorUrl.href);

    this.node = new AudioWorkletNode(this.ctx, 'synth-processor', {
      numberOfInputs: 0,
      numberOfOutputs: 1,
      outputChannelCount: [2],
    });

    this.node.port.postMessage({
      type: 'init',
      useSAB: this.useSAB,
      paramSab: this.paramSab,
      eventSab: this.eventSab
    });

    this.node.connect(this.ctx.destination);
  }

  public setParameter(index: number, value: number): void {
    this.paramArray[index] = value;
    if (!this.useSAB && this.node) {
      this.node.port.postMessage({ type: 'param', index, value });
    }
  }

  public sendEvent(type: number, value: number): void {
    if (this.useSAB) {
      this.eventBuffer.push(type, value);
    } else if (this.node) {
      this.node.port.postMessage({ type: 'event', eventType: type, value });
    }
  }

  public noteOn(note: number): void {
    this.sendEvent(EVENTS.NOTE_ON, note);
  }

  public noteOff(note: number): void {
    this.sendEvent(EVENTS.NOTE_OFF, note);
  }

  public startRecording(): void {
    this.sendEvent(EVENTS.START_RECORD, 0);
  }

  public stopRecording(): void {
    this.sendEvent(EVENTS.STOP_RECORD, 0);
  }

  public onMessage(callback: (msg: any) => void): void {
    if (this.node) {
      this.node.port.onmessage = (e) => callback(e.data);
    }
  }

  public onRecordDone(callback: (buffer: Float32Array[]) => void): void {
    this.onMessage((msg) => {
      if (msg.type === 'record-done') {
        callback(msg.buffer);
      } else if (msg.type === 'seq-step') {
        // Handle seq-step if needed, or let another listener handle it
        // For now, we'll just emit it if we had a multi-listener system
      }
    });
  }
  
  public getAudioContext(): AudioContext {
    return this.ctx;
  }
}