ALTER TYPE "MemberStatus" ADD VALUE 'POS_JR';
ALTER TABLE "Member" ADD COLUMN "membershipHistory" JSONB NOT NULL DEFAULT '[]';
ALTER TABLE "Position" ADD COLUMN "directorateId" TEXT;
CREATE INDEX "Position_directorateId_idx" ON "Position"("directorateId");
ALTER TABLE "Position" ADD CONSTRAINT "Position_directorateId_fkey"
  FOREIGN KEY ("directorateId") REFERENCES "Directorate"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- Snapshot names and role so history survives later renames/deletions of positions.
CREATE FUNCTION preserve_member_departure() RETURNS trigger AS $$
DECLARE
  linked_directorate text;
BEGIN
  IF TG_OP = 'UPDATE' THEN
    NEW."membershipHistory" := OLD."membershipHistory";
    IF NEW.status::text = 'POS_JR' AND OLD.status::text <> 'POS_JR' THEN
      NEW."exitDate" := COALESCE(NEW."exitDate", CURRENT_TIMESTAMP);
      NEW."membershipHistory" := OLD."membershipHistory" || jsonb_build_array(jsonb_build_object(
        'directorateId', OLD."directorateId",
        'directorateName', (SELECT name FROM "Directorate" WHERE id = OLD."directorateId"),
        'positionId', OLD."positionId",
        'positionName', (SELECT name FROM "Position" WHERE id = OLD."positionId"),
        'positionRole', (SELECT role::text FROM "Position" WHERE id = OLD."positionId"),
        'entryDate', OLD."entryDate", 'exitDate', NEW."exitDate", 'recordedAt', CURRENT_TIMESTAMP
      ));
    END IF;
  END IF;
  IF NEW.status::text = 'POS_JR' THEN
    NEW."positionId" := NULL;
    NEW."directorateId" := NULL;
  END IF;
  IF NEW."directorateId" IS NOT NULL AND NOT EXISTS (
    SELECT 1 FROM "Directorate" WHERE id = NEW."directorateId" AND "organizationId" = NEW."organizationId"
  ) THEN
    RAISE EXCEPTION 'INVALID_MEMBER_DIRECTORATE' USING ERRCODE = '23514';
  END IF;
  IF NEW."positionId" IS NOT NULL THEN
    SELECT "directorateId" INTO linked_directorate FROM "Position"
      WHERE id = NEW."positionId" AND "organizationId" = NEW."organizationId" FOR SHARE;
    IF NOT FOUND OR (linked_directorate IS NOT NULL AND linked_directorate IS DISTINCT FROM NEW."directorateId") THEN
      RAISE EXCEPTION 'INVALID_MEMBER_POSITION' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Runs before the existing leadership trigger, freeing positions atomically.
CREATE TRIGGER a_member_departure_before_write BEFORE INSERT OR UPDATE ON "Member"
  FOR EACH ROW EXECUTE FUNCTION preserve_member_departure();

CREATE FUNCTION enforce_position_directorate() RETURNS trigger AS $$
BEGIN
  IF NEW."directorateId" IS NOT NULL THEN
    IF NOT EXISTS (SELECT 1 FROM "Directorate" WHERE id = NEW."directorateId" AND "organizationId" = NEW."organizationId") THEN
      RAISE EXCEPTION 'INVALID_POSITION_DIRECTORATE' USING ERRCODE = '23514';
    END IF;
    IF EXISTS (SELECT 1 FROM "Member" WHERE "positionId" = NEW.id AND "directorateId" IS DISTINCT FROM NEW."directorateId") THEN
      RAISE EXCEPTION 'POSITION_HAS_INCOMPATIBLE_MEMBERS' USING ERRCODE = '23514';
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;
CREATE TRIGGER position_directorate_before_write BEFORE INSERT OR UPDATE OF "directorateId", "organizationId" ON "Position"
  FOR EACH ROW EXECUTE FUNCTION enforce_position_directorate();

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
    JOIN "Position" p ON p.id = m."positionId"
    WHERE m."organizationId" = NEW."organizationId"
      AND m.status = 'ACTIVE'
      AND p.role = position_role
      AND m.id <> NEW.id
  ) THEN
    RAISE EXCEPTION 'ACTIVE_LEADERSHIP_CONFLICT' USING ERRCODE = '23505';
  END IF;

  IF position_role = 'DIRECTOR' AND EXISTS (
    SELECT 1 FROM "Member" m
    JOIN "Position" p ON p.id = m."positionId"
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

