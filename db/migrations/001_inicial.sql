-- Organizadores: entran con su cuenta de Google. Los jugadores no tienen cuenta.
CREATE TABLE usuarios (
  id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  google_sub  text NOT NULL UNIQUE,
  email       text NOT NULL,
  nombre      text NOT NULL,
  creado_en   timestamptz NOT NULL DEFAULT now()
);

-- Sesión del organizador: en la cookie va el token; aquí solo su hash.
CREATE TABLE sesiones (
  token_hash  text PRIMARY KEY,
  usuario_id  bigint NOT NULL REFERENCES usuarios ON DELETE CASCADE,
  vence_en    timestamptz NOT NULL
);
CREATE INDEX sesiones_usuario ON sesiones (usuario_id);

CREATE TABLE pachangas (
  id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  -- Va en el link público que se comparte por WhatsApp; al azar, no adivinable.
  codigo          text NOT NULL UNIQUE,
  organizador_id  bigint NOT NULL REFERENCES usuarios ON DELETE CASCADE,
  deporte         text NOT NULL CHECK (length(deporte) BETWEEN 2 AND 40),
  cupo            int NOT NULL CHECK (cupo BETWEEN 2 AND 30),
  empieza_en      timestamptz NOT NULL,
  lugar           text NOT NULL CHECK (length(lugar) BETWEEN 2 AND 120),
  creada_en       timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX pachangas_organizador ON pachangas (organizador_id, empieza_en DESC);

-- Quien se anota desde el link: solo un nombre. Los que entran después de
-- llenarse el cupo quedan como suplentes (orden de llegada).
CREATE TABLE inscripciones (
  id           bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  pachanga_id  bigint NOT NULL REFERENCES pachangas ON DELETE CASCADE,
  nombre       text NOT NULL CHECK (length(nombre) BETWEEN 2 AND 40),
  creada_en    timestamptz NOT NULL DEFAULT now()
);
-- El mismo nombre no se anota dos veces en la misma pachanga (sin distinguir mayúsculas).
CREATE UNIQUE INDEX inscripciones_nombre ON inscripciones (pachanga_id, lower(nombre));
CREATE INDEX inscripciones_orden ON inscripciones (pachanga_id, creada_en, id);
