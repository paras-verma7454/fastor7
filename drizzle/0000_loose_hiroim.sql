CREATE TABLE "employees" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"password_hash" text NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "employees_email_unique" UNIQUE("email")
);
--> statement-breakpoint
CREATE TABLE "enquiries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"email" text NOT NULL,
	"phone" text,
	"course_interest" text NOT NULL,
	"message" text,
	"source" text DEFAULT 'web_form' NOT NULL,
	"claimed_by" uuid,
	"claimed_at" timestamp with time zone,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "enquiries_claim_pair_chk" CHECK ((claimed_by is null) = (claimed_at is null)),
	CONSTRAINT "enquiries_source_chk" CHECK (source in ('web_form', 'counselor'))
);
--> statement-breakpoint
ALTER TABLE "enquiries" ADD CONSTRAINT "enquiries_claimed_by_employees_id_fk" FOREIGN KEY ("claimed_by") REFERENCES "public"."employees"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "enquiries_unclaimed_idx" ON "enquiries" USING btree ("created_at" DESC NULLS LAST) WHERE claimed_by is null;--> statement-breakpoint
CREATE INDEX "enquiries_claimed_by_idx" ON "enquiries" USING btree ("claimed_by","claimed_at" DESC NULLS LAST) WHERE claimed_by is not null;