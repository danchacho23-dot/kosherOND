"use client";

import { useActionState, useEffect, useRef, useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Alert,
  Card,
  CardContent,
  Checkbox,
  Field,
  FieldError,
  Input,
  Label,
  Select,
  Textarea,
} from "@/components/ui/primitives";
import { copy } from "@/lib/copy";
import { submitApplication, type ApplicationFormState } from "@/app/(public)/aplicar/actions";

interface Option {
  slug: string;
  name: string;
}

interface HourRange {
  opensAt: string;
  closesAt: string;
}

const CHANNELS = [
  { value: "WHATSAPP", label: copy.channelChoice.WHATSAPP },
  { value: "WEBSITE", label: copy.channelChoice.WEBSITE },
  { value: "PHONE", label: copy.channelChoice.PHONE },
  { value: "PICKUP", label: copy.channelChoice.PICKUP },
] as const;

const DIETS = [
  { value: "MEAT", label: copy.diet.MEAT },
  { value: "DAIRY", label: copy.diet.DAIRY },
  { value: "PAREVE", label: copy.diet.PAREVE },
  { value: "MIXED", label: copy.diet.MIXED },
] as const;

const initialState: ApplicationFormState = { status: "idle" };

export function ApplicationForm({
  categories,
  neighborhoods,
  onSuccess,
}: {
  categories: Option[];
  neighborhoods: Option[];
  onSuccess: (trackingCode: string) => void;
}) {
  const [state, formAction, isPending] = useActionState(submitApplication, initialState);
  const [channels, setChannels] = useState<string[]>(["WHATSAPP"]);
  const [offersDelivery, setOffersDelivery] = useState(false);
  const [offersPickup, setOffersPickup] = useState(true);
  const [consent, setConsent] = useState(false);
  const [hours, setHours] = useState<Record<number, HourRange[]>>({
    0: [],
    1: [{ opensAt: "09:00", closesAt: "18:00" }],
    2: [{ opensAt: "09:00", closesAt: "18:00" }],
    3: [{ opensAt: "09:00", closesAt: "18:00" }],
    4: [{ opensAt: "09:00", closesAt: "18:00" }],
    5: [{ opensAt: "09:00", closesAt: "14:00" }],
    6: [],
  });
  const errorRef = useRef<HTMLDivElement>(null);

  const errors = state.errors ?? {};

  useEffect(() => {
    if (state.status === "success" && state.trackingCode) {
      onSuccess(state.trackingCode);
    }
    if (state.status === "error") {
      errorRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
    }
  }, [state, onSuccess]);

  function toggleChannel(value: string) {
    setChannels((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value],
    );
  }

  function updateRange(day: number, index: number, patch: Partial<HourRange>) {
    setHours((current) => ({
      ...current,
      [day]: current[day].map((range, i) => (i === index ? { ...range, ...patch } : range)),
    }));
  }

  return (
    <form
      action={formAction}
      className="space-y-8"
      onSubmit={(event) => {
        // El payload viaja como un solo JSON: los horarios son anidados y
        // FormData plano los volvería un parseo frágil del lado del servidor.
        const form = event.currentTarget;
        const data = new FormData(form);
        const payload = {
          legalName: String(data.get("legalName") ?? ""),
          name: String(data.get("name") ?? ""),
          contactName: String(data.get("contactName") ?? ""),
          phone: String(data.get("phone") ?? ""),
          whatsappPhone: String(data.get("whatsappPhone") ?? ""),
          email: String(data.get("email") ?? ""),
          categorySlug: String(data.get("categorySlug") ?? ""),
          neighborhoodSlug: String(data.get("neighborhoodSlug") ?? ""),
          addressLine: String(data.get("addressLine") ?? ""),
          description: String(data.get("description") ?? ""),
          dietTag: String(data.get("dietTag") ?? ""),
          offersDelivery,
          offersPickup,
          deliveryAreaText: String(data.get("deliveryAreaText") ?? ""),
          orderChannels: channels,
          websiteUrl: String(data.get("websiteUrl") ?? ""),
          logoUrl: String(data.get("logoUrl") ?? ""),
          coverUrl: String(data.get("coverUrl") ?? ""),
          hours: Object.entries(hours).flatMap(([day, ranges]) =>
            ranges.map((range) => ({
              dayOfWeek: Number(day),
              opensAt: range.opensAt,
              closesAt: range.closesAt,
            })),
          ),
          consent,
        };
        const input = form.querySelector<HTMLInputElement>('input[name="payload"]');
        if (input) input.value = JSON.stringify(payload);
      }}
    >
      <input type="hidden" name="payload" defaultValue="" />

      <div ref={errorRef}>
        {state.status === "error" ? (
          <Alert variant="danger" title={copy.apply.errorGeneric}>
            {state.message}
          </Alert>
        ) : null}
      </div>

      <Section title={copy.apply.sectionBusiness}>
        <Field
          id="name"
          label={copy.apply.fields.name}
          hint={copy.apply.fields.nameHint}
          error={errors.name}
          required
        >
          <Input name="name" required maxLength={120} autoComplete="organization" />
        </Field>
        <Field
          id="legalName"
          label={copy.apply.fields.legalName}
          hint={copy.apply.fields.legalNameHint}
          error={errors.legalName}
          required
        >
          <Input name="legalName" required maxLength={160} />
        </Field>
        <Field
          id="categorySlug"
          label={copy.apply.fields.category}
          error={errors.categorySlug}
          required
        >
          <Select name="categorySlug" required defaultValue="">
            <option value="" disabled>
              Elegí una opción
            </option>
            {categories.map((category) => (
              <option key={category.slug} value={category.slug}>
                {category.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field id="dietTag" label={copy.apply.fields.dietTag} error={errors.dietTag}>
          <Select name="dietTag" defaultValue="">
            <option value="">Sin especificar</option>
            {DIETS.map((diet) => (
              <option key={diet.value} value={diet.value}>
                {diet.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="description"
          label={copy.apply.fields.description}
          hint={copy.apply.fields.descriptionHint}
          error={errors.description}
        >
          <Textarea name="description" maxLength={1200} rows={4} />
        </Field>
      </Section>

      <Section title={copy.apply.sectionContact}>
        <Field
          id="contactName"
          label={copy.apply.fields.contactName}
          error={errors.contactName}
          required
        >
          <Input name="contactName" required maxLength={120} autoComplete="name" />
        </Field>
        <Field id="phone" label={copy.apply.fields.phone} error={errors.phone} required>
          <Input name="phone" type="tel" required inputMode="tel" autoComplete="tel" />
        </Field>
        <Field
          id="whatsappPhone"
          label={copy.apply.fields.whatsappPhone}
          hint={copy.apply.fields.whatsappHint}
          error={errors.whatsappPhone}
        >
          <Input name="whatsappPhone" type="tel" inputMode="tel" />
        </Field>
        <Field id="email" label={copy.apply.fields.email} error={errors.email} required>
          <Input name="email" type="email" required autoComplete="email" />
        </Field>
      </Section>

      <Section title={copy.apply.sectionLocation}>
        <Field
          id="neighborhoodSlug"
          label={copy.apply.fields.neighborhood}
          error={errors.neighborhoodSlug}
          required
        >
          <Select name="neighborhoodSlug" required defaultValue="">
            <option value="" disabled>
              Elegí una opción
            </option>
            {neighborhoods.map((neighborhood) => (
              <option key={neighborhood.slug} value={neighborhood.slug}>
                {neighborhood.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field
          id="addressLine"
          label={copy.apply.fields.addressLine}
          error={errors.addressLine}
          required
        >
          <Input name="addressLine" required maxLength={240} autoComplete="street-address" />
        </Field>

        <div className="space-y-2">
          <Checkbox
            id="offersPickup"
            checked={offersPickup}
            onChange={(event) => setOffersPickup(event.target.checked)}
            label={copy.apply.fields.offersPickup}
          />
          <Checkbox
            id="offersDelivery"
            checked={offersDelivery}
            onChange={(event) => setOffersDelivery(event.target.checked)}
            label={copy.apply.fields.offersDelivery}
          />
          <FieldError>{errors.offersPickup}</FieldError>
        </div>

        {offersDelivery ? (
          <Field
            id="deliveryAreaText"
            label={copy.apply.fields.deliveryAreaText}
            hint={copy.apply.fields.deliveryAreaHint}
            error={errors.deliveryAreaText}
          >
            <Textarea name="deliveryAreaText" maxLength={400} rows={2} />
          </Field>
        ) : null}
      </Section>

      <Section title={copy.apply.sectionOrders}>
        <fieldset>
          <legend className="text-sm font-medium text-ink-800">
            {copy.apply.fields.orderChannels}
          </legend>
          <div className="mt-2 space-y-2">
            {CHANNELS.map((channel) => (
              <Checkbox
                key={channel.value}
                id={`canal-${channel.value}`}
                checked={channels.includes(channel.value)}
                onChange={() => toggleChannel(channel.value)}
                label={channel.label}
              />
            ))}
          </div>
          <FieldError>{errors.orderChannels}</FieldError>
        </fieldset>

        {channels.includes("WEBSITE") ? (
          <Field id="websiteUrl" label={copy.apply.fields.websiteUrl} error={errors.websiteUrl}>
            <Input name="websiteUrl" type="url" placeholder="https://" />
          </Field>
        ) : null}

        <Field id="logoUrl" label={copy.apply.fields.logoUrl} error={errors.logoUrl}>
          <Input name="logoUrl" type="url" placeholder="https://" />
        </Field>
        <Field id="coverUrl" label={copy.apply.fields.coverUrl} error={errors.coverUrl}>
          <Input name="coverUrl" type="url" placeholder="https://" />
        </Field>
      </Section>

      <Section title={copy.apply.sectionHours} hint={copy.apply.fields.hoursHint}>
        <div className="space-y-3">
          {copy.hours.days.map((dayLabel, day) => (
            <div key={day} className="rounded-lg border border-ink-200 bg-white p-3">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm font-medium text-ink-800">{dayLabel}</span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() =>
                    setHours((current) => ({
                      ...current,
                      [day]: [...current[day], { opensAt: "09:00", closesAt: "18:00" }],
                    }))
                  }
                >
                  <Plus aria-hidden="true" />
                  {copy.apply.fields.addRange}
                </Button>
              </div>

              {hours[day].length === 0 ? (
                <p className="mt-1 text-xs text-ink-500">{copy.hours.closedToday}</p>
              ) : (
                <div className="mt-2 space-y-2">
                  {hours[day].map((range, index) => (
                    <div key={index} className="flex items-end gap-2">
                      <div className="flex-1">
                        <Label htmlFor={`abre-${day}-${index}`} className="text-xs">
                          {copy.apply.fields.opensAt}
                        </Label>
                        <Input
                          id={`abre-${day}-${index}`}
                          type="time"
                          value={range.opensAt}
                          onChange={(event) =>
                            updateRange(day, index, { opensAt: event.target.value })
                          }
                          className="mt-1"
                        />
                      </div>
                      <div className="flex-1">
                        <Label htmlFor={`cierra-${day}-${index}`} className="text-xs">
                          {copy.apply.fields.closesAt}
                        </Label>
                        <Input
                          id={`cierra-${day}-${index}`}
                          type="time"
                          value={range.closesAt}
                          onChange={(event) =>
                            updateRange(day, index, { closesAt: event.target.value })
                          }
                          className="mt-1"
                        />
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        aria-label={`${copy.apply.fields.removeRange} ${dayLabel}`}
                        onClick={() =>
                          setHours((current) => ({
                            ...current,
                            [day]: current[day].filter((_, i) => i !== index),
                          }))
                        }
                      >
                        <Trash2 aria-hidden="true" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
      </Section>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <Alert>{copy.apply.supervisionNote}</Alert>
          <Checkbox
            id="consent"
            checked={consent}
            onChange={(event) => setConsent(event.target.checked)}
            label={copy.apply.consent}
          />
          <FieldError>{errors.consent}</FieldError>
          <Button type="submit" size="lg" block disabled={isPending}>
            {isPending ? copy.apply.submitting : copy.apply.submit}
          </Button>
        </CardContent>
      </Card>
    </form>
  );
}

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold text-ink-900">{title}</h2>
        {hint ? <p className="mt-1 text-sm text-ink-500">{hint}</p> : null}
      </div>
      {children}
    </section>
  );
}
