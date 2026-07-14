import { vi, describe, it, expect, beforeEach } from "vitest";

vi.mock("../employees/employee.repository.ts");
vi.mock("../terminals/terminal.repository.ts");
vi.mock("./refresh-token.repository.ts");
vi.mock("../../shared/lib/clerk.ts", () => ({
    clerkClient: {
        users: {
            getUserList: vi.fn(),
            verifyPassword: vi.fn(),
            createUser: vi.fn(),
            deleteUser: vi.fn(),
        },
    },
}));
vi.mock("bcrypt", () => ({
    default: { compare: vi.fn(), hash: vi.fn() },
    compare: vi.fn(),
    hash: vi.fn(),
}));
vi.mock("jsonwebtoken", async () => {
    const actual =
        await vi.importActual<typeof import("jsonwebtoken")>("jsonwebtoken");
    const mocked = {
        ...actual,
        sign: vi.fn(actual.sign),
        verify: vi.fn(actual.verify),
        TokenExpiredError: actual.TokenExpiredError,
        JsonWebTokenError: actual.JsonWebTokenError,
    };
    return {
        ...mocked,
        default: mocked,
    };
});
vi.mock("crypto", () => ({
    createHash: vi.fn(() => ({
        update: vi.fn().mockReturnThis(),
        digest: vi.fn().mockReturnValue("hashed-token"),
    })),
}));

import { authService } from "./auth.service.ts";
import { employeeRepository } from "../employees/employee.repository.ts";
import { terminalRepository } from "../terminals/terminal.repository.ts";
import { refreshTokenRepository } from "./refresh-token.repository.ts";
import { clerkClient } from "../../shared/lib/clerk.ts";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import { TokenExpiredError, JsonWebTokenError } from "jsonwebtoken";

const mockEmployeeRepo = vi.mocked(employeeRepository);
const mockTerminalRepo = vi.mocked(terminalRepository);
const mockRefreshRepo = vi.mocked(refreshTokenRepository);
const mockClerk = clerkClient as unknown as {
    users: {
        getUserList: ReturnType<typeof vi.fn>;
        verifyPassword: ReturnType<typeof vi.fn>;
        createUser: ReturnType<typeof vi.fn>;
        deleteUser: ReturnType<typeof vi.fn>;
    };
};
const mockBcrypt = vi.mocked(bcrypt);
const mockJwt = vi.mocked(jwt);

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

const makeRefreshToken = (overrides = {}) => ({
    id: "rt-1",
    entityId: "emp-1",
    entityType: "employee" as const,
    tokenHash: "hashed-token",
    expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    revoked: false,
    createdAt: new Date(),
    ...overrides,
});

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

