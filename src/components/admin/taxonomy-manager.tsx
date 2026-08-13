"use client";

import { useState } from "react";
import { ActionButton, ActionForm } from "@/components/admin/action-form";
import { Button } from "@/components/ui/button";
import {
  Badge,
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  EmptyState,
  Field,
  Input,
  Select,
} from "@/components/ui/primitives";
import { CATEGORY_ICON_NAMES, CategoryIcon } from "@/components/category-icon";
import { slugify } from "@/lib/utils";
import type { ActionState } from "@/lib/admin/form";

export interface TaxonomyRow {
  id: string;
  name: string;
  slug: string;
  icon?: string | null;
  sortOrder: number;
  isActive: boolean;
  merchantCount: number;
}

export function TaxonomyManager({
  title,
  rows,
  saveAction,
  deleteAction,
  withIcon = false,
}: {
  title: string;
  rows: TaxonomyRow[];
  saveAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
  deleteAction: (state: ActionState, formData: FormData) => Promise<ActionState>;
  withIcon?: boolean;
}) {
  const [editing, setEditing] = useState<TaxonomyRow | null>(null);
  const [creating, setCreating] = useState(false);

  const form = editing ?? null;
  const showForm = creating || Boolean(editing);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <h1 className="text-xl font-semibold text-ink-900">{title}</h1>
        {!showForm ? (
          <Button
            onClick={() => {
              setEditing(null);
              setCreating(true);
            }}
          >
            Agregar
          </Button>
        ) : null}
      </div>

      {showForm ? (
        <Card>
          <CardHeader>
            <CardTitle>{form ? `Editar ${form.name}` : "Nuevo"}</CardTitle>
          </CardHeader>
          <CardContent>
            <ActionForm action={saveAction} key={form?.id ?? "nuevo"}>
              {(state) => {
                const errors = state.errors ?? {};
                return (
                  <>
                    {form ? <input type="hidden" name="id" value={form.id} /> : null}
                    <div className="grid gap-4 sm:grid-cols-2">
                      <Field id="name" label="Nombre" error={errors.name} required>
                        <Input
                          name="name"
                          defaultValue={form?.name ?? ""}
                          required
                          onChange={(event) => {
                            // Autocompleta el slug solo al crear, para no romper
                            // URLs ya publicadas.
                            if (form) return;
                            const slugInput =
                              event.currentTarget.form?.querySelector<HTMLInputElement>(
                                'input[name="slug"]',
                              );
                            if (slugInput) slugInput.value = slugify(event.target.value);
                          }}
                        />
                      </Field>
                      <Field id="slug" label="Slug" error={errors.slug} required>
                        <Input name="slug" defaultValue={form?.slug ?? ""} required />
                      </Field>
                      {withIcon ? (
                        <Field id="icon" label="Ícono" error={errors.icon}>
                          <Select name="icon" defaultValue={form?.icon ?? ""}>
                            <option value="">Sin ícono</option>
                            {CATEGORY_ICON_NAMES.map((name) => (
                              <option key={name} value={name}>
                                {name}
                              </option>
                            ))}
                          </Select>
                        </Field>
                      ) : null}
                      <Field id="sortOrder" label="Orden" error={errors.sortOrder}>
                        <Input
                          name="sortOrder"
                          type="number"
                          min={0}
                          max={999}
                          defaultValue={form?.sortOrder ?? 0}
                        />
                      </Field>
                      <div className="sm:col-span-2">
                        <Checkbox
                          id="isActive"
                          name="isActive"
                          defaultChecked={form?.isActive ?? true}
                          label="Activo"
                        />
                      </div>
                    </div>
                  </>
                );
              }}
            </ActionForm>
            <Button
              variant="ghost"
              size="sm"
              className="mt-2"
              onClick={() => {
                setEditing(null);
                setCreating(false);
              }}
            >
              Cancelar
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {rows.length === 0 ? (
        <EmptyState title="Todavía no hay nada cargado." />
      ) : (
        <ul className="divide-y divide-ink-100 rounded-[var(--radius-card)] border border-ink-200 bg-white">
          {rows.map((row) => (
            <li key={row.id} className="flex flex-wrap items-center gap-3 p-4">
              {withIcon ? (
                <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-brand-100 text-brand-700">
                  <CategoryIcon name={row.icon} />
                </span>
              ) : null}
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink-900">{row.name}</p>
                <p className="truncate text-xs text-ink-500">
                  /{row.slug} · orden {row.sortOrder} · {row.merchantCount} comercio(s)
                </p>
              </div>
              {!row.isActive ? <Badge variant="neutral">Inactivo</Badge> : null}
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setCreating(false);
                  setEditing(row);
                }}
              >
                Editar
              </Button>
              <ActionButton
                action={deleteAction}
                label="Eliminar"
                variant="ghost"
                fields={{ id: row.id }}
                confirm={`¿Eliminar “${row.name}”?`}
              />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
