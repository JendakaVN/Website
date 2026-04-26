import { useState, useEffect } from "react";
import { useAuth } from "@/context/AuthContext";
import { supabase } from "@/integrations/supabase/client";

// hooks/useUserRole.ts (version cache)
let cachedRole: { isAdmin: boolean; timestamp: number; userId: string } | null = null;
const CACHE_DURATION = 300000; // 5 phút

export function useUserRole() {
  const { user } = useAuth();
  const [state, setState] = useState(() => {
    // Khởi tạo state từ cache nếu hợp lệ và đúng userId
    if (user && cachedRole && cachedRole.userId === user.id && Date.now() - cachedRole.timestamp < CACHE_DURATION) {
      return { isAdmin: cachedRole.isAdmin, loading: false };
    }
    return { isAdmin: false, loading: !!user };
  });

  useEffect(() => {
    if (!user) {
      setState({ isAdmin: false, loading: false });
      return;
    }
    
    // Kiểm tra cache với userId validation để tránh rò rỉ quyền hạn giữa các tài khoản
    if (cachedRole && cachedRole.userId === user.id && Date.now() - cachedRole.timestamp < CACHE_DURATION) {
      setState({ isAdmin: cachedRole.isAdmin, loading: false });
      return;
    }
    
    const fetchRole = async () => {
      const { data } = await supabase
        .from('user_roles')
        .select('role')
        .eq('user_id', user.id);
      
      const isAdmin = data?.some(r => r.role === 'admin') ?? false;
      cachedRole = { isAdmin, timestamp: Date.now(), userId: user.id };
      setState({ isAdmin, loading: false });
    };
    
    fetchRole();
  }, [user]);

  return { isAdmin: state.isAdmin, loading: state.loading };
}