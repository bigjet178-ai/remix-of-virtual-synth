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
    Object.entries(preset.params).forEach(([param, value]) => {
      hostRef.current!.setParameter(Number(param), value);
    });
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
        hostRef.current.noteOn(note);
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
    <div className="w-full h-screen bg-[#0a0a0a] text-zinc-300 flex flex-col font-mono overflow-hidden selection:bg-emerald-500/30">
      {/* Header */}
      <header className="h-16 border-b border-zinc-800/50 flex items-center justify-between px-8 bg-[#0d0d0d] z-30 shadow-xl">
        <div className="flex items-center gap-6">
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <Activity size={16} className="text-emerald-500" />
              <h1 className="font-bold tracking-[0.2em] text-zinc-100 text-sm">WAM-2.0 CORE</h1>
            </div>
            <span className="text-[10px] text-zinc-500 tracking-widest mt-0.5 uppercase">Virtual Analog Synthesis Engine</span>
          </div>
          
          <div className="h-8 w-[1px] bg-zinc-800" />
          
          <div className="hidden md:flex items-center gap-8">
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-zinc-500 uppercase tracking-tighter">Engine Status</span>
              <div className="flex items-center gap-2">
                <div className={`w-1.5 h-1.5 rounded-full ${isReady ? 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]' : 'bg-zinc-700'}`} />
                <span className="text-[10px] font-bold uppercase">{isReady ? 'Online' : 'Standby'}</span>
              </div>
            </div>
            
            <div className="flex flex-col gap-1">
              <span className="text-[9px] text-zinc-500 uppercase tracking-tighter">DSP Load</span>
              <div className="w-24 h-1.5 bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                <motion.div 
                  initial={{ width: 0 }}
                  animate={{ width: isReady ? '12%' : '0%' }}
                  className="h-full bg-emerald-500/50"
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="flex items-center gap-4">
          {!isReady && !isBooting ? (
            <button 
              onClick={initSynth}
              className="group flex items-center gap-3 bg-zinc-100 hover:bg-white text-black px-6 py-2 rounded-sm font-bold text-xs transition-all active:scale-95 shadow-[0_0_20px_rgba(255,255,255,0.1)]"
            >
              <Power size={14} className="group-hover:rotate-12 transition-transform" />
              INITIALIZE SYSTEM
            </button>
          ) : isBooting ? (
            <div className="flex items-center gap-3 bg-zinc-900 px-6 py-2 rounded-sm border border-zinc-800">
              <div className="w-3 h-3 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-bold text-emerald-500">BOOTING... {bootProgress}%</span>
            </div>
          ) : (
            <div className="flex items-center gap-6">
              <div className="flex items-center gap-2 text-zinc-400 text-[10px] bg-zinc-900/50 px-4 py-2 rounded-sm border border-zinc-800/50">
                <KeyboardIcon size={14} className="text-emerald-500" />
                <span className="uppercase tracking-wider">Keys: A-K / W-U</span>
              </div>
              
              <div className="relative">
                <button 
                  onClick={() => {
                    setShowPresets(!showPresets);
                    setActiveCategory(null);
                  }}
                  className="flex items-center gap-2 px-4 py-2 rounded-sm border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-900/50"
                >
                  <ListMusic size={14} className="text-emerald-500" />
                  <span className="text-[10px] font-bold uppercase tracking-widest">Presets</span>
                </button>
                
                {showPresets && (
                  <div className="absolute top-full right-0 mt-2 w-56 bg-zinc-900 border border-zinc-800 rounded-sm shadow-2xl z-50 flex">
                    <div className="flex-1 border-r border-zinc-800/50 rounded-sm overflow-hidden">
                      <div className="px-3 py-2 border-b border-zinc-800 bg-black/50">
                        <span className="text-[9px] text-zinc-500 uppercase tracking-widest">Categories</span>
                      </div>
                      <div className="flex flex-col py-1">
                        {PRESET_CATEGORIES.map((cat, i) => (
                          <button
                            key={i}
                            onMouseEnter={() => setActiveCategory(cat.category)}
                            className={`px-3 py-2 text-left text-xs transition-colors flex items-center justify-between ${activeCategory === cat.category ? 'bg-zinc-800 text-emerald-500' : 'text-zinc-300 hover:bg-zinc-800/50'}`}
                          >
                            {cat.category}
                            <ChevronRight size={12} className={activeCategory === cat.category ? 'opacity-100' : 'opacity-0'} />
                          </button>
                        ))}
                        
                        {userPresets.length > 0 && (
                          <button
                            onMouseEnter={() => setActiveCategory('User')}
                            className={`px-3 py-2 text-left text-xs transition-colors flex items-center justify-between ${activeCategory === 'User' ? 'bg-zinc-800 text-emerald-500' : 'text-zinc-300 hover:bg-zinc-800/50'}`}
                          >
                            User Presets
                            <ChevronRight size={12} className={activeCategory === 'User' ? 'opacity-100' : 'opacity-0'} />
                          </button>
                        )}
                      </div>
                    </div>
                    
                    {activeCategory && (
                      <div className="w-48 bg-zinc-900 border border-zinc-800/50 absolute right-full mr-1 top-0 bottom-auto rounded-sm overflow-y-auto max-h-[300px] shadow-2xl">
                        <div className="px-3 py-2 border-b border-zinc-800 bg-black/50 sticky top-0 z-10">
                          <span className="text-[9px] text-zinc-500 uppercase tracking-widest">{activeCategory}</span>
                        </div>
                        <div className="flex flex-col py-1">
                          {activeCategory === 'User' ? (
                            userPresets.map((preset, i) => (
                              <div key={i} className="group flex items-center justify-between hover:bg-zinc-800 transition-colors">
                                <button
                                  onClick={() => applyPreset(preset)}
                                  className="flex-1 px-3 py-2 text-left text-xs text-zinc-300 group-hover:text-emerald-500 transition-colors"
                                >
                                  {preset.name}
                                </button>
                                <button 
                                  onClick={(e) => { e.stopPropagation(); deleteUserPreset(i); }}
                                  className="px-2 py-2 text-zinc-600 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
                                  title="Delete Preset"
                                >
                                  <Activity size={10} />
                                </button>
                              </div>
                            ))
                          ) : (
                            PRESET_CATEGORIES.find(c => c.category === activeCategory)?.presets.map((preset, i) => (
                              <button
                                key={i}
                                onClick={() => applyPreset(preset)}
                                className="px-3 py-2 text-left text-xs text-zinc-300 hover:bg-zinc-800 hover:text-emerald-500 transition-colors"
                              >
                                {preset.name}
                              </button>
                            ))
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </div>

              <button 
                onClick={() => setSaveModalOpen(true)}
                className="flex items-center gap-2 px-4 py-2 rounded-sm border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-900/50"
                title="Save Current Preset"
              >
                <Volume2 size={14} className="text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Save</span>
              </button>

              <button 
                onClick={() => hostRef.current?.randomize()}
                className="flex items-center gap-2 px-4 py-2 rounded-sm border border-zinc-800 text-zinc-400 hover:text-zinc-100 transition-colors bg-zinc-900/50"
                title="Randomize Parameters"
              >
                <Activity size={14} className="text-emerald-500" />
                <span className="text-[10px] font-bold uppercase tracking-widest">Random</span>
              </button>

              <button 
                onClick={toggleRecording}
                className={`flex items-center gap-2 px-4 py-2 rounded-sm border transition-all ${isRecording ? 'bg-red-500/20 border-red-500 text-red-500 animate-pulse' : 'bg-zinc-900/50 border-zinc-800 text-zinc-400 hover:text-zinc-100'}`}
              >
                <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-red-500' : 'bg-zinc-600'}`} />
                <span className="text-[10px] font-bold uppercase tracking-widest">{isRecording ? 'STOP REC' : 'RECORD'}</span>
              </button>
              <button className="p-2 text-zinc-500 hover:text-zinc-100 transition-colors">
                <Settings size={18} />
              </button>
            </div>
          )}
        </div>
      </header>

      {/* Camera Controls */}
      {/* 2D UI doesn't need camera controls */}

      {/* Main Viewport */}
      <main className="flex-1 relative bg-[#050505]">
        <AnimatePresence>
          {(!isReady || isBooting) && (
            <motion.div 
              initial={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.8, ease: "easeInOut" }}
              className="absolute inset-0 flex items-center justify-center bg-[#0a0a0a] z-20"
            >
              <div className="relative w-full max-w-2xl px-12">
                {/* Background Grid for Boot Screen */}
                <div className="absolute inset-0 opacity-[0.03] pointer-events-none" 
                     style={{ backgroundImage: 'radial-gradient(#fff 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                
                <div className="relative z-10 flex flex-col items-center text-center">
                  <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    className="mb-12"
                  >
                    <div className="w-20 h-20 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center mb-6 mx-auto shadow-2xl">
                      <Cpu size={40} className={isBooting ? "text-emerald-500 animate-pulse" : "text-zinc-600"} />
                    </div>
                    <h2 className="text-3xl font-bold text-zinc-100 tracking-tighter mb-2">SYSTEM INITIALIZATION</h2>
                    <p className="text-zinc-500 text-sm max-w-sm mx-auto leading-relaxed">
                      High-fidelity WebAssembly DSP engine requires user interaction to allocate audio buffers and initialize 3D context.
                    </p>
                  </motion.div>

                  {!isBooting ? (
                    <button 
                      onClick={initSynth}
                      className="group relative w-full max-w-xs py-4 bg-emerald-600 hover:bg-emerald-500 text-white rounded-sm font-black text-sm tracking-[0.3em] transition-all overflow-hidden shadow-[0_0_40px_rgba(16,185,129,0.2)]"
                    >
                      <div className="absolute inset-0 bg-white/10 translate-y-full group-hover:translate-y-0 transition-transform duration-300" />
                      <span className="relative z-10">START ENGINE</span>
                    </button>
                  ) : (
                    <div className="w-full max-w-md space-y-4">
                      <div className="flex justify-between text-[10px] uppercase tracking-widest text-zinc-500 font-bold">
                        <span>Loading DSP Modules</span>
                        <span>{bootProgress}%</span>
                      </div>
                      <div className="h-1 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${bootProgress}%` }}
                          className="h-full bg-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.8)]"
                        />
                      </div>
                      <div className="flex gap-2 justify-center">
                        {[0, 1, 2].map(i => (
                          <motion.div
                            key={i}
                            animate={{ opacity: [0.3, 1, 0.3] }}
                            transition={{ duration: 1, repeat: Infinity, delay: i * 0.2 }}
                            className="w-1 h-1 bg-emerald-500 rounded-full"
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
              className="absolute inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
            >
              <motion.div 
                initial={{ scale: 0.9, opacity: 0, y: 20 }}
                animate={{ scale: 1, opacity: 1, y: 0 }}
                exit={{ scale: 0.9, opacity: 0, y: 20 }}
                className="bg-zinc-900 border border-zinc-800 p-6 rounded-sm w-full max-w-md shadow-2xl"
              >
                <div className="flex items-center gap-3 mb-6">
                  <div className="p-2 bg-emerald-500/10 rounded-sm">
                    <Volume2 size={20} className="text-emerald-500" />
                  </div>
                  <div>
                    <h2 className="text-sm font-bold tracking-widest uppercase text-zinc-100">Save Preset</h2>
                    <p className="text-[10px] text-zinc-500 uppercase tracking-tighter mt-1">Capture current engine state</p>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex flex-col gap-2">
                    <label className="text-[9px] text-zinc-500 uppercase tracking-widest ml-1">Preset Name</label>
                    <input 
                      autoFocus
                      type="text" 
                      value={newPresetName}
                      onChange={(e) => setNewPresetName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && saveCurrentPreset()}
                      placeholder="Enter name..."
                      className="w-full bg-black border border-zinc-800 px-4 py-3 text-xs text-zinc-200 focus:outline-none focus:border-emerald-500/50 transition-colors rounded-sm"
                    />
                  </div>

                  <div className="flex gap-3 pt-4">
                    <button 
                      onClick={() => setSaveModalOpen(false)}
                      className="flex-1 px-4 py-3 border border-zinc-800 text-zinc-500 hover:text-zinc-300 transition-colors text-[10px] font-bold uppercase tracking-widest rounded-sm"
                    >
                      Cancel
                    </button>
                    <button 
                      onClick={saveCurrentPreset}
                      disabled={!newPresetName.trim()}
                      className="flex-1 px-4 py-3 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white transition-colors text-[10px] font-bold uppercase tracking-widest rounded-sm shadow-[0_0_20px_rgba(16,185,129,0.2)]"
                    >
                      Save Preset
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
          <div className="absolute bottom-8 left-8 right-8 flex justify-between items-end pointer-events-none z-10">
            <div className="flex flex-col gap-4">
              <div className="bg-black/60 backdrop-blur-md border border-white/5 p-4 rounded-sm flex flex-col gap-2 w-48">
                <div className="flex justify-between items-center">
                  <span className="text-[9px] uppercase tracking-widest text-zinc-500">Master Out</span>
                  <Volume2 size={12} className="text-emerald-500" />
                </div>
                <div className="flex gap-0.5 h-8 items-end">
                  {Array.from({ length: 24 }).map((_, i) => (
                    <div 
                      key={i} 
                      className="flex-1 bg-zinc-800 rounded-t-[1px]" 
                      style={{ height: `${Math.random() * 40 + 10}%` }} 
                    />
                  ))}
                </div>
              </div>
            </div>
            
            <div className="text-right">
              <div className="text-[10px] text-zinc-500 uppercase tracking-[0.4em] mb-1">Architecture</div>
              <div className="text-xs font-bold text-zinc-100 tracking-widest">WASM-DSP / THREE.JS / REACT</div>
            </div>
          </div>
        )}
      </main>
      
      {/* Footer / Status Bar */}
      <footer className="h-8 bg-[#080808] border-t border-zinc-900 flex items-center justify-between px-8 text-[9px] text-zinc-600 uppercase tracking-widest">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-emerald-500" />
            <span>Audio: 48kHz / 24-bit</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-emerald-500" />
            <span>Latency: 2.4ms</span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-1 h-1 rounded-full bg-emerald-500" />
            <span>Octave: {octave} (Z/X)</span>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span>© 2026 WAM-2.0 VIRTUAL ANALOG</span>
          <div className="w-[1px] h-3 bg-zinc-800" />
          <span>Build 07.04.26</span>
        </div>
      </footer>
    </div>
  );
}

export default App;