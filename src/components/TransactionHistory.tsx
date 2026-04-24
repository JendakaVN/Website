import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";
import { formatVND } from "@/data/discount";
import { History, ArrowDown, ArrowUp } from "lucide-react";

interface Tx {
  id: string;
  type: string;
  amount: number;
  description: string | null;
  created_at: string;
}

const LABELS: Record<string, string> = {
  card_recharge: "Nạp thẻ",
  robux_purchase: "Mua Robux",
  game_bet: "Đặt cược",
  game_win: "Thắng game",
  adjustment: "Điều chỉnh",
};

export function TransactionHistory() {
  const { user } = useAuth();
  const [items, setItems] = useState<Tx[]>([]);

  useEffect(() => {
    if (!user) return;
    const load = async () => {
      const { data } = await supabase
        .from("transactions")
        .select("id,type,amount,description,created_at")
        .eq("user_id", user.id)
        .order("created_at", { ascending: false })
        .limit(15);
      setItems((data as Tx[]) ?? []);
    };
    load();
    const ch = supabase.channel("hist")
      .on("postgres_changes", { event: "INSERT", schema: "public", table: "transactions", filter: `user_id=eq.${user.id}` }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [user]);

  return (
    <div className="glass-card p-5 sm:p-6">
      <div className="flex items-center gap-2 mb-4">
        <History className="w-5 h-5 text-primary" />
        <h3 className="font-display font-bold text-lg">Lịch sử giao dịch</h3>
      </div>
      {!user ? (
        <p className="text-sm text-muted-foreground text-center py-6">Đăng nhập để xem lịch sử của bạn.</p>
      ) : items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Chưa có giao dịch nào.</p>
      ) : (
        <div className="space-y-2 max-h-[420px] overflow-y-auto pr-1">
          {items.map((t) => {
            const positive = t.amount >= 0;
            return (
              <div key={t.id} className="flex items-center gap-3 p-2.5 rounded-xl bg-secondary/30">
                <div className={`w-8 h-8 rounded-lg flex items-center justify-center ${positive ? "bg-success/15 text-success" : "bg-destructive/15 text-destructive"}`}>
                  {positive ? <ArrowUp className="w-4 h-4" /> : <ArrowDown className="w-4 h-4" />}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-semibold truncate">{LABELS[t.type] ?? t.type}</div>
                  <div className="text-[11px] text-muted-foreground truncate">{t.description}</div>
                </div>
                <div className={`text-sm font-bold whitespace-nowrap ${positive ? "text-success" : "text-destructive"}`}>
                  {positive ? "+" : ""}{formatVND(t.amount)}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
