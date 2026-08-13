import {
  Beef,
  CakeSlice,
  Croissant,
  Grape,
  Salad,
  ShoppingBasket,
  Store,
  UtensilsCrossed,
  Wine,
} from "lucide-react";

/**
 * Íconos de categoría por nombre. Mapa explícito en lugar de import dinámico:
 * son ocho categorías, y así el bundle no arrastra toda la librería.
 */
const ICONS = {
  beef: Beef,
  cake: CakeSlice,
  croissant: Croissant,
  grape: Grape,
  salad: Salad,
  basket: ShoppingBasket,
  store: Store,
  utensils: UtensilsCrossed,
  wine: Wine,
} as const;

export type CategoryIconName = keyof typeof ICONS;

export const CATEGORY_ICON_NAMES = Object.keys(ICONS) as CategoryIconName[];

export function CategoryIcon({
  name,
  className = "size-5",
}: {
  name?: string | null;
  className?: string;
}) {
  const Icon = (name && ICONS[name as CategoryIconName]) || Store;
  return <Icon className={className} aria-hidden="true" />;
}
