import * as fs from 'fs';
import * as path from 'path';
import faustwasm from '@grame/faustwasm';

async function compile() {
  try {
    console.log("Loading Faust compiler...");
    const compiler = await faustwasm.instantiateFaustModuleFromFile(
      path.join(process.cwd(), 'node_modules', '@grame', 'faustwasm', 'libfaust-wasm', 'libfaust-wasm.js')
    );
    
    console.log("Reading DSP file...");
    const dspCode = fs.readFileSync('reverb.dsp', 'utf8');
    
    console.log("Compiling DSP...");
    const factory = await compiler.createWasmFactory('reverb', dspCode, '-O3 -I /usr/share/faust');
    
    if (!factory) {
      console.error("Failed to compile DSP:", compiler.getErrorMessage());
      return;
    }
    
    console.log("Writing output...");
    fs.mkdirSync('src/audio', { recursive: true });
    fs.writeFileSync('src/audio/reverb.wasm', factory.code);
    fs.writeFileSync('src/audio/reverb.json', factory.json);
    
    console.log("Compilation successful!");
  } catch (e) {
    console.error("Error:", e);
  }
}

compile();
