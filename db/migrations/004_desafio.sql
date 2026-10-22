-- Desafío: dos grupos que se enfrentan (p. ej. 6 contra 6). Cada uno con nombre
-- y color (color_1/color_2), y los jugadores se anotan directamente en el suyo
-- (inscripciones.equipo). El capitán del grupo 2 lo gestiona con un link propio:
-- aquí solo el hash de su código.
ALTER TABLE pachangas
  ADD COLUMN tipo text NOT NULL DEFAULT 'abierta' CHECK (tipo IN ('abierta', 'desafio')),
  ADD COLUMN nombre_1 text CHECK (length(nombre_1) BETWEEN 2 AND 30),
  ADD COLUMN nombre_2 text CHECK (length(nombre_2) BETWEEN 2 AND 30),
  ADD COLUMN capitan_hash text;
