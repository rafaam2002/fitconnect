import {EntityManager} from "@mikro-orm/core";
import {Company} from "../entities/Company";
import {PictureUrl} from "../entities/PictureUrl";
import {Product} from "../entities/Product";
import {User} from "../entities/User";
import {getPresignedUrl} from "./s3Client";
import {BadRequestError} from "./errors.util";

export * from "./s3Client";

/**
 * Actualizar URLs de imágenes con presigned URLs
 * Usa batch operations para mejor performance
 */
export const updatePictureUrls = async (em: EntityManager): Promise<void> => {
  try {
    // Actualizar URLs de usuarios
    await updateUserPictureUrls(em);

    // Actualizar URLs de productos
    await updateProductPictureUrls(em);

    console.log('✅ Picture URLs updated successfully');
  } catch (error) {
    console.error('❌ Error updating picture URLs:', error);
    throw error;
  }
};

/**
 * Actualizar URLs de imágenes de usuarios
 */
const updateUserPictureUrls = async (em: EntityManager): Promise<void> => {
  const userRepo = em.getRepository(User);

  const users = await userRepo.find(
      {
        pictureUrl: { $ne: null }
      },
      {
        filters: false,
        populate: ['pictureUrl']
      }
  );

  if (users.length === 0) {
    console.log('No users with pictures to update');
    return;
  }

  // Generar presigned URLs en paralelo
  const urlPromises = users.map(async (user) => {
    if (user.pictureUrl) {
      user.pictureUrl.url = await getPresignedUrl(user.pictureUrl.name);
    }
  });

  await Promise.all(urlPromises);

  // Flush una sola vez al final
  await em.flush();

  console.log(`✅ Updated ${users.length} user picture URLs`);
};

/**
 * Actualizar URLs de imágenes de productos
 */
const updateProductPictureUrls = async (em: EntityManager): Promise<void> => {
  const productRepo = em.getRepository(Product);

  const products = await productRepo.find(
      {
        pictures: { $ne: null }
      },
      {
        populate: ['pictures']
      }
  );

  if (products.length === 0) {
    console.log('No products with pictures to update');
    return;
  }

  // Obtener todas las pictures de todos los productos
  const allPictures = products.flatMap(product =>
      product.pictures.getItems()
  );

  if (allPictures.length === 0) {
    console.log('No product pictures to update');
    return;
  }

  // Generar presigned URLs en paralelo
  const urlPromises = allPictures.map(async (picture) => {
    picture.url = await getPresignedUrl(picture.name);

  });

  await Promise.all(urlPromises);

  // Flush una sola vez al final
  await em.flush();

  console.log(`✅ Updated ${allPictures.length} product picture URLs`);
};

/**
 * Tipos de owner para PictureUrl
 */
type PictureOwnerType = "user" | "product" | "companyLogo";

interface CreatePictureUrlInput {
  id: string;
  name: string;
  type: PictureOwnerType;
}

/**
 * Crear entidad PictureUrl asociada a un owner
 * @throws Error si el tipo de owner es inválido
 */
export const createPictureUrl = (
    em: EntityManager,
    item: CreatePictureUrlInput,
    url: string
): PictureUrl => {
  // Validar input
  if (!item.id || !item.name || !url) {
    throw new BadRequestError('Invalid input: id, name, and url are required');
  }

  if (!['user', 'product', 'companyLogo'].includes(item.type)) {
    throw new BadRequestError(`Invalid item type: ${item.type}`);
  }

  // Mapeo de tipo a entidad y campo
  const ownerConfig: Record<PictureOwnerType, { entity: any; field: string }> = {
    user: { entity: User, field: 'user' },
    product: { entity: Product, field: 'product' },
    companyLogo: { entity: Company, field: 'companyLogo' }
  };

  const config = ownerConfig[item.type];
  const owner = {
    user: null,
    product: null,
    companyLogo: null,
    [config.field]: em.getReference(config.entity, item.id)
  };

  return em.create(PictureUrl, {
    name: item.name,
    url,
    ...owner
  });

};

/**
 * Crear y persistir PictureUrl en una sola operación
 */
export const createAndPersistPictureUrl = async (
    em: EntityManager,
    item: CreatePictureUrlInput,
    url: string
): Promise<PictureUrl> => {
  const pictureUrl = createPictureUrl(em, item, url);
  await em.persistAndFlush(pictureUrl);
  return pictureUrl;
};

/**
 * Actualizar o crear PictureUrl
 * Si ya existe, actualiza la URL. Si no, crea uno nuevo.
 */
export const upsertPictureUrl = async (
    em: EntityManager,
    item: CreatePictureUrlInput,
    url: string
): Promise<PictureUrl> => {
  const existingPictureUrl = await em.findOne(PictureUrl, {
    name: item.name
  });

  if (existingPictureUrl) {
    existingPictureUrl.url = url;
    await em.flush();
    return existingPictureUrl;
  }

  return await createAndPersistPictureUrl(em, item, url);
};

/**
 * Crear múltiples PictureUrls en batch
 */
export const createPictureUrlsBatch = async (
    em: EntityManager,
    items: Array<{ input: CreatePictureUrlInput; url: string }>
): Promise<PictureUrl[]> => {
  const pictureUrls = items.map(({ input, url }) =>
      createPictureUrl(em, input, url)
  );

  await em.persistAndFlush(pictureUrls);
  return pictureUrls;
};

/**
 * Obtener presigned URL y crear PictureUrl en un solo paso
 */
export const createPictureUrlWithPresigned = async (
    em: EntityManager,
    item: CreatePictureUrlInput
): Promise<PictureUrl> => {
  const presignedUrl = await getPresignedUrl(item.name);
  return await createAndPersistPictureUrl(em, item, presignedUrl);
};

/**
 * Refrescar presigned URLs expiradas
 * Útil para ejecutar periódicamente
 */
export const refreshExpiredPresignedUrls = async (
    em: EntityManager,
    expirationThresholdHours: number = 24
): Promise<number> => {
  try {
    const threshold = new Date();
    threshold.setHours(threshold.getHours() - expirationThresholdHours);

    // Obtener todas las PictureUrls que puedan estar expiradas
    const pictureUrls = await em.find(PictureUrl, {
      updated_at: { $lt: threshold }
    });

    if (pictureUrls.length === 0) {
      console.log('No expired URLs to refresh');
      return 0;
    }

    // Regenerar URLs en paralelo
    const urlPromises = pictureUrls.map(async (pictureUrl) => {
      pictureUrl.url = await getPresignedUrl(pictureUrl.name);
    });

    await Promise.all(urlPromises);
    await em.flush();

    console.log(`✅ Refreshed ${pictureUrls.length} expired presigned URLs`);
    return pictureUrls.length;
  } catch (error) {
    console.error('❌ Error refreshing expired URLs:', error);
    throw error;
  }
};