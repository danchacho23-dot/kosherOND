"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useTransition } from "react";
import { X } from "lucide-react";
import { Select } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";
import { cn } from "@/lib/utils";

export interface FilterOption {
  slug: string;
  name: string;
}

const DIET_OPTIONS = [
  { value: "MEAT", label: copy.diet.MEAT },
  { value: "DAIRY", label: copy.diet.DAIRY },
  { value: "PAREVE", label: copy.diet.PAREVE },
] as const;

export function DirectoryFilters({
  categories,
  neighborhoods,
}: {
  categories: FilterOption[];
  neighborhoods: FilterOption[];
}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  function update(key: string, value: string | null) {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);

    if (value) reportFilter(key, value);

    startTransition(() => {
      router.push(params.toString() ? `/directorio?${params}` : "/directorio", {
        scroll: false,
      });
    });
  }

  function toggle(key: string) {
    update(key, searchParams.get(key) ? null : "1");
  }

  const activeCount = ["categoria", "barrio", "abierto", "delivery", "retiro", "tipo"].filter(
    (key) => searchParams.get(key),
  ).length;

  return (
    <div
      className={cn("space-y-3", isPending && "opacity-70")}
      aria-busy={isPending || undefined}
    >
      <div className="flex flex-wrap items-center gap-2">
        <ToggleChip
          active={Boolean(searchParams.get("abierto"))}
          onClick={() => toggle("abierto")}
        >
          {copy.directory.filterOpenNow}
        </ToggleChip>
        <ToggleChip
          active={Boolean(searchParams.get("delivery"))}
          onClick={() => toggle("delivery")}
        >
          {copy.directory.filterDelivery}
        </ToggleChip>
        <ToggleChip
          active={Boolean(searchParams.get("retiro"))}
          onClick={() => toggle("retiro")}
        >
          {copy.directory.filterPickup}
        </ToggleChip>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <label className="sr-only" htmlFor="filtro-categoria">
          {copy.directory.filterCategory}
        </label>
        <Select
          id="filtro-categoria"
          value={searchParams.get("categoria") ?? ""}
          onChange={(event) => update("categoria", event.target.value || null)}
        >
          <option value="">{copy.directory.allCategories}</option>
          {categories.map((category) => (
            <option key={category.slug} value={category.slug}>
              {category.name}
            </option>
          ))}
        </Select>

        <label className="sr-only" htmlFor="filtro-barrio">
          {copy.directory.filterNeighborhood}
        </label>
        <Select
          id="filtro-barrio"
          value={searchParams.get("barrio") ?? ""}
          onChange={(event) => update("barrio", event.target.value || null)}
        >
          <option value="">{copy.directory.allNeighborhoods}</option>
          {neighborhoods.map((neighborhood) => (
            <option key={neighborhood.slug} value={neighborhood.slug}>
              {neighborhood.name}
            </option>
          ))}
        </Select>

        <label className="sr-only" htmlFor="filtro-tipo">
          {copy.directory.filterDiet}
        </label>
        <Select
          id="filtro-tipo"
          value={searchParams.get("tipo") ?? ""}
          onChange={(event) => update("tipo", event.target.value || null)}
        >
          <option value="">{copy.directory.allDiets}</option>
          {DIET_OPTIONS.map((option) => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </Select>
      </div>

      {activeCount > 0 ? (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => {
            const q = searchParams.get("q");
            startTransition(() => {
              router.push(q ? `/directorio?q=${encodeURIComponent(q)}` : "/directorio", {
                scroll: false,
              });
            });
          }}
        >
          <X aria-hidden="true" />
          {copy.directory.clearFilters}
        </Button>
      ) : null}
    </div>
  );
}

function ToggleChip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3.5 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-brand-600 bg-brand-600 text-white"
          : "border-ink-300 bg-white text-ink-700 hover:bg-ink-100",
      )}
    >
      {children}
    </button>
  );
}

function reportFilter(key: string, value: string) {
  if (typeof navigator === "undefined" || !navigator.sendBeacon) return;
  try {
    navigator.sendBeacon(
      "/api/eventos",
      new Blob(
        [JSON.stringify({ type: "FILTER_USE", filterKey: key, filterValue: value })],
        { type: "application/json" },
      ),
    );
  } catch {
    // ignorado a propósito
  }
}
