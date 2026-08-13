import { describe, expect, it } from "vitest";
import {
  buildWeeklySchedule,
  computeOpenState,
  describeInstant,
  type WeeklyRange,
} from "@/lib/hours/engine";
import { computeReligiousClosures } from "@/lib/hours/hebrew-calendar";
import {
  formatZonedTime,
  getZonedParts,
  zonedWallTimeToUtc,
} from "@/lib/hours/timezone";

/**
 * Todas las horas están verificadas contra el calendario real de Ciudad de
 * Panamá (8.98 N, 79.52 O, America/Panama, sin horario de verano).
 *
 * Si la app dice "abierto" un sábado a las 11am, la comunidad deja de confiar
 * y no vuelve. Estos tests son el seguro contra eso.
 */

const TZ = "America/Panama";

/** Instante a partir de hora de pared panameña. */
function panama(
  year: number,
  month: number,
  day: number,
  hour: number,
  minute = 0,
): Date {
  return zonedWallTimeToUtc(year, month, day, hour * 60 + minute, TZ);
}

/** Lunes a domingo, 08:00–18:00 todos los días. Incluye sábado a propósito:
 *  queremos ver que el motor lo cierra igual. */
const EVERY_DAY_8_TO_18: WeeklyRange[] = Array.from({ length: 7 }, (_, day) => ({
  dayOfWeek: day,
  opensAt: 8 * 60,
  closesAt: 18 * 60,
}));

const BASE = {
  timezone: TZ,
  weeklyHours: EVERY_DAY_8_TO_18,
  observesShabbat: true,
  shabbatCloseOffsetMinutes: 90,
  havdalahReopenOffsetMinutes: 60,
};

describe("zona horaria", () => {
  it("convierte hora de pared panameña a UTC (UTC−5 fijo)", () => {
    expect(panama(2026, 9, 4, 18, 6).toISOString()).toBe("2026-09-04T23:06:00.000Z");
  });

  it("lee las partes locales de un instante UTC", () => {
    const parts = getZonedParts(new Date("2026-09-05T23:55:00Z"), TZ);
    expect(parts).toMatchObject({ year: 2026, month: 9, day: 5, hour: 18, minute: 55 });
    expect(parts.weekday).toBe(6); // sábado
  });

  it("no aplica horario de verano en Panamá", () => {
    // Mismo desfase en enero y en julio.
    expect(formatZonedTime(new Date("2026-01-15T17:00:00Z"), TZ)).toBe("12:00");
    expect(formatZonedTime(new Date("2026-07-15T17:00:00Z"), TZ)).toBe("12:00");
  });
});

describe("intervalos de cierre religioso", () => {
  it("empareja encendido de velas con la havdalá siguiente", () => {
    const closures = computeReligiousClosures(
      new Date("2026-09-01T00:00:00Z"),
      new Date("2026-09-08T00:00:00Z"),
    );
    expect(closures).toHaveLength(1);
    expect(closures[0].candleLighting.toISOString()).toBe("2026-09-04T23:06:00.000Z");
    expect(closures[0].havdalah.toISOString()).toBe("2026-09-05T23:55:00.000Z");
    expect(closures[0].holidayName).toBeNull();
    expect(closures[0].label).toBe("Shabat");
  });

  it("fusiona un jag de dos días en un solo intervalo continuo", () => {
    // Rosh Hashaná 5787 arranca el viernes 11/09/2026 y termina el domingo 13.
    // Son ~48h corridas: el comercio no reabre el sábado a la noche.
    const closures = computeReligiousClosures(
      new Date("2026-09-10T00:00:00Z"),
      new Date("2026-09-15T00:00:00Z"),
    );
    expect(closures).toHaveLength(1);
    expect(closures[0].candleLighting.toISOString()).toBe("2026-09-11T23:02:00.000Z");
    expect(closures[0].havdalah.toISOString()).toBe("2026-09-13T23:51:00.000Z");
    expect(closures[0].holidayName).toBe("Rosh Hashaná");
  });

  it("fusiona Shabat pegado a jag (Sucot 2026)", () => {
    const closures = computeReligiousClosures(
      new Date("2026-09-24T00:00:00Z"),
      new Date("2026-09-29T00:00:00Z"),
    );
    expect(closures).toHaveLength(1);
    expect(closures[0].candleLighting.toISOString()).toBe("2026-09-25T22:54:00.000Z");
    expect(closures[0].havdalah.toISOString()).toBe("2026-09-27T23:42:00.000Z");
    expect(closures[0].holidayName).toContain("Sucot");
  });

  it("no genera cierres por Janucá", () => {
    // 08/12/2026 es martes, quinta vela. Día hábil normal.
    const closures = computeReligiousClosures(
      new Date("2026-12-07T00:00:00Z"),
      new Date("2026-12-10T00:00:00Z"),
    );
    expect(closures).toHaveLength(0);
  });
});

