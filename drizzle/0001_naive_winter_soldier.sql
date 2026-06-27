CREATE TABLE `meal_recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meal_timeline` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_id` text NOT NULL,
	`time` text NOT NULL,
	`content` text NOT NULL,
	`recipe_id` text,
	`done` integer DEFAULT false NOT NULL,
	`order` integer NOT NULL
);
--> statement-breakpoint
CREATE TABLE `meals` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`description` text,
	`emoji` text,
	`image_path` text,
	`image_pos` text,
	`prep_time` integer,
	`eta_at` integer,
	`running` integer DEFAULT false NOT NULL,
	`created_by` text NOT NULL,
	`created_at` integer NOT NULL,
	`updated_at` integer NOT NULL,
	`version` integer DEFAULT 1 NOT NULL
);
--> statement-breakpoint
ALTER TABLE `recipes` ADD `emoji` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `image_pos` text;--> statement-breakpoint
ALTER TABLE `recipes` ADD `version` integer DEFAULT 1 NOT NULL;