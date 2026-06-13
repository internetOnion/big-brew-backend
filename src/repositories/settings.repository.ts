import { eq } from "drizzle-orm";
import { db } from "../models/index.ts";
import { settingsTable } from "../models/schema/index.ts";

export interface Settings {
    id: number;
    storeName: string;
    storeAddress: string | null;
    currencySymbol: string;
    receiptHeader: string | null;
    receiptFooter: string | null;
    taxLabel: string;
    logoUrl: string | null;
    qrCodeUrl: string | null;
    createdAt: Date;
    updatedAt: Date;
}

export interface UpdateSettings {
    storeName?: string;
    storeAddress?: string | null;
    currencySymbol?: string;
    receiptHeader?: string | null;
    receiptFooter?: string | null;
    taxLabel?: string;
    logoUrl?: string | null;
    qrCodeUrl?: string | null;
}

export class SettingsRepository {
    async find(): Promise<Settings | null> {
        const result = await db
            .select()
            .from(settingsTable)
            .where(eq(settingsTable.id, 1));
        return result[0] ?? null;
    }

    async update(data: UpdateSettings): Promise<Settings> {
        const result = await db
            .update(settingsTable)
            .set({ ...data, updatedAt: new Date() })
            .where(eq(settingsTable.id, 1))
            .returning();
        return result[0];
    }
}

export const settingsRepository = new SettingsRepository();