describe("abierto / cerrado", () => {
  it("está abierto un miércoles a media mañana", () => {
    const state = computeOpenState(BASE, panama(2026, 9, 2, 10, 0));
    expect(state.isOpen).toBe(true);
    expect(formatZonedTime(state.closesAt!, TZ)).toBe("18:00");
  });

  it("está cerrado el sábado a las 11 de la mañana", () => {
    // El test que define la reputación del producto.
    const state = computeOpenState(BASE, panama(2026, 9, 5, 11, 0));
    expect(state.isOpen).toBe(false);
    expect(state.closedReason).toBe("SHABBAT");
    expect(state.shortLabel).toBe("Cerrado por Shabat");
  });

  it("cierra el viernes antes del encendido de velas, con el offset del comercio", () => {
    // Velas 18:06, offset 90 min → última hora abierta 16:36.
    const open = computeOpenState(BASE, panama(2026, 9, 4, 16, 0));
    expect(open.isOpen).toBe(true);
    expect(formatZonedTime(open.closesAt!, TZ)).toBe("16:36");

    const closed = computeOpenState(BASE, panama(2026, 9, 4, 17, 0));
    expect(closed.isOpen).toBe(false);
    expect(closed.closedReason).toBe("SHABBAT");
  });

  it("respeta un offset de cierre distinto por comercio", () => {
    const state = computeOpenState(
      { ...BASE, shabbatCloseOffsetMinutes: 240 },
      panama(2026, 9, 4, 15, 0),
    );
    expect(state.isOpen).toBe(false);
    expect(state.closedReason).toBe("SHABBAT");
  });

  it("reabre después de havdalá más el offset", () => {
    const hours: WeeklyRange[] = [
      ...EVERY_DAY_8_TO_18,
      { dayOfWeek: 6, opensAt: 19 * 60, closesAt: 23 * 60 }, // sábado a la noche
    ];
    // Havdalá 18:55 + 60 min → reabre 19:55.
    const before = computeOpenState({ ...BASE, weeklyHours: hours }, panama(2026, 9, 5, 19, 30));
    expect(before.isOpen).toBe(false);

    const after = computeOpenState({ ...BASE, weeklyHours: hours }, panama(2026, 9, 5, 20, 30));
    expect(after.isOpen).toBe(true);
  });

  it("sigue cerrado el domingo durante el segundo día de Rosh Hashaná", () => {
    const state = computeOpenState(BASE, panama(2026, 9, 13, 12, 0));
    expect(state.isOpen).toBe(false);
    expect(state.closedReason).toBe("HOLIDAY");
    expect(state.closedLabel).toBe("Rosh Hashaná");
    // Havdalá 18:51 del domingo + 60 min → no reabre hasta el lunes a las 08:00.
    expect(state.opensAt!.toISOString()).toBe(panama(2026, 9, 14, 8, 0).toISOString());
  });

  it("está abierto en jol hamoed", () => {
    // Lunes 28/09/2026, Sucot III (jol hamoed). Día laborable.
    const state = computeOpenState(BASE, panama(2026, 9, 28, 10, 0));
    expect(state.isOpen).toBe(true);
  });

  it("está abierto durante Janucá", () => {
    const state = computeOpenState(BASE, panama(2026, 12, 8, 10, 0));
    expect(state.isOpen).toBe(true);
  });

  it("no cierra por Shabat si el comercio no lo observa", () => {
    const state = computeOpenState(
      { ...BASE, observesShabbat: false },
      panama(2026, 9, 5, 11, 0),
    );
    expect(state.isOpen).toBe(true);
  });
});

