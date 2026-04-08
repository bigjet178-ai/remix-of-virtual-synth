import fs from 'fs';

const dsp = `
import("stdfaust.lib");
roomsize = hslider("Room Size", 0.5, 0.1, 1.0, 0.01);
wetdry = hslider("Wet/Dry", 0.5, 0.0, 1.0, 0.01);
comb(d, g) = + ~ (@(d) : *(g));
ap(d, g) = + ~ (@(d) : *(g)) : _ <: @(d), *(-g) : +;
combs = _ <: comb(1557, roomsize), comb(1617, roomsize), comb(1491, roomsize), comb(1422, roomsize) :> _ / 4;
allpasses = ap(225, 0.5) : ap(341, 0.5);
reverb_mono = combs : allpasses;
combs_R = _ <: comb(1557+23, roomsize), comb(1617+23, roomsize), comb(1491+23, roomsize), comb(1422+23, roomsize) :> _ / 4;
allpasses_R = ap(225+23, 0.5) : ap(341+23, 0.5);
reverb_R = combs_R : allpasses_R;
process(L, R) = 
  L <: _, reverb_mono : *(1 - wetdry), *(wetdry) : +,
  R <: _, reverb_R : *(1 - wetdry), *(wetdry) : +;
`;

async function main() {
  const res = await fetch('https://faustservice.grame.fr/api/v1/generate/webaudio/wam', {
    method: 'POST',
    body: dsp
  });
  const text = await res.text();
  console.log(text);
}
main();
