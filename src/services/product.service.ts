import { EntityManager } from '@mikro-orm/core';

import { Product } from '../entities/Product';
import { User } from '../entities/User';
import { CurrentUser, ServiceResponse } from '../types/common.type';
import { UserRoleEnum } from '../types/enums';
import {
  BadRequestError,
  createServiceResponse,
  ForbiddenError,
  InternalServerError,
  NotFoundError,
  UnauthorizedError,
} from '../utils/errors.util';
import { sendPushNotification } from '../utils/notification.util';
import {
  createPictureUrl,
  getPresignedUrl,
} from '../utils/presigned-urls.util';

import { BaseService } from './base.service';
import { S3Service } from './s3.service';

export class ProductService extends BaseService {
  private s3Service: S3Service;

  constructor(em: EntityManager) {
    super(em);
    this.s3Service = new S3Service(em);
  }

  /**
   * Obtener todos los productos
   */
  public async getProducts(currentUser: CurrentUser): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    try {
      const products = await this.em.findAll(Product, {});

      return createServiceResponse(200, 'Products found', true, { products });
    } catch (error: any) {
      throw new InternalServerError('Error fetching products');
    }
  }

  /**
   * Crear nuevo producto (solo BOSS)
   */
  public async createProduct(
    currentUser: CurrentUser,
    name: string,
    description: string,
    price: number
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    // Verificar rol BOSS
    if (currentUser.contextRole !== UserRoleEnum.BOSS) {
      throw new ForbiddenError('You are not allowed to create a product');
    }

    // Validar campos requeridos
    if (!name || !description || !price) {
      throw new BadRequestError('Please fill all the fields');
    }

    try {
      const product = this.em.create(Product, {
        name,
        description,
        price,
        company: currentUser.activeCompanyId!,
      });

      this.em.persist(product);
      await this.em.flush();

      // Enviar notificaciones push a todos los usuarios
      await this.sendProductNotifications(product);

      return createServiceResponse(200, 'Product created', true, { product });
    } catch (error: any) {
      if (
        error instanceof ForbiddenError ||
        error instanceof BadRequestError ||
        error instanceof UnauthorizedError
      ) {
        throw error;
      }
      throw new InternalServerError('Error creating product');
    }
  }

  /**
   * Actualizar imagen de producto (solo BOSS)
   */
  public async updateProductPicture(
    currentUser: CurrentUser,
    imageName: string,
    productId: string
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    // Verificar rol BOSS
    if (currentUser.contextRole !== UserRoleEnum.BOSS) {
      throw new ForbiddenError('You are not allowed to update a product');
    }
    const productRepo = this.em.getRepository(Product);
    const product = await productRepo.findOne({ id: productId });

    if (!product) {
      throw new NotFoundError('Product');
    }

    if (product.pictures && product.pictures.length > 0) {
      for (const picture of product.pictures.getItems()) {
        await this.s3Service.deleteFile(picture.name);
      }
    }

    const pictureUrl = createPictureUrl(
      this.em,
      {
        id: productId,
        name: imageName,
        type: 'product',
      },
      await getPresignedUrl(imageName)
    );

    this.em.persist(pictureUrl);
    await this.em.flush();

    return createServiceResponse(200, 'Product picture updated', true, {
      product,
    });
  }

  /**
   * Eliminar múltiples productos
   */
  public async removeProducts(
    currentUser: CurrentUser,
    ids: string[]
  ): Promise<ServiceResponse> {
    if (!currentUser) {
      throw new UnauthorizedError();
    }

    if (!ids || ids.length === 0) {
      throw new BadRequestError('At least one product ID is required');
    }

    const productRepo = this.em.getRepository(Product);

    const products = await productRepo.find({
      id: { $in: ids },
    });

    if (products.length === 0) {
      throw new NotFoundError('No products found with the provided IDs');
    }

    // Verificar si se encontraron todos los productos
    if (products.length !== ids.length) {
      const foundIds = products.map((product: Product) => product.id);
      const notFoundIds = ids.filter(id => !foundIds.includes(id));
      throw new NotFoundError(
        `Some products not found: ${notFoundIds.join(', ')}`
      );
    }

    await this.em.removeAndFlush(products);

    return createServiceResponse(
      200,
      `${products.length} product(s) deleted successfully`,
      true
    );
  }

  // ============= MÉTODOS PRIVADOS =============

  /**
   * Enviar notificaciones push sobre nuevo producto
   */
  private async sendProductNotifications(product: Product): Promise<void> {
    try {
      const users = await this.em.find(User, {}, { populate: ['pushTokens'] });
      const notificationTitle = '¡Nuevo producto disponible!';
      const notificationBody = product.name;
      const notificationData = {
        type: 'new_product',
        productId: product.id,
      };

      users.forEach((user: User) => {
        if (user.pushTokens && user.pushTokens.length > 0) {
          user.pushTokens.getItems().forEach(pushToken => {
            sendPushNotification(
              pushToken.token,
              notificationTitle,
              notificationBody,
              notificationData
            );
          });
        }
      });
    } catch (error) {
      console.error('Error sending product notifications:', error);
      // No lanzar error - las notificaciones son secundarias
    }
  }
}
