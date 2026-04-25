import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { formatVND } from "@/data/discount";
import { Trophy, Crown, Medal, Calendar } from "lucide-react";

interface Row {
  id: string;
  display_name: string;
  total_deposited: number;
}

export function Leaderboard() {
  const [allTime, setAllTime] = useState<Row[]>([]);
  const [monthly, setMonthly] = useState<Row[]>([]);

  useEffect(() => {
    const load = async () => {
      // Fetch Top nạp từ trước đến nay
      const { data: atData } = await supabase
        .from("profiles")
        .select("id,display_name,total_deposited")
        .order("total_deposited", { ascending: false })
        .limit(10);
      setAllTime((atData as Row[]) ?? []);

      // Fetch Top nạp trong tháng hiện tại
      const firstDayOfMonth = new Date();
      firstDayOfMonth.setDate(1);
      firstDayOfMonth.setHours(0, 0, 0, 0);

      const { data: txs } = await supabase
        .from("transactions")
        .select("user_id, amount")
        .eq("type", "card_recharge")
        .eq("status", "completed")
        .gte("created_at", firstDayOfMonth.toISOString());

      if (txs && txs.length > 0) {
        const sums: Record<string, number> = {};
        txs.forEach((t) => {
          sums[t.user_id] = (sums[t.user_id] || 0) + Math.abs(t.amount);
        });

        const sortedUids = Object.entries(sums)
          .sort(([, a], [, b]) => b - a)
          .slice(0, 10)
          .map(([id]) => id);

        if (sortedUids.length > 0) {
          const { data: profs } = await supabase
            .from("profiles")
            .select("id,display_name")
            .in("id", sortedUids);

          const mRows = sortedUids.map(uid => {
            const p = profs?.find(x => x.id === uid);
            return {
              id: uid,
              display_name: p?.display_name || "Ẩn danh",
              total_deposited: sums[uid]
            };
          });
          setMonthly(mRows);
        }
      } else {
        setMonthly([]);
      }
    };

    load();
    const ch = supabase.channel("lb")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => load())
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => load())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, []);

  const icon = (i: number) =>
    i === 0 ? <Crown className="w-4 h-4 text-warning" /> :
    i === 1 ? <Medal className="w-4 h-4 text-muted-foreground" /> :
    i === 2 ? <Medal className="w-4 h-4 text-orange-400" /> :
    <span className="text-muted-foreground font-semibold w-4 text-center text-xs">{i + 1}</span>;

  const ListSection = ({ title, icon: TitleIcon, items }: { title: string, icon: any, items: Row[] }) => (
    <div className="flex-1">
      <div className="flex items-center gap-2 mb-4">
        {TitleIcon}
        <h3 className="font-display font-bold text-lg">{title}</h3>
      </div>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground text-center py-6">Chưa có dữ liệu — hãy là người đầu tiên!</p>
      ) : (
        <div className="space-y-2">
          {items.map((r, i) => (
            <div key={r.id} className={`flex items-center gap-3 p-2.5 rounded-xl ${i < 3 ? "bg-gradient-card border border-primary/20" : "bg-secondary/30"}`}>
              <div className="w-7 flex justify-center">{icon(i)}</div>
              <div className="flex-1 truncate font-semibold">{r.display_name}</div>
              <div className={`text-sm font-bold ${i === 0 ? "text-warning" : "text-primary"}`}>{formatVND(r.total_deposited)}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  return (
    <div className="glass-card p-5 sm:p-8">
      <div className="grid md:grid-cols-2 gap-8 lg:gap-12">
        <ListSection title="Top nạp đại gia" icon={<Trophy className="w-5 h-5 text-warning" />} items={allTime} />
        <ListSection title="Top nạp tháng" icon={<Calendar className="w-5 h-5 text-accent" />} items={monthly} />
      </div>
    </div>
  );
}
