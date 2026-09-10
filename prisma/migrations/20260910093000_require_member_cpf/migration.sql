-- CPF is normalized to digits before it becomes mandatory.
UPDATE "Member" SET "cpf" = regexp_replace("cpf", '\D', '', 'g') WHERE "cpf" IS NOT NULL;

ALTER TABLE "Member" ALTER COLUMN "cpf" SET NOT NULL;
