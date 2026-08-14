import type { Metadata } from "next";
import { Alert } from "@/components/ui/primitives";
import { copy } from "@/lib/copy";

export const metadata: Metadata = {
  title: copy.legal.privacyTitle,
  robots: { index: false, follow: true },
};

export default function PrivacyPage() {
  return (
    <div className="container-page max-w-2xl py-10">
      <h1 className="text-2xl font-semibold tracking-tight text-ink-900">
        {copy.legal.privacyTitle}
      </h1>

      <div className="mt-4">
        <Alert variant="warning" title="Borrador">
          {copy.legal.draftNotice}
        </Alert>
      </div>

      <div className="mt-8 space-y-6 text-[0.95rem] leading-relaxed text-ink-700">
        <section>
          <h2 className="text-lg font-semibold text-ink-900">Navegación sin cuenta</h2>
          <p className="mt-2">
            No hace falta crear una cuenta para usar el directorio y no la ofrecemos. No
            guardamos tu nombre, tu email ni tu teléfono por navegar el sitio.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">Qué medimos</h2>
          <p className="mt-2">
            Registramos eventos agregados y sin datos personales: cuántas veces se vio la
            home, qué se buscó, qué filtros se usaron, qué comercios se vieron y cuántos
            clicks salieron hacia WhatsApp o hacia el sitio de un comercio. No guardamos tu
            dirección IP ni tu user agent junto a esos eventos, y no usamos cookies de
            seguimiento ni analítica de terceros.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">Solicitudes de comercios</h2>
          <p className="mt-2">
            Si completás el formulario para sumar un comercio, guardamos los datos que
            enviaste para poder evaluarlos y publicarlos. Para frenar abuso guardamos
            además un identificador derivado de tu conexión mediante un hash con sal: no
            permite reconstruir la IP ni identificarte.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">Avisos de Shabat</h2>
          <p className="mt-2">
            Si activás los avisos de cierre por Shabat, guardamos la suscripción de
            notificaciones que crea tu navegador: una dirección técnica del servicio de push
            y las claves para cifrar el mensaje. Es el único identificador persistente que
            guardamos de un visitante, y existe solo porque sin él no hay forma de mandarte
            un aviso. No está asociado a ninguna cuenta, no lo cruzamos con las métricas y no
            lo compartimos con nadie.
          </p>
          <p className="mt-2">
            Se borra apenas desactivás los avisos, y también solo si tu navegador da de baja
            la suscripción. Los únicos mensajes que mandamos son el aviso de cierre por
            Shabat y por jaguim. No mandamos promociones.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">Documentos de certificación</h2>
          <p className="mt-2">
            Los documentos de supervisión kosher se guardan en almacenamiento privado y no
            son accesibles públicamente. Solo los ve el equipo de administración.
          </p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-ink-900">Salidas hacia terceros</h2>
          <p className="mt-2">
            Cuando seguís un pedido por WhatsApp o hacia el sitio de un comercio, salís de
            KosherOnDemand. Lo que pase ahí se rige por las políticas de ese tercero.
          </p>
        </section>
      </div>
    </div>
  );
}
