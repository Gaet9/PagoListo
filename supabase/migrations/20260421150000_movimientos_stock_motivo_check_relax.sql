-- El CHECK histórico `movimientos_stock_motivo_check` suele listar códigos viejos
-- (p. ej. ingreso/egreso o valores en inglés) y rechaza valores nuevos que
-- usan los triggers actuales. Se reemplaza por una regla mínima: texto no vacío.

ALTER TABLE public.movimientos_stock
  DROP CONSTRAINT IF EXISTS movimientos_stock_motivo_check;

ALTER TABLE public.movimientos_stock
  ADD CONSTRAINT movimientos_stock_motivo_check
  CHECK (
    char_length(trim(motivo)) >= 1
    AND char_length(motivo) <= 200
  );
