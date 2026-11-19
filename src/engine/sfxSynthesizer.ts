export type SfxName =
  | 'glitch'
  | 'ding'
  | 'laser'
  | 'tick'
  | 'beep'
  | 'sparkle'
  | 'whoosh'
  | 'pop'
  | 'impact'
  | 'rise'
  | 'click'
  | 'sweep'
  | string;

/**
 * Schedules a procedural Web Audio SFX on the given AudioContext & destination node
 * at `when` (in AudioContext time, seconds).
 */
export function triggerSfxAt(
  ctx: BaseAudioContext,
  destination: AudioNode,
  name: SfxName,
  when: number,
  volume: number = 0.5,
  pitch: number = 1.0
): void {
  const safeVol = Math.max(0.01, Math.min(1.5, volume)) * 0.45;
  const safePitch = Math.max(0.25, Math.min(4.0, pitch));
  const t = Math.max(ctx.currentTime, when);
  const key = name.toLowerCase().trim();

  switch (key) {
    case 'ding': {
      const osc = ctx.createOscillator();
      const osc2 = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc2.type = 'triangle';
      osc.frequency.setValueAtTime(1046.5 * safePitch, t);
      osc2.frequency.setValueAtTime(2093 * safePitch, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(safeVol, t + 0.008);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.65);
      osc.connect(gain);
      osc2.connect(gain);
      gain.connect(destination);
      osc.start(t);
      osc2.start(t);
      osc.stop(t + 0.68);
      osc2.stop(t + 0.68);
      break;
    }

    case 'beep': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(880 * safePitch, t);
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(safeVol * 0.85, t + 0.006);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.14);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(t);
      osc.stop(t + 0.16);
      break;
    }

    case 'tick':
    case 'click': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'triangle';
      osc.frequency.setValueAtTime(1650 * safePitch, t);
      osc.frequency.exponentialRampToValueAtTime(420 * safePitch, t + 0.03);
      gain.gain.setValueAtTime(safeVol * 0.9, t);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.04);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(t);
      osc.stop(t + 0.045);
      break;
    }

    case 'laser': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(1400 * safePitch, t);
      osc.frequency.exponentialRampToValueAtTime(190 * safePitch, t + 0.22);

      const filter = ctx.createBiquadFilter();
      filter.type = 'lowpass';
      filter.frequency.setValueAtTime(3200, t);
      filter.frequency.exponentialRampToValueAtTime(500, t + 0.22);

      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(safeVol * 0.7, t + 0.01);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.24);

      osc.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      osc.start(t);
      osc.stop(t + 0.25);
      break;
    }

    case 'glitch': {
      // Short digital burst + stepped square chirp
      const bufferSize = Math.floor(ctx.sampleRate * 0.14);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        const block = Math.floor(i / 180);
        const gate = block % 3 === 0 ? 1 : 0.35;
        data[i] = (Math.random() * 2 - 1) * gate;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(1900 * safePitch, t);
      filter.Q.setValueAtTime(3.2, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(safeVol * 0.75, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.14);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      noise.start(t);

      // Add stepped square blip
      const osc = ctx.createOscillator();
      const oscGain = ctx.createGain();
      osc.type = 'square';
      osc.frequency.setValueAtTime(310 * safePitch, t);
      osc.frequency.setValueAtTime(640 * safePitch, t + 0.04);
      osc.frequency.setValueAtTime(220 * safePitch, t + 0.08);
      oscGain.gain.setValueAtTime(safeVol * 0.3, t);
      oscGain.gain.exponentialRampToValueAtTime(0.001, t + 0.12);
      osc.connect(oscGain);
      oscGain.connect(destination);
      osc.start(t);
      osc.stop(t + 0.13);
      break;
    }

    case 'sparkle': {
      const notes = [1318.5, 1760, 2093, 2637];
      notes.forEach((freq, idx) => {
        const start = t + idx * 0.045;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(freq * safePitch, start);
        gain.gain.setValueAtTime(0.001, start);
        gain.gain.linearRampToValueAtTime(safeVol * 0.45, start + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0008, start + 0.28);
        osc.connect(gain);
        gain.connect(destination);
        osc.start(start);
        osc.stop(start + 0.3);
      });
      break;
    }

    case 'whoosh':
    case 'sweep': {
      const bufferSize = Math.floor(ctx.sampleRate * 0.32);
      const buffer = ctx.createBuffer(1, bufferSize, ctx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufferSize; i++) {
        data[i] = Math.random() * 2 - 1;
      }
      const noise = ctx.createBufferSource();
      noise.buffer = buffer;

      const filter = ctx.createBiquadFilter();
      filter.type = 'bandpass';
      filter.frequency.setValueAtTime(280 * safePitch, t);
      filter.frequency.exponentialRampToValueAtTime(2400 * safePitch, t + 0.16);
      filter.frequency.exponentialRampToValueAtTime(420 * safePitch, t + 0.32);
      filter.Q.setValueAtTime(1.8, t);

      const gain = ctx.createGain();
      gain.gain.setValueAtTime(0.001, t);
      gain.gain.linearRampToValueAtTime(safeVol * 0.75, t + 0.12);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.32);

      noise.connect(filter);
      filter.connect(gain);
      gain.connect(destination);
      noise.start(t);
      break;
    }

    case 'impact':
    case 'thud':
    case 'stamp': {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime((key === 'thud' ? 135 : 160) * safePitch, t);
      osc.frequency.exponentialRampToValueAtTime(36, t + 0.24);
      gain.gain.setValueAtTime(safeVol * 1.15, t);
      gain.gain.exponentialRampToValueAtTime(0.001, t + 0.28);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(t);
      osc.stop(t + 0.3);
      break;
    }

    case 'pop':
    default: {
      const osc = ctx.createOscillator();
      const gain = ctx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(340 * safePitch, t);
      osc.frequency.exponentialRampToValueAtTime(760 * safePitch, t + 0.055);
      gain.gain.setValueAtTime(safeVol * 0.75, t);
      gain.gain.exponentialRampToValueAtTime(0.0008, t + 0.085);
      osc.connect(gain);
      gain.connect(destination);
      osc.start(t);
      osc.stop(t + 0.09);
      break;
    }
  }
}
