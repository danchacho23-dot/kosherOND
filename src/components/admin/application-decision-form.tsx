"use client";

import { useState } from "react";
import { ActionForm } from "@/components/admin/action-form";
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Textarea,
} from "@/components/ui/primitives";
import { decideApplication } from "@/lib/admin/actions/applications";

type Decision = "UNDER_REVIEW" | "APPROVED" | "REJECTED";

const OPTIONS: Array<{ value: Decision; label: string; hint: string }> = [
  {
    value: "UNDER_REVIEW",
    label: "Marcar en revisión",
    hint: "No manda ningún email. Sirve para dejar constancia de que la estás mirando.",
  },
  {
    value: "APPROVED",
    label: "Aprobar y publicar",
    hint: "Crea el comercio con estos datos, lo publica y le manda el email de aprobación.",
  },
  {
    value: "REJECTED",
    label: "Rechazar",
    hint: "Le manda un email con el motivo, si cargás uno.",
  },
];

export function ApplicationDecisionForm({
  applicationId,
  canApprove,
  defaultNotes,
}: {
  applicationId: string;
  canApprove: boolean;
  defaultNotes: string;
}) {
  const [decision, setDecision] = useState<Decision>("APPROVED");
  const selected = OPTIONS.find((option) => option.value === decision)!;

  return (
    <Card>
      <CardHeader>
        <CardTitle>Decisión</CardTitle>
      </CardHeader>
      <CardContent>
        <ActionForm
          action={decideApplication}
          submitLabel={selected.label}
          pendingLabel="Procesando…"
          variant={decision === "REJECTED" ? "danger" : "primary"}
          confirm={
            decision === "APPROVED"
              ? "Se va a crear y publicar el comercio, y se le manda el email de aprobación. ¿Continuar?"
              : decision === "REJECTED"
                ? "Se le manda un email de rechazo. ¿Continuar?"
                : undefined
          }
        >
          {(state) => (
            <>
              <input type="hidden" name="applicationId" value={applicationId} />
              <input type="hidden" name="decision" value={decision} />

              <fieldset className="space-y-2">
                <legend className="text-sm font-medium text-ink-800">Qué hacer</legend>
                {OPTIONS.map((option) => (
                  <label
                    key={option.value}
                    className="flex items-start gap-2.5 rounded-lg border border-ink-200 p-3 text-sm has-checked:border-brand-500 has-checked:bg-brand-50"
                  >
                    <input
                      type="radio"
                      name="decisionChoice"
                      className="mt-0.5 accent-brand-600"
                      checked={decision === option.value}
                      disabled={option.value === "APPROVED" && !canApprove}
                      onChange={() => setDecision(option.value)}
                    />
                    <span>
                      <span className="block font-medium text-ink-900">{option.label}</span>
                      <span className="block text-xs text-ink-500">{option.hint}</span>
                    </span>
                  </label>
                ))}
              </fieldset>

              {!canApprove ? (
                <Alert variant="warning">
                  No se puede aprobar hasta que la categoría y el barrio existan.
                </Alert>
              ) : null}

              {decision === "REJECTED" ? (
                <Field
                  id="rejectionReason"
                  label="Motivo del rechazo"
                  hint="Se incluye en el email al comercio."
                  error={state.errors?.rejectionReason}
                >
                  <Textarea name="rejectionReason" rows={3} />
                </Field>
              ) : null}

              <Field
                id="reviewNotes"
                label="Notas internas"
                hint="No se envían a nadie."
                error={state.errors?.reviewNotes}
              >
                <Textarea name="reviewNotes" rows={2} defaultValue={defaultNotes} />
              </Field>
            </>
          )}
        </ActionForm>
      </CardContent>
    </Card>
  );
}
