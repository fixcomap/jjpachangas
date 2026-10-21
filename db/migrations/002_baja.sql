-- Quien se anota recibe un código secreto para bajarse (solo lo tiene su
-- dispositivo); aquí, solo su hash. Las inscripciones anteriores no lo tienen:
-- a esas solo las puede sacar el organizador.
ALTER TABLE inscripciones ADD COLUMN baja_hash text;
