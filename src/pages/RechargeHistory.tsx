import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { AppShell } from "./AppShell";
import { formatVND } from "@/data/discount";
import { History, CheckCircle2, XCircle, Loader2 } from "lucide-react";

interface Card {
  id: string;
  network: string;
  denomination: number;
  credited_amount: number;
  discount_rate: number;
  serial: string;
  pin: string;
  status: string;
  created_at: string;
}

export default function RechargeHistory() {
  const { user, loading: authLoading } = useAuth();
  const navigate = useNavigate();
  const [items, setItems] = useState<Card[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (authLoading) return;
    if (!user) { navigate("/auth"); return; }

    (async () => {
      const { data } = await supabase
        .from("card_recharges")
        .select("*")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false });
      setItems((data as Card[]) ?? []);
      setLoading(false);
    })();
  }, [user, navigate, authLoading]);

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <History className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Lịch sử nạp thẻ</h1>
        </div>

        {loading ? (
          <p className="text-center py-10 text-muted-foreground">Đang tải...</p>
        ) : items.length === 0 ? (
          <p className="text-center py-10 text-muted-foreground">Chưa có lượt nạp thẻ nào.</p>
        ) : (
          <div className="space-y-2">
            {items.map((c) => {
              const Icon = c.status === "success" || c.status === "completed" ? CheckCircle2 : c.status === "failed" ? XCircle : Loader2;
              const cls = c.status === "success" || c.status === "completed" ? "text-success" : c.status === "failed" ? "text-destructive" : "text-warning animate-spin";
              return (
                <div key={c.id} className="glass-card p-4 flex items-center gap-3">
                  <Icon className={`w-6 h-6 shrink-0 ${cls}`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold">{c.network} · {formatVND(c.denomination)}</span>
                      <span className="text-success font-bold">+{formatVND(c.credited_amount)}</span>
                    </div>
                    <div className="text-xs text-muted-foreground truncate">
                      Serial: {c.serial} · Chiết khấu {c.discount_rate}%
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {new Date(c.created_at).toLocaleString("vi-VN")}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </AppShell>
  );
}
