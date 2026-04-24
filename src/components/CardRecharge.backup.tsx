import { useState } from "react";
import { z } from "zod";
import { DISCOUNT_TABLE, NETWORKS, NETWORK_COLORS, Network, creditedAmount, formatVND } from "@/data/discount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";
import { CreditCard, ArrowRight } from "lucide-react";
import { useNavigate } from "react-router-dom";

const cardSchema = z.object({
  serial: z.string().trim().min(6, "Serial tối thiểu 6 ký tự").max(40, "Serial tối đa 40 ký tự").regex(/^[A-Za-z0-9]+$/, "Chỉ chữ và số"),
  pin: z.string().trim().min(6, "Mã thẻ tối thiểu 6 ký tự").max(40, "Mã thẻ tối đa 40 ký tự").regex(/^[A-Za-z0-9]+$/, "Chỉ chữ và số"),
});

export function CardRecharge() {
  const { user, refreshProfile } = useAuth();
  const navigate = useNavigate();
  const [network, setNetwork] = useState<Network>("Viettel");
  const [denom, setDenom] = useState<number>(DISCOUNT_TABLE.Viettel[3].denomination);
  const [serial, setSerial] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const entries = DISCOUNT_TABLE[network];
  const selected = entries.find((e) => e.denomination === denom) ?? entries[0];
  const credited = creditedAmount(selected.denomination, selected.rate);

  const onNetworkChange = (n: Network) => {
    setNetwork(n);
    setDenom(DISCOUNT_TABLE[n][0].denomination);
  };

  const submit = async () => {
    if (!user) { navigate("/auth"); return; }
    const parsed = cardSchema.safeParse({ serial, pin });
    if (!parsed.success) { toast.error(parsed.error.issues[0].message); return; }
    setSubmitting(true);
    try {
      const { error } = await supabase.from("card_recharges").insert({
        user_id: user.id,
        network,
        denomination: selected.denomination,
        serial: parsed.data.serial,
        pin: parsed.data.pin,
        discount_rate: selected.rate,
        credited_amount: credited,
        status: "pending",
      });
      if (error) throw error;
      // Auto-credit demo (in real life: admin approves)
      const { error: rpcErr } = await supabase.rpc("adjust_balance", {
        _delta: credited,
        _type: "card_recharge",
        _description: `Nạp thẻ ${network} ${formatVND(selected.denomination)}`,
      });
      if (rpcErr) throw rpcErr;
      toast.success(`Nạp thành công! +${formatVND(credited)} vào tài khoản`);
      setSerial(""); setPin("");
      await refreshProfile();
    } catch (err: any) {
      toast.error(err.message ?? "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="card" className="container mx-auto px-4 py-10 sm:py-14">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-4xl font-display font-bold mb-2">Nạp thẻ <span className="gradient-text">chiết khấu cao</span></h2>
        <p className="text-muted-foreground text-sm sm:text-base">Hỗ trợ 6 nhà mạng, tự động duyệt trong vài giây.</p>
      </div>

      <div className="glass-card p-5 sm:p-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-6">
          {NETWORKS.map((n) => (
            <button
              key={n}
              onClick={() => onNetworkChange(n)}
              className={`relative px-2 py-3 rounded-xl border-2 transition-bounce text-xs sm:text-sm font-semibold ${
                network === n
                  ? "border-primary bg-primary/10 text-foreground shadow-glow"
                  : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
              }`}
            >
              <span className={`block w-full h-1 rounded-full mb-2 bg-gradient-to-r ${NETWORK_COLORS[n]}`} />
              {n}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label className="mb-3 block">Mệnh giá</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {entries.map((e) => (
                <button
                  key={e.denomination}
                  onClick={() => setDenom(e.denomination)}
                  className={`px-3 py-3 rounded-xl text-sm font-semibold transition-smooth border ${
                    denom === e.denomination
                      ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
                      : "border-border bg-secondary/40 hover:border-primary/50"
                  }`}
                >
                  <div>{formatVND(e.denomination)}</div>
                  <div className={`text-[10px] mt-0.5 ${denom === e.denomination ? "text-primary-foreground/80" : "text-muted-foreground"}`}>
                    Phí {e.rate}%
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="serial">Serial</Label>
              <Input id="serial" value={serial} onChange={(e) => setSerial(e.target.value.trim())} placeholder="Nhập serial" maxLength={40} />
            </div>
            <div>
              <Label htmlFor="pin">Mã thẻ</Label>
              <Input id="pin" value={pin} onChange={(e) => setPin(e.target.value.trim())} placeholder="Nhập mã thẻ" maxLength={40} />
            </div>

            <div className="rounded-xl bg-secondary/40 border border-border/50 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Mệnh giá</span><span className="font-semibold">{formatVND(selected.denomination)}</span></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Phí giao dịch</span><span className="text-warning font-semibold">{selected.rate}%</span></div>
              <div className="flex justify-between border-t border-border/40 pt-2 mt-2"><span>Bạn nhận</span><span className="text-success font-bold">{formatVND(credited)}</span></div>
            </div>

            <Button
              onClick={submit}
              disabled={submitting}
              className="w-full bg-gradient-primary hover:opacity-90 transition-smooth shadow-glow h-12 font-semibold text-base"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {submitting ? "Đang xử lý..." : user ? `Nạp ngay +${formatVND(credited)}` : "Đăng nhập để nạp"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}
