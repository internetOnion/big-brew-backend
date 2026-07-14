import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./terminal.repository.ts");
vi.mock("../../shared/lib/clerk.ts", () => ({
    clerkClient: {
        users: {
            getUser: vi.fn(),
            createUser: vi.fn(),
            deleteUser: vi.fn(),
            updateUser: vi.fn(),
        },
    },
}));

import { terminalService } from "./terminal.service.ts";
import { terminalRepository } from "./terminal.repository.ts";
import { clerkClient } from "../../shared/lib/clerk.ts";

const mockRepo = vi.mocked(terminalRepository);
const mockClerk = clerkClient as unknown as {
    users: {
        getUser: ReturnType<typeof vi.fn>;
        createUser: ReturnType<typeof vi.fn>;
        deleteUser: ReturnType<typeof vi.fn>;
        updateUser: ReturnType<typeof vi.fn>;
    };
};

const makeTerminal = (overrides = {}) => ({
    id: "term-1",
    name: "Front Counter",
    clerkUserId: "clerk-term-1",
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const makeClerkUser = (overrides = {}) => ({
    id: "clerk-term-1",
    primaryEmailAddressId: "email-1",
    emailAddresses: [{ id: "email-1", emailAddress: "pos@bigbrew.com" }],
    ...overrides,
});

describe("TerminalService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("listTerminals", () => {
        it("returns terminals with Clerk emails", async () => {
            mockRepo.findAll.mockResolvedValue([makeTerminal()]);
            mockClerk.users.getUser.mockResolvedValue(makeClerkUser() as any);

            const result = await terminalService.listTerminals();

            expect(result).toHaveLength(1);
            expect(result[0].email).toBe("pos@bigbrew.com");
            expect(result[0].name).toBe("Front Counter");
        });

        it("gracefully handles Clerk failure", async () => {
            mockRepo.findAll.mockResolvedValue([makeTerminal()]);
            mockClerk.users.getUser.mockRejectedValue(new Error("Clerk down"));

            const result = await terminalService.listTerminals();

            expect(result).toHaveLength(1);
            expect(result[0].email).toBe("");
        });
    });

    describe("getTerminalById", () => {
        it("returns terminal when found and active", async () => {
            mockRepo.findById.mockResolvedValue(makeTerminal());
            mockClerk.users.getUser.mockResolvedValue(makeClerkUser() as any);

            const result = await terminalService.getTerminalById("term-1");

            expect(result.id).toBe("term-1");
            expect(result.email).toBe("pos@bigbrew.com");
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                terminalService.getTerminalById("missing"),
            ).rejects.toThrow("Terminal not found");
        });

        it("throws notFound when inactive", async () => {
            mockRepo.findById.mockResolvedValue(
                makeTerminal({ isActive: false }),
            );

            await expect(
                terminalService.getTerminalById("term-1"),
            ).rejects.toThrow("Terminal not found");
        });
    });

    describe("createTerminal", () => {
        it("creates Clerk user and inserts terminal", async () => {
            mockClerk.users.createUser.mockResolvedValue(
                makeClerkUser() as any,
            );
            mockRepo.insert.mockResolvedValue(makeTerminal());

            const result = await terminalService.createTerminal({
                name: "Front Counter",
                email: "pos@bigbrew.com",
                password: "Pass123",
            });

            expect(result.name).toBe("Front Counter");
            expect(result.email).toBe("pos@bigbrew.com");
            expect(mockClerk.users.createUser).toHaveBeenCalledWith({
                emailAddress: ["pos@bigbrew.com"],
                password: "Pass123",
            });
        });

        it("throws conflict when email already registered", async () => {
            mockClerk.users.createUser.mockRejectedValue({
                errors: [{ code: "form_identifier_exists" }],
            });

            await expect(
                terminalService.createTerminal({
                    name: "Terminal",
                    email: "dup@example.com",
                    password: "Pass123",
                }),
            ).rejects.toThrow("Email already registered");
        });

        it("rolls back Clerk user when DB insert fails", async () => {
            mockClerk.users.createUser.mockResolvedValue(
                makeClerkUser() as any,
            );
            mockRepo.insert.mockRejectedValue(new Error("db fail"));
            mockClerk.users.deleteUser.mockResolvedValue({} as any);

            await expect(
                terminalService.createTerminal({
                    name: "Terminal",
                    email: "pos@bigbrew.com",
                    password: "Pass123",
                }),
            ).rejects.toThrow("db fail");

            expect(mockClerk.users.deleteUser).toHaveBeenCalledWith(
                "clerk-term-1",
            );
        });

        it("wraps unknown Clerk errors as internal", async () => {
            mockClerk.users.createUser.mockRejectedValue(
                new Error("Clerk down"),
            );

            await expect(
                terminalService.createTerminal({
                    name: "Terminal",
                    email: "pos@bigbrew.com",
                    password: "Pass123",
                }),
            ).rejects.toThrow("Failed to create auth user");
        });
    });

    describe("updateTerminal", () => {
        it("updates name only", async () => {
            mockRepo.findById.mockResolvedValue(makeTerminal());
            mockRepo.update.mockResolvedValue(
                makeTerminal({ name: "Updated" }),
            );
            mockClerk.users.getUser.mockResolvedValue(makeClerkUser() as any);

            const result = await terminalService.updateTerminal("term-1", {
                name: "Updated",
            });

            expect(result.name).toBe("Updated");
        });

        it("updates password via Clerk", async () => {
            mockRepo.findById.mockResolvedValue(makeTerminal());
            mockClerk.users.updateUser.mockResolvedValue({} as any);
            mockClerk.users.getUser.mockResolvedValue(makeClerkUser() as any);

            await terminalService.updateTerminal("term-1", {
                password: "NewPass123",
            });

            expect(mockClerk.users.updateUser).toHaveBeenCalledWith(
                "clerk-term-1",
                { password: "NewPass123" },
            );
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                terminalService.updateTerminal("missing", { name: "X" }),
            ).rejects.toThrow("Terminal not found");
        });

        it("wraps Clerk password errors as internal", async () => {
            mockRepo.findById.mockResolvedValue(makeTerminal());
            mockClerk.users.updateUser.mockRejectedValue(
                new Error("Clerk fail"),
            );

            await expect(
                terminalService.updateTerminal("term-1", {
                    password: "NewPass123",
                }),
            ).rejects.toThrow("Failed to update auth user");
        });
    });

    describe("deleteTerminal", () => {
        it("soft deletes terminal and deletes Clerk user", async () => {
            mockRepo.findById.mockResolvedValue(makeTerminal());
            mockRepo.delete.mockResolvedValue(undefined);
            mockClerk.users.deleteUser.mockResolvedValue({} as any);

            await terminalService.deleteTerminal("term-1");

            expect(mockRepo.delete).toHaveBeenCalledWith("term-1");
            expect(mockClerk.users.deleteUser).toHaveBeenCalledWith(
                "clerk-term-1",
            );
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                terminalService.deleteTerminal("missing"),
            ).rejects.toThrow("Terminal not found");
        });

        it("continues when Clerk delete fails", async () => {
            mockRepo.findById.mockResolvedValue(makeTerminal());
            mockRepo.delete.mockResolvedValue(undefined);
            mockClerk.users.deleteUser.mockRejectedValue(
                new Error("Clerk fail"),
            );

            await terminalService.deleteTerminal("term-1");

            expect(mockRepo.delete).toHaveBeenCalled();
        });
    });
});
