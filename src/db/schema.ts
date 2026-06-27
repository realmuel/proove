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