import { createClerkClient } from "@clerk/backend";
import { config } from "../config/index.ts";

export const clerkClient = createClerkClient({
    secretKey: config.clerkSecretKey,
});
