import { PaginationDto } from "src/common/dto/pagination.dto";
import { orderStatusList } from "../enum/order.enum";
import { IsEnum, IsOptional } from "class-validator";
import { OrderStatus } from "@prisma/client";

export class OrderPaginationDto extends PaginationDto {
    @IsOptional()
    @IsEnum(orderStatusList, {
        message: `Valid status are ${orderStatusList}`
    })
    status: OrderStatus;
}