import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatVND } from "@/data/discount";
import { CreditCard } from "lucide-react";

interface TickerItem {
  id: string;
  amount: number;
  display_name: string;
  created_at: string;
}

function maskName(name: string) {
  if (!name) return "Người chơi ẩn danh";
  // mask emails
  let s = name.replace(/([a-zA-Z0-9._-]{1,3})[a-zA-Z0-9._-]*@[a-zA-Z0-9.-]+/g, "$1***");
  // mask middle of long names
  if (s.length > 4 && !s.includes("***")) {
    const head = s.slice(0, Math.max(2, Math.floor(s.length / 3)));
    const tail = s.slice(-1);
    s = `${head}***${tail}`;
  }
  if (s.length > 32) s = s.slice(0, 30) + "…";
  return s;
}

function timeAgo(iso: string) {
  const diff = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 1000));
  if (diff < 60) return `${diff}s trước`;
  if (diff < 3600) return `${Math.floor(diff / 60)} phút trước`;
  if (diff < 86400) return `${Math.floor(diff / 3600)} giờ trước`;
  return `${Math.floor(diff / 86400)} ngày trước`;
}

export function TransactionTicker() {
  const [items, setItems] = useState<TickerItem[]>([]);
  const cacheRef = useRef<TickerItem[]>([]);

  useEffect(() => {
    const load = async () => {
      const { data: txs } = await supabase
        .from("transactions")
        .select("id,amount,user_id,created_at")
        .eq("status", "completed")
        .eq("type", "card_recharge")
        .order("created_at", { ascending: false })
        .limit(20);

      if (!txs || txs.length === 0) {
        if (cacheRef.current.length > 0) setItems(cacheRef.current);
        return;
      }

      const userIds = Array.from(new Set(txs.map((t: any) => t.user_id)));
      const { data: profs } = await supabase
        .from("profiles")
        .select("id,display_name")
        .in("id", userIds);
      const nameMap = new Map<string, string>();
      (profs ?? []).forEach((p: any) => nameMap.set(p.id, p.display_name));

      const merged: TickerItem[] = txs.map((t: any) => ({
        id: t.id,
        amount: t.amount,
        created_at: t.created_at,
        display_name: nameMap.get(t.user_id) ?? "Ẩn danh",
      }));
      cacheRef.current = merged;
      setItems(merged);
    };

    load();
    const interval = setInterval(load, 15_000);
    const ch = supabase
      .channel("ticker-cards")
      .on(
        "postgres_changes",
        { event: "INSERT", schema: "public", table: "transactions", filter: "type=eq.card_recharge" },
        () => load()
      )
      .subscribe();
    return () => {
      clearInterval(interval);
      supabase.removeChannel(ch);
    };
  }, []);

  if (items.length === 0) {
    return (
      <div className="bg-gradient-card border-y border-border/40 py-2 overflow-hidden">
        <div className="container mx-auto px-4 text-xs text-muted-foreground text-center">
          🔥 Chưa có ai nạp thẻ — hãy là người đầu tiên!
        </div>
      </div>
    );
  }

  const loop = [...items, ...items];

  return (
    <div className="bg-gradient-card border-y border-border/40 py-2 overflow-hidden">
      <div className="ticker-track flex gap-8 whitespace-nowrap">
        {loop.map((it, i) => (
          <span key={`${it.id}-${i}`} className="inline-flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-primary/15 text-primary font-semibold">
              <CreditCard className="w-3 h-3" />
              Nạp thẻ
            </span>
            <span className="text-muted-foreground">{maskName(it.display_name)}</span>
            <span className="font-semibold text-success">+{formatVND(Math.abs(it.amount))}</span>
            <span className="text-muted-foreground/70">· {timeAgo(it.created_at)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}
