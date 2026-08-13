"use client";

import { ActionButton, ActionForm } from "@/components/admin/action-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
} from "@/components/ui/primitives";
import { addClosure, removeClosure } from "@/lib/admin/actions/merchants";

export interface ClosureRow {
  id: string;
  startsAt: string;
  endsAt: string;
  reason: string | null;
}

/** Cierres puntuales cargados a mano: vacaciones, remodelación, mudanza. */
export function ClosuresEditor({
  merchantId,
  closures,
}: {
  merchantId: string;
  closures: ClosureRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Cierres puntuales</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <ActionForm action={addClosure} submitLabel="Agregar cierre">
          {(state) => (
            <>
              <input type="hidden" name="merchantId" value={merchantId} />
              <div className="grid gap-3 sm:grid-cols-3">
                <Field id="startsAt" label="Desde" error={state.errors?.startsAt} required>
                  <Input name="startsAt" type="date" required />
                </Field>
                <Field id="endsAt" label="Hasta" error={state.errors?.endsAt} required>
                  <Input name="endsAt" type="date" required />
                </Field>
                <Field id="reason" label="Motivo" error={state.errors?.reason}>
                  <Input name="reason" placeholder="Vacaciones" />
                </Field>
              </div>
            </>
          )}
        </ActionForm>

        {closures.length === 0 ? (
          <p className="text-sm text-ink-500">No hay cierres cargados.</p>
        ) : (
          <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200">
            {closures.map((closure) => (
              <li key={closure.id} className="flex items-center justify-between gap-3 p-3">
                <div>
                  <p className="text-sm text-ink-900">
                    {closure.startsAt} → {closure.endsAt}
                  </p>
                  <p className="text-xs text-ink-500">{closure.reason ?? "Sin motivo"}</p>
                </div>
                <ActionButton
                  action={removeClosure}
                  label="Quitar"
                  variant="ghost"
                  fields={{ id: closure.id }}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
