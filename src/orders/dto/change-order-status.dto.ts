import { OrderStatus } from "@prisma/client";
import { IsEnum, IsUUID } from "class-validator";
import { orderStatusList } from "../enum/order.enum";

export class ChangeOrderStatusDto {
    @IsUUID()
    id: string;

    @IsEnum(orderStatusList, {
        message: `the valid status are ${orderStatusList}`
    })
    status: OrderStatus;
}