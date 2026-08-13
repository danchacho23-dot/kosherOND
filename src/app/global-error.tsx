"use client";

export default function GlobalError({ reset }: { error: Error; reset: () => void }) {
  return (
    <html lang="es-PA">
      <body
        style={{
          fontFamily: "system-ui, sans-serif",
          display: "grid",
          placeItems: "center",
          minHeight: "100dvh",
          margin: 0,
          padding: "1.5rem",
          background: "#faf9f7",
          color: "#1a1713",
        }}
      >
        <div style={{ maxWidth: "24rem", textAlign: "center" }}>
          <h1 style={{ fontSize: "1.125rem", margin: 0 }}>Algo salió mal</h1>
          <p style={{ color: "#5c5549", marginTop: "0.5rem" }}>
            Intentá de nuevo en un momento.
          </p>
          <button
            onClick={reset}
            style={{
              marginTop: "1rem",
              padding: "0.625rem 1rem",
              borderRadius: "0.5rem",
              border: 0,
              background: "#0f7f68",
              color: "white",
              fontWeight: 600,
            }}
          >
            Reintentar
          </button>
        </div>
      </body>
    </html>
  );
}
