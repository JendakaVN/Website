import { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { formatVND } from "@/data/discount";
import { Disc3, Gift, Dices, Sparkles, Frown, PartyPopper, ChevronRight } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { playWinSound, playLoseSound } from "@/lib/sound";

const SPIN_SEGMENTS = [
  { mult: 1, label: "Chúc may mắn", color: "hsl(var(--muted))" },   // 1 → 0.8
  { mult: 0.5, label: "x0.5", color: "hsl(var(--accent))" },
  { mult: 1, label: "x1", color: "hsl(var(--primary))" },
  { mult: 2.2, label: "x2.2", color: "hsl(var(--success))" },         // 1.5 → 1.2
  { mult: 1.5, label: "x1.5", color: "hsl(var(--warning))" },         // 2 → 1.5
  { mult: 0, label: "Mất lượt", color: "hsl(var(--destructive))" },
  { mult: 2, label: "x2", color: "hsl(var(--primary-glow))" },   // 1.8 → 1.5
  { mult: 1.7, label: "x1.7", color: "hsl(var(--accent))" },          // 0.8 → 0.7
];

const BOX_ITEMS = [
  { mult: 2.5, label: "💎 Kim cương", rarity: "Hiếm" }, 
  { mult: 2, label: "✨ Pha lê", rarity: "Thường" },  
  { mult: 1.5, label: "💰 Túi vàng", rarity: "Thường" },
  { mult: 0, label: "❌ Hộp rỗng", rarity: "Trượt" },
  { mult: 3, label: "🎁 Báu vật", rarity: "Huyền thoại" }, 
  { mult: 0, label: "💸 Cát bụi", rarity: "Trượt" },
];

interface ResultPopup {
  win: boolean;
  title: string;
  detail: string;
  amount: number;
}

// ===== Win-rate controller: target 45% (9 thắng / 20 lượt) trên 20 lượt gần nhất, áp dụng cho TẤT CẢ mini game =====
const HISTORY_KEY = "mg_history_v1";
const WINDOW_SIZE = 20;
const TARGET_WINS = 9;

function getHistory(): boolean[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    if (!raw) return [];
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr.slice(-WINDOW_SIZE) : [];
  } catch { return []; }
}

function pushHistory(win: boolean) {
  const h = [...getHistory(), win].slice(-WINDOW_SIZE);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(h));
}

/** Quyết định lượt này có được phép thắng hay không, dựa trên lịch sử gần nhất. */
function decideWin(): boolean {
  const h = getHistory();
  const wins = h.filter(Boolean).length;
  const losses = h.length - wins;
  // Nếu đã đạt/đủ ngưỡng thắng trong cửa sổ → ép thua
  if (wins >= TARGET_WINS) return false;
  // Nếu đã thua quá nhiều (đủ chỗ trống cần thắng) → ép thắng để giữ tỉ lệ
  const remaining = WINDOW_SIZE - h.length;
  const winsNeeded = TARGET_WINS - wins;
  if (winsNeeded > remaining) return true;
  // Còn lại theo xác suất 45%
  return Math.random() < TARGET_WINS / WINDOW_SIZE;
}

// Lịch sử ván chơi giờ chỉ lưu local (không insert lên cloud)
const PLAYS_KEY = "mg_plays_v1";
interface LocalPlay { id: string; game: string; bet: number; reward: number; outcome: string; at: number; }
function pushLocalPlay(p: Omit<LocalPlay, "id" | "at">) {
  try {
    const raw = localStorage.getItem(PLAYS_KEY);
    const arr: LocalPlay[] = raw ? JSON.parse(raw) : [];
    arr.unshift({ ...p, id: crypto.randomUUID(), at: Date.now() });
    localStorage.setItem(PLAYS_KEY, JSON.stringify(arr.slice(0, 100)));
  } catch {}
}

