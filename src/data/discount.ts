// EXACT discount table — DO NOT MODIFY VALUES
export type Network = "Viettel" | "Vinaphone" | "Mobifone" | "Vietnamobile" | "Zing" | "Garena";

export interface DiscountEntry {
  denomination: number; // VND
  rate: number; // percent discount (fee charged)
}

export const DISCOUNT_TABLE: Record<Network, DiscountEntry[]> = {
  Viettel: [
    { denomination: 10000, rate: 16 },
    { denomination: 20000, rate: 17.5 },
    { denomination: 30000, rate: 18.5 },
    { denomination: 50000, rate: 16.5 },
    { denomination: 100000, rate: 16.5 },
    { denomination: 200000, rate: 16.5 },
    { denomination: 300000, rate: 17.5 },
    { denomination: 500000, rate: 17.5 },
    { denomination: 1000000, rate: 17.5 },
  ],
  Vinaphone: [
    { denomination: 10000, rate: 17 },
    { denomination: 20000, rate: 16 },
    { denomination: 30000, rate: 16 },
    { denomination: 50000, rate: 13.5 },
    { denomination: 100000, rate: 13 },
    { denomination: 200000, rate: 11.5 },
    { denomination: 300000, rate: 11.5 },
    { denomination: 500000, rate: 11.5 },
  ],
  Mobifone: [
    { denomination: 10000, rate: 21 },
    { denomination: 20000, rate: 21 },
    { denomination: 30000, rate: 21 },
    { denomination: 50000, rate: 20 },
    { denomination: 100000, rate: 18 },
    { denomination: 200000, rate: 18 },
    { denomination: 300000, rate: 18 },
    { denomination: 500000, rate: 18 },
  ],
  Vietnamobile: [
    { denomination: 10000, rate: 21 },
    { denomination: 20000, rate: 21 },
    { denomination: 30000, rate: 21 },
    { denomination: 50000, rate: 20 },
    { denomination: 100000, rate: 18 },
    { denomination: 200000, rate: 18 },
    { denomination: 300000, rate: 18 },
    { denomination: 500000, rate: 18 },
  ],
  Zing: [
    { denomination: 10000, rate: 11.5 },
    { denomination: 20000, rate: 11.5 },
    { denomination: 50000, rate: 11.5 },
    { denomination: 100000, rate: 11.5 },
    { denomination: 200000, rate: 11.5 },
    { denomination: 500000, rate: 11.5 },
    { denomination: 1000000, rate: 11.5 },
  ],
  Garena: [
    { denomination: 5000, rate: 14.5 },
    { denomination: 10000, rate: 14.5 },
    { denomination: 20000, rate: 14.5 },
    { denomination: 50000, rate: 14.5 },
    { denomination: 100000, rate: 14.5 },
    { denomination: 200000, rate: 14.5 },
    { denomination: 500000, rate: 14.5 },
  ],
};

export const NETWORKS: Network[] = ["Viettel", "Vinaphone", "Mobifone", "Vietnamobile", "Zing", "Garena"];

export const NETWORK_COLORS: Record<Network, string> = {
  Viettel: "from-red-500 to-orange-500",
  Vinaphone: "from-blue-500 to-cyan-500",
  Mobifone: "from-blue-600 to-indigo-600",
  Vietnamobile: "from-pink-500 to-rose-500",
  Zing: "from-violet-500 to-purple-500",
  Garena: "from-orange-500 to-amber-500",
};

export function creditedAmount(denomination: number, rate: number) {
  return Math.round(denomination * (1 - rate / 100));
}

export function formatVND(n: number) {
  return new Intl.NumberFormat("vi-VN").format(n) + "₫";
}
