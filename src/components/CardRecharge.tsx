import { useState, useEffect } from "react";
import { z } from "zod";
import {
  DISCOUNT_TABLE,
  NETWORKS,
  NETWORK_COLORS,
  Network,
  creditedAmount,
  formatVND,
} from "@/data/discount";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/context/AuthContext";
import { toast } from "sonner";
import { CreditCard, ArrowRight, Loader2 } from "lucide-react";

// Schema validation
const cardSchema = z.object({
  serial: z
    .string()
    .trim()
    .min(14, "Serial tối thiểu 14 số")
    .max(14, "Serial tối đa 14 số")
    .regex(/^\d+$/, "Serial chỉ được chứa chữ số"),
  pin: z
    .string()
    .trim()
    .min(15, "Mã thẻ tối thiểu 15 số")
    .max(15, "Mã thẻ tối đa 15 số")
    .regex(/^\d+$/, "Mã thẻ chỉ được chứa chữ số"),
});

const TELCO_MAP: Record<Network, string> = {
  Viettel: "VIETTEL",
  Vinaphone: "VINAPHONE",
  Mobifone: "MOBIFONE",
  Vietnamobile: "VIETNAMOBILE",
  Zing: "ZING",
  Garena: "GARENA",
};

// Hàm parse dữ liệu từ API getfee
function parseDiscountData(
  apiData: any
): Record<Network, Array<{ denomination: number; rate: number }>> {
  console.log("🔍 [parseDiscountData] Raw input:", apiData);

  let items: any[] = [];

  if (Array.isArray(apiData)) {
    items = apiData;
  } else if (apiData && typeof apiData === "object") {
    if (Array.isArray(apiData.data)) {
      items = apiData.data;
    } else if (apiData.body) {
      try {
        const parsedBody = JSON.parse(apiData.body);
        items = Array.isArray(parsedBody) ? parsedBody : [];
      } catch {
        items = [];
      }
    }
  }

  console.log(`📦 [parseDiscountData] Extracted ${items.length} items`);

  if (items.length === 0) {
    throw new Error("No discount items found");
  }

  const grouped: Record<string, Array<{ denomination: number; rate: number }>> =
    {};

  for (const item of items) {
    const telco = item.telco;
    const value = Number(item.value);
    const fee = Number(item.fees);

    if (!telco || isNaN(value) || isNaN(fee)) {
      console.warn("⚠️ [parseDiscountData] Skipping invalid item:", item);
      continue;
    }

    if (!grouped[telco]) grouped[telco] = [];
    grouped[telco].push({ denomination: value, rate: fee });
  }

  for (const telco in grouped) {
    grouped[telco].sort((a, b) => a.denomination - b.denomination);
  }

  console.log("🏷️ [parseDiscountData] Grouped telcos:", Object.keys(grouped));

  const mapping: Record<string, Network> = {
    VIETTEL: "Viettel",
    VINAPHONE: "Vinaphone",
    MOBIFONE: "Mobifone",
    VIETNAMOBILE: "Vietnamobile",
    VNMOBI: "Vietnamobile",
    ZING: "Zing",
    GARENA: "Garena",
  };

  const result = {} as Record<
    Network,
    Array<{ denomination: number; rate: number }>
  >;

  for (const net of NETWORKS) {
    result[net] = [];
  }

  for (const apiTelco in grouped) {
    const network = mapping[apiTelco];
    if (network && NETWORKS.includes(network)) {
      result[network] = grouped[apiTelco];
      console.log(
        `✅ [parseDiscountData] Mapped ${apiTelco} -> ${network} (${result[network].length} denominations)`
      );
    } else {
      console.warn(`❓ [parseDiscountData] Unknown telco: ${apiTelco}`);
    }
  }

  for (const net of NETWORKS) {
    if (result[net].length === 0) {
      console.warn(
        `⚠️ [parseDiscountData] No data for ${net}, using fallback DISCOUNT_TABLE`
      );
      result[net] = DISCOUNT_TABLE[net];
    }
  }

  console.log("✅ [parseDiscountData] Final result:", result);
  return result;
}

