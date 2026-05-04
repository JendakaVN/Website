import { Suspense, lazy } from "react";
import { AppShell } from "@/components/AppShell";
import { TransactionTicker } from "@/components/TransactionTicker";
import { Hero } from "@/components/Hero";
import { Link } from 'react-router-dom';
import { Skeleton } from "@/components/ui/skeleton";

const CardRecharge = lazy(() => import("@/components/CardRecharge").then(m => ({ default: m.CardRecharge })));
const RobuxShop = lazy(() => import("@/components/RobuxShop").then(m => ({ default: m.RobuxShop })));
const GamepassShop = lazy(() => import("@/components/GamepassShop").then(m => ({ default: m.GamepassShop })));
const MiniGames = lazy(() => import("@/components/MiniGames").then(m => ({ default: m.MiniGames })));
const BoostingZone = lazy(() => import("@/components/BoostingZone").then(m => ({ default: m.BoostingZone })));
const Leaderboard = lazy(() => import("@/components/Leaderboard").then(m => ({ default: m.Leaderboard })));
const TransactionHistory = lazy(() => import("@/components/TransactionHistory").then(m => ({ default: m.TransactionHistory })));
const RobuxOrders = lazy(() => import("@/components/RobuxOrders").then(m => ({ default: m.RobuxOrders })));

const Index = () => {
  return (
    <AppShell>
      <TransactionTicker />
        <Hero />
        <Suspense fallback={<div className="container p-10"><Skeleton className="h-40 w-full" /></div>}>
          <CardRecharge />
          <RobuxShop />
          <GamepassShop />
          <BoostingZone />
          <MiniGames />
        </Suspense>

        <section className="container mx-auto px-4 py-10 sm:py-14">
          <div className="grid md:grid-cols-2 xl:grid-cols-4 gap-4 items-start">
            <Suspense fallback={<Skeleton className="h-64 w-full" />}>
              <Leaderboard />
              <RobuxOrders />
              <TransactionHistory />
            </Suspense>
          </div>
          <div className="mt-4">
            <Link to="/partner-form" className="text-blue-500 underline">
              Go to Partner Form
            </Link>
          </div>
        </section>
    </AppShell>
  );
};

export default Index;
