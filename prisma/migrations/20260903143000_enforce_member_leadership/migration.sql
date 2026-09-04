CREATE OR REPLACE FUNCTION enforce_member_leadership_rules()
RETURNS trigger AS $$
DECLARE
  position_role "PositionRole";
BEGIN
  IF NEW.status <> 'ACTIVE' OR NEW."positionId" IS NULL THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW."organizationId"));

  SELECT role INTO position_role
  FROM "Position"
  WHERE id = NEW."positionId" AND "organizationId" = NEW."organizationId";

  IF position_role = 'DIRECTOR' AND NEW."directorateId" IS NULL THEN
    RAISE EXCEPTION 'ACTIVE_DIRECTOR_REQUIRES_DIRECTORATE' USING ERRCODE = '23514';
  END IF;

  IF position_role IN ('PRESIDENT', 'VICE_PRESIDENT') AND EXISTS (
    SELECT 1 FROM "Member" m
    JOIN "Position" p ON p.id = m.positionId
    WHERE m."organizationId" = NEW."organizationId"
      AND m.status = 'ACTIVE'
      AND p.role = position_role
      AND m.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'ACTIVE_LEADERSHIP_CONFLICT' USING ERRCODE = '23505';
  END IF;

  IF position_role = 'DIRECTOR' AND EXISTS (
    SELECT 1 FROM "Member" m
    JOIN "Position" p ON p.id = m.positionId
    WHERE m."organizationId" = NEW."organizationId"
      AND m.status = 'ACTIVE'
      AND p.role = 'DIRECTOR'
      AND m."directorateId" = NEW."directorateId"
      AND m.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'ACTIVE_DIRECTOR_CONFLICT' USING ERRCODE = '23505';
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_member_leadership_before_write
BEFORE INSERT OR UPDATE OF status, "positionId", "directorateId", "organizationId"
ON "Member"
FOR EACH ROW EXECUTE FUNCTION enforce_member_leadership_rules();

CREATE OR REPLACE FUNCTION enforce_position_leadership_rules()
RETURNS trigger AS $$
DECLARE
  assigned_active integer;
  other_active integer;
BEGIN
  IF NEW.role NOT IN ('PRESIDENT', 'VICE_PRESIDENT', 'DIRECTOR') THEN
    RETURN NEW;
  END IF;

  PERFORM pg_advisory_xact_lock(hashtext(NEW."organizationId"));

  SELECT count(*) INTO assigned_active
  FROM "Member"
  WHERE "positionId" = NEW.id AND status = 'ACTIVE';

  IF NEW.role IN ('PRESIDENT', 'VICE_PRESIDENT') THEN
    SELECT count(*) INTO other_active
    FROM "Member" m JOIN "Position" p ON p.id = m."positionId"
    WHERE m."organizationId" = NEW."organizationId"
      AND m.status = 'ACTIVE' AND p.role = NEW.role AND p.id <> NEW.id;

    IF assigned_active + other_active > 1 THEN
      RAISE EXCEPTION 'ACTIVE_LEADERSHIP_CONFLICT' USING ERRCODE = '23505';
    END IF;
  ELSE
    IF EXISTS (
      SELECT 1 FROM "Member" m
      WHERE m."positionId" = NEW.id AND m.status = 'ACTIVE' AND m."directorateId" IS NULL
    ) OR EXISTS (
      SELECT m."directorateId"
      FROM "Member" m
      JOIN "Position" p ON p.id = m."positionId"
      WHERE m."organizationId" = NEW."organizationId" AND m.status = 'ACTIVE'
        AND (p.role = 'DIRECTOR' OR p.id = NEW.id)
      GROUP BY m."directorateId" HAVING count(*) > 1
    ) THEN
      RAISE EXCEPTION 'ACTIVE_DIRECTOR_CONFLICT' USING ERRCODE = '23505';
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER enforce_position_leadership_before_write
BEFORE UPDATE OF role, "organizationId" ON "Position"
FOR EACH ROW EXECUTE FUNCTION enforce_position_leadership_rules();
