"use client";

import { FileText, ShieldCheck, Trash2 } from "lucide-react";
import { ActionButton, ActionForm } from "@/components/admin/action-form";
import {
  Alert,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  Input,
  Textarea,
} from "@/components/ui/primitives";
import {
  deleteCertificationDocument,
  revokeSupervision,
  saveSupervision,
  uploadCertificationDocument,
} from "@/lib/admin/actions/supervision";

export interface SupervisionValues {
  authority: string;
  certificateId: string;
  verifiedAt: string;
  expiresAt: string;
  notes: string;
  isActive: boolean;
}

export interface DocumentRow {
  id: string;
  fileName: string;
  mimeType: string;
  sizeBytes: number;
  createdAt: string;
}

/**
 * Supervisión kosher. Solo edita un administrador; no hay portal de comercio y
 * no lo va a haber en el MVP. Mientras no exista una fila activa y vigente, la
 * página pública no dice nada sobre supervisión.
 */
export function SupervisionPanel({
  merchantId,
  values,
  documents,
  hasSupervision,
  storageConfigured,
}: {
  merchantId: string;
  values: SupervisionValues | null;
  documents: DocumentRow[];
  hasSupervision: boolean;
  storageConfigured: boolean;
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="size-5 text-brand-700" aria-hidden="true" />
          Supervisión kosher
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <Alert variant="warning">
          Cargá esto solo con documentación a la vista. Si no hay verificación, la página
          pública no muestra nada — ni badge negativo, ni “informado por el comercio”.
        </Alert>

        <ActionForm action={saveSupervision} submitLabel="Guardar supervisión">
          {(state) => {
            const errors = state.errors ?? {};
            return (
              <>
                <input type="hidden" name="merchantId" value={merchantId} />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="authority"
                    label="Autoridad certificante"
                    error={errors.authority}
                    required
                  >
                    <Input name="authority" defaultValue={values?.authority ?? ""} required />
                  </Field>
                  <Field
                    id="certificateId"
                    label="Número de certificado"
                    error={errors.certificateId}
                  >
                    <Input name="certificateId" defaultValue={values?.certificateId ?? ""} />
                  </Field>
                  <Field
                    id="verifiedAt"
                    label="Verificado el"
                    error={errors.verifiedAt}
                    required
                  >
                    <Input
                      name="verifiedAt"
                      type="date"
                      defaultValue={values?.verifiedAt ?? ""}
                      required
                    />
                  </Field>
                  <Field
                    id="expiresAt"
                    label="Vence el"
                    hint="Avisamos por email un mes antes."
                    error={errors.expiresAt}
                  >
                    <Input name="expiresAt" type="date" defaultValue={values?.expiresAt ?? ""} />
                  </Field>
                  <div className="sm:col-span-2">
                    <Field id="notes" label="Notas internas" error={errors.notes}>
                      <Textarea name="notes" defaultValue={values?.notes ?? ""} rows={2} />
                    </Field>
                  </div>
                  <div className="sm:col-span-2">
                    <Checkbox
                      id="isActive"
                      name="isActive"
                      defaultChecked={values?.isActive ?? true}
                      label="Activa (visible en la página pública mientras esté vigente)"
                    />
                  </div>
                </div>
              </>
            );
          }}
        </ActionForm>

        {hasSupervision ? (
          <div className="border-t border-ink-200 pt-5">
            <h3 className="text-sm font-semibold text-ink-900">Documentos</h3>
            <p className="mt-1 text-xs text-ink-500">
              Almacenamiento privado. No hay URL pública: solo se descargan desde acá, con
              sesión de admin.
            </p>

            {storageConfigured ? (
              <ActionForm
                action={uploadCertificationDocument}
                submitLabel="Subir documento"
                className="mt-3"
              >
                {(state) => (
                  <>
                    <input type="hidden" name="merchantId" value={merchantId} />
                    <Field
                      id="file"
                      label="Archivo"
                      hint="PDF o imagen, hasta 10 MB."
                      error={state.errors?.file}
                    >
                      <Input
                        name="file"
                        type="file"
                        accept="application/pdf,image/jpeg,image/png,image/webp"
                      />
                    </Field>
                  </>
                )}
              </ActionForm>
            ) : (
              <div className="mt-3">
                <Alert variant="warning">
                  El almacenamiento de objetos no está configurado. Definí S3_ENDPOINT,
                  S3_BUCKET, S3_ACCESS_KEY_ID y S3_SECRET_ACCESS_KEY para poder subir
                  documentos.
                </Alert>
              </div>
            )}

            {documents.length > 0 ? (
              <ul className="mt-4 divide-y divide-ink-100 rounded-lg border border-ink-200">
                {documents.map((document) => (
                  <li key={document.id} className="flex items-center gap-3 p-3">
                    <FileText className="size-4 shrink-0 text-ink-400" aria-hidden="true" />
                    <div className="min-w-0 flex-1">
                      <a
                        href={`/admin/documentos/${document.id}`}
                        className="block truncate text-sm font-medium text-brand-700 hover:underline"
                      >
                        {document.fileName}
                      </a>
                      <p className="text-xs text-ink-500">
                        {(document.sizeBytes / 1024).toFixed(0)} KB · {document.createdAt}
                      </p>
                    </div>
                    <ActionButton
                      action={deleteCertificationDocument}
                      label="Eliminar"
                      variant="ghost"
                      fields={{ id: document.id }}
                      confirm="¿Eliminar este documento? No se puede deshacer."
                    />
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-ink-500">Todavía no hay documentos cargados.</p>
            )}

            <div className="mt-5 flex items-center gap-2">
              <Trash2 className="size-4 text-ink-400" aria-hidden="true" />
              <ActionButton
                action={revokeSupervision}
                label="Revocar supervisión"
                variant="danger"
                fields={{ merchantId }}
                confirm="La página pública dejará de mostrar la supervisión. ¿Continuar?"
              />
            </div>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