describe("horario semanal", () => {
  it("está cerrado fuera de horario, en un día en que sí abre", () => {
    const state = computeOpenState(BASE, panama(2026, 9, 2, 6, 0));
    expect(state.isOpen).toBe(false);
    expect(state.closedReason).toBe("OUTSIDE_HOURS");
    expect(formatZonedTime(state.opensAt!, TZ)).toBe("08:00");
  });

  it("está cerrado un día sin horario cargado", () => {
    const state = computeOpenState(
      { ...BASE, weeklyHours: [{ dayOfWeek: 1, opensAt: 480, closesAt: 1080 }] },
      panama(2026, 9, 2, 10, 0), // miércoles
    );
    expect(state.isOpen).toBe(false);
    expect(state.closedReason).toBe("OUTSIDE_HOURS");
    expect(state.opensAt!.toISOString()).toBe(panama(2026, 9, 7, 8, 0).toISOString());
  });

  it("soporta turnos partidos", () => {
    const hours: WeeklyRange[] = [
      { dayOfWeek: 3, opensAt: 8 * 60, closesAt: 13 * 60 },
      { dayOfWeek: 3, opensAt: 16 * 60, closesAt: 20 * 60 },
    ];
    const siesta = computeOpenState({ ...BASE, weeklyHours: hours }, panama(2026, 9, 2, 14, 0));
    expect(siesta.isOpen).toBe(false);
    expect(formatZonedTime(siesta.opensAt!, TZ)).toBe("16:00");

    const tarde = computeOpenState({ ...BASE, weeklyHours: hours }, panama(2026, 9, 2, 17, 0));
    expect(tarde.isOpen).toBe(true);
  });

  it("soporta horarios que cruzan la medianoche", () => {
    const hours: WeeklyRange[] = [
      { dayOfWeek: 3, opensAt: 20 * 60, closesAt: 2 * 60 }, // miércoles 20:00 → jueves 02:00
    ];
    const state = computeOpenState(
      { ...BASE, weeklyHours: hours },
      panama(2026, 9, 3, 1, 0), // jueves 01:00
    );
    expect(state.isOpen).toBe(true);
  });

  it("informa cuando el comercio no cargó horarios", () => {
    const state = computeOpenState({ ...BASE, weeklyHours: [] }, panama(2026, 9, 2, 10, 0));
    expect(state.isOpen).toBe(false);
    expect(state.closedReason).toBe("NO_SCHEDULE");
    expect(state.opensAt).toBeNull();
  });
});

describe("cierres puntuales", () => {
  it("cierra por un cierre cargado a mano", () => {
    const state = computeOpenState(
      {
        ...BASE,
        closures: [
          {
            startsAt: panama(2026, 9, 1, 0, 0),
            endsAt: panama(2026, 9, 10, 0, 0),
            reason: "Vacaciones",
          },
        ],
      },
      panama(2026, 9, 2, 10, 0),
    );
    expect(state.isOpen).toBe(false);
    expect(state.closedReason).toBe("MANUAL_CLOSURE");
    expect(state.closedLabel).toBe("Vacaciones");
    expect(state.opensAt!.toISOString()).toBe(panama(2026, 9, 10, 8, 0).toISOString());
  });

  it("ignora un cierre que ya terminó", () => {
    const state = computeOpenState(
      {
        ...BASE,
        closures: [
          { startsAt: panama(2026, 8, 1, 0, 0), endsAt: panama(2026, 8, 15, 0, 0) },
        ],
      },
      panama(2026, 9, 2, 10, 0),
    );
    expect(state.isOpen).toBe(true);
  });
});

describe("frases de estado", () => {
  it("dice hoy, mañana o el día de la semana", () => {
    const reference = panama(2026, 9, 2, 6, 0); // miércoles
    expect(describeInstant(panama(2026, 9, 2, 8, 0), reference, TZ)).toBe(
      "hoy a las 08:00",
    );
    expect(describeInstant(panama(2026, 9, 3, 8, 0), reference, TZ)).toBe(
      "mañana a las 08:00",
    );
    expect(describeInstant(panama(2026, 9, 7, 8, 0), reference, TZ)).toBe(
      "el lunes a las 08:00",
    );
    expect(describeInstant(panama(2026, 9, 20, 8, 0), reference, TZ)).toBe(
      "el 20 de septiembre a las 08:00",
    );
  });

  it("arma la semana empezando por hoy", () => {
    const schedule = buildWeeklySchedule(
      EVERY_DAY_8_TO_18,
      panama(2026, 9, 2, 10, 0), // miércoles
      TZ,
    );
    expect(schedule[0].dayLabel).toBe("Miércoles");
    expect(schedule[0].isToday).toBe(true);
    expect(schedule).toHaveLength(7);
    expect(schedule[0].ranges).toEqual([{ opensAt: "08:00", closesAt: "18:00" }]);
  });
});
