import {
    stockMovementRepository,
    type StockMovement,
    type StockMovementFilters,
} from "../repositories/stockMovement.repository.ts";

export class StockMovementService {
    async listMovements(
        filters: StockMovementFilters,
    ): Promise<StockMovement[]> {
        return stockMovementRepository.findAll(filters);
    }
}

export const stockMovementService = new StockMovementService();
