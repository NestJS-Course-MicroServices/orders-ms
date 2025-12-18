import { OrderStatus } from "@prisma/client";

export const orderStatusList = [
    OrderStatus.PENDING,
    OrderStatus.CANCELLED,
    OrderStatus.DELIVERED
];