import { createClient } from "@supabase/supabase-js";
import { config } from "../config/index.ts";

export const supabaseAdmin = createClient(
    config.supabaseUrl,
    config.supabaseSecretKey,
);

export const supabaseAuth = createClient(
    config.supabaseUrl,
    config.supabasePublishableKey,
);
