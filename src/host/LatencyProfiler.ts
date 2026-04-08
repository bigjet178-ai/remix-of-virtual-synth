/**
 * Performance Profiling & Optimization
 * Phase 5: Latency Measurement Utility
 */

export class LatencyProfiler {
  /**
   * Calculates the theoretical and OS-reported round-trip latency.
   * @param ctx The active AudioContext
   * @returns Latency in milliseconds
   */
  public static getSystemLatency(ctx: AudioContext): { base: number, output: number, total: number } {
    // baseLatency: The processing latency of the Web Audio API graph (e.g., 128 frames / 44100Hz = ~2.9ms)
    const base = (ctx.baseLatency || 0) * 1000;
    
    // outputLatency: The latency of the OS audio subsystem and DAC
    const output = (ctx.outputLatency || 0) * 1000;
    
    return {
      base,
      output,
      total: base + output
    };
  }

  /**
   * Maximum Length Sequence (MLS) Cross-Correlation (Simulated for Browser Environment)
   * 
   * In a physical hardware loopback test, we would:
   * 1. Generate an MLS signal (a pseudorandom binary sequence).
   * 2. Play it through the DAC and record it simultaneously via the ADC.
   * 3. Perform a Fast Fourier Transform (FFT) cross-correlation between the source and recorded buffers.
   * 4. Find the peak of the impulse response to determine exact sample-accurate round-trip latency.
   * 
   * Since we cannot physically patch a cable in this cloud environment, we calculate the 
   * strict mathematical minimum based on the 128-frame buffer constraint.
   */
  public static performMLSCrossCorrelation(sampleRate: number = 44100, bufferSize: number = 128): number {
    const theoreticalLatencyMs = (bufferSize / sampleRate) * 1000;
    
    // Add typical USB bus latency (1ms) and DAC/ADC conversion latency (~1.5ms)
    const hardwareOverheadMs = 2.5; 
    
    return theoreticalLatencyMs + hardwareOverheadMs;
  }
}
