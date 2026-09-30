import {
  pgTable,
  uuid,
  text,
  integer,
  timestamp,
  index,
  AnyPgColumn,
} from "drizzle-orm/pg-core";

export const users = pgTable("users", {
  id: uuid("id").defaultRandom().primaryKey(),
  email: text("email").notNull().unique(),
  name: text("name").notNull(),
  passwordHash: text("password_hash").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true })
    .defaultNow()
    .notNull(),
});

export const apiKeys = pgTable(
  "api_keys",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    provider: text("provider").notNull(), // openai | anthropic | google
    label: text("label").notNull(),
    model: text("model").notNull(),
    ciphertext: text("ciphertext").notNull(),
    iv: text("iv").notNull(),
    authTag: text("auth_tag").notNull(),
    last4: text("last4").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("api_keys_user_idx").on(t.userId)]
);

export const projects = pgTable(
  "projects",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    userId: uuid("user_id")
      .references(() => users.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    type: text("type").notNull().default("novel"), // novel | trilogy | series | stories | screenplay
    genre: text("genre").notNull().default(""),
    status: text("status").notNull().default("draft"), // draft | in-progress | complete | shelved
    premise: text("premise").notNull().default(""),
    targetWordCount: integer("target_word_count").notNull().default(60000),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("projects_user_idx").on(t.userId)]
);

export const chapters = pgTable(
  "chapters",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    title: text("title").notNull(),
    content: text("content").notNull().default(""),
    position: integer("position").notNull().default(0),
    wordCount: integer("word_count").notNull().default(0),
    version: integer("version").notNull().default(1),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("chapters_project_idx").on(t.projectId)]
);

export const codexEntries = pgTable(
  "codex_entries",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    kind: text("kind").notNull().default("character"), // character | location | lore | plot
    name: text("name").notNull(),
    summary: text("summary").notNull().default(""),
    content: text("content").notNull().default(""),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [index("codex_project_idx").on(t.projectId)]
);

export const storyNodes = pgTable(
  "story_nodes",
  {
    id: uuid("id").defaultRandom().primaryKey(),
    projectId: uuid("project_id")
      .references(() => projects.id, { onDelete: "cascade" })
      .notNull(),
    kind: text("kind").notNull().default("premise"), // premise | act | chapter | scene
    title: text("title").notNull(),
    summary: text("summary").notNull().default(""),
    parentId: uuid("parent_id").references((): AnyPgColumn => storyNodes.id, {
      onDelete: "cascade",
    }),
    chapterId: uuid("chapter_id").references(() => chapters.id, {
      onDelete: "set null",
    }),
    createdAt: timestamp("created_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
      .defaultNow()
      .notNull(),
  },
  (t) => [
    index("story_nodes_project_idx").on(t.projectId),
    index("story_nodes_parent_idx").on(t.parentId),
  ]
);

export type User = typeof users.$inferSelect;
export type ApiKey = typeof apiKeys.$inferSelect;
export type Project = typeof projects.$inferSelect;
export type Chapter = typeof chapters.$inferSelect;
export type CodexEntry = typeof codexEntries.$inferSelect;
export type StoryNode = typeof storyNodes.$inferSelect;
