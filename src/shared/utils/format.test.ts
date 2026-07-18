import { describe, it, expect } from "vitest";
import { formatCategory } from "./formatCategory.ts";
import { formatEmployee } from "./formatEmployee.ts";
import type { Category } from "../../features/categories/category.repository.ts";
import type { Employee } from "../../features/employees/employee.repository.ts";

describe("formatCategory.formatCategory", () => {
    it("returns a formatted category object", () => {
        const mockCategory: Category = {
            id: "1",
            name: "Hot",
            sortOrder: 1,
            createdAt: new Date(),
            updatedAt: new Date(),
            deletedAt: null,
        };

        const formattedCategory = formatCategory(mockCategory);

        expect(formattedCategory).toEqual({
            id: "1",
            name: "Hot",
            sortOrder: 1,
        });
    });
});

describe("formatEmployee.formatEmployee", () => {
    it("return a formatted employee object", () => {
        const mockEmployee: Employee = {
            id: "1",
            role: "manager",
            name: "Reaksmey Nou",
            pin: "123456",
            clerkUserId: "clerk-user-id",
            isActive: true,
            deletedAt: null,
            createdAt: new Date(),
            updatedAt: new Date(),
        };

        const formattedEmployee = formatEmployee(mockEmployee);

        expect(formattedEmployee).toEqual({
            id: "1",
            role: "manager",
            name: "Reaksmey Nou",
            clerkUserId: "clerk-user-id",
            isActive: true,
        });
    });
});
