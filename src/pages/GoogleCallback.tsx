import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Loader2 } from "lucide-react";

export default function GoogleCallback() {
  useEffect(() => {
    const handleAuth = async () => {
      // Lấy id_token từ URL hash (Google trả về dạng #id_token=...&access_token=...)
      const hash = window.location.hash.substring(1);
      const params = new URLSearchParams(hash);
      const idToken = params.get('id_token');

      if (idToken) {
        try {
          // Đăng nhập vào Supabase bằng ID Token
          const { error } = await supabase.auth.signInWithIdToken({
            provider: 'google',
            token: idToken,
          });

          if (error) throw error;

          // Thành công: Reload trang chính và đóng popup
          if (window.opener) {
            window.opener.location.reload();
          }
          window.close();
        } catch (err: any) {
          console.error("Lỗi xác thực ID Token:", err.message);
          window.close();
        }
      } else {
        window.close();
      }
    };

    handleAuth();
  }, []);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-background">
      <Loader2 className="w-10 h-10 text-primary animate-spin mb-4" />
      <p className="font-medium text-muted-foreground">Đang hoàn tất đăng nhập...</p>
    </div>
  );
}