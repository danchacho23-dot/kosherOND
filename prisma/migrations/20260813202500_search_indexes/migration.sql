-- Índice de búsqueda full-text sobre el texto ya normalizado (minúsculas, sin
-- acentos). Se usa la configuración `simple` a propósito: el stemming en
-- español agrupa mal los nombres propios de comercios, y como el texto ya viene
-- sin acentos no hace falta la extensión `unaccent`.
CREATE INDEX IF NOT EXISTS "Merchant_searchText_fts_idx"
  ON "Merchant" USING GIN (to_tsvector('simple', "searchText"));

-- Respaldo para la búsqueda por subcadena (`LIKE '%term%'`), que el índice GIN
-- de arriba no cubre. Requiere pg_trgm.
CREATE EXTENSION IF NOT EXISTS pg_trgm;

CREATE INDEX IF NOT EXISTS "Merchant_searchText_trgm_idx"
  ON "Merchant" USING GIN ("searchText" gin_trgm_ops);
