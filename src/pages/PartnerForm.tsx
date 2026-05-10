import React, { useState, useEffect } from 'react';
import { AppShell } from "./AppShell";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { ShieldCheck, Save, Globe, Key, User, Wallet, Loader2 } from "lucide-react";

const PartnerForm: React.FC = () => {
  const [formData, setFormData] = useState({
    partnerId: '',
    partnerKey: '',
    walletId: '',
    callbackUrl: '',
    ipAddress: '',
  });
  const [loading, setLoading] = useState(false);
  const [fetching, setFetching] = useState(true);

  // Lấy cấu hình hiện tại từ Supabase khi vừa vào trang
  useEffect(() => {
    const fetchConfig = async () => {
      const { data, error } = await (supabase as any)
        .from('system_configs')
        .select('*')
        .single();
      
      if (data) {
        const config = data as any;
        setFormData({
          partnerId: config.partner_id || '',
          partnerKey: config.partner_key || '',
          walletId: config.wallet_id || '',
          callbackUrl: config.callback_url || '',
          ipAddress: config.ip_address || '',
        });
      }
      setFetching(false);
    };
    fetchConfig();
  }, []);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData({ ...formData, [name]: value });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      // Lưu vào bảng system_configs (Bạn cần tạo bảng này trong Supabase)
      const { error } = await (supabase as any)
        .from('system_configs')
        .upsert({
          id: 1, // Luôn chỉ có 1 dòng cấu hình
          partner_id: formData.partnerId,
          partner_key: formData.partnerKey,
          wallet_id: formData.walletId,
          callback_url: formData.callbackUrl,
          ip_address: formData.ipAddress,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      toast.success("Đã cập nhật cấu hình đối tác thành công!");
    } catch (err: any) {
      toast.error("Lỗi khi lưu: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (fetching) return <AppShell><div className="container py-20 text-center">Đang tải cấu hình...</div></AppShell>;

  return (
    <AppShell>
      <div className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="flex items-center gap-2 mb-6">
          <ShieldCheck className="w-6 h-6 text-primary" />
          <h1 className="text-2xl font-display font-bold">Cấu hình kết nối API</h1>
        </div>

        <div className="glass-card p-6">
          <form onSubmit={handleSubmit} className="space-y-5">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><User className="w-4 h-4 text-muted-foreground" /> Partner ID</Label>
                <Input name="partnerId" value={formData.partnerId} onChange={handleChange} placeholder="Mã đối tác TSR" required />
              </div>
              <div className="space-y-2">
                <Label className="flex items-center gap-2"><Key className="w-4 h-4 text-muted-foreground" /> Partner Key</Label>
                <Input type="password" name="partnerKey" value={formData.partnerKey} onChange={handleChange} placeholder="Khóa bí mật" required />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Wallet className="w-4 h-4 text-muted-foreground" /> Wallet ID (Số điện thoại nhận tiền)</Label>
              <Input name="walletId" value={formData.walletId} onChange={handleChange} placeholder="09xxxxxxx" required />
            </div>

            <div className="space-y-2">
              <Label className="flex items-center gap-2"><Globe className="w-4 h-4 text-muted-foreground" /> Callback URL</Label>
              <Input type="url" name="callbackUrl" value={formData.callbackUrl} onChange={handleChange} placeholder="https://api.yourdomain.com/callback" />
              <p className="text-[10px] text-muted-foreground italic">* Webhook để nhận kết quả nạp thẻ từ TSR</p>
            </div>

            <Button type="submit" disabled={loading} className="w-full bg-gradient-primary shadow-glow">
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Lưu cấu hình hệ thống
            </Button>
          </form>
        </div>
      </div>
    </AppShell>
  );
};

export default PartnerForm;