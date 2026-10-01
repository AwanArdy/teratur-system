CREATE TABLE IF NOT EXISTS "payroll_stubs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"organization_id" uuid NOT NULL,
	"outlet_id" uuid NOT NULL,
	"staff_id" uuid NOT NULL,
	"period_start" text NOT NULL,
	"period_end" text NOT NULL,
	"base_salary_idr" bigint NOT NULL,
	"bonus_idr" bigint DEFAULT 0 NOT NULL,
	"deductions_idr" bigint DEFAULT 0 NOT NULL,
	"total_net_idr" bigint NOT NULL,
	"notes" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ingredients" ADD COLUMN "last_purchase_unit_cost" numeric(14, 4);--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payroll_stubs" ADD CONSTRAINT "payroll_stubs_organization_id_organizations_id_fk" FOREIGN KEY ("organization_id") REFERENCES "public"."organizations"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payroll_stubs" ADD CONSTRAINT "payroll_stubs_outlet_id_outlets_id_fk" FOREIGN KEY ("outlet_id") REFERENCES "public"."outlets"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "payroll_stubs" ADD CONSTRAINT "payroll_stubs_staff_id_staff_id_fk" FOREIGN KEY ("staff_id") REFERENCES "public"."staff"("id") ON DELETE no action ON UPDATE no action;
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
CREATE INDEX IF NOT EXISTS "payroll_stubs_org_idx" ON "payroll_stubs" USING btree ("organization_id","outlet_id");
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_balances" ADD CONSTRAINT "inv_bal_qty_on_hand_nonneg" CHECK ("qty_on_hand" >= 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_balances" ADD CONSTRAINT "inv_bal_qty_reserved_nonneg" CHECK ("qty_reserved" >= 0);
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
DO $$ BEGIN
 ALTER TABLE "inventory_balances" ADD CONSTRAINT "inv_bal_reserved_lte_onhand" CHECK ("qty_on_hand" >= "qty_reserved");
EXCEPTION
 WHEN duplicate_object THEN null;
END $$;
--> statement-breakpoint
UPDATE "ingredients" SET "last_purchase_unit_cost" = "purchase_price_idr" WHERE "last_purchase_unit_cost" IS NULL;