import { HttpStatus, Inject, Injectable, Logger, OnModuleInit, Param } from '@nestjs/common';
import { CreateOrderDto } from './dto/create-order.dto';
import { PrismaClient } from '@prisma/client';
import { ClientProxy, RpcException } from '@nestjs/microservices';
import { ChangeOrderStatusDto, OrderPaginationDto } from './dto';
import { NATS_SERVICE } from 'src/config';
import {  firstValueFrom } from 'rxjs';


@Injectable()
export class OrdersService extends PrismaClient implements OnModuleInit {

  constructor(
    @Inject(NATS_SERVICE)
    private readonly client: ClientProxy
  ) {
    super();
  }

  private logger = new Logger('OrdersService');

  async onModuleInit() {
    await this.$connect();
    this.logger.log('Databse connected!');
  }


  async create(createOrderDto: CreateOrderDto) {
    try {
      const ids = createOrderDto.items.map(item => item.productId);
      const products: any[] = await firstValueFrom(this.client.send({ cmd: 'validate_products' }, ids));

      const totalAmount = createOrderDto.items.reduce((acc, orderItem) => {
        const price = products.find(product => product.id === orderItem.productId).price;
        return acc + orderItem.quantity * price;
      }, 0);

      const totalItems = createOrderDto.items.reduce((acc, orderItem) => {
        return acc + orderItem.quantity;
      }, 0);

      const order = await this.order.create({
        data: {
          totalAmount,
          totalItems,
          orderItem: {
            createMany: {
              data: createOrderDto.items.map(orderItem => ({
                productId: orderItem.productId,
                quantity: orderItem.quantity,
                price: products.find(product => product.id === orderItem.productId).price
              }))
            }
          }
        },
        include: {
          orderItem: {
            select: {
              price: true,
              quantity: true,
              productId: true
            }
          }
        }
      })

      return {
        ...order,
        orderItem: order.orderItem.map(item => ({
          ...item,
          name: products.find(product => product.id === item.productId).name
        }))

      }

    } catch (error) {
      throw new RpcException(error);
    }




    //return this.order.create({ data: createOrderDto });
  }

  async findAll(orderPaginationDto: OrderPaginationDto) {

    const { status, limit, page } = orderPaginationDto;

    const totalPages = await this.order.count({ where: { status } });

    return {
      data: await this.order.findMany({
        skip: (page - 1) * limit,
        take: limit,
        where: { status }
      }),
      meta: {
        total: totalPages,
        page,
        lastPage: Math.ceil(totalPages / limit)
      }
    }
  }

  async findOne(id: string) {
    try {
      const order = await this.order.findUnique({
        where: {
          id
        },
        include: {
          orderItem: {
            select: {
              productId: true,
              price: true,
              quantity: true
            }
          }
        }
      });

      if (!order) {
        throw new RpcException({ message: `order whith #id = ${id} not found`, status: HttpStatus.NOT_FOUND });
      }


      const ids = order.orderItem.map(item => item.productId);
      const products: any[] = await firstValueFrom(this.client.send({ cmd: 'validate_products' }, ids));


      return {
        ...order,
        orderItem: order.orderItem.map(item => ({
          ...item,
          name: products.find(product => product.id === item.productId).name
        }))
      };

    } catch (error) {
      throw new RpcException(error);
    }
  }

  async changeStatus(changeOrderStatusDto: ChangeOrderStatusDto) {
    const { id, status } = changeOrderStatusDto;

    const order = await this.findOne(id);

    if (order.status === status) {
      return order;
    }

    return this.order.update({
      where: { id },
      data: { status }
    })
  }


}
