"use client";

import { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { ActionForm } from "@/components/admin/action-form";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, Input } from "@/components/ui/primitives";
import { copy } from "@/lib/copy";
import { saveMerchantHours } from "@/lib/admin/actions/merchants";
import { labelToMinutes, minutesToLabel } from "@/lib/utils";

interface Range {
  dayOfWeek: number;
  opensAt: number;
  closesAt: number;
}

export function HoursEditor({
  merchantId,
  initialRanges,
}: {
  merchantId: string;
  initialRanges: Range[];
}) {
  const [ranges, setRanges] = useState<Range[]>(initialRanges);

  function byDay(day: number) {
    return ranges
      .map((range, index) => ({ range, index }))
      .filter((entry) => entry.range.dayOfWeek === day)
      .sort((a, b) => a.range.opensAt - b.range.opensAt);
  }

  function update(index: number, patch: Partial<Range>) {
    setRanges((current) =>
      current.map((range, i) => (i === index ? { ...range, ...patch } : range)),
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Horario semanal</CardTitle>
      </CardHeader>
      <CardContent>
        <ActionForm action={saveMerchantHours} submitLabel="Guardar horario">
          <input type="hidden" name="merchantId" value={merchantId} />
          {/* Controlado: el JSON siempre refleja el estado actual del editor. */}
          <input type="hidden" name="ranges" value={JSON.stringify(ranges)} />

          <div className="space-y-2">
            {copy.hours.days.map((dayLabel, day) => {
              const entries = byDay(day);
              return (
                <div key={day} className="rounded-lg border border-ink-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-sm font-medium text-ink-800">{dayLabel}</span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() =>
                        setRanges((current) => [
                          ...current,
                          { dayOfWeek: day, opensAt: 9 * 60, closesAt: 18 * 60 },
                        ])
                      }
                    >
                      <Plus aria-hidden="true" />
                      Turno
                    </Button>
                  </div>

                  {entries.length === 0 ? (
                    <p className="mt-1 text-xs text-ink-500">{copy.hours.closedToday}</p>
                  ) : (
                    <div className="mt-2 space-y-2">
                      {entries.map(({ range, index }) => (
                        <div key={index} className="flex min-w-0 items-center gap-2">
                          <Input
                            type="time"
                            aria-label={`${dayLabel}: abre`}
                            value={minutesToLabel(range.opensAt)}
                            onChange={(event) => {
                              const minutes = labelToMinutes(event.target.value);
                              if (minutes !== null) update(index, { opensAt: minutes });
                            }}
                          />
                          <span className="text-ink-400" aria-hidden="true">
                            –
                          </span>
                          <Input
                            type="time"
                            aria-label={`${dayLabel}: cierra`}
                            value={minutesToLabel(range.closesAt)}
                            onChange={(event) => {
                              const minutes = labelToMinutes(event.target.value);
                              if (minutes !== null) update(index, { closesAt: minutes });
                            }}
                          />
                          <Button
                            variant="ghost"
                            size="icon"
                            className="shrink-0"
                            aria-label={`Quitar turno de ${dayLabel}`}
                            onClick={() =>
                              setRanges((current) => current.filter((_, i) => i !== index))
                            }
                          >
                            <Trash2 aria-hidden="true" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          <p className="text-xs text-ink-500">
            No hace falta cargar el cierre de Shabat ni el de los jaguim: se calculan solos
            a partir del calendario y de los offsets del comercio.
          </p>
        </ActionForm>
      </CardContent>
    </Card>
  );
}
