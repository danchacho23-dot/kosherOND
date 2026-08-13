import type { Metadata } from "next";
import { Alert } from "@/components/ui/primitives";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.legal.termsTitle,
  robots: { index: false, follow: true },
};

export default function TermsPage() {
  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
        {copy.legal.termsTitle}
      </h1>

      <div className="mt-4">
        <Alert variant="warning" title="Borrador">
          {copy.legal.draftNotice}
        </Alert>
      </div>

      <div className="mt-8 space-y-6 text-[0.95rem] leading-relaxed text-ink-700">
        <section>
          <h2 className="text-lg font-semibold text-ink-900">Qué es este servicio</h2>
          <p className="mt-2">
            KosherOnDemand es un directorio informativo de comercios kosher en Panamá. No
            vendemos productos, no procesamos pagos, no entregamos pedidos y no somos parte
            de la relación comercial entre vos y el comercio.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">Información de los comercios</h2>
          <p className="mt-2">
            Los datos publicados —horarios, direcciones, precios, zonas de entrega— los
            provee cada comercio. Hacemos un esfuerzo razonable por mantenerlos al día, pero
            no garantizamos que sean exactos ni que estén actualizados. Confirmá siempre con
            el comercio antes de hacer un pedido.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">Supervisión kosher</h2>
          <p className="mt-2">
            Cuando una página muestra información de supervisión kosher, es porque
            verificamos documentación provista por el comercio en la fecha indicada. Esa
            verificación es administrativa: no constituye una certificación propia ni un
            aval rabínico. Si no aparece nada sobre supervisión, es porque no tenemos
            verificación —no inferimos nada en ninguna dirección.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">Pedidos y pagos</h2>
          <p className="mt-2">
            Todo pedido y todo pago se hacen directamente con el comercio, fuera de esta
            plataforma. Reclamos, devoluciones y garantías corren por cuenta del comercio.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">Contacto</h2>
          <p className="mt-2">
            Para correcciones, bajas o consultas sobre estos términos, escribinos.
          </p>
        </section>
      </div>
    </div>
  );
}
