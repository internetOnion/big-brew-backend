import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("./employee.repository.ts");
vi.mock("../../shared/lib/clerk.ts", () => ({
    clerkClient: {
        users: {
            getUser: vi.fn(),
            createUser: vi.fn(),
            deleteUser: vi.fn(),
            updateUser: vi.fn(),
        },
        emailAddresses: {
            createEmailAddress: vi.fn(),
        },
    },
}));
vi.mock("bcrypt", () => ({
    default: { compare: vi.fn(), hash: vi.fn() },
    compare: vi.fn(),
    hash: vi.fn(),
}));

import { employeeService } from "./employee.service.ts";
import { employeeRepository } from "./employee.repository.ts";
import { clerkClient } from "../../shared/lib/clerk.ts";
import bcrypt from "bcrypt";

const mockRepo = vi.mocked(employeeRepository);
const mockClerk = clerkClient as unknown as {
    users: {
        getUser: ReturnType<typeof vi.fn>;
        createUser: ReturnType<typeof vi.fn>;
        deleteUser: ReturnType<typeof vi.fn>;
        updateUser: ReturnType<typeof vi.fn>;
    };
    emailAddresses: {
        createEmailAddress: ReturnType<typeof vi.fn>;
    };
};
const mockBcrypt = vi.mocked(bcrypt);

const makeEmployee = (overrides = {}) => ({
    id: "emp-1",
    role: "barista" as const,
    name: "Alice",
    pin: "$2b$10$hashedpin",
    clerkUserId: "clerk-1",
    isActive: true,
    deletedAt: null,
    createdAt: new Date(),
    updatedAt: new Date(),
    ...overrides,
});

const makeClerkUser = (overrides = {}) => ({
    id: "clerk-1",
    primaryEmailAddressId: "email-1",
    emailAddresses: [{ id: "email-1", emailAddress: "alice@example.com" }],
    ...overrides,
});

