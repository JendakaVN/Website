// Tạo âm thanh win/lose bằng WebAudio (không cần asset).
let ctx: AudioContext | null = null;
const getCtx = () => {
  if (typeof window === "undefined") return null;
  if (!ctx) {
    const AC = (window.AudioContext || (window as any).webkitAudioContext);
    if (!AC) return null;
    ctx = new AC();
  }
  if (ctx.state === "suspended") ctx.resume().catch(() => {});
  return ctx;
};

function tone(freq: number, start: number, dur: number, type: OscillatorType = "triangle", vol = 0.18) {
  const c = getCtx();
  if (!c) return;
  const osc = c.createOscillator();
  const gain = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, c.currentTime + start);
  gain.gain.setValueAtTime(0, c.currentTime + start);
  gain.gain.linearRampToValueAtTime(vol, c.currentTime + start + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, c.currentTime + start + dur);
  osc.connect(gain).connect(c.destination);
  osc.start(c.currentTime + start);
  osc.stop(c.currentTime + start + dur + 0.05);
}

export function playWinSound() {
  // Arpeggio C5-E5-G5-C6 vui tươi
  tone(523.25, 0, 0.18);
  tone(659.25, 0.12, 0.18);
  tone(783.99, 0.24, 0.2);
  tone(1046.5, 0.36, 0.45, "triangle", 0.22);
}

export function playLoseSound() {
  // 2 nốt giảm dần buồn
  tone(330, 0, 0.25, "sawtooth", 0.14);
  tone(220, 0.2, 0.45, "sawtooth", 0.14);
}
