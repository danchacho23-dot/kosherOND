"use client";

import { useRouter } from "next/navigation";
import { Search } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { copy } from "@/lib/copy";

/**
 * Buscador. Es un `<form>` de verdad con method GET: navega aunque el JS no
 * haya cargado. El JS solo agrega el registro del evento de búsqueda.
 */
export function SearchForm({
  defaultValue = "",
  autoFocus = false,
}: {
  defaultValue?: string;
  autoFocus?: boolean;
}) {
  const router = useRouter();
  const [value, setValue] = useState(defaultValue);

  return (
    <form
      action="/directorio"
      method="get"
      role="search"
      className="flex w-full gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const term = value.trim();
        if (term && typeof navigator !== "undefined" && navigator.sendBeacon) {
          try {
            navigator.sendBeacon(
              "/api/eventos",
              new Blob([JSON.stringify({ type: "SEARCH", searchTerm: term })], {
                type: "application/json",
              }),
            );
          } catch {
            // ignorado a propósito
          }
        }
        router.push(term ? `/directorio?q=${encodeURIComponent(term)}` : "/directorio");
      }}
    >
      <div className="relative flex-1">
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-400"
          aria-hidden="true"
        />
        <input
          type="search"
          name="q"
          value={value}
          autoFocus={autoFocus}
          onChange={(event) => setValue(event.target.value)}
          placeholder={copy.home.searchPlaceholder}
          aria-label={copy.directory.searchLabel}
          className="h-12 w-full rounded-lg border border-ink-300 bg-white pr-3 pl-9 text-[0.95rem] text-ink-900 placeholder:text-ink-400"
        />
      </div>
      <Button type="submit" size="lg">
        {copy.home.searchAction}
      </Button>
    </form>
  );
}
