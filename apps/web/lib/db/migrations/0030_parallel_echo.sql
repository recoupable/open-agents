-- Remove any users rows left over from the pre-Privy Vercel OAuth flow.
-- Sessions/chats/etc. cascade via FK ON DELETE CASCADE.
DELETE FROM "users" WHERE "provider" = 'vercel';--> statement-breakpoint
DROP TABLE "vercel_project_links" CASCADE;--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "vercel_project_id";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "vercel_project_name";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "vercel_team_id";--> statement-breakpoint
ALTER TABLE "sessions" DROP COLUMN "vercel_team_slug";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "access_token";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "refresh_token";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "scope";--> statement-breakpoint
ALTER TABLE "users" DROP COLUMN "token_expires_at";