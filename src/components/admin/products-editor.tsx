"use client";

import { ActionButton, ActionForm } from "@/components/admin/action-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Field,
  Input,
  Select,
} from "@/components/ui/primitives";
import { copy } from "@/lib/copy";
import { deleteProduct, saveProduct } from "@/lib/admin/actions/merchants";
import { formatPrice } from "@/lib/utils";

export interface ProductRow {
  id: string;
  name: string;
  description: string | null;
  priceCents: number | null;
  dietTag: string | null;
}

const DIETS = ["MEAT", "DAIRY", "PAREVE"] as const;

/** Catálogo informativo: lista plana, sin stock ni modificadores. */
export function ProductsEditor({
  merchantId,
  products,
}: {
  merchantId: string;
  products: ProductRow[];
}) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Catálogo</CardTitle>
      </CardHeader>
      <CardContent className="space-y-5">
        <p className="text-xs text-ink-500">
          Opcional e informativo. No hay stock ni disponibilidad en vivo: el cliente
          confirma con el comercio.
        </p>

        <ActionForm action={saveProduct} submitLabel="Agregar producto">
          {(state) => (
            <>
              <input type="hidden" name="merchantId" value={merchantId} />
              <div className="grid gap-3 sm:grid-cols-2">
                <Field id="name" label="Nombre" error={state.errors?.name} required>
                  <Input name="name" required />
                </Field>
                <Field id="price" label="Precio (B/.)" error={state.errors?.priceCents}>
                  <Input name="price" inputMode="decimal" placeholder="12.50" />
                </Field>
                <Field id="description" label="Descripción" error={state.errors?.description}>
                  <Input name="description" />
                </Field>
                <Field id="dietTag" label="Tipo" error={state.errors?.dietTag}>
                  <Select name="dietTag" defaultValue="">
                    <option value="">Sin especificar</option>
                    {DIETS.map((diet) => (
                      <option key={diet} value={diet}>
                        {copy.diet[diet]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </div>
            </>
          )}
        </ActionForm>

        {products.length === 0 ? (
          <p className="text-sm text-ink-500">Este comercio no tiene catálogo cargado.</p>
        ) : (
          <ul className="divide-y divide-ink-100 rounded-lg border border-ink-200">
            {products.map((product) => (
              <li key={product.id} className="flex items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <p className="truncate text-sm text-ink-900">{product.name}</p>
                  <p className="truncate text-xs text-ink-500">
                    {formatPrice(product.priceCents) ?? "Sin precio"}
                    {product.dietTag
                      ? ` · ${copy.diet[product.dietTag as keyof typeof copy.diet]}`
                      : ""}
                  </p>
                </div>
                <ActionButton
                  action={deleteProduct}
                  label="Quitar"
                  variant="ghost"
                  fields={{ id: product.id }}
                />
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
