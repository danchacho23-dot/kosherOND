"use client";

import { ActionForm } from "@/components/admin/action-form";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Checkbox,
  Field,
  FieldError,
  Input,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { copy } from "@/lib/copy";
import type { ActionState } from "@/lib/admin/form";

interface Option {
  id: string;
  name: string;
}

export interface MerchantFormValues {
  id?: string;
  legalName: string;
  name: string;
  slug: string;
  tagline: string;
  description: string;
  contactName: string;
  phone: string;
  whatsappPhone: string;
  email: string;
  categoryId: string;
  neighborhoodId: string;
  addressLine: string;
  addressNote: string;
  latitude: string;
  longitude: string;
  deliveryAreaText: string;
  offersDelivery: boolean;
  offersPickup: boolean;
  dietTag: string;
  tags: string;
  orderChannels: string[];
  websiteUrl: string;
  whatsappGreeting: string;
  logoUrl: string;
  coverUrl: string;
  observesShabbat: boolean;
  shabbatCloseOffsetMinutes: number;
  havdalahReopenOffsetMinutes: number;
  status: string;
  isFeatured: boolean;
  sortWeight: number;
}

export const EMPTY_MERCHANT: MerchantFormValues = {
  legalName: "",
  name: "",
  slug: "",
  tagline: "",
  description: "",
  contactName: "",
  phone: "",
  whatsappPhone: "",
  email: "",
  categoryId: "",
  neighborhoodId: "",
  addressLine: "",
  addressNote: "",
  latitude: "",
  longitude: "",
  deliveryAreaText: "",
  offersDelivery: false,
  offersPickup: true,
  dietTag: "",
  tags: "",
  orderChannels: ["WHATSAPP"],
  websiteUrl: "",
  whatsappGreeting: "",
  logoUrl: "",
  coverUrl: "",
  observesShabbat: true,
  shabbatCloseOffsetMinutes: 90,
  havdalahReopenOffsetMinutes: 60,
  status: "DRAFT",
  isFeatured: false,
  sortWeight: 0,
};

const CHANNELS = ["WHATSAPP", "WEBSITE", "PHONE", "PICKUP"] as const;
const DIETS = ["MEAT", "DAIRY", "PAREVE", "MIXED"] as const;

