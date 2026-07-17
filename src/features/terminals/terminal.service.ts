import { clerkClient } from "../../shared/lib/clerk.ts";
import { AppError } from "../../shared/utils/AppError.ts";
import { logger } from "../../shared/utils/logger.ts";
import { terminalRepository } from "./terminal.repository.ts";

interface CreateTerminalInput {
    name: string;
    email: string;
    password: string;
}

interface UpdateTerminalInput {
    name?: string;
    password?: string;
    isActive?: boolean;
}

interface TerminalPayload {
    id: string;
    name: string;
    email: string;
    isActive: boolean;
}

const getTerminalEmail = async (clerkUserId: string): Promise<string> => {
    const clerkUser = await clerkClient.users.getUser(clerkUserId);
    return (
        clerkUser.emailAddresses?.find(
            (e) => e.id === clerkUser.primaryEmailAddressId,
        )?.emailAddress ?? ""
    );
};

export class TerminalService {
    async listTerminals(): Promise<TerminalPayload[]> {
        const terminals = await terminalRepository.findAll();
        const results: TerminalPayload[] = [];
        for (const t of terminals) {
            let email = "";
            try {
                email = await getTerminalEmail(t.clerkUserId);
            } catch {
                // ponytail: clerk fetch failure is non-critical
            }
            results.push({
                id: t.id,
                name: t.name,
                email,
                isActive: t.isActive,
            });
        }
        return results;
    }

    async getTerminalById(id: string): Promise<TerminalPayload> {
        const terminal = await terminalRepository.findById(id);
        if (!terminal || !terminal.isActive) {
            throw AppError.notFound("Terminal not found");
        }

        let email = "";
        try {
            email = await getTerminalEmail(terminal.clerkUserId);
        } catch {
            // ponytail: clerk fetch failure is non-critical
        }

        return {
            id: terminal.id,
            name: terminal.name,
            email,
            isActive: terminal.isActive,
        };
    }

    async createTerminal(input: CreateTerminalInput): Promise<TerminalPayload> {
        const { name, email, password } = input;

        let clerkUser;
        try {
            clerkUser = await clerkClient.users.createUser({
                emailAddress: [email],
                password,
            });
        } catch (err: any) {
            if (err?.errors?.[0]?.code === "form_identifier_exists") {
                throw AppError.conflict("Email already registered");
            }
            if (
                err?.errors?.[0]?.code === "form_password_pwned" ||
                err?.errors?.[0]?.code === "form_password_compromised"
            ) {
                throw AppError.badRequest(
                    "This password has been found in a data breach. Please choose a different password.",
                );
            }
            logger.error(
                err as Error,
                "Failed to create Clerk user for terminal",
            );
            throw AppError.internal(
                `Failed to create terminal account: ${err?.errors?.[0]?.message ?? err?.message ?? "unknown"}`,
            );
        }

        try {
            const terminal = await terminalRepository.insert({
                name,
                clerkUserId: clerkUser.id,
            });

            return {
                id: terminal.id,
                name: terminal.name,
                email,
                isActive: terminal.isActive,
            };
        } catch (err) {
            try {
                await clerkClient.users.deleteUser(clerkUser.id);
            } catch (deleteErr) {
                logger.error(
                    deleteErr as Error,
                    "Failed to rollback Clerk user after terminal DB insert failure",
                );
            }
            throw err;
        }
    }

    async updateTerminal(
        id: string,
        input: UpdateTerminalInput,
    ): Promise<TerminalPayload> {
        const terminal = await terminalRepository.findById(id);
        if (!terminal) {
            throw AppError.notFound("Terminal not found");
        }

        const { name, password, isActive } = input;

        if (password) {
            try {
                await clerkClient.users.updateUser(terminal.clerkUserId, {
                    password,
                });
            } catch (err) {
                logger.error(
                    err as Error,
                    "Failed to update terminal password in Clerk",
                );
                throw AppError.internal("Failed to update auth user");
            }
        }

        const dbUpdate: { name?: string; isActive?: boolean } = {};
        if (name !== undefined) dbUpdate.name = name;
        if (isActive !== undefined) dbUpdate.isActive = isActive;

        let resultTerminal = terminal;
        if (Object.keys(dbUpdate).length > 0) {
            resultTerminal = await terminalRepository.update(id, dbUpdate);
        }

        let email = "";
        try {
            email = await getTerminalEmail(resultTerminal.clerkUserId);
        } catch {
            // ponytail: clerk fetch failure is non-critical
        }

        return {
            id: resultTerminal.id,
            name: resultTerminal.name,
            email,
            isActive: resultTerminal.isActive,
        };
    }

    async deleteTerminal(id: string): Promise<void> {
        const terminal = await terminalRepository.findById(id);
        if (!terminal) {
            throw AppError.notFound("Terminal not found");
        }

        await terminalRepository.delete(id);

        try {
            await clerkClient.users.deleteUser(terminal.clerkUserId);
        } catch (err) {
            logger.error(
                err as Error,
                "Failed to delete Clerk user during terminal deletion",
            );
        }
    }
}

export const terminalService = new TerminalService();
