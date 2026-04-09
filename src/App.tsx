import React, { useEffect, useRef, useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { SynthHost } from './host/SynthHost';
import { Synth3D } from './gui/Synth3D';
import { PARAMETERS } from './audio/SharedState';
import { PRESET_CATEGORIES, Preset } from './audio/Presets';
import { Power, Keyboard as KeyboardIcon, Activity, Cpu, Volume2, Settings, ListMusic, ChevronRight } from 'lucide-react';

// PC Keyboard to MIDI Note offsets (relative to base note)
const KEY_OFFSETS: Record<string, number> = {
  'a': 0, 'w': 1, 's': 2, 'e': 3, 'd': 4, 'f': 5, 't': 6, 'g': 7, 'y': 8, 'h': 9, 'u': 10, 'j': 11, 'k': 12
};

function App() {
  const [isReady, setIsReady] = useState(false);
  const [isBooting, setIsBooting] = useState(false);
  const [bootProgress, setBootProgress] = useState(0);
  const [octave, setOctave] = useState(4); // Default octave 4 (Middle C)
  const containerRef = useRef<HTMLDivElement>(null);
  const hostRef = useRef<SynthHost | null>(null);
  const synth3DRef = useRef<Synth3D | null>(null);
  const activeNotes = useRef<Map<string, number>>(new Map());

  const [isRecording, setIsRecording] = useState(false);
  const [showPresets, setShowPresets] = useState(false);
  const [activeCategory, setActiveCategory] = useState<string | null>(null);
  const [userPresets, setUserPresets] = useState<Preset[]>(() => {
    const saved = localStorage.getItem('wam_user_presets');
    return saved ? JSON.parse(saved) : [];
  });
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newPresetName, setNewPresetName] = useState('');

  const applyPreset = (preset: Preset) => {
    if (!hostRef.current) return;
    hostRef.current.loadPreset(preset);
    
    // Update 3D UI LCD
    if (synth3DRef.current) {
      synth3DRef.current.updateLCD("PRESET LOADED", preset.name);
    }
    
    setShowPresets(false);
    setActiveCategory(null);
  };

  const saveCurrentPreset = () => {
    if (!hostRef.current || !newPresetName.trim()) return;
    
    const params: Record<number, number> = {};
    // Capture all current parameters from the host's paramArray
    for (let i = 0; i < PARAMETERS.MASTER_VOL + 1; i++) {
      params[i] = hostRef.current.paramArray[i];
    }

    const newPreset: Preset = {
      name: newPresetName.trim(),
      params
    };

    const updatedPresets = [...userPresets, newPreset];
    setUserPresets(updatedPresets);
    localStorage.setItem('wam_user_presets', JSON.stringify(updatedPresets));
    setNewPresetName('');
    setSaveModalOpen(false);
  };

  const deleteUserPreset = (index: number) => {
    const updatedPresets = userPresets.filter((_, i) => i !== index);
    setUserPresets(updatedPresets);
    localStorage.setItem('wam_user_presets', JSON.stringify(updatedPresets));
  };

  const toggleRecording = () => {
    if (!hostRef.current) return;
    if (!isRecording) {
      hostRef.current.startRecording();
      setIsRecording(true);
    } else {
      hostRef.current.stopRecording();
      setIsRecording(false);
    }
  };

  useEffect(() => {
    if (isReady && hostRef.current) {
      hostRef.current.onMessage((msg) => {
        if (msg.type === 'record-done') {
          exportWav(msg.buffer);
        } else if (msg.type === 'seq-step') {
          if (synth3DRef.current) synth3DRef.current.updateSeqStep(msg.step);
        } else if (msg.type === 'scope') {
          if (synth3DRef.current) {
            synth3DRef.current.updateScope(msg.data);
            if (msg.lfo1 !== undefined) synth3DRef.current.updateLFOs(msg.lfo1, msg.lfo2);
          }
        }
      });
    }
  }, [isReady]);

  const exportWav = (buffer: Float32Array[]) => {
    const numChannels = buffer.length;
    const length = buffer[0].length;
    const sampleRate = 48000;
    const wavBuffer = new ArrayBuffer(44 + length * numChannels * 2);
    const view = new DataView(wavBuffer);

    // RIFF header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i));
      }
    };

    writeString(0, 'RIFF');
    view.setUint32(4, 36 + length * numChannels * 2, true);
    writeString(8, 'WAVE');
    writeString(12, 'fmt ');
    view.setUint32(16, 16, true);
    view.setUint16(20, 1, true);
    view.setUint16(22, numChannels, true);
    view.setUint32(24, sampleRate, true);
    view.setUint32(28, sampleRate * numChannels * 2, true);
    view.setUint16(32, numChannels * 2, true);
    view.setUint16(34, 16, true);
    writeString(36, 'data');
    view.setUint32(40, length * numChannels * 2, true);

    // Write PCM data
    let offset = 44;
    for (let i = 0; i < length; i++) {
      for (let channel = 0; channel < numChannels; channel++) {
        const s = Math.max(-1, Math.min(1, buffer[channel][i]));
        view.setInt16(offset, s < 0 ? s * 0x8000 : s * 0x7FFF, true);
        offset += 2;
      }
    }

    const blob = new Blob([view], { type: 'audio/wav' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `synth_recording_${Date.now()}.wav`;
    link.click();
  };

  const initSynth = async () => {
    if (isBooting || isReady) return;
    
    setIsBooting(true);
    setBootProgress(10);

    try {
      if (!hostRef.current) {
        hostRef.current = new SynthHost();
        setBootProgress(30);
        await hostRef.current.initialize();
        setBootProgress(60);
      }
      
      // Wait for container to be rendered and have size
      let attempts = 0;
      while (attempts < 10 && (!containerRef.current || containerRef.current.clientWidth === 0)) {
        await new Promise(r => setTimeout(r, 100));
        attempts++;
      }

      if (containerRef.current) {
        synth3DRef.current = new Synth3D(containerRef.current, hostRef.current);
        setBootProgress(90);
      }
      
      setBootProgress(100);
      setTimeout(() => {
        setIsReady(true);
        setIsBooting(false);
      }, 500);
    } catch (error) {
      console.error("Failed to initialize synth:", error);
      setIsBooting(false);
    }
  };

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!isReady || !hostRef.current || e.repeat) return;
      
      const key = e.key.toLowerCase();
      
      // Octave switching
      if (key === 'z') {
        setOctave(prev => Math.max(0, prev - 1));
        return;
      }
      if (key === 'x') {
        setOctave(prev => Math.min(8, prev + 1));
        return;
      }

      const offset = KEY_OFFSETS[key];
      if (offset !== undefined) {
        const note = (octave + 1) * 12 + offset;
        activeNotes.current.set(key, note);
        
        const seqEnabled = hostRef.current.paramArray[PARAMETERS.SEQ_ENABLE] > 0.5;
        if (seqEnabled) {
          const transpose = note - 60;
          hostRef.current.setParameter(PARAMETERS.SEQ_TRANSPOSE, transpose);
          if (synth3DRef.current) {
            synth3DRef.current.updateLCD("SEQ TRANSPOSE", `${transpose > 0 ? '+' : ''}${transpose} SEMI`);
          }
        } else {
          hostRef.current.noteOn(note);
        }
      }
    };

    const handleKeyUp = (e: KeyboardEvent) => {
      if (!isReady || !hostRef.current) return;
      const key = e.key.toLowerCase();
      const note = activeNotes.current.get(key);
      if (note !== undefined) {
        activeNotes.current.delete(key);
        hostRef.current.noteOff(note);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('keyup', handleKeyUp);

    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('keyup', handleKeyUp);
    };
  }, [isReady, octave]); // Re-bind when octave changes to ensure correct note calculation

  // Handle Resize
  // No longer needed for 2D UI

  return (
    <div className="w-full h-screen bg-obsidian-bg text-zinc-300 flex flex-col font-sans overflow-hidden selection:bg-obsidian-accent selection:text-black">
      {/* Atmospheric Background Layer */}
      <div className="absolute inset-0 atmosphere z-0 pointer-events-none" />

      {/* Header / Control Panel */}
      <header className="h-20 glass-panel flex items-center justify-between px-10 z-30 shadow-2xl relative">
        <div className="flex items-center gap-10">
          <div className="flex flex-col">
            <div className="flex items-center gap-3">
              <div className="w-2 h-2 bg-obsidian-accent shadow-[0_0_10px_rgba(0,255,0,0.5)] rounded-full animate-pulse" />
              <h1 className="font-mono font-bold tracking-[0.3em] text-white text-base">OBSIDIAN-2.0</h1>
            </div>
            <span className="micro-label mt-1">Advanced Synthesis Engine // Studio Grade</span>
          </div>
          
          <div className="h-10 w-[1px] bg-white/5" />
          
          <div className="hidden lg:flex items-center gap-10">
            <div className="flex flex-col gap-1.5">
              <span className="micro-label">System Status</span>
              <div className="flex items-center gap-2.5">
                <div className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-obsidian-accent shadow-[0_0_12px_rgba(0,255,0,0.6)]' : 'bg-white/10'}`} />
                <span className="font-mono text-[11px] font-bold uppercase tracking-wider">{isReady ? 'Ready' : 'Standby'}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-1.5">
              <span className="micro-label">DSP Load</span>
              <div className="w-32 h-1 bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: isReady ? '14%' : '0%' }}
                  className="h-full bg-obsidian-accent/40"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-5">
          {!isReady && !isBooting ? (
            <button 
              onClick={initSynth}
              className="group flex items-center gap-3 bg-white hover:bg-obsidian-accent text-black px-8 py-2.5 rounded-none font-mono font-black text-xs transition-all active:scale-95 shadow-[0_0_30px_rgba(255,255,255,0.05)]"
            >
              <Power size={14} className="group-hover:rotate-12 transition-transform" />
              BOOT SYSTEM
            </button>
          ) : isBooting ? (
            <div className="flex items-center gap-4 bg-white/5 px-8 py-2.5 rounded-none border border-white/10">
              <div className="w-3 h-3 border-2 border-obsidian-accent border-t-transparent rounded-full animate-spin" />
              <span className="font-mono text-xs font-bold text-obsidian-accent tracking-widest uppercase">Initializing... {bootProgress}%</span>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-3 text-white/60 font-mono text-[10px] bg-white/5 px-5 py-2.5 rounded-none border border-white/10">
                <KeyboardIcon size={14} className="text-obsidian-accent" />
                <span className="uppercase tracking-[0.2em]">Keys: A-K / W-U</span>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowPresets(!showPresets);
                    setActiveCategory(null);
                  }}
                  className={`flex items-center gap-3 px-5 py-2.5 rounded-none border transition-all font-mono bg-white/5 ${showPresets ? 'border-obsidian-accent text-obsidian-accent' : 'border-white/10 text-white/60 hover:text-white hover:border-white/20'}`}
                >
                  <ListMusic size={14} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">Presets</span>
                </button>
                
                <AnimatePresence>
                  {showPresets && (
                    <motion.div 
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      className="absolute top-full right-0 mt-3 w-64 glass-panel rounded-none shadow-2xl z-50 flex flex-col overflow-hidden"
                    >
                      <div className="flex-1 overflow-hidden">
                        <div className="px-4 py-3 border-b border-white/5 bg-white/5">
                          <span className="micro-label">Sound Library</span>
                        </div>
                        <div className="flex flex-col py-2 max-h-[400px] overflow-y-auto">
                          {PRESET_CATEGORIES.map((cat, i) => (
                            <div key={i} className="flex flex-col">
                              <div className="px-4 py-2 bg-white/5">
                                <span className="micro-label text-[8px] opacity-30">{cat.category}</span>
                              </div>
                              {cat.presets.map((preset, pi) => (
                                <button
                                  key={pi}
                                  onClick={() => applyPreset(preset)}
                                  className="px-6 py-2.5 text-left font-mono text-[11px] text-white/60 hover:text-obsidian-accent hover:bg-white/5 transition-all flex items-center justify-between group"
                                >
                                  {preset.name}
                                  <ChevronRight size={10} className="opacity-0 group-hover:opacity-100 transition-opacity" />
                                </button>
                              ))}
                            </div>
                          ))}
                          
                          {userPresets.length > 0 && (
                            <div className="flex flex-col border-t border-white/5 mt-2">
                              <div className="px-4 py-2 bg-white/5">
                                <span className="micro-label text-[8px] opacity-30">User Presets</span>
                              </div>
                              {userPresets.map((preset, i) => (
                                <div key={i} className="group flex items-center justify-between hover:bg-white/5 transition-colors">
                                  <button
                                    onClick={() => applyPreset(preset)}
                                    className="flex-1 px-6 py-2.5 text-left font-mono text-[11px] text-white/60 group-hover:text-obsidian-accent transition-colors"
                                  >
                                    {preset.name}
                                  </button>
                                  <button 
                                    onClick={(e) => { e.stopPropagation(); deleteUserPreset(i); }}
                                    className="px-4 py-2.5 text-white/20 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                  >
                                    <Activity size={10} />
                                  </button>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSaveModalOpen(true)}
                  className="p-2.5 rounded-none border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all bg-white/5"
                  title="Save Current Preset"
                >
                  <Volume2 size={16} />
                </button>

                <button 
                  onClick={() => hostRef.current?.randomize()}
                  className="p-2.5 rounded-none border border-white/10 text-white/40 hover:text-white hover:border-white/20 transition-all bg-white/5"
                  title="Randomize Parameters"
                >
                  <Activity size={16} />
                </button>

                <button 
                  onClick={toggleRecording}
                  className={`flex items-center gap-3 px-5 py-2.5 rounded-none border transition-all font-mono ${isRecording ? 'bg-red-500/10 border-red-500 text-red-500 shadow-[0_0_20px_rgba(239,68,68,0.2)]' : 'bg-white/5 border-white/10 text-white/40 hover:text-white hover:border-white/20'}`}
                >
                  <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500 animate-pulse' : 'bg-white/20'}`} />
                  <span className="text-[10px] font-bold uppercase tracking-[0.2em]">{isRecording ? 'STOP' : 'REC'}</span>
                </button>
              </div>
            </div>
          )}
        </div>
      </header>

      {/* Camera Controls */}
      {/* 2D UI doesn't need camera controls */}

      {/* Main Viewport */}
      <main className="flex-1 relative bg-obsidian-bg">
        <AnimatePresence>
          {(!isReady || isBooting) && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 1, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center bg-obsidian-bg z-20"
            >
              <div className="relative w-full max-w-3xl px-12">
                {/* Background Grid for Boot Screen */}
                <div className="absolute inset-0 opacity-[0.05] pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '40px 40px' }} />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  <motion.div
                    initial={{ y: 20, opacity: 0 }}
                    animate={{ y: 0, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    className="mb-16"
                  >
                    <div className="w-24 h-24 rounded-none bg-white/5 border border-white/10 flex items-center justify-center mb-8 mx-auto shadow-2xl relative group">
                      <div className="absolute inset-0 bg-obsidian-accent/5 opacity-0 group-hover:opacity-100 transition-opacity" />
                      <Cpu size={48} className={isBooting ? "text-obsidian-accent animate-pulse" : "text-white/20"} />
                    </div>
                    <h2 className="font-mono text-4xl font-black text-white tracking-[-0.05em] mb-4 uppercase">Obsidian OS v2.0</h2>
                    <p className="font-mono text-white/40 text-[11px] max-w-sm mx-auto leading-relaxed tracking-widest uppercase">
                      Hardware Abstraction Layer // Neural DSP Core // WebAssembly Runtime
                    </p>
                  </motion.div>

                  {!isBooting ? (
                    <button 
                      onClick={initSynth}
                      className="group relative w-full max-w-xs py-5 bg-white hover:bg-obsidian-accent text-black rounded-none font-mono font-black text-xs tracking-[0.4em] transition-all overflow-hidden shadow-[0_0_50px_rgba(255,255,255,0.05)]"
                    >
                      <span className="relative z-10">INITIALIZE CORE</span>
                    </button>
                  ) : (
                    <div className="w-full max-w-md space-y-6">
                      <div className="flex justify-between font-mono text-[10px] uppercase tracking-[0.3em] text-white/30 font-bold">
                        <span>Loading Modules</span>
                        <span className="text-obsidian-accent">{bootProgress}%</span>
                      </div>
                      <div className="h-1 w-full bg-white/5 rounded-full overflow-hidden">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${bootProgress}%` }}
                          className="h-full bg-obsidian-accent shadow-[0_0_20px_rgba(0,255,0,0.4)]"
                        />
                      </div>
                      <div className="flex gap-3 justify-center">
                        {[0, 1, 2, 3].map(i => (
                          <motion.div
                            key={i}
                            animate={{ scale: [1, 1.5, 1], opacity: [0.2, 1, 0.2] }}
                            transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.2 }}
                            className="w-1.5 h-1.5 bg-obsidian-accent rounded-full"
                          />
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Save Preset Modal */}
        <AnimatePresence>
          {saveModalOpen && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4"
            >
              <motion.div 
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.95, opacity: 0 }}
                className="glass-panel p-10 rounded-none w-full max-w-lg shadow-2xl"
              >
                <div className="flex items-center gap-5 mb-10">
                  <div className="p-3 bg-obsidian-accent/10 border border-obsidian-accent/20">
                    <Volume2 size={24} className="text-obsidian-accent" />
                  </div>
                  <div>
                    <h2 className="font-mono text-lg font-bold tracking-[0.2em] uppercase text-white">Commit to Flash</h2>
                    <p className="micro-label mt-1">Permanent memory allocation</p>
                  </div>
                </div>

                <div className="space-y-6">
                  <div className="flex flex-col gap-3">
                    <label className="micro-label ml-1">Identifier</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveCurrentPreset()}
                      placeholder="PRESET_NAME_01"
                      className="w-full bg-white/5 border border-white/10 px-6 py-4 font-mono text-xs text-white focus:outline-none focus:border-obsidian-accent/50 transition-all rounded-none"
                    />
                  </div>

                  <div className="flex gap-4 pt-6">
                    <button 
                      onClick={() => setSaveModalOpen(false)}
                      className="flex-1 px-6 py-4 border border-white/10 text-white/40 hover:text-white hover:bg-white/5 transition-all font-mono text-[10px] font-bold uppercase tracking-[0.2em] rounded-none"
                    >
                      Abort
                    </button>
                    <button 
                      onClick={saveCurrentPreset}
                      disabled={!newPresetName.trim()}
                      className="flex-1 px-6 py-4 bg-white hover:bg-obsidian-accent disabled:opacity-20 text-black transition-all font-mono text-[10px] font-bold uppercase tracking-[0.2em] rounded-none shadow-[0_0_30px_rgba(255,255,255,0.1)]"
                    >
                      Commit
                    </button>
                  </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* 3D Panel */}
        <div ref={containerRef} className="absolute inset-0 z-0" />
        
        {/* UI Overlays */}
        {isReady && (
          <div className="absolute bottom-10 left-10 right-10 flex justify-between items-end pointer-events-none z-10">
            <div className="flex flex-col gap-6">
              <div className="glass-panel p-6 rounded-none flex flex-col gap-4 w-64">
                <div className="flex justify-between items-center">
                  <span className="micro-label">Output Monitor</span>
                  <div className="w-2 h-2 bg-obsidian-accent rounded-full shadow-[0_0_8px_rgba(0,255,0,0.5)]" />
                </div>
                <div className="flex gap-1 h-12 items-end">
                  {Array.from({ length: 32 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-white/10" 
                      style={{ height: `${Math.random() * 60 + 20}%` }} 
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="micro-label mb-2">System Architecture</div>
              <div className="font-mono text-[11px] font-bold text-white/80 tracking-[0.3em] uppercase">WASM-DSP // THREE.JS // REACT</div>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer / Status Bar */}
      <footer className="h-10 bg-obsidian-bg border-t border-white/5 flex items-center justify-between px-10 text-[9px] font-mono text-white/30 uppercase tracking-[0.2em]">
        <div className="flex items-center gap-10">
          <div className="flex items-center gap-3">
            <div className="w-1 h-1 rounded-full bg-obsidian-accent" />
            <span>48.0 KHZ / 32-BIT FLOAT</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-1 h-1 rounded-full bg-obsidian-accent" />
            <span>BUFFER: 128 SAMPLES</span>
          </div>
          <div className="flex items-center gap-3">
            <div className="w-1 h-1 rounded-full bg-obsidian-accent" />
            <span>OCTAVE: {octave}</span>
          </div>
        </div>
        <div className="flex items-center gap-6">
          <span>© 2026 OBSIDIAN STUDIO</span>
          <div className="w-[1px] h-4 bg-white/5" />
          <span className="text-obsidian-accent/50">BUILD_REV.090426</span>
        </div>
      </footer>
    </div>
  );
}

export default App;
;