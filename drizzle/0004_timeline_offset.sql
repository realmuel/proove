ALTER TABLE `meal_timeline` ADD `offset_min` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
-- Convert old "HH:MM" task times to minutes before the meal's latest task
-- (the nearest thing the old model had to a serving time). Blank times -> 0.
UPDATE `meal_timeline` SET `offset_min` = CASE WHEN `time` = '' THEN 0 ELSE
  COALESCE((SELECT MAX(CAST(substr(t2.`time`,1,2) AS integer)*60 + CAST(substr(t2.`time`,4,2) AS integer))
            FROM `meal_timeline` t2 WHERE t2.`meal_id` = `meal_timeline`.`meal_id` AND t2.`time` <> ''), 0)
  - (CAST(substr(`time`,1,2) AS integer)*60 + CAST(substr(`time`,4,2) AS integer))
END;--> statement-breakpoint
ALTER TABLE `meal_timeline` DROP COLUMN `time`;
