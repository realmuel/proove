PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_ingredients` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`name` text NOT NULL,
	`amount` real NOT NULL,
	`unit` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_ingredients`("id", "recipe_id", "name", "amount", "unit") SELECT "id", "recipe_id", "name", "amount", "unit" FROM `ingredients` WHERE `recipe_id` IN (SELECT `id` FROM `recipes`);--> statement-breakpoint
DROP TABLE `ingredients`;--> statement-breakpoint
ALTER TABLE `__new_ingredients` RENAME TO `ingredients`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE INDEX `ingredients_recipe_idx` ON `ingredients` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `__new_meal_recipes` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_id` text NOT NULL,
	`recipe_id` text NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`meal_id`) REFERENCES `meals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_meal_recipes`("id", "meal_id", "recipe_id", "order") SELECT "id", "meal_id", "recipe_id", "order" FROM `meal_recipes` WHERE `meal_id` IN (SELECT `id` FROM `meals`);--> statement-breakpoint
DROP TABLE `meal_recipes`;--> statement-breakpoint
ALTER TABLE `__new_meal_recipes` RENAME TO `meal_recipes`;--> statement-breakpoint
CREATE INDEX `meal_recipes_meal_idx` ON `meal_recipes` (`meal_id`);--> statement-breakpoint
CREATE TABLE `__new_meal_timeline` (
	`id` text PRIMARY KEY NOT NULL,
	`meal_id` text NOT NULL,
	`time` text NOT NULL,
	`content` text NOT NULL,
	`recipe_id` text,
	`done` integer DEFAULT false NOT NULL,
	`order` integer NOT NULL,
	FOREIGN KEY (`meal_id`) REFERENCES `meals`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_meal_timeline`("id", "meal_id", "time", "content", "recipe_id", "done", "order") SELECT "id", "meal_id", "time", "content", "recipe_id", "done", "order" FROM `meal_timeline` WHERE `meal_id` IN (SELECT `id` FROM `meals`);--> statement-breakpoint
DROP TABLE `meal_timeline`;--> statement-breakpoint
ALTER TABLE `__new_meal_timeline` RENAME TO `meal_timeline`;--> statement-breakpoint
CREATE INDEX `meal_timeline_meal_idx` ON `meal_timeline` (`meal_id`);--> statement-breakpoint
CREATE TABLE `__new_steps` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`order` integer NOT NULL,
	`content` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_steps`("id", "recipe_id", "order", "content") SELECT "id", "recipe_id", "order", "content" FROM `steps` WHERE `recipe_id` IN (SELECT `id` FROM `recipes`);--> statement-breakpoint
DROP TABLE `steps`;--> statement-breakpoint
ALTER TABLE `__new_steps` RENAME TO `steps`;--> statement-breakpoint
CREATE INDEX `steps_recipe_idx` ON `steps` (`recipe_id`);--> statement-breakpoint
CREATE TABLE `__new_tools` (
	`id` text PRIMARY KEY NOT NULL,
	`recipe_id` text NOT NULL,
	`name` text NOT NULL,
	FOREIGN KEY (`recipe_id`) REFERENCES `recipes`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
INSERT INTO `__new_tools`("id", "recipe_id", "name") SELECT "id", "recipe_id", "name" FROM `tools` WHERE `recipe_id` IN (SELECT `id` FROM `recipes`);--> statement-breakpoint
DROP TABLE `tools`;--> statement-breakpoint
ALTER TABLE `__new_tools` RENAME TO `tools`;--> statement-breakpoint
CREATE INDEX `tools_recipe_idx` ON `tools` (`recipe_id`);