async function play(_uid: string, game: "spin" | "box" | "dice", bet: number, reward: number, outcome: string) {
  const { error: e1 } = await supabase.rpc("adjust_balance", {
    _delta: -bet,
    _type: "game_bet",
    _description: `Đặt cược ${game}`,
  });
  if (e1) throw e1;
  if (reward > 0) {
    const { error: e2 } = await supabase.rpc("adjust_balance", {
      _delta: reward,
      _type: "game_win",
      _description: `Thắng ${game}: ${outcome}`,
    });
    if (e2) throw e2;
  }
  // Lưu lịch sử ván chơi vào localStorage thay vì cloud
  pushLocalPlay({ game, bet, reward, outcome });
}

function GameCard({ icon, title, color, children }: any) {
  return (
    <div className="glass-card p-5 transition-smooth hover:shadow-elevated hover:-translate-y-1 relative overflow-hidden group">
      <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${color} opacity-20 blur-2xl group-hover:opacity-40 transition-opacity`} />
      <div className="relative flex items-center gap-3 mb-4">
        <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${color} flex items-center justify-center shadow-glow`}>
          {icon}
        </div>
        <h3 className="font-display font-bold text-xl">{title}</h3>
      </div>
      <div className="relative">{children}</div>
    </div>
  );
}

function BetInput({ bet, setBet }: { bet: number; setBet: (n: number) => void }) {
  return (
    <div className="space-y-2 mb-3">
      <Label className="text-xs text-muted-foreground">Đặt cược (VNĐ)</Label>
      <Input
        type="number"
        min={1000}
        step={1000}
        value={bet}
        onChange={(e) => setBet(Math.max(0, parseInt(e.target.value) || 0))}
      />
      <div className="flex gap-1">
        {[5000, 10000, 50000, 100000].map((v) => (
          <button key={v} onClick={() => setBet(v)} className="flex-1 text-[11px] py-1 rounded-md bg-secondary/60 hover:bg-secondary transition-smooth">
            {formatVND(v)}
          </button>
        ))}
      </div>
    </div>
  );
}

