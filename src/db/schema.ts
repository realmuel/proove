import {
  sqliteTable,
  text,
  integer,
  real,
  index,
} from "drizzle-orm/sqlite-core";

/* ------------------ RECIPES ------------------ */
export const recipes = sqliteTable("recipes", {
  id: text("id").primaryKey(),

  title: text("title").notNull(),
  description: text("description"),

  servings: integer("servings").notNull(),

  // decorative emoji shown when no image is set
  emoji: text("emoji"),

  ovenTemp: integer("oven_temp"),
  prepTime: integer("prep_time"),
  cookTime: integer("cook_time"),
  chillTime: integer("chill_time"),
  coolTime: integer("cool_time"),
  proveTime: integer("prove_time"),

  imagePath: text("image_path"),
  // object-position for the hero image, e.g. "50% 30%"
  imagePos: text("image_pos"),

  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),

  // optimistic-concurrency token; bumped on every write
  version: integer("version").notNull().default(1),
});

/* ------------------ INGREDIENTS ------------------ */
export const ingredients = sqliteTable("ingredients", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
  amount: real("amount").notNull(),
  unit: text("unit").notNull(),
}, (t) => [index("ingredients_recipe_idx").on(t.recipeId)]);

/* ------------------ STEPS ------------------ */
export const steps = sqliteTable("steps", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),

  order: integer("order").notNull(),
  content: text("content").notNull(),
}, (t) => [index("steps_recipe_idx").on(t.recipeId)]);

/* ------------------ TOOLS ------------------ */
export const tools = sqliteTable("tools", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id")
    .notNull()
    .references(() => recipes.id, { onDelete: "cascade" }),

  name: text("name").notNull(),
}, (t) => [index("tools_recipe_idx").on(t.recipeId)]);

/* ------------------ MEALS ------------------ */
/* A meal groups several recipes together with a prep timeline and an ETA. */
export const meals = sqliteTable("meals", {
  id: text("id").primaryKey(),

  name: text("name").notNull(),
  description: text("description"),

  // decorative emoji shown when no image is set
  emoji: text("emoji"),

  imagePath: text("image_path"),
  // object-position for the hero image, e.g. "50% 30%"
  imagePos: text("image_pos"),

  // overall preparation time, minutes
  prepTime: integer("prep_time"),

  // plate-up time, chosen when the meal is started
  etaAt: integer("eta_at", { mode: "timestamp" }),

  // whether the prep timers are actively counting down
  running: integer("running", { mode: "boolean" }).notNull().default(false),

  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),

  // optimistic-concurrency token; bumped on every write
  version: integer("version").notNull().default(1),
});

/* Recipes attached to a meal (many-to-many, ordered). */
export const mealRecipes = sqliteTable("meal_recipes", {
  id: text("id").primaryKey(),
  mealId: text("meal_id")
    .notNull()
    .references(() => meals.id, { onDelete: "cascade" }),
  // deliberately no FK: deleting a recipe leaves the meal showing "(deleted recipe)"
  recipeId: text("recipe_id").notNull(),

  order: integer("order").notNull(),
}, (t) => [index("meal_recipes_meal_idx").on(t.mealId)]);

/* A single action on the meal's preparation timeline. */
export const mealTimeline = sqliteTable("meal_timeline", {
  id: text("id").primaryKey(),
  mealId: text("meal_id")
    .notNull()
    .references(() => meals.id, { onDelete: "cascade" }),

  // minutes before plate-up that this task is due (0 = at plate-up)
  offsetMin: integer("offset_min").notNull().default(0),
  content: text("content").notNull(),

  // optional link to a recipe this action relates to
  recipeId: text("recipe_id"),

  // checked off once done
  done: integer("done", { mode: "boolean" }).notNull().default(false),

  order: integer("order").notNull(),
}, (t) => [index("meal_timeline_meal_idx").on(t.mealId)]);