import { lazy, Suspense } from "react";
import { AppShell } from "@/components/AppShell";
import { Receipt } from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { useNavigate } from "react-router-dom";
import { useEffect } from "react";

const TransactionHistory = lazy(() => import("@/components/TransactionHistory").then(m => ({ default: m.TransactionHistory })));

export default function TransactionsPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  useEffect(() => { if (!user) navigate("/auth"); }, [user, navigate]);

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <div className="flex items-center gap-2 mb-6">
          <Receipt className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Lịch sử giao dịch</h1>
        </div>
        <Suspense fallback={<div className="text-center py-10 text-muted-foreground animate-pulse">Đang tải lịch sử...</div>}>
          <TransactionHistory />
        </Suspense>
      </div>
    </AppShell>
  );
}