export function MiniGames() {
  const { user, profile, refreshProfile } = useAuth();
  const [bet1, setBet1] = useState(10000);
  const [bet2, setBet2] = useState(10000);
  const [bet3, setBet3] = useState(10000);
  const [busy, setBusy] = useState<string | null>(null);
  const [spinAngle, setSpinAngle] = useState(0);
  const [boxIdx, setBoxIdx] = useState<number | null>(null);
  const [boxOpening, setBoxOpening] = useState(false);
  const [diceRoll, setDiceRoll] = useState<[number, number] | null>(null);
  const [diceRolling, setDiceRolling] = useState(false);
  const [popup, setPopup] = useState<ResultPopup | null>(null);

  const ensure = (bet: number) => {
    if (!user) { toast.error("Hãy đăng nhập trước"); return false; }
    if (bet < 1000) { toast.error("Cược tối thiểu 1.000₫"); return false; }
    if ((profile?.balance ?? 0) < bet) { toast.error("Số dư không đủ"); return false; }
    return true;
  };

  const showResult = (win: boolean, title: string, detail: string, amount: number) => {
    setPopup({ win, title, detail, amount });
    if (win) playWinSound(); else playLoseSound();
  };

  const spin = async () => {
    if (!ensure(bet1)) return;
    setBusy("spin");

    // Logic thao túng: Quyết định thắng hay thua trước khi quay
    const shouldWin = decideWin();
    
    // Phân loại các ô để chọn
    const winIndices = SPIN_SEGMENTS.map((s, i) => s.mult > 1 ? i : -1).filter(i => i !== -1);
    const lossIndices = SPIN_SEGMENTS.map((s, i) => s.mult <= 1 ? i : -1).filter(i => i !== -1);
    
    // Chọn index dựa trên quyết định của "nhà cái"
    let idx;
    if (shouldWin && winIndices.length > 0) {
      idx = winIndices[Math.floor(Math.random() * winIndices.length)];
    } else {
      idx = lossIndices[Math.floor(Math.random() * lossIndices.length)];
    }

    const seg = SPIN_SEGMENTS[idx];
    const reward = Math.round(bet1 * seg.mult);
    const segAngle = 360 / SPIN_SEGMENTS.length;

    // Tính toán góc quay: Quay ít nhất 6 vòng + góc tới ô mục tiêu
    // Thêm một chút random (-segAngle/3 đến segAngle/3) để kim không dừng chính giữa ô, trông thật hơn
    const randomOffset = (Math.random() - 0.5) * (segAngle * 0.7);
    const target = (360 * 8) + (90 - (idx * segAngle + segAngle / 2) + 360) % 360 + randomOffset;
    
    setSpinAngle(target);

    await new Promise((r) => setTimeout(r, 3200));
    try {
      await play(user!.id, "spin", bet1, reward, seg.label);
      pushHistory(reward > 0);
      showResult(reward > 0, reward > 0 ? "Chiến thắng!" : "Tiếc quá!", `Vòng quay dừng ở: ${seg.label}`, reward);
      await refreshProfile();
    } catch (e: any) { toast.error(e.message); }
    setBusy(null);
  };

  const openBox = async () => {
    if (!ensure(bet2)) return;
    setBusy("box");
    setBoxOpening(true);
    setBoxIdx(null);

    // Logic thao túng cho Hộp
    const shouldWin = decideWin();
    const winIndices = BOX_ITEMS.map((b, i) => b.mult > 1 ? i : -1).filter(i => i !== -1);
    const lossIndices = BOX_ITEMS.map((b, i) => b.mult <= 1 ? i : -1).filter(i => i !== -1);

    let idx;
    if (shouldWin && winIndices.length > 0) {
      idx = winIndices[Math.floor(Math.random() * winIndices.length)];
    } else {
      idx = lossIndices[Math.floor(Math.random() * lossIndices.length)];
    }

    const item = BOX_ITEMS[idx];
    await new Promise((r) => setTimeout(r, 1400));
    setBoxIdx(idx);
    setBoxOpening(false);
    const reward = Math.round(bet2 * item.mult);
    await new Promise((r) => setTimeout(r, 500));
    try {
      await play(user!.id, "box", bet2, reward, item.label);
      pushHistory(reward > 0);
      showResult(reward > 0, reward > 0 ? `Vật phẩm ${item.rarity}!` : "Hộp rỗng!", item.label, reward);
      await refreshProfile();
    } catch (e: any) { toast.error(e.message); }
    setBusy(null);
  };

  const rollDice = async () => {
    if (!ensure(bet3)) return;
    setBusy("dice");
    setDiceRolling(true);
    const tick = setInterval(() => {
      setDiceRoll([1 + Math.floor(Math.random() * 6), 1 + Math.floor(Math.random() * 6)]);
    }, 90);
    await new Promise((r) => setTimeout(r, 1400));
    clearInterval(tick);

    // Logic thao túng cho Xúc xắc
    const shouldWin = decideWin();
    let a, b, sum;

    // Hàm kiểm tra xem một cặp xúc xắc có phải là "thắng" không (mult > 1)
    const isWin = (s: number) => s >= 7; 

    // Tìm kết quả phù hợp
    let attempts = 0;
    do {
      a = 1 + Math.floor(Math.random() * 6);
      b = 1 + Math.floor(Math.random() * 6);
      sum = a + b;
      attempts++;
      // Nếu decideWin bảo thắng mà quay ra thua (hoặc ngược lại), thì quay lại 
      // (Giới hạn 50 lần thử để tránh lặp vô tận, mặc dù xác suất đó gần như bằng 0)
    } while (isWin(sum) !== shouldWin && attempts < 50);

    setDiceRoll([a, b]);
    setDiceRolling(false);
    sum = a + b;

    const mult = sum >= 12 ? 3 : sum === 11 ? 2 : sum >= 9 ? 1.5 : sum >= 7 ? 1.1 : sum >= 5 ? 0.5 : 0;
    const reward = Math.round(bet3 * mult);
    await new Promise((r) => setTimeout(r, 400));
    try {
      await play(user!.id, "dice", bet3, reward, `${a}+${b}=${sum}`);
      pushHistory(reward > 0);
      showResult(reward > 0, reward > 0 ? `Tổng ${sum} - Thắng x${mult}!` : `Tổng ${sum} - Thua`, `Xúc xắc: ${a} + ${b}`, reward);
      await refreshProfile();
    } catch (e: any) { toast.error(e.message); }
    setBusy(null);
  };

  const DiceFace = ({ n, rolling }: { n: number; rolling?: boolean }) => {
    const dots: Record<number, string[]> = {
      1: ["c"],
      2: ["tl", "br"],
      3: ["tl", "c", "br"],
      4: ["tl", "tr", "bl", "br"],
      5: ["tl", "tr", "c", "bl", "br"],
      6: ["tl", "tr", "ml", "mr", "bl", "br"],
    };
    const pos: Record<string, string> = {
      tl: "top-1.5 left-1.5", tr: "top-1.5 right-1.5",
      ml: "top-1/2 -translate-y-1/2 left-1.5", mr: "top-1/2 -translate-y-1/2 right-1.5",
      bl: "bottom-1.5 left-1.5", br: "bottom-1.5 right-1.5",
      c: "top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2",
    };
    return (
      <div className={`relative w-16 h-16 rounded-2xl bg-gradient-to-br from-background to-secondary border-2 border-primary/60 shadow-glow ${rolling ? "animate-bounce" : ""}`}>
        {dots[n].map((p, i) => (
          <div key={i} className={`absolute w-2.5 h-2.5 rounded-full bg-primary ${pos[p]}`} />
        ))}
      </div>
    );
  };

  const segAngle = 360 / SPIN_SEGMENTS.length;
  const conicGradient = SPIN_SEGMENTS.map((s, i) => `${s.color} ${i * segAngle}deg ${(i + 1) * segAngle}deg`).join(", ");

  return (
    <section id="games" className="container mx-auto px-4 py-10 sm:py-14 relative overflow-hidden">
      {/* Aura background */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-10 left-1/4 w-72 h-72 rounded-full bg-primary/20 blur-3xl animate-pulse" />
        <div className="absolute bottom-10 right-1/4 w-72 h-72 rounded-full bg-accent/20 blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 rounded-full bg-warning/10 blur-3xl" />
      </div>

      <div className="text-center mb-8 relative">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-warning/10 border border-warning/30 text-xs font-semibold text-warning mb-3">
          <Sparkles className="w-3.5 h-3.5 animate-pulse" /> Tỉ lệ thưởng cực đỉnh — thắng x5!
        </div>
        <h2 className="text-3xl sm:text-5xl font-display font-bold mb-2">
          Mini <span className="shimmer-text">Game</span>
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">Quay số · Mở hộp · Đổ xúc xắc — thưởng tới x5 lần cược!</p>
      </div>

      <div className="grid md:grid-cols-3 gap-4 max-w-6xl mx-auto relative">
        {/* SPIN */}
        <GameCard title="Vòng quay" color="from-violet-500 to-purple-600" icon={<Disc3 className="w-6 h-6 text-white" />}>
          <div className="flex justify-center mb-4">
            <div className="relative w-40 h-40 mini-game-aura rounded-full">
              {/* outer glow ring */}
              <div className="absolute inset-0 rounded-full bg-gradient-to-br from-primary/40 to-accent/40 blur-xl animate-pulse" />
              <div
                className="relative w-full h-full rounded-full border-4 border-primary shadow-glow"
                style={{
                  transform: `rotate(${spinAngle}deg)`,
                  transition: "transform 3s cubic-bezier(.17,.67,.21,1)",
                  background: `conic-gradient(${conicGradient})`,
                }}
              >
                {SPIN_SEGMENTS.map((s, i) => (
                  <div
                    key={i}
                    className={`absolute top-1/2 left-1/2 origin-left font-black text-white drop-shadow-[0_2px_4px_rgba(0,0,0,1)] tracking-tighter uppercase ${
                      s.label === "Mất lượt" 
                        ? "text-[9px] whitespace-nowrap" 
                        : s.label === "Chúc may mắn" 
                        ? "text-[10px] leading-[0.85]" 
                        : "text-[12px] whitespace-nowrap"
                    }`}
                    style={{ 
                      transform: `rotate(${i * segAngle + segAngle / 2 - 90}deg) translateX(${
                        s.label === "Chúc may mắn" || s.label === "Mất lượt" ? "22px" : 
                        (s.label === "x2" || s.label === "x1.7") ? "46px" : 
                        (s.label === "x1") ? "43px" : 
                        (s.label === "x2.2") ? "35px" : 
                        "38px"
                      }) translateY(${
                        s.label === "x0.5" || s.label === "x1" ? "-3px" :
                        s.label === "Mất lượt" ? "3px" :
                        "0px"
                      })` 
                    }}
                  >
                    {s.label === "Chúc may mắn" ? (
                      <div className="flex flex-col">
                        <span className="pl-2">CHÚC MAY</span>
                        <span className="pl-8 text-[11.5px] mt-1">MẮN</span>
                      </div>
                    ) : (
                      s.label
                    )}
                  </div>
                ))}
              </div>
              {/* center hub */}
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-gradient-primary border-2 border-background shadow-glow z-10" />
              {/* pointer */}
              <ChevronRight className="absolute -right-5 top-1/2 -translate-y-1/2 w-8 h-8 text-warning drop-shadow-lg z-10 rotate-180" />
            </div>
          </div>
          <div className="text-[12px] text-muted-foreground text-center mt-1">
            🎲 Tỉ lệ: x2.2 · x2 · x1.7 · x1.5 · x1 · x0.5 · Chúc may mắn · Mất lượt
          </div>
          <BetInput bet={bet1} setBet={setBet1} />
          <Button onClick={spin} disabled={busy === "spin"} className="w-full bg-gradient-primary font-semibold">
            {busy === "spin" ? "Đang quay..." : "Quay ngay"}
          </Button>
        </GameCard>

        {/* BOX */}
        <GameCard title="Hộp ngẫu nhiên" color="from-amber-500 to-orange-600" icon={<Gift className="w-6 h-6 text-white" />}>
          <div className="h-40 flex flex-col items-center justify-center gap-2 mb-4 rounded-2xl bg-gradient-to-br from-secondary/60 to-secondary/20 border border-border/50 relative overflow-hidden">
            {boxOpening && (
              <>
                <div className="absolute inset-0 bg-gradient-to-t from-warning/30 to-transparent animate-pulse" />
                <Sparkles className="absolute top-3 left-4 w-5 h-5 text-warning animate-ping" />
                <Sparkles className="absolute bottom-3 right-4 w-4 h-4 text-warning animate-ping" style={{ animationDelay: "0.3s" }} />
            </>
            )}
            <div className={`text-5xl ${boxOpening ? "animate-bounce" : "transition-smooth"}`}>
              {boxIdx !== null ? BOX_ITEMS[boxIdx].label.split(" ")[0] : "🎁"}
            </div>
            {boxIdx !== null && !boxOpening && (
              <div className="absolute bottom-2 left-0 right-0 text-center text-xs font-semibold text-foreground/80">
             {BOX_ITEMS[boxIdx].rarity}
            </div>
          )}
        {/* Dòng luật chơi nằm trong khung */}
        <div className="text-[12px] text-muted-foreground mt-1 text-center">
          🎁 Tỉ lệ: Báu vật x3 · Kim cương x2.5 · Pha lê x2 · Túi vàng x1.5 · Hộp rỗng / Cát bụi x0
          </div>
        </div>
        <BetInput bet={bet2} setBet={setBet2} />
          <Button onClick={openBox} disabled={busy === "box"} className="w-full bg-gradient-primary font-semibold">
            {busy === "box" ? "Đang mở..." : "Mở hộp"}
          </Button>
        </GameCard>

        {/* DICE */}
        <GameCard title="Xúc xắc" color="from-cyan-500 to-blue-600" icon={<Dices className="w-6 h-6 text-white" />}>
          <div className="h-40 flex flex-col items-center justify-center gap-2 mb-4 rounded-2xl bg-gradient-to-br from-secondary/60 to-secondary/20 border border-border/50">
            {diceRoll ? (
              <div className="flex items-center gap-3">
                <DiceFace n={diceRoll[0]} rolling={diceRolling} />
                <span className="text-2xl font-display font-bold text-muted-foreground">+</span>
                <DiceFace n={diceRoll[1]} rolling={diceRolling} />
              </div>
            ) : (
              <div className="flex gap-3">
                <DiceFace n={1} />
                <DiceFace n={6} />
              </div>
            )}
            <div className="text-[13px] text-muted-foreground mt-1 text-center">
             🎲 12: x3 · 11: x2 · 9-10: x1.5 · 7-8: x1.1 · 5-6: x0.5 · ≤4: 0
            </div>
          </div>
          <BetInput bet={bet3} setBet={setBet3} />
          <Button onClick={rollDice} disabled={busy === "dice"} className="w-full bg-gradient-primary font-semibold">
            {busy === "dice" ? "Đang lăn..." : "Lăn xúc xắc"}
          </Button>
        </GameCard>
      </div>

      {/* RESULT POPUP */}
      <Dialog open={!!popup} onOpenChange={(o) => !o && setPopup(null)}>
        <DialogContent className="max-w-sm border-2 overflow-hidden">
          {popup && (
            <>
              <div className={`absolute inset-0 opacity-20 ${popup.win ? "bg-gradient-to-br from-success via-warning to-primary" : "bg-gradient-to-br from-destructive to-muted"}`} />
              {popup.win && (
                <div className="absolute inset-0 pointer-events-none overflow-hidden">
                  {Array.from({ length: 30 }).map((_, i) => {
                    const colors = ["hsl(var(--warning))", "hsl(var(--success))", "hsl(var(--primary))", "hsl(var(--accent))", "hsl(var(--primary-glow))"];
                    const left = Math.random() * 100;
                    const cx = (Math.random() - 0.5) * 200;
                    const delay = Math.random() * 0.4;
                    const bg = colors[i % colors.length];
                    return (
                      <span
                        key={i}
                        className="confetti-piece"
                        style={{ left: `${left}%`, top: 0, background: bg, ['--cx' as any]: `${cx}px`, animationDelay: `${delay}s` }}
                      />
                    );
                  })}
                </div>
              )}
              <div className="relative">
                <div className="flex justify-center mb-4">
                  <div className={`w-20 h-20 rounded-full flex items-center justify-center shadow-glow ${popup.win ? "bg-gradient-to-br from-warning to-success animate-pulse" : "bg-gradient-to-br from-destructive to-muted"}`}>
                    {popup.win ? <PartyPopper className="w-10 h-10 text-white" /> : <Frown className="w-10 h-10 text-white" />}
                  </div>
                </div>
                <DialogHeader>
                  <DialogTitle className="text-center text-2xl font-display">
                    {popup.win ? <span className="gradient-text">{popup.title}</span> : popup.title}
                  </DialogTitle>
                  <DialogDescription className="text-center text-base pt-2">
                    {popup.detail}
                  </DialogDescription>
                </DialogHeader>
                <div className={`mt-4 text-center py-4 rounded-xl ${popup.win ? "bg-success/10 border border-success/30" : "bg-destructive/10 border border-destructive/30"}`}>
                  <div className="text-xs text-muted-foreground mb-1">{popup.win ? "Bạn nhận được" : "Phần thưởng"}</div>
                  <div className={`text-3xl font-display font-bold ${popup.win ? "text-success" : "text-destructive"}`}>
                    {popup.win ? `+${formatVND(popup.amount)}` : formatVND(0)}
                  </div>
                </div>
                <DialogFooter className="mt-4">
                  <Button onClick={() => setPopup(null)} className="w-full bg-gradient-primary font-semibold">
                    {popup.win ? "Tuyệt vời!" : "Thử lại"}
                  </Button>
                </DialogFooter>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
