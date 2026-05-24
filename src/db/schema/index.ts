import { pgTable, integer, text, timestamp } from "drizzle-orm/pg-core";

export const settings = pgTable("settings", {
    id: integer().primaryKey().default(1),
    storeName: text("store_name").notNull().default("My Cafe"),
    storeAddress: text("store_address"),
    currencySymbol: text("currency_symbol").notNull().default("$"),
    receiptHeader: text("receipt_header"),
    receiptFooter: text("receipt_footer"),
    taxLabel: text("tax_label").notNull().default("Tax included"),
    logoUrl: text("logo_url"),
    createdAt: timestamp("created_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: timestamp("updated_at", { withTimezone: true })
        .notNull()
        .defaultNow(),
});
