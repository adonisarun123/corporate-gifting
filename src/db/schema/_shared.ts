import { bigint, integer, pgEnum, timestamp, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

/** UUID primary key with server-side default. */
export const id = () =>
  uuid("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`);

/** Money in integer minor units (paise). Serialised as number; bounded by CHECK in migrations. */
export const money = (name: string) => bigint(name, { mode: "number" });

export const createdAt = () => timestamp("created_at", { withTimezone: true }).notNull().defaultNow();
export const updatedAt = () => timestamp("updated_at", { withTimezone: true }).notNull().defaultNow();
export const rowVersion = () => integer("row_version").notNull().default(1);

export const currencyEnum = pgEnum("currency", ["INR"]);
export const actorKindEnum = pgEnum("actor_kind", ["visitor", "buyer", "vendor", "platform", "system"]);
