import { describe, expect, it } from "vitest";
import {
  alreadyNotified,
  buildReminder,
  describeLead,
  isWithinLeadWindow,
  minutesUntil,
  normalizeLeadMinutes,
  DEFAULT_LEAD_MINUTES,
} from "@/lib/push/reminders";
import { computeReligiousClosures } from "@/lib/hours/hebrew-calendar";
import { zonedWallTimeToUtc } from "@/lib/hours/timezone";

/**
 * El aviso de cierre por Shabat.
 *
 * Un aviso que llega tarde es peor que ninguno: el comercio ya cerró y el
 * cliente perdió el viaje. Estos tests fijan que la ventana se cierra en el
 * encendido de velas, y que nadie recibe dos veces el mismo aviso.
 */

const TZ = "America/Panama";

function panama(year: number, month: number, day: number, hour: number, minute = 0): Date {
  return zonedWallTimeToUtc(year, month, day, hour * 60 + minute, TZ);
}

// Shabat del 4–5 de septiembre de 2026: velas 18:06, havdalá 18:55.
const [shabbat] = computeReligiousClosures(
  new Date("2026-09-01T00:00:00Z"),
  new Date("2026-09-08T00:00:00Z"),
);

// Rosh Hashaná 5787: empieza el viernes 11/09/2026 a las 18:02.
const [roshHashana] = computeReligiousClosures(
  new Date("2026-09-10T00:00:00Z"),
  new Date("2026-09-15T00:00:00Z"),
);

describe("ventana de aviso", () => {
  it("avisa dentro de las dos horas previas al encendido", () => {
    // Velas 18:06 → la ventana de 120 min abre a las 16:06.
    expect(isWithinLeadWindow(shabbat.candleLighting, panama(2026, 9, 4, 17, 0), 120)).toBe(true);
    expect(isWithinLeadWindow(shabbat.candleLighting, panama(2026, 9, 4, 16, 30), 120)).toBe(true);
  });

  it("no avisa antes de que abra la ventana", () => {
    expect(isWithinLeadWindow(shabbat.candleLighting, panama(2026, 9, 4, 15, 0), 120)).toBe(false);
    expect(isWithinLeadWindow(shabbat.candleLighting, panama(2026, 9, 3, 17, 0), 120)).toBe(false);
  });

  it("NO avisa una vez encendidas las velas", () => {
    // El caso que importa: llegar tarde con este aviso no sirve para nada.
    expect(isWithinLeadWindow(shabbat.candleLighting, panama(2026, 9, 4, 18, 30), 120)).toBe(false);
    expect(isWithinLeadWindow(shabbat.candleLighting, panama(2026, 9, 5, 11, 0), 120)).toBe(false);
  });

  it("respeta el anticipo elegido por cada suscripción", () => {
    const at1700 = panama(2026, 9, 4, 17, 0);
    // Con 30 min de anticipo, a las 17:00 todavía es temprano.
    expect(isWithinLeadWindow(shabbat.candleLighting, at1700, 30)).toBe(false);
    // Con 6 horas, a las 17:00 ya corresponde.
    expect(isWithinLeadWindow(shabbat.candleLighting, at1700, 360)).toBe(true);
  });
});

describe("no repetir el mismo aviso", () => {
  it("considera avisado el cierre ya marcado", () => {
    expect(alreadyNotified(shabbat.candleLighting, shabbat.candleLighting)).toBe(true);
  });

  it("no bloquea el cierre siguiente", () => {
    // Avisado el Shabat del 4/09, Rosh Hashaná del 11/09 sigue pendiente.
    expect(alreadyNotified(shabbat.candleLighting, roshHashana.candleLighting)).toBe(false);
  });

  it("trata como no avisado a quien nunca recibió nada", () => {
    expect(alreadyNotified(null, shabbat.candleLighting)).toBe(false);
    expect(alreadyNotified(undefined, shabbat.candleLighting)).toBe(false);
  });
});

describe("anticipo configurado", () => {
  it("acota a un rango razonable", () => {
    expect(normalizeLeadMinutes(5)).toBe(30);
    expect(normalizeLeadMinutes(99999)).toBe(24 * 60);
    expect(normalizeLeadMinutes(90)).toBe(90);
  });

  it("cae al valor por defecto si el dato no sirve", () => {
    expect(normalizeLeadMinutes("hola")).toBe(DEFAULT_LEAD_MINUTES);
    expect(normalizeLeadMinutes(null)).toBe(DEFAULT_LEAD_MINUTES);
    expect(normalizeLeadMinutes(undefined)).toBe(DEFAULT_LEAD_MINUTES);
  });
});

describe("texto del aviso", () => {
  it("nombra a Shabat con la hora del encendido", () => {
    const reminder = buildReminder(shabbat, panama(2026, 9, 4, 16, 30), TZ);
    expect(reminder.title).toBe("Shabat empieza hoy a las 18:06");
    expect(reminder.body).toContain("cierran antes");
    expect(reminder.url).toBe("/directorio?abierto=1");
  });

  it("nombra al jag cuando corresponde", () => {
    const reminder = buildReminder(roshHashana, panama(2026, 9, 11, 16, 30), TZ);
    expect(reminder.title).toBe("Rosh Hashaná empieza hoy a las 18:02");
  });

  it("dice el día si el aviso sale la víspera", () => {
    const reminder = buildReminder(shabbat, panama(2026, 9, 3, 20, 0), TZ);
    expect(reminder.title).toBe("Shabat empieza el viernes a las 18:06");
  });

  it("usa un tag por cierre, para no apilar avisos repetidos", () => {
    const a = buildReminder(shabbat, panama(2026, 9, 4, 16, 30), TZ);
    const b = buildReminder(shabbat, panama(2026, 9, 4, 17, 30), TZ);
    expect(a.tag).toBe(b.tag);
    expect(buildReminder(roshHashana, panama(2026, 9, 11, 16, 0), TZ).tag).not.toBe(a.tag);
  });
});

describe("cuánto falta", () => {
  it("cuenta los minutos hasta el encendido", () => {
    expect(minutesUntil(shabbat.candleLighting, panama(2026, 9, 4, 17, 6))).toBe(60);
    expect(minutesUntil(shabbat.candleLighting, panama(2026, 9, 4, 16, 6))).toBe(120);
  });

  it("lo dice en castellano", () => {
    expect(describeLead(45)).toBe("en 45 minutos");
    expect(describeLead(60)).toBe("en 1 hora");
    expect(describeLead(120)).toBe("en 2 horas");
    expect(describeLead(90)).toBe("en 1 hora y 30 minutos");
  });
});
