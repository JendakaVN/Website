import { Lock } from "lucide-react";

export function GamepassShop() {
  return (
    <section id="gamepass" className="container mx-auto px-4 py-10 sm:py-14">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-4xl font-display font-bold mb-2">Mua <span className="gradient-text">Gamepass</span></h2>
        <p className="text-muted-foreground text-sm sm:text-base">Mua gamepass cho các game Roblox yêu thích.</p>
      </div>

      <div className="glass-card p-5 sm:p-8 max-w-5xl mx-auto">
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <div className="w-16 h-16 rounded-2xl bg-secondary/60 flex items-center justify-center mb-4">
            <Lock className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="font-display font-bold text-xl mb-2">Hiện chưa hỗ trợ</h3>
          <p className="text-muted-foreground text-sm">Tính năng mua Gamepass đang được phát triển.</p>
        </div>
      </div>
    </section>
  );
}
