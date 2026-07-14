import {
    pgTable,
    uuid,
    text,
    timestamp,
    boolean,
    index,
    pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const entityTypeEnum = pgEnum("entity_type", ["employee", "terminal"]);

export const refreshTokensTable = pgTable(
    "refresh_tokens",
    {
        id: uuid().primaryKey().defaultRandom(),
        entityId: uuid("entity_id").notNull(),
        entityType: entityTypeEnum("entity_type").notNull(),
        tokenHash: text("token_hash").notNull().unique(),
        expiresAt: timestamp("expires_at", { withTimezone: true }).notNull(),
        revoked: boolean("revoked").default(false).notNull(),
        createdAt: timestamp("created_at", { withTimezone: true })
            .notNull()
            .defaultNow(),
    },
    (t) => [
        index("idx_refresh_tokens_entity").on(t.entityId, t.entityType),
        index("idx_refresh_tokens_hash")
            .on(t.tokenHash)
            .where(sql`${t.revoked} = false`),
    ],
);
