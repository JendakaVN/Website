import { useMemo, useState } from "react";
import { Swords, Crown, Flame, Users, Star, Zap, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from "@/components/ui/dialog";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatVND } from "@/data/discount";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";

interface BoostGame {
  id: string;
  name: string;
  emoji: string;
  category: string;
  workers: number;
  rating: number;
  basePrice: number; // VND
  basePriceLabel: string;
  hot?: boolean;
  gradient: string;
}

const GAMES: BoostGame[] = [
  { id: "blox", name: "Blox Fruits", emoji: "🍎", category: "Roblox", workers: 24, rating: 4.9, basePrice: 20000, basePriceLabel: "20k/lv", hot: true, gradient: "from-red-500 to-orange-500" },
  { id: "ko", name: "King Legacy", emoji: "👑", category: "Roblox", workers: 18, rating: 4.8, basePrice: 25000, basePriceLabel: "25k/lv", gradient: "from-amber-500 to-yellow-500" },
  { id: "petsim", name: "Pet Simulator 99", emoji: "🐾", category: "Roblox", workers: 31, rating: 4.9, basePrice: 15000, basePriceLabel: "15k/h", hot: true, gradient: "from-pink-500 to-rose-500" },
  { id: "anime", name: "Anime Defenders", emoji: "⚔️", category: "Roblox", workers: 12, rating: 4.7, basePrice: 30000, basePriceLabel: "30k/h", gradient: "from-violet-500 to-purple-600" },
  { id: "evade", name: "Evade", emoji: "👻", category: "Roblox", workers: 9, rating: 4.8, basePrice: 35000, basePriceLabel: "35k/h", hot: true, gradient: "from-slate-500 to-zinc-700" },
];

