import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useQuery, useQueryClient } from "@tanstack/react-query"; // Đề xuất dùng React Query
import { formatVND } from "@/data/discount";
import { Trophy, Crown, Medal, Calendar } from "lucide-react";

interface Row {
  id: string;
  display_name: string;
  total_deposited: number;
  background_url?: string | null;
}

export function Leaderboard() {
  const queryClient = useQueryClient();
  const currentMonth = new Date().getMonth() + 1;

  // Thay vì useEffect + useState, dùng useQuery code sẽ ngắn và nhanh hơn
  const { data: allTime = [] } = useQuery({
    queryKey: ['leaderboard-alltime'],
    queryFn: async () => {
      const { data } = await supabase.from("profiles").select("id,display_name,total_deposited,background_url").order("total_deposited", { ascending: false }).limit(10);
      return (data as Row[]) || [];
    },
    staleTime: 30000, // Cache dữ liệu trong 30 giây
  });

  // Tương tự cho monthly leaderboard...
  const { data: monthly = [] } = useQuery({
    queryKey: ['leaderboard-monthly'],
    queryFn: async () => {
      const { data, error } = await supabase.rpc('get_monthly_leaderboard' as any);
      if (error) {
        console.error("Lỗi lấy top tháng:", error);
        return [];
      }
      return (data as Row[]) || [];
    },
    staleTime: 30000, // Cache dữ liệu trong 30 giây
  });

  useEffect(() => {
    const refresh = () => {
      queryClient.invalidateQueries({ queryKey: ['leaderboard-alltime'] });
      queryClient.invalidateQueries({ queryKey: ['leaderboard-monthly'] });
    };

    const ch = supabase.channel("lb")
      .on("postgres_changes", { event: "*", schema: "public", table: "profiles" }, () => refresh())
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, () => refresh())
      .subscribe();
    return () => { supabase.removeChannel(ch); };
  }, [queryClient]);

  const icon = (i: number) =>
    i === 0 ? <Crown className="w-4 h-4 text-warning" /> :
    i === 1 ? <Medal className="w-4 h-4 text-muted-foreground" /> :
    i === 2 ? <Medal className="w-4 h-4 text-orange-400" /> :
    <span className="text-muted-foreground font-semibold w-4 text-center text-xs">{i + 1}</span>;

  const ListSection = ({ 
    title, 
    icon: TitleIcon, 
    items, 
    variant = "warning" 
  }: { 
    title: string, 
    icon: any, 
    items: Row[],
    variant?: "warning" | "accent"
  }) => {
    const top3 = items.slice(0, 3);
    
    const barColor = variant === "warning" ? "bg-warning/20" : "bg-accent/20";
    const textColor = variant === "warning" ? "text-warning" : "text-accent";
    const borderColor = variant === "warning" ? "border-warning/30" : "border-accent/30";
    const iconColor = variant === "warning" ? "text-warning" : "text-accent";

    return (
      <div className="flex flex-col h-full">
        <div className="flex items-center gap-2 mb-4 sm:mb-6">
          <div className={iconColor}>{TitleIcon}</div>
          <h3 className="font-display font-bold text-lg">{title}</h3>
        </div>

        {items.length === 0 ? (
          <p className="text-sm text-muted-foreground text-center py-6">Chưa có dữ liệu</p>
        ) : (
          <div className="flex flex-col">
            {/* Biểu đồ cột Podium cho Top 3 */}
            <div className="flex items-end justify-center gap-1 sm:gap-2 mb-8 h-24 sm:h-32 px-1">
              {/* Hạng 2 */}
              {top3[1] && (
                <div className="flex-1 flex flex-col items-center min-w-0 h-full justify-end">
                  <div className="text-[8px] sm:text-[10px] font-bold text-muted-foreground mb-1 truncate w-full text-center">{formatVND(top3[1].total_deposited)}</div>
                  <div className="w-full bg-slate-400/20 border-t border-x border-slate-400/30 rounded-t-lg relative transition-[height] duration-500 ease-out flex flex-col items-center justify-start pt-2" style={{ height: '45%' }}>
                    <div className="absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-slate-400/50 bg-secondary overflow-hidden shadow-sm">
                        {top3[1].background_url ? (
                          <img src={top3[1].background_url} alt="Top 2 Avatar" width="32" height="32" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] font-bold uppercase">
                            {top3[1].display_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-slate-400" />
                    </div>
                  </div>
                  <div className="text-[9px] font-bold mt-1 truncate w-full text-center opacity-80">{top3[1].display_name.split(' ')[0]}</div>
                </div>
              )}

              {/* Hạng 1 */}
              {top3[0] && (
                <div className="flex-1 flex flex-col items-center min-w-0 h-full justify-end">
                  <div className={`text-[9px] sm:text-[11px] font-bold ${textColor} mb-1 truncate w-full text-center`}>{formatVND(top3[0].total_deposited)}</div>
                  <div className="w-full bg-yellow-500/30 border-x border-t border-yellow-500/50 rounded-t-xl relative shadow-[0_0_20px_rgba(234,179,8,0.3)] transition-[height] duration-500 ease-out flex flex-col items-center justify-start pt-2" style={{ height: '95%' }}>
                    <div className="absolute -top-12 sm:-top-14 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                      <div className={`w-9 h-9 sm:w-10 sm:h-10 rounded-full border-2 ${borderColor} bg-secondary overflow-hidden shadow-glow`}>
                        {top3[0].background_url ? (
                          <img src={top3[0].background_url} alt="Top 1 Avatar" width="40" height="40" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[10px] font-bold uppercase">
                            {top3[0].display_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <Crown className={`w-4 h-4 sm:w-5 sm:h-5 ${variant === 'warning' ? 'text-warning' : 'text-accent'} animate-bounce`} />
                    </div>
                  </div>
                  <div className={`text-[10px] font-bold mt-1 truncate w-full text-center ${textColor}`}>{top3[0].display_name.split(' ')[0]}</div>
                </div>
              )}

              {/* Hạng 3 */}
              {top3[2] && (
                <div className="flex-1 flex flex-col items-center min-w-0 h-full justify-end">
                  <div className="text-[8px] sm:text-[10px] font-bold text-muted-foreground mb-1 truncate w-full text-center">{formatVND(top3[2].total_deposited)}</div>
                  <div className="w-full bg-orange-600/20 border-t border-x border-orange-600/30 rounded-t-lg relative transition-[height] duration-500 ease-out flex flex-col items-center justify-start pt-2" style={{ height: '18%' }}>
                    <div className="absolute -top-10 sm:-top-12 left-1/2 -translate-x-1/2 flex flex-col items-center gap-1">
                      <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-full border-2 border-orange-400/50 bg-secondary overflow-hidden shadow-sm">
                        {top3[2].background_url ? (
                          <img src={top3[2].background_url} alt="Top 3 Avatar" width="32" height="32" className="w-full h-full object-cover" loading="lazy" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center text-[8px] font-bold uppercase">
                            {top3[2].display_name.charAt(0)}
                          </div>
                        )}
                      </div>
                      <Medal className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-orange-400" />
                    </div>
                  </div>
                  <div className="text-[9px] font-bold mt-1 truncate w-full text-center opacity-80">{top3[2].display_name.split(' ')[0]}</div>
                </div>
              )}
            </div>

            {/* Danh sách đầy đủ thành từng dòng */}
            <div className="space-y-1.5">
              {items.slice(0, 7).map((r, i) => (
                <div key={r.id} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg transition-smooth ${i < 3 ? "bg-secondary/40 border border-border/50" : "bg-secondary/15 hover:bg-secondary/25"}`}>
                  <div className="w-6 flex justify-center">{icon(i)}</div>
                  {/* Avatar website nhỏ bên cạnh tên */}
                  <div className="w-6 h-6 rounded-full overflow-hidden border border-border/50 bg-secondary shrink-0 shadow-sm">
                    {r.background_url ? (
                      <img src={r.background_url} alt="User Avatar" width="24" height="24" className="w-full h-full object-cover" loading="lazy" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-[8px] font-bold text-muted-foreground bg-muted/30 uppercase">
                        {r.display_name.charAt(0)}
                      </div>
                    )}
                  </div>
                  <div className="flex-1 truncate font-medium text-[11px]">{r.display_name}</div>
                  <div className={`text-[11px] font-bold ${i === 0 ? textColor : "text-foreground/80"}`}>{formatVND(r.total_deposited)}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="glass-card p-5 sm:p-6 xl:col-span-2 h-[450px] overflow-hidden">
      <div className="grid sm:grid-cols-2 gap-y-12 sm:gap-x-0 h-full overflow-y-auto pr-1 [&::-webkit-scrollbar]:w-1 [&::-webkit-scrollbar-thumb]:bg-warning/20 [&::-webkit-scrollbar-thumb]:rounded-full">
        <div className="flex flex-col sm:pr-6 md:pr-8">
          <ListSection title="Top nạp server" icon={<Trophy className="w-5 h-5" />} items={allTime} variant="warning" />
        </div>
        <div className="border-t sm:border-t-0 sm:border-l border-border/40 pt-10 sm:pt-0 sm:pl-6 md:pl-8 flex flex-col">
          <ListSection title={`Top nạp tháng ${currentMonth}`} icon={<Calendar className="w-5 h-5" />} items={monthly} variant="accent" />
        </div>
      </div>
    </div>
  );
}
