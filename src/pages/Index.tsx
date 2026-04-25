import { Header } from "@/components/Header";
import { TransactionTicker } from "@/components/TransactionTicker";
import { Hero } from "@/components/Hero";
import { CardRecharge } from "@/components/CardRecharge";
import { RobuxShop } from "@/components/RobuxShop";
import { GamepassShop } from "@/components/GamepassShop";
import { MiniGames } from "@/components/MiniGames";
import { BoostingZone } from "@/components/BoostingZone";
import { Leaderboard } from "@/components/Leaderboard";
import { TransactionHistory } from "@/components/TransactionHistory";
import { RobuxOrders } from "@/components/RobuxOrders";
import { Link } from 'react-router-dom';

const Index = () => {
  return (
    <div className="min-h-screen flex flex-col">
      <Header />
      <TransactionTicker />
      <main className="flex-1">
        <Hero />
        <CardRecharge />
        <RobuxShop />
        <GamepassShop />
        <BoostingZone />
        <MiniGames />

        <section className="container mx-auto px-4 py-10 sm:py-14 space-y-4">
          <Leaderboard />
          <div className="grid lg:grid-cols-2 gap-4">
            <RobuxOrders />
            <TransactionHistory />
          </div>
          <div className="mt-4">
            <Link to="/partner-form" className="text-blue-500 underline">
              Go to Partner Form
            </Link>
          </div>
        </section>
      </main>

      <footer className="border-t border-border/40 py-6 text-center text-xs text-muted-foreground">
        © {new Date().getFullYear()} Shop Jendaka — Nạp thẻ & Robux uy tín. Mọi giao dịch tự động 24/7.
      </footer>
    </div>
  );
};

export default Index;
