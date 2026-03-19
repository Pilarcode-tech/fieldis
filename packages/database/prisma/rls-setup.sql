-- Fieldis RLS (Row Level Security) Setup
-- Ensures tenant isolation at the database level.
-- The application sets "app.current_tenant" via SET LOCAL before each request.

-- Enable RLS on all tenant-scoped tables
ALTER TABLE "User" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Obra" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Employee" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EmployeeAllocation" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Document" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "TimeRecord" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "EpiDelivery" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollPeriod" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "PayrollItem" ENABLE ROW LEVEL SECURITY;
ALTER TABLE "Advance" ENABLE ROW LEVEL SECURITY;

-- Create policies for each table
-- Using COALESCE to handle cases where the setting is not set (returns empty string)
-- DROP POLICY IF EXISTS ensures idempotent execution

DROP POLICY IF EXISTS tenant_isolation ON "User";
CREATE POLICY tenant_isolation ON "User"
  USING ("companyId"::text = COALESCE(current_setting('app.current_tenant', true), ''));

DROP POLICY IF EXISTS tenant_isolation ON "Obra";
CREATE POLICY tenant_isolation ON "Obra"
  USING ("companyId"::text = COALESCE(current_setting('app.current_tenant', true), ''));

DROP POLICY IF EXISTS tenant_isolation ON "Employee";
CREATE POLICY tenant_isolation ON "Employee"
  USING ("companyId"::text = COALESCE(current_setting('app.current_tenant', true), ''));

DROP POLICY IF EXISTS tenant_isolation ON "EmployeeAllocation";
CREATE POLICY tenant_isolation ON "EmployeeAllocation"
  USING ("companyId"::text = COALESCE(current_setting('app.current_tenant', true), ''));

DROP POLICY IF EXISTS tenant_isolation ON "Document";
CREATE POLICY tenant_isolation ON "Document"
  USING ("companyId"::text = COALESCE(current_setting('app.current_tenant', true), ''));

DROP POLICY IF EXISTS tenant_isolation ON "TimeRecord";
CREATE POLICY tenant_isolation ON "TimeRecord"
  USING ("companyId"::text = COALESCE(current_setting('app.current_tenant', true), ''));

DROP POLICY IF EXISTS tenant_isolation ON "EpiDelivery";
CREATE POLICY tenant_isolation ON "EpiDelivery"
  USING ("companyId"::text = COALESCE(current_setting('app.current_tenant', true), ''));

DROP POLICY IF EXISTS tenant_isolation ON "PayrollPeriod";
CREATE POLICY tenant_isolation ON "PayrollPeriod"
  USING ("companyId"::text = COALESCE(current_setting('app.current_tenant', true), ''));

DROP POLICY IF EXISTS tenant_isolation ON "PayrollItem";
CREATE POLICY tenant_isolation ON "PayrollItem"
  USING ("companyId"::text = COALESCE(current_setting('app.current_tenant', true), ''));

DROP POLICY IF EXISTS tenant_isolation ON "Advance";
CREATE POLICY tenant_isolation ON "Advance"
  USING ("companyId"::text = COALESCE(current_setting('app.current_tenant', true), ''));

-- IMPORTANT: The superuser (postgres) bypasses RLS by default.
-- If the application connects as the same user that owns the tables,
-- we need to FORCE RLS on that user too:
ALTER TABLE "User" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Obra" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Employee" FORCE ROW LEVEL SECURITY;
ALTER TABLE "EmployeeAllocation" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Document" FORCE ROW LEVEL SECURITY;
ALTER TABLE "TimeRecord" FORCE ROW LEVEL SECURITY;
ALTER TABLE "EpiDelivery" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PayrollPeriod" FORCE ROW LEVEL SECURITY;
ALTER TABLE "PayrollItem" FORCE ROW LEVEL SECURITY;
ALTER TABLE "Advance" FORCE ROW LEVEL SECURITY;
