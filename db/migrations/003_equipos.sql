-- Equipos: el organizador elige el color de camiseta de cada uno y reparte a los
-- titulares. Sin equipos todavía: colores e inscripciones.equipo en NULL.
ALTER TABLE pachangas
  ADD COLUMN color_1 text,
  ADD COLUMN color_2 text,
  ADD CONSTRAINT pachangas_colores CHECK (
    (color_1 IS NULL AND color_2 IS NULL)
    OR (color_1 IN ('negro', 'blanco', 'rojo', 'azul')
        AND color_2 IN ('negro', 'blanco', 'rojo', 'azul')
        AND color_1 <> color_2)
  );

ALTER TABLE inscripciones ADD COLUMN equipo smallint CHECK (equipo IN (1, 2));