export function CardRecharge() {
  const { user, refreshProfile } = useAuth();
  const [network, setNetwork] = useState<Network>("Viettel");
  const [denom, setDenom] = useState<number | null>(null);
  const [serial, setSerial] = useState("");
  const [pin, setPin] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [errors, setErrors] = useState<{ serial?: string; pin?: string }>({});

  const [discountTable, setDiscountTable] = useState<Record<
    Network,
    Array<{ denomination: number; rate: number }>
  > | null>(null);
  const [isLoadingDiscount, setIsLoadingDiscount] = useState(true);

  // Fetch bảng giá từ Edge Function get-discount
  useEffect(() => {
    const fetchDiscount = async () => {
      try {
        const response = await fetch(
          "https://psqqratdhxijxpdozltf.supabase.co/functions/v1/get-discount"
        );
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const data = await response.json();
        console.log("📡 Fetch data:", data);
        const parsed = parseDiscountData(data);
        setDiscountTable(parsed);
      } catch (err) {
        console.error("❌ Fetch failed:", err);
        toast.error("Dùng bảng giá mặc định");
        setDiscountTable(DISCOUNT_TABLE);
      } finally {
        setIsLoadingDiscount(false);
      }
    };

    fetchDiscount();
  }, []);

  // Khi discountTable hoặc network thay đổi, chọn mệnh giá đầu tiên
  useEffect(() => {
    if (discountTable && discountTable[network]?.length > 0) {
      setDenom(discountTable[network][0].denomination);
    } else {
      setDenom(null);
    }
  }, [network, discountTable]);

  // Nếu đang loading hoặc dữ liệu chưa sẵn sàng
  if (isLoadingDiscount || !discountTable || denom === null) {
    return (
      <section id="card" className="container mx-auto px-4 py-10 sm:py-14">
        <div className="text-center mb-8">
          <h2 className="text-2xl sm:text-4xl font-display font-bold mb-2">
            Nạp thẻ <span className="gradient-text">chiết khấu cao</span>
          </h2>
          <p className="text-muted-foreground text-sm sm:text-base">
            Đang tải bảng giá...
          </p>
        </div>
        <div className="glass-card p-5 sm:p-8 max-w-4xl mx-auto flex justify-center items-center h-64">
          <Loader2 className="w-8 h-8 animate-spin text-primary" />
        </div>
      </section>
    );
  }

  const entries = discountTable[network];
  const selected = entries.find((e) => e.denomination === denom) ?? entries[0];
  const credited = creditedAmount(selected.denomination, selected.rate);

  const onNetworkChange = (n: Network) => {
    setNetwork(n);
  };

  const handleRecharge = async () => {
    // Validate bằng Zod
    const validation = cardSchema.safeParse({ serial, pin });
    if (!validation.success) {
      const fieldErrors: { serial?: string; pin?: string } = {};
      for (const issue of validation.error.issues) {
        if (issue.path[0] === "serial") fieldErrors.serial = issue.message;
        if (issue.path[0] === "pin") fieldErrors.pin = issue.message;
      }
      setErrors(fieldErrors);
      toast.error(
        fieldErrors.serial || fieldErrors.pin || "Thông tin thẻ không hợp lệ"
      );
      return;
    }

    if (!network || !denom) {
      toast.error("Vui lòng chọn nhà mạng và mệnh giá");
      return;
    }

    const payload = {
      telco: TELCO_MAP[network],
      amount: denom,
      serial: serial.trim(),
      code: pin.trim(),
    };

    try {
      setSubmitting(true);
      const response = await fetch(
        "https://psqqratdhxijxpdozltf.supabase.co/functions/v1/card-recharge",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        }
      );
      const data = await response.json();

      if (data?.status === 99) {
        toast.success("Gửi thẻ thành công! Đang chờ duyệt.");
        await refreshProfile();
        setSerial("");
        setPin("");
        setErrors({});
      } else {
        toast.error(data?.message || "Giao dịch thất bại");
      }
    } catch (err: any) {
      toast.error(err.message || "Có lỗi xảy ra");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <section id="card" className="container mx-auto px-4 py-10 sm:py-14">
      <div className="text-center mb-8">
        <h2 className="text-2xl sm:text-4xl font-display font-bold mb-2">
          Nạp thẻ <span className="gradient-text">chiết khấu cao</span>
        </h2>
        <p className="text-muted-foreground text-sm sm:text-base">
          Hỗ trợ 6 nhà mạng, tự động duyệt trong vài giây.
        </p>
      </div>

      <div className="glass-card p-5 sm:p-8 max-w-4xl mx-auto">
        <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 sm:gap-3 mb-6">
          {NETWORKS.map((n) => (
            <button
              key={n}
              onClick={() => onNetworkChange(n)}
              className={`relative px-2 py-3 rounded-xl border-2 transition-bounce text-xs sm:text-sm font-semibold ${
                network === n
                  ? "border-primary bg-primary/10 text-foreground shadow-glow"
                  : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/50"
              }`}
            >
              <span
                className={`block w-full h-1 rounded-full mb-2 bg-gradient-to-r ${NETWORK_COLORS[n]}`}
              />
              {n}
            </button>
          ))}
        </div>

        <div className="grid md:grid-cols-2 gap-6">
          <div>
            <Label className="mb-3 block">Mệnh giá</Label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {entries.map((e) => (
                <button
                  key={e.denomination}
                  onClick={() => setDenom(e.denomination)}
                  className={`px-3 py-3 rounded-xl text-sm font-semibold transition-smooth border ${
                    denom === e.denomination
                      ? "border-primary bg-gradient-primary text-primary-foreground shadow-glow"
                      : "border-border bg-secondary/40 hover:border-primary/50"
                  }`}
                >
                  <div>{formatVND(e.denomination)}</div>
                  <div
                    className={`text-[10px] mt-0.5 ${
                      denom === e.denomination
                        ? "text-primary-foreground/80"
                        : "text-muted-foreground"
                    }`}
                  >
                    Phí {e.rate}%
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="serial">Serial</Label>
              <Input
                id="serial"
                value={serial}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setSerial(value);
                  setErrors((prev) => ({ ...prev, serial: undefined }));
                }}
                placeholder="Nhập số serial"
                maxLength={14}
                inputMode="numeric"
                pattern="\d*"
                className={errors.serial ? "border-red-500" : ""}
              />
              {errors.serial && (
                <p className="text-red-500 text-sm mt-1">{errors.serial}</p>
              )}
            </div>

            <div>
              <Label htmlFor="pin">Mã thẻ</Label>
              <Input
                id="pin"
                value={pin}
                onChange={(e) => {
                  const value = e.target.value.replace(/\D/g, "");
                  setPin(value);
                  setErrors((prev) => ({ ...prev, pin: undefined }));
                }}
                placeholder="Nhập mã thẻ cào"
                maxLength={15}
                inputMode="numeric"
                pattern="\d*"
                className={errors.pin ? "border-red-500" : ""}
              />
              {errors.pin && (
                <p className="text-red-500 text-sm mt-1">{errors.pin}</p>
              )}
            </div>

            <div className="rounded-xl bg-secondary/40 border border-border/50 p-4 space-y-1.5 text-sm">
              <div className="flex justify-between">
                <span className="text-muted-foreground">Mệnh giá</span>
                <span className="font-semibold">
                  {formatVND(selected.denomination)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-muted-foreground">Phí giao dịch</span>
                <span className="text-warning font-semibold">
                  {selected.rate}%
                </span>
              </div>
              <div className="flex justify-between border-t border-border/40 pt-2 mt-2">
                <span>Bạn nhận</span>
                <span className="text-success font-bold">
                  {formatVND(credited)}
                </span>
              </div>
            </div>

            <Button
              onClick={handleRecharge}
              disabled={submitting}
              className="w-full bg-gradient-primary hover:opacity-90 transition-smooth shadow-glow h-12 font-semibold text-base"
            >
              <CreditCard className="w-4 h-4 mr-2" />
              {submitting
                ? "Đang xử lý..."
                : user
                ? `Nạp ngay +${formatVND(credited)}`
                : "Đăng nhập để nạp"}
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        </div>
      </div>
    </section>
  );
}