describe("EmployeeService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("listEmployees", () => {
        it("returns employees with Clerk emails", async () => {
            mockRepo.findAll.mockResolvedValue([makeEmployee()]);
            mockClerk.users.getUser.mockResolvedValue(makeClerkUser() as any);

            const result = await employeeService.listEmployees();

            expect(result).toHaveLength(1);
            expect(result[0].email).toBe("alice@example.com");
        });

        it("gracefully handles Clerk failure", async () => {
            mockRepo.findAll.mockResolvedValue([makeEmployee()]);
            mockClerk.users.getUser.mockRejectedValue(new Error("Clerk down"));

            const result = await employeeService.listEmployees();

            expect(result).toHaveLength(1);
            expect(result[0].email).toBeUndefined();
        });

        it("skips Clerk fetch when no clerkUserId", async () => {
            mockRepo.findAll.mockResolvedValue([
                makeEmployee({ clerkUserId: null }),
            ]);

            const result = await employeeService.listEmployees();

            expect(result).toHaveLength(1);
            expect(mockClerk.users.getUser).not.toHaveBeenCalled();
        });
    });

    describe("getEmployeeById", () => {
        it("returns employee when found and active", async () => {
            mockRepo.findById.mockResolvedValue(makeEmployee());
            mockClerk.users.getUser.mockResolvedValue(makeClerkUser() as any);

            const result = await employeeService.getEmployeeById("emp-1");

            expect(result.id).toBe("emp-1");
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                employeeService.getEmployeeById("missing"),
            ).rejects.toThrow("Employee not found");
        });

        it("throws notFound when inactive", async () => {
            mockRepo.findById.mockResolvedValue(
                makeEmployee({ isActive: false }),
            );

            await expect(
                employeeService.getEmployeeById("emp-1"),
            ).rejects.toThrow("Employee not found");
        });
    });

    describe("updateEmployee", () => {
        it("updates name only", async () => {
            mockRepo.findById.mockResolvedValue(makeEmployee());
            mockRepo.update.mockResolvedValue(
                makeEmployee({ name: "Updated" }),
            );
            mockClerk.users.getUser.mockResolvedValue(makeClerkUser() as any);

            const result = await employeeService.updateEmployee("emp-1", {
                name: "Updated",
            });

            expect(result.name).toBe("Updated");
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                employeeService.updateEmployee("missing", { name: "X" }),
            ).rejects.toThrow("Employee not found");
        });

        it("throws conflict when PIN already in use", async () => {
            mockRepo.findById.mockResolvedValue(makeEmployee());
            mockRepo.findActiveEmployees.mockResolvedValue([
                makeEmployee({ id: "emp-2", pin: "$2b$10$other" }),
            ]);
            mockBcrypt.compare.mockResolvedValue(true as never);

            await expect(
                employeeService.updateEmployee("emp-1", { pin: "1234" }),
            ).rejects.toThrow("PIN already in use");
        });

        it("updates PIN with bcrypt hash", async () => {
            mockRepo.findById.mockResolvedValue(makeEmployee());
            mockRepo.findActiveEmployees.mockResolvedValue([]);
            mockBcrypt.hash.mockResolvedValue("$2b$10$newhash" as never);
            mockRepo.update.mockResolvedValue(makeEmployee());
            mockClerk.users.getUser.mockResolvedValue(makeClerkUser() as any);

            await employeeService.updateEmployee("emp-1", { pin: "5678" });

            expect(mockBcrypt.hash).toHaveBeenCalledWith("5678", 10);
            expect(mockRepo.update).toHaveBeenCalledWith("emp-1", {
                pin: "$2b$10$newhash",
            });
        });

        it("updates email via Clerk", async () => {
            mockRepo.findById.mockResolvedValue(makeEmployee());
            mockClerk.users.getUser.mockResolvedValue(makeClerkUser() as any);
            mockClerk.emailAddresses.createEmailAddress.mockResolvedValue({
                id: "email-new",
            } as any);
            mockClerk.users.updateUser.mockResolvedValue({} as any);
            mockRepo.update.mockResolvedValue(makeEmployee());

            const result = await employeeService.updateEmployee("emp-1", {
                email: "new@example.com",
            });

            expect(
                mockClerk.emailAddresses.createEmailAddress,
            ).toHaveBeenCalledWith({
                userId: "clerk-1",
                emailAddress: "new@example.com",
            });
        });

        it("throws badRequest when no clerkUserId and email/password change", async () => {
            mockRepo.findById.mockResolvedValue(
                makeEmployee({ clerkUserId: null }),
            );

            await expect(
                employeeService.updateEmployee("emp-1", {
                    email: "new@example.com",
                }),
            ).rejects.toThrow("Employee has no linked auth account");
        });

        it("throws conflict when Clerk reports email exists", async () => {
            mockRepo.findById.mockResolvedValue(makeEmployee());
            mockClerk.users.getUser.mockResolvedValue(makeClerkUser() as any);
            mockClerk.emailAddresses.createEmailAddress.mockRejectedValue({
                errors: [{ code: "form_identifier_exists" }],
            });

            await expect(
                employeeService.updateEmployee("emp-1", {
                    email: "dup@example.com",
                }),
            ).rejects.toThrow("Email already registered");
        });

        it("wraps unknown Clerk errors as internal", async () => {
            mockRepo.findById.mockResolvedValue(makeEmployee());
            mockClerk.users.getUser.mockResolvedValue(makeClerkUser() as any);
            mockClerk.emailAddresses.createEmailAddress.mockRejectedValue(
                new Error("Clerk down"),
            );

            await expect(
                employeeService.updateEmployee("emp-1", {
                    email: "new@example.com",
                }),
            ).rejects.toThrow("Failed to update auth user");
        });

        it("attempts rollback when DB update fails after Clerk email change", async () => {
            mockRepo.findById.mockResolvedValue(makeEmployee());
            // First getUser call returns original Clerk user (to get originalEmail)
            // Second getUser call (rollback) also returns the user
            mockClerk.users.getUser.mockResolvedValue(makeClerkUser() as any);
            mockClerk.emailAddresses.createEmailAddress
                .mockResolvedValueOnce({ id: "email-new" } as any)
                .mockResolvedValueOnce({ id: "email-rollback" } as any);
            mockClerk.users.updateUser.mockResolvedValue({} as any);
            // DB update fails — need a non-email field so dbUpdate is non-empty
            mockRepo.update.mockRejectedValue(new Error("db fail"));

            await expect(
                employeeService.updateEmployee("emp-1", {
                    email: "new@example.com",
                    name: "NewName",
                }),
            ).rejects.toThrow("db fail");

            // rollback was attempted — createEmailAddress called twice (new email + rollback)
            expect(
                mockClerk.emailAddresses.createEmailAddress,
            ).toHaveBeenCalledTimes(2);
        });
    });

    describe("deleteEmployee", () => {
        it("soft deletes employee and Clerk user", async () => {
            mockRepo.findById.mockResolvedValue(makeEmployee());
            mockRepo.delete.mockResolvedValue(undefined);
            mockClerk.users.deleteUser.mockResolvedValue({} as any);

            await employeeService.deleteEmployee("emp-1");

            expect(mockRepo.delete).toHaveBeenCalledWith("emp-1");
            expect(mockClerk.users.deleteUser).toHaveBeenCalledWith("clerk-1");
        });

        it("throws notFound when missing", async () => {
            mockRepo.findById.mockResolvedValue(null);

            await expect(
                employeeService.deleteEmployee("missing"),
            ).rejects.toThrow("Employee not found");
        });

        it("throws forbidden when deleting owner", async () => {
            mockRepo.findById.mockResolvedValue(
                makeEmployee({ role: "owner" }),
            );

            await expect(
                employeeService.deleteEmployee("emp-1"),
            ).rejects.toThrow("Cannot delete owner account");
        });

        it("continues when Clerk delete fails", async () => {
            mockRepo.findById.mockResolvedValue(makeEmployee());
            mockRepo.delete.mockResolvedValue(undefined);
            mockClerk.users.deleteUser.mockRejectedValue(
                new Error("Clerk fail"),
            );

            await employeeService.deleteEmployee("emp-1");

            expect(mockRepo.delete).toHaveBeenCalled();
        });
    });
});