describe("AuthService", () => {
    beforeEach(() => vi.resetAllMocks());

    describe("signup", () => {
        it("creates Clerk user and inserts manager employee", async () => {
            mockEmployeeRepo.findActiveEmployees.mockResolvedValue([]);
            mockClerk.users.createUser.mockResolvedValue(
                makeClerkUser() as any,
            );
            mockEmployeeRepo.insert.mockResolvedValue(
                makeEmployee({ role: "manager" }),
            );

            const result = await authService.signup(
                {
                    email: "alice@example.com",
                    password: "pass123",
                    name: "Alice",
                    role: "manager",
                },
                "manager",
            );

            expect(result.employee.name).toBe("Alice");
            expect(mockClerk.users.createUser).toHaveBeenCalledWith({
                emailAddress: ["alice@example.com"],
                password: "pass123",
            });
        });

        it("creates barista without Clerk account", async () => {
            mockEmployeeRepo.findActiveEmployees.mockResolvedValue([]);
            mockBcrypt.hash.mockResolvedValue("$2b$10$hashed" as never);
            mockEmployeeRepo.insert.mockResolvedValue(
                makeEmployee({ name: "Bob", clerkUserId: null }),
            );

            const result = await authService.signup(
                {
                    name: "Bob",
                    pin: "123456",
                    role: "barista",
                },
                "manager",
            );

            expect(result.employee.name).toBe("Bob");
            expect(mockClerk.users.createUser).not.toHaveBeenCalled();
            expect(mockEmployeeRepo.insert).toHaveBeenCalledWith({
                name: "Bob",
                role: "barista",
                pin: "$2b$10$hashed",
                clerkUserId: null,
            });
        });

        it("throws conflict when PIN already in use", async () => {
            mockEmployeeRepo.findActiveEmployees.mockResolvedValue([
                makeEmployee(),
            ]);
            mockBcrypt.compare.mockResolvedValue(true as never);

            await expect(
                authService.signup(
                    {
                        name: "Alice",
                        pin: "1234",
                        role: "barista",
                    },
                    "manager",
                ),
            ).rejects.toThrow("PIN already in use");
        });

        it("throws badRequest when manager signup missing email", async () => {
            await expect(
                authService.signup(
                    {
                        name: "Alice",
                        role: "manager",
                    },
                    "manager",
                ),
            ).rejects.toThrow(
                "Email and password are required for manager accounts",
            );
        });

        it("throws conflict when email already registered", async () => {
            mockEmployeeRepo.findActiveEmployees.mockResolvedValue([]);
            mockClerk.users.createUser.mockRejectedValue({
                errors: [{ code: "form_identifier_exists" }],
            });

            await expect(
                authService.signup(
                    {
                        email: "dup@example.com",
                        password: "pass",
                        name: "Alice",
                        role: "manager",
                    },
                    "manager",
                ),
            ).rejects.toThrow("Email already registered");
        });

        it("rolls back Clerk user when DB insert fails", async () => {
            mockEmployeeRepo.findActiveEmployees.mockResolvedValue([]);
            mockClerk.users.createUser.mockResolvedValue(
                makeClerkUser() as any,
            );
            mockEmployeeRepo.insert.mockRejectedValue(new Error("db fail"));
            mockClerk.users.deleteUser.mockResolvedValue({} as any);

            await expect(
                authService.signup(
                    {
                        email: "a@b.com",
                        password: "pass",
                        name: "Alice",
                        role: "manager",
                    },
                    "manager",
                ),
            ).rejects.toThrow("db fail");

            expect(mockClerk.users.deleteUser).toHaveBeenCalledWith("clerk-1");
        });

        it("wraps unknown Clerk errors as internal", async () => {
            mockEmployeeRepo.findActiveEmployees.mockResolvedValue([]);
            mockClerk.users.createUser.mockRejectedValue(
                new Error("Clerk down"),
            );

            await expect(
                authService.signup(
                    {
                        email: "a@b.com",
                        password: "pass",
                        name: "Alice",
                        role: "manager",
                    },
                    "manager",
                ),
            ).rejects.toThrow("Failed to create auth user");
        });
    });

    describe("login", () => {
        it("verifies password, finds employee, returns tokens", async () => {
            mockClerk.users.getUserList.mockResolvedValue({
                data: [makeClerkUser()],
            } as any);
            mockClerk.users.verifyPassword.mockResolvedValue({} as any);
            mockEmployeeRepo.findByClerkUserId.mockResolvedValue(
                makeEmployee(),
            );
            mockJwt.sign
                .mockReturnValueOnce("access-token" as any)
                .mockReturnValueOnce("refresh-token" as any);
            mockRefreshRepo.insert.mockResolvedValue(makeRefreshToken());

            const result = await authService.login({
                email: "alice@example.com",
                password: "pass123",
            });

            expect(result.accessToken).toBe("access-token");
            expect(result.employee.name).toBe("Alice");
        });

        it("throws unauthorized when user not found in Clerk", async () => {
            mockClerk.users.getUserList.mockResolvedValue({
                data: [],
            } as any);

            await expect(
                authService.login({
                    email: "nobody@example.com",
                    password: "pass",
                }),
            ).rejects.toThrow("Invalid email or password");
        });

        it("throws unauthorized when password wrong", async () => {
            mockClerk.users.getUserList.mockResolvedValue({
                data: [makeClerkUser()],
            } as any);
            mockClerk.users.verifyPassword.mockRejectedValue(
                new Error("wrong"),
            );

            await expect(
                authService.login({
                    email: "alice@example.com",
                    password: "wrong",
                }),
            ).rejects.toThrow("Invalid email or password");
        });

        it("throws unauthorized when employee inactive", async () => {
            mockClerk.users.getUserList.mockResolvedValue({
                data: [makeClerkUser()],
            } as any);
            mockClerk.users.verifyPassword.mockResolvedValue({} as any);
            mockEmployeeRepo.findByClerkUserId.mockResolvedValue(
                makeEmployee({ isActive: false }),
            );

            await expect(
                authService.login({
                    email: "alice@example.com",
                    password: "pass",
                }),
            ).rejects.toThrow("Employee account is inactive");
        });

        it("throws unauthorized when employee record not found", async () => {
            mockClerk.users.getUserList.mockResolvedValue({
                data: [makeClerkUser()],
            } as any);
            mockClerk.users.verifyPassword.mockResolvedValue({} as any);
            mockEmployeeRepo.findByClerkUserId.mockResolvedValue(null);

            await expect(
                authService.login({
                    email: "alice@example.com",
                    password: "pass",
                }),
            ).rejects.toThrow("Employee record not found");
        });
    });

    describe("terminalLogin", () => {
        it("verifies password, finds terminal, returns tokens", async () => {
            mockClerk.users.getUserList.mockResolvedValue({
                data: [makeClerkUser({ id: "clerk-term-1" })],
            } as any);
            mockClerk.users.verifyPassword.mockResolvedValue({} as any);
            mockTerminalRepo.findByClerkUserId.mockResolvedValue(
                makeTerminal(),
            );
            mockJwt.sign
                .mockReturnValueOnce("terminal-access" as any)
                .mockReturnValueOnce("terminal-refresh" as any);
            mockRefreshRepo.insert.mockResolvedValue(
                makeRefreshToken({
                    entityId: "term-1",
                    entityType: "terminal",
                }),
            );

            const result = await authService.terminalLogin({
                email: "pos@bigbrew.com",
                password: "Pass123",
            });

            expect(result.accessToken).toBe("terminal-access");
            expect(result.terminal.name).toBe("Front Counter");
        });

        it("throws unauthorized when terminal not found in Clerk", async () => {
            mockClerk.users.getUserList.mockResolvedValue({
                data: [],
            } as any);

            await expect(
                authService.terminalLogin({
                    email: "nobody@example.com",
                    password: "pass",
                }),
            ).rejects.toThrow("Invalid email or password");
        });

        it("throws unauthorized when terminal password wrong", async () => {
            mockClerk.users.getUserList.mockResolvedValue({
                data: [makeClerkUser()],
            } as any);
            mockClerk.users.verifyPassword.mockRejectedValue(
                new Error("wrong"),
            );

            await expect(
                authService.terminalLogin({
                    email: "pos@bigbrew.com",
                    password: "wrong",
                }),
            ).rejects.toThrow("Invalid email or password");
        });

        it("throws unauthorized when terminal record not found", async () => {
            mockClerk.users.getUserList.mockResolvedValue({
                data: [makeClerkUser()],
            } as any);
            mockClerk.users.verifyPassword.mockResolvedValue({} as any);
            mockTerminalRepo.findByClerkUserId.mockResolvedValue(null);

            await expect(
                authService.terminalLogin({
                    email: "pos@bigbrew.com",
                    password: "pass",
                }),
            ).rejects.toThrow("Terminal record not found");
        });

        it("throws unauthorized when terminal inactive", async () => {
            mockClerk.users.getUserList.mockResolvedValue({
                data: [makeClerkUser()],
            } as any);
            mockClerk.users.verifyPassword.mockResolvedValue({} as any);
            mockTerminalRepo.findByClerkUserId.mockResolvedValue(
                makeTerminal({ isActive: false }),
            );

            await expect(
                authService.terminalLogin({
                    email: "pos@bigbrew.com",
                    password: "pass",
                }),
            ).rejects.toThrow("Terminal is inactive");
        });
    });

    describe("verifyPin", () => {
        it("returns barista info when PIN matches", async () => {
            mockEmployeeRepo.findActiveEmployees.mockResolvedValue([
                makeEmployee(),
            ]);
            mockBcrypt.compare.mockResolvedValue(true as never);

            const result = await authService.verifyPin("1234");

            expect(result.id).toBe("emp-1");
            expect(result.name).toBe("Alice");
        });

        it("skips non-barista employees", async () => {
            mockEmployeeRepo.findActiveEmployees.mockResolvedValue([
                makeEmployee({
                    id: "mgr-1",
                    role: "manager",
                    pin: "$2b$10$mgr",
                }),
                makeEmployee(),
            ]);
            mockBcrypt.compare
                .mockResolvedValueOnce(true as never) // manager PIN matches
                .mockResolvedValueOnce(true as never); // barista PIN matches

            const result = await authService.verifyPin("1234");

            // Should return barista, not manager
            expect(result.id).toBe("emp-1");
            expect(result.role).toBe("barista");
        });

        it("throws unauthorized when PIN invalid", async () => {
            mockEmployeeRepo.findActiveEmployees.mockResolvedValue([
                makeEmployee(),
            ]);
            mockBcrypt.compare.mockResolvedValue(false as never);

            await expect(authService.verifyPin("9999")).rejects.toThrow(
                "Invalid PIN",
            );
        });
    });

    describe("refresh", () => {
        it("returns new access token for employee", async () => {
            mockJwt.verify.mockReturnValue({
                sub: "emp-1",
            } as any);
            mockRefreshRepo.findByHash.mockResolvedValue(makeRefreshToken());
            mockEmployeeRepo.findById.mockResolvedValue(makeEmployee());
            mockJwt.sign.mockReturnValue("new-access-token" as any);

            const result = await authService.refresh("valid-refresh-token");

            expect(result.accessToken).toBe("new-access-token");
            expect(result.entityType).toBe("employee");
        });

        it("returns new access token for terminal", async () => {
            mockJwt.verify.mockReturnValue({
                sub: "term-1",
            } as any);
            mockRefreshRepo.findByHash.mockResolvedValue(
                makeRefreshToken({
                    entityId: "term-1",
                    entityType: "terminal",
                }),
            );
            mockTerminalRepo.findById.mockResolvedValue(makeTerminal());
            mockJwt.sign.mockReturnValue("terminal-access-token" as any);

            const result = await authService.refresh("valid-terminal-token");

            expect(result.accessToken).toBe("terminal-access-token");
            expect(result.entityType).toBe("terminal");
        });

        it("throws unauthorized when token expired", async () => {
            const expiredError = new TokenExpiredError("expired", new Date());
            mockJwt.verify.mockImplementation(() => {
                throw expiredError;
            });

            await expect(authService.refresh("expired-token")).rejects.toThrow(
                "Refresh token expired",
            );
        });

        it("throws unauthorized when token invalid", async () => {
            const jwtError = new JsonWebTokenError("invalid");
            mockJwt.verify.mockImplementation(() => {
                throw jwtError;
            });

            await expect(authService.refresh("bad-token")).rejects.toThrow(
                "Invalid refresh token",
            );
        });

        it("throws unauthorized when token not in DB", async () => {
            mockJwt.verify.mockReturnValue({
                sub: "emp-1",
            } as any);
            mockRefreshRepo.findByHash.mockResolvedValue(null);

            await expect(authService.refresh("revoked-token")).rejects.toThrow(
                "Invalid refresh token",
            );
        });

        it("throws unauthorized when token expired in DB", async () => {
            mockJwt.verify.mockReturnValue({
                sub: "emp-1",
            } as any);
            mockRefreshRepo.findByHash.mockResolvedValue(
                makeRefreshToken({
                    expiresAt: new Date(Date.now() - 1000),
                }),
            );

            await expect(
                authService.refresh("expired-stored-token"),
            ).rejects.toThrow("Refresh token expired");
        });

        it("throws unauthorized when employee inactive", async () => {
            mockJwt.verify.mockReturnValue({
                sub: "emp-1",
            } as any);
            mockRefreshRepo.findByHash.mockResolvedValue(makeRefreshToken());
            mockEmployeeRepo.findById.mockResolvedValue(
                makeEmployee({ isActive: false }),
            );

            await expect(authService.refresh("valid-token")).rejects.toThrow(
                "Employee not found or inactive",
            );
        });

        it("throws unauthorized when terminal inactive", async () => {
            mockJwt.verify.mockReturnValue({
                sub: "term-1",
            } as any);
            mockRefreshRepo.findByHash.mockResolvedValue(
                makeRefreshToken({
                    entityId: "term-1",
                    entityType: "terminal",
                }),
            );
            mockTerminalRepo.findById.mockResolvedValue(
                makeTerminal({ isActive: false }),
            );

            await expect(
                authService.refresh("valid-terminal-token"),
            ).rejects.toThrow("Terminal not found or inactive");
        });
    });

    describe("logout", () => {
        it("revokes all refresh tokens for employee", async () => {
            mockRefreshRepo.revokeAllForEntity.mockResolvedValue(undefined);

            await authService.logout("emp-1");

            expect(mockRefreshRepo.revokeAllForEntity).toHaveBeenCalledWith(
                "emp-1",
                "employee",
            );
        });

        it("revokes all refresh tokens for terminal", async () => {
            mockRefreshRepo.revokeAllForEntity.mockResolvedValue(undefined);

            await authService.logout("term-1", "terminal");

            expect(mockRefreshRepo.revokeAllForEntity).toHaveBeenCalledWith(
                "term-1",
                "terminal",
            );
        });
    });
});