export function MerchantForm({
  action,
  values,
  categories,
  neighborhoods,
  submitLabel,
}: {
  action: (state: ActionState, formData: FormData) => Promise<ActionState>;
  values: MerchantFormValues;
  categories: Option[];
  neighborhoods: Option[];
  submitLabel?: string;
}) {
  return (
    <ActionForm action={action} submitLabel={submitLabel} className="space-y-6">
      {(state) => {
        const errors = state.errors ?? {};
        return (
          <>
            {values.id ? <input type="hidden" name="id" value={values.id} /> : null}

            <Card>
              <CardHeader>
                <CardTitle>Identidad</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field id="name" label="Nombre público" error={errors.name} required>
                  <Input name="name" defaultValue={values.name} required />
                </Field>
                <Field id="legalName" label="Razón social" error={errors.legalName} required>
                  <Input name="legalName" defaultValue={values.legalName} required />
                </Field>
                <Field
                  id="slug"
                  label="Slug"
                  hint="Define la URL pública: /comercio/mi-slug"
                  error={errors.slug}
                >
                  <Input name="slug" defaultValue={values.slug} />
                </Field>
                <Field id="tagline" label="Bajada" error={errors.tagline}>
                  <Input name="tagline" defaultValue={values.tagline} maxLength={160} />
                </Field>
                <div className="sm:col-span-2">
                  <Field id="description" label="Descripción" error={errors.description}>
                    <Textarea name="description" defaultValue={values.description} rows={4} />
                  </Field>
                </div>
                <Field
                  id="tags"
                  label="Etiquetas"
                  hint="Separadas por coma. Entran en la búsqueda."
                  error={errors.tags}
                >
                  <Input name="tags" defaultValue={values.tags} />
                </Field>
                <Field id="dietTag" label="Tipo" error={errors.dietTag}>
                  <Select name="dietTag" defaultValue={values.dietTag}>
                    <option value="">Sin especificar</option>
                    {DIETS.map((diet) => (
                      <option key={diet} value={diet}>
                        {copy.diet[diet]}
                      </option>
                    ))}
                  </Select>
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Contacto</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field id="contactName" label="Responsable" error={errors.contactName} required>
                  <Input name="contactName" defaultValue={values.contactName} required />
                </Field>
                <Field id="email" label="Email" error={errors.email} required>
                  <Input name="email" type="email" defaultValue={values.email} required />
                </Field>
                <Field id="phone" label="Teléfono" error={errors.phone} required>
                  <Input name="phone" defaultValue={values.phone} required />
                </Field>
                <Field id="whatsappPhone" label="WhatsApp" error={errors.whatsappPhone}>
                  <Input name="whatsappPhone" defaultValue={values.whatsappPhone} />
                </Field>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Ubicación y entrega</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field id="categoryId" label="Categoría" error={errors.categoryId} required>
                  <Select name="categoryId" defaultValue={values.categoryId} required>
                    <option value="" disabled>
                      Elegí una opción
                    </option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field
                  id="neighborhoodId"
                  label="Barrio"
                  error={errors.neighborhoodId}
                  required
                >
                  <Select name="neighborhoodId" defaultValue={values.neighborhoodId} required>
                    <option value="" disabled>
                      Elegí una opción
                    </option>
                    {neighborhoods.map((neighborhood) => (
                      <option key={neighborhood.id} value={neighborhood.id}>
                        {neighborhood.name}
                      </option>
                    ))}
                  </Select>
                </Field>
                <div className="sm:col-span-2">
                  <Field id="addressLine" label="Dirección" error={errors.addressLine} required>
                    <Input name="addressLine" defaultValue={values.addressLine} required />
                  </Field>
                </div>
                <Field id="addressNote" label="Referencia" error={errors.addressNote}>
                  <Input name="addressNote" defaultValue={values.addressNote} />
                </Field>
                <div className="grid grid-cols-2 gap-3">
                  <Field id="latitude" label="Latitud" error={errors.latitude}>
                    <Input name="latitude" inputMode="decimal" defaultValue={values.latitude} />
                  </Field>
                  <Field id="longitude" label="Longitud" error={errors.longitude}>
                    <Input name="longitude" inputMode="decimal" defaultValue={values.longitude} />
                  </Field>
                </div>
                <div className="space-y-2 sm:col-span-2">
                  <Checkbox
                    id="offersPickup"
                    name="offersPickup"
                    defaultChecked={values.offersPickup}
                    label="Retiro en el local"
                  />
                  <Checkbox
                    id="offersDelivery"
                    name="offersDelivery"
                    defaultChecked={values.offersDelivery}
                    label="Hace delivery"
                  />
                  <FieldError>{errors.offersPickup}</FieldError>
                </div>
                <div className="sm:col-span-2">
                  <Field
                    id="deliveryAreaText"
                    label="Zona de entrega"
                    hint="Texto libre. Sin radios ni polígonos."
                    error={errors.deliveryAreaText}
                  >
                    <Textarea
                      name="deliveryAreaText"
                      defaultValue={values.deliveryAreaText}
                      rows={2}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Pedido externo</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <fieldset>
                  <legend className="text-sm font-medium text-ink-800">Canales</legend>
                  <div className="mt-2 grid gap-2 sm:grid-cols-2">
                    {CHANNELS.map((channel) => (
                      <Checkbox
                        key={channel}
                        id={`canal-${channel}`}
                        name="orderChannels"
                        value={channel}
                        defaultChecked={values.orderChannels.includes(channel)}
                        label={copy.channelChoice[channel]}
                      />
                    ))}
                  </div>
                  <FieldError>{errors.orderChannels}</FieldError>
                </fieldset>
                <Field id="websiteUrl" label="Sitio web" error={errors.websiteUrl}>
                  <Input name="websiteUrl" type="url" defaultValue={values.websiteUrl} />
                </Field>
                <Field
                  id="whatsappGreeting"
                  label="Mensaje de WhatsApp"
                  hint="Si queda vacío se usa el mensaje por defecto. El identificador de origen se agrega solo."
                  error={errors.whatsappGreeting}
                >
                  <Textarea
                    name="whatsappGreeting"
                    defaultValue={values.whatsappGreeting}
                    rows={2}
                  />
                </Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field id="logoUrl" label="Logo (URL)" error={errors.logoUrl}>
                    <Input name="logoUrl" type="url" defaultValue={values.logoUrl} />
                  </Field>
                  <Field id="coverUrl" label="Portada (URL)" error={errors.coverUrl}>
                    <Input name="coverUrl" type="url" defaultValue={values.coverUrl} />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Shabat y jaguim</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <Checkbox
                  id="observesShabbat"
                  name="observesShabbat"
                  defaultChecked={values.observesShabbat}
                  label="Cierra por Shabat y jaguim (cálculo automático)"
                />
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field
                    id="shabbatCloseOffsetMinutes"
                    label="Minutos antes del encendido de velas"
                    hint="La mayoría cierra bastante antes."
                    error={errors.shabbatCloseOffsetMinutes}
                  >
                    <Input
                      name="shabbatCloseOffsetMinutes"
                      type="number"
                      min={0}
                      max={600}
                      defaultValue={values.shabbatCloseOffsetMinutes}
                    />
                  </Field>
                  <Field
                    id="havdalahReopenOffsetMinutes"
                    label="Minutos después de havdalá"
                    error={errors.havdalahReopenOffsetMinutes}
                  >
                    <Input
                      name="havdalahReopenOffsetMinutes"
                      type="number"
                      min={0}
                      max={600}
                      defaultValue={values.havdalahReopenOffsetMinutes}
                    />
                  </Field>
                </div>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Publicación</CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-2">
                <Field id="status" label="Estado" error={errors.status}>
                  <Select name="status" defaultValue={values.status}>
                    <option value="DRAFT">Borrador (no visible)</option>
                    <option value="APPROVED">Publicado</option>
                    <option value="SUSPENDED">Suspendido</option>
                  </Select>
                </Field>
                <Field id="sortWeight" label="Peso de orden" error={errors.sortWeight}>
                  <Input
                    name="sortWeight"
                    type="number"
                    min={-100}
                    max={100}
                    defaultValue={values.sortWeight}
                  />
                </Field>
                <div className="sm:col-span-2">
                  <Checkbox
                    id="isFeatured"
                    name="isFeatured"
                    defaultChecked={values.isFeatured}
                    label="Destacado en la home"
                  />
                </div>
                <p className="text-xs text-ink-500 sm:col-span-2">
                  La supervisión kosher se carga en su propia sección, más abajo. No se
                  edita desde acá y nunca la informa el comercio.
                </p>
              </CardContent>
            </Card>
          </>
        );
      }}
    </ActionForm>
  );
}
