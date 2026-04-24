export interface RobuxPackage {
  robux: number;
  priceVnd: number;
  badge?: string;
}

export const ROBUX_PACKAGES: RobuxPackage[] = [
  { robux: 80, priceVnd: 25000 },
  { robux: 200, priceVnd: 60000 },
  { robux: 400, priceVnd: 115000, badge: "Phổ biến" },
  { robux: 800, priceVnd: 220000 },
  { robux: 1700, priceVnd: 460000, badge: "HOT" },
  { robux: 4500, priceVnd: 1190000 },
  { robux: 10000, priceVnd: 2590000, badge: "Best deal" },
  { robux: 22500, priceVnd: 5750000 },
];
