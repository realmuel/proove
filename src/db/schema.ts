import {
  sqliteTable,
  text,
  integer,
  real
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

  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),

  // optimistic-concurrency token; bumped on every write
  version: integer("version").notNull().default(1),
});

/* ------------------ INGREDIENTS ------------------ */
export const ingredients = sqliteTable("ingredients", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id").notNull(),

  name: text("name").notNull(),
  amount: real("amount").notNull(),
  unit: text("unit").notNull(),
});

/* ------------------ STEPS ------------------ */
export const steps = sqliteTable("steps", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id").notNull(),

  order: integer("order").notNull(),
  content: text("content").notNull(),
});

/* ------------------ TOOLS ------------------ */
export const tools = sqliteTable("tools", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id").notNull(),

  name: text("name").notNull(),
});

/* ------------------ COOK LOGS ------------------ */
export const cookLogs = sqliteTable("cook_logs", {
  id: text("id").primaryKey(),
  recipeId: text("recipe_id").notNull(),

  cookedAt: integer("cooked_at", { mode: "timestamp" }).notNull(),
  notes: text("notes"),
});

/* ------------------ MEALS ------------------ */
/* A meal groups several recipes together with a prep timeline and an ETA. */
export const meals = sqliteTable("meals", {
  id: text("id").primaryKey(),

  name: text("name").notNull(),
  description: text("description"),

  // decorative emoji shown when no image is set
  emoji: text("emoji"),

  imagePath: text("image_path"),

  // overall preparation time, minutes
  prepTime: integer("prep_time"),

  // when the meal needs to be ready
  etaAt: integer("eta_at", { mode: "timestamp" }),

  createdBy: text("created_by").notNull(),
  createdAt: integer("created_at", { mode: "timestamp" }).notNull(),
  updatedAt: integer("updated_at", { mode: "timestamp" }).notNull(),

  // optimistic-concurrency token; bumped on every write
  version: integer("version").notNull().default(1),
});

/* Recipes attached to a meal (many-to-many, ordered). */
export const mealRecipes = sqliteTable("meal_recipes", {
  id: text("id").primaryKey(),
  mealId: text("meal_id").notNull(),
  recipeId: text("recipe_id").notNull(),

  order: integer("order").notNull(),
});

/* A single action on the meal's preparation timeline. */
export const mealTimeline = sqliteTable("meal_timeline", {
  id: text("id").primaryKey(),
  mealId: text("meal_id").notNull(),

  // clock time of day, "HH:MM"
  time: text("time").notNull(),
  content: text("content").notNull(),

  // optional link to a recipe this action relates to
  recipeId: text("recipe_id"),

  // checked off once done
  done: integer("done", { mode: "boolean" }).notNull().default(false),

  order: integer("order").notNull(),
});