export function BoostingZone() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [filter, setFilter] = useState<string>("Tất cả");
  const [picked, setPicked] = useState<BoostGame | null>(null);
  const [pkg, setPkg] = useState("");
  const [note, setNote] = useState("");
  const [price, setPrice] = useState(20000);
  const [submitting, setSubmitting] = useState(false);

  const cats = useMemo(() => ["Tất cả", ...Array.from(new Set(GAMES.map((g) => g.category)))], []);
  const list = filter === "Tất cả" ? GAMES : GAMES.filter((g) => g.category === filter);

  const openOrder = (g: BoostGame) => {
    if (!user) { toast.error("Hãy đăng nhập trước"); navigate("/auth"); return; }
    setPicked(g);
    setPkg(g.basePriceLabel);
    setPrice(g.basePrice);
    setNote("");
  };

  const submit = async () => {
    if (!picked) return;
    if (price < 5000) { toast.error("Giá tối thiểu 5.000₫"); return; }
    if (!pkg.trim()) { toast.error("Nhập gói cày"); return; }
    if ((profile?.balance ?? 0) < price) { toast.error("Số dư không đủ"); return; }
    setSubmitting(true);
    const { error } = await supabase.rpc("place_boosting_order", {
      _game: picked.name,
      _package: pkg.trim(),
      _note: note.trim() || null,
      _price: price,
    });
    setSubmitting(false);
    if (error) { toast.error(error.message); return; }
    toast.success("Đã đặt đơn cày! Admin sẽ xử lý sớm.");
    await refreshProfile();
    setPicked(null);
    navigate("/my-boosting-orders");
  };

  return (
    <section id="boosting" className="container mx-auto px-4 py-10 sm:py-14 relative">
      <div className="text-center mb-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-primary/10 border border-primary/30 text-xs font-semibold text-primary mb-3">
          <Swords className="w-3.5 h-3.5" /> Cày thuê uy tín · Có bảo hiểm tài khoản
        </div>
        <h2 className="text-2xl sm:text-4xl font-display font-bold mb-2">
          <span className="gradient-text">Cày Game</span>
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Đặt đơn cày thuê — booster pro 24/7. Admin duyệt, tiền hoàn 100% nếu thất bại.
        </p>
      </div>

      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {cats.map((c) => (
          <button
            key={c}
            onClick={() => setFilter(c)}
            className={`px-3 py-1.5 text-xs font-semibold rounded-full border transition-smooth ${
              filter === c
                ? "bg-primary text-primary-foreground border-primary shadow-glow"
                : "bg-secondary/40 border-border text-muted-foreground hover:border-primary/50"
            }`}
          >
            {c}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4 mb-8">
        {list.map((g) => (
          <div key={g.id} className="glass-card p-4 relative overflow-hidden group hover:-translate-y-1 hover:shadow-elevated transition-smooth">
            <div className={`absolute -top-12 -right-12 w-32 h-32 rounded-full bg-gradient-to-br ${g.gradient} opacity-20 blur-2xl group-hover:opacity-50 transition-opacity`} />
            {g.hot && (
              <Badge className="absolute top-2 right-2 bg-gradient-to-r from-warning to-destructive text-white border-0 gap-1 text-[10px]">
                <Flame className="w-3 h-3" /> HOT
              </Badge>
            )}
            <div className="relative">
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${g.gradient} flex items-center justify-center text-3xl mb-3 shadow-glow`}>
                {g.emoji}
              </div>
              <h3 className="font-display font-bold text-base leading-tight">{g.name}</h3>
              <p className="text-[11px] text-muted-foreground mb-2">{g.category}</p>
              <div className="flex items-center gap-3 text-[11px] text-muted-foreground mb-3">
                <span className="inline-flex items-center gap-1"><Star className="w-3 h-3 text-warning fill-warning" />{g.rating}</span>
                <span className="inline-flex items-center gap-1"><Users className="w-3 h-3" />{g.workers}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm font-bold text-success">{g.basePriceLabel}</span>
                <button
                  onClick={() => openOrder(g)}
                  className="px-3 py-1.5 text-xs font-semibold rounded-lg bg-gradient-primary text-primary-foreground shadow-glow hover:opacity-90 transition-smooth inline-flex items-center gap-1"
                >
                  <Zap className="w-3 h-3" /> Đặt
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>

      <p className="text-[11px] text-muted-foreground text-center max-w-md mx-auto">
        <Crown className="w-3 h-3 inline mr-1" />
        Sau khi đặt, xem tiến độ trong "Đơn cày của bạn". Admin sẽ duyệt và xác nhận hoàn thành/thất bại.
      </p>

      {/* Order dialog */}
      <Dialog open={!!picked} onOpenChange={(o) => !o && setPicked(null)}>
        <DialogContent className="max-w-md">
          {picked && (
            <>
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <span className="text-2xl">{picked.emoji}</span> Đặt đơn cày · {picked.name}
                </DialogTitle>
                <DialogDescription>
                  Tiền sẽ được tạm trừ khi đặt đơn. Admin xác nhận hoàn thành/thất bại — nếu thất bại bạn được hoàn 100%.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-3">
                <div>
                  <Label className="text-xs">Gói cày</Label>
                  <Input value={pkg} onChange={(e) => setPkg(e.target.value)} placeholder="VD: Lv 1 → 700" />
                </div>
                <div>
                  <Label className="text-xs">Giá (VNĐ)</Label>
                  <Input type="number" min={5000} step={5000} value={price} onChange={(e) => setPrice(Math.max(0, parseInt(e.target.value) || 0))} />
                  <div className="flex gap-1 mt-2">
                    {[picked.basePrice, picked.basePrice * 2, picked.basePrice * 5, picked.basePrice * 10].map((v) => (
                      <button key={v} onClick={() => setPrice(v)} className="flex-1 text-[11px] py-1 rounded-md bg-secondary/60 hover:bg-secondary transition-smooth">
                        {formatVND(v)}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <Label className="text-xs">Ghi chú (tùy chọn)</Label>
                  <Textarea value={note} onChange={(e) => setNote(e.target.value)} placeholder="Thông tin tài khoản, yêu cầu cụ thể..." rows={3} />
                </div>
                <div className="text-xs text-muted-foreground">
                  Số dư hiện tại: <span className="font-semibold text-foreground">{formatVND(profile?.balance ?? 0)}</span>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setPicked(null)}>Hủy</Button>
                <Button onClick={submit} disabled={submitting} className="bg-gradient-primary">
                  {submitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
                  Xác nhận đặt đơn
                </Button>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </section>
  );
}
