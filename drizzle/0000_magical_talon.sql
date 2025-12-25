CREATE TABLE "user_watch_history" (
	"id" serial PRIMARY KEY NOT NULL,
	"user_id" varchar(100) NOT NULL,
	"video_id" integer NOT NULL,
	"episode_number" integer NOT NULL,
	"progress" integer DEFAULT 0,
	"watched_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "video_stats" (
	"id" serial PRIMARY KEY NOT NULL,
	"video_id" integer NOT NULL,
	"views_total" integer DEFAULT 0 NOT NULL,
	"views_24h" integer DEFAULT 0 NOT NULL,
	"last_viewed_at" timestamp,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "videos" (
	"id" serial PRIMARY KEY NOT NULL,
	"source" varchar(50) NOT NULL,
	"external_id" varchar(100) NOT NULL,
	"title" text NOT NULL,
	"poster" text,
	"description" text,
	"genres" text,
	"release_year" integer,
	"total_episodes" integer,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user_watch_history" ADD CONSTRAINT "user_watch_history_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "video_stats" ADD CONSTRAINT "video_stats_video_id_videos_id_fk" FOREIGN KEY ("video_id") REFERENCES "public"."videos"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "user_video_idx" ON "user_watch_history" USING btree ("user_id","video_id");--> statement-breakpoint
CREATE UNIQUE INDEX "video_stats_video_id_idx" ON "video_stats" USING btree ("video_id");--> statement-breakpoint
CREATE INDEX "views_total_idx" ON "video_stats" USING btree ("views_total");--> statement-breakpoint
CREATE UNIQUE INDEX "source_external_id_idx" ON "videos" USING btree ("source","external_id");--> statement-breakpoint
CREATE INDEX "source_idx" ON "videos" USING btree ("source");