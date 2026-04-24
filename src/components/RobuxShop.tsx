import { useState } from "react";
import { z } from "zod";
import { formatVND } from "@/data/discount";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { Coins, Sparkles, Lock } from "lucide-react";

interface OfficialPackage {
  robux: number;
  priceVnd: number;
  badge?: string;
}

const OFFICIAL_PACKAGES: OfficialPackage[] = [
  { robux: 55, priceVnd: 20000 },
  { robux: 145, priceVnd: 50000, badge: "Phổ biến" },
  { robux: 300, priceVnd: 100000, badge: "HOT" },
];

const userSchema = z
  .string()
  .trim()
  .min(4, "Tối thiểu 4 ký tự (gồm @ và ít nhất 3 ký tự)")
  .max(21, "Tối đa 21 ký tự (gồm @ và tối đa 20 ký tự)")
  .regex(/^@[A-Za-z0-9_]+$/, "Phải bắt đầu bằng @, theo sau là chữ, số hoặc _");

export function RobuxShop() {
  const { user, profile, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [username, setUsername] = useState("");
  const [picked, setPicked] = useState<OfficialPackage>(OFFICIAL_PACKAGES[1]);
  const [busy, setBusy] = useState(false);

  const buy = async () => {
    if (!user) { navigate("/auth"); return; }
    const parsed = userSchema.safeParse(username);
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    if ((profile?.balance ?? 0) < picked.priceVnd) { toast.error("Số dư không đủ. Hãy nạp thẻ trước!"); return; }
    setBusy(true);
    try {
      const { error: rpc } = await supabase.rpc("adjust_balance", {
        _delta: -picked.priceVnd,
        _type: "robux_purchase",
        _description: `Mua ${picked.robux} Robux (chính hãng) cho ${parsed.data}`,
      });
      if (rpc) throw rpc;
      const { error } = await supabase.from("robux_orders").insert({
        user_id: user.id,
        roblox_username: parsed.data,
        package_robux: picked.robux,
        price: picked.priceVnd,
        status: "processing",
      });
      if (error) throw error;
      toast.success(`Đã đặt ${picked.robux} Robux cho ${parsed.data}!`);
      await refreshProfile();
    } catch (e: any) {
      toast.error(e.message ?? "Lỗi");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section id="robux" className="container mx-auto px-4 py-10 sm:py-14">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-4xl font-display font-bold mb-2">Mua <span className="gradient-text">Robux</span></h2>
        <p className="text-muted-foreground text-sm sm:text-base">Nhận Robux trong 1–5 phút sau khi đặt.</p>
      </div>

      <div className="glass-card p-5 sm:p-8 max-w-5xl mx-auto">
        <Tabs defaultValue="official" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-6">
            <TabsTrigger value="official">Robux chính hãng</TabsTrigger>
            <TabsTrigger value="lau">Robux 120h</TabsTrigger>
          </TabsList>

          <TabsContent value="official" className="mt-0">
            <div className="mb-6">
              <Label htmlFor="rblxuser">Tên đăng nhập Roblox</Label>
              <Input
                id="rblxuser"
                value={username}
                onChange={(e) => {
                  let val = e.target.value;
    
                  // Chỉ giữ lại chữ cái, số, _ và @
                  val = val.replace(/[^A-Za-z0-9_@]/g, '');
    
                  // Nếu có @ không nằm ở đầu, xóa nó đi
                  if (val.indexOf('@') > 0) {
                    val = val.replace(/@/g, '');
                  }
    
                  // Nếu chưa có @ ở đầu và người dùng đã gõ ít nhất 1 ký tự, tự động thêm @ vào đầu
                  if (val.length > 0 && !val.startsWith('@')) {
                    val = '@' + val;
                  }
    
                  // Giới hạn độ dài tối đa 21 ký tự (bao gồm @)
                  setUsername(val.slice(0, 21));
                }}
                placeholder="VD: @cnvksg"
                maxLength={21}
            />
            </div>

            <Label className="mb-3 block">Chọn gói</Label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
              {OFFICIAL_PACKAGES.map((p) => (
                <button
                  key={p.robux}
                  onClick={() => setPicked(p)}
                  className={`relative p-4 rounded-xl text-center transition-bounce border-2 ${
                    picked.robux === p.robux
                      ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
                      : "border-border bg-secondary/40 hover:border-primary/50"
                  }`}
                >
                  {p.badge && (
                    <span className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0.5 text-[10px] font-bold rounded-full bg-gradient-gold text-background">
                      {p.badge}
                    </span>
                  )}
                  <Coins className={`w-6 h-6 mx-auto mb-1 ${picked.robux === p.robux ? "text-primary-foreground" : "text-warning"}`} />
                  <div className="font-display font-bold text-lg">Gói {p.robux.toLocaleString()} Robux</div>
                  <div className="font-semibold mt-1 text-sm">{formatVND(p.priceVnd)}</div>
                </button>
              ))}
            </div>

            <Button onClick={buy} disabled={busy} className="w-full bg-gradient-primary hover:opacity-90 transition-smooth shadow-glow h-12 font-semibold">
              <Sparkles className="w-4 h-4 mr-2" />
              {busy ? "Đang xử lý..." : user ? `Đặt mua ${picked.robux} Robux — ${formatVND(picked.priceVnd)}` : "Đăng nhập để mua"}
            </Button>
          </TabsContent>

          <TabsContent value="lau" className="mt-0">
            <div className="flex flex-col items-center justify-center py-16 text-center">
              <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center mb-4">
                <Lock className="w-8 h-8 text-muted-foreground" />
              </div>
              <h3 className="font-display font-bold text-xl mb-2">Hiện chưa có</h3>
              <p className="text-muted-foreground text-sm">Mục Robux 120h đang được cập nhật. Vui lòng quay lại sau.</p>
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </section>
  );
}
