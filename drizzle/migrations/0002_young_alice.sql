ALTER TABLE "expenses" ADD COLUMN "input_method" text DEFAULT 'MANUAL' NOT NULL;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "receipt_image_url" text;--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "receipt_confidence" numeric(5, 2);--> statement-breakpoint
ALTER TABLE "expenses" ADD COLUMN "receipt_number" text;