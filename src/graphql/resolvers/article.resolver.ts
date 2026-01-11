import { ContextProps } from '../../types/resolvers';
import { ArticleService } from '../../services/article.service';
import { UnauthorizedError } from '../../utils/errors.util';

// ============= TYPES =============

type PaginationProps = {
  limit?: number;
  offset?: number;
};

// ============= QUERY RESOLVERS =============

/**
 * Obtener artículos desde API externa con paginación
 *
 * @param _ - Parent (no usado)
 * @param args - Parámetros de paginación
 * @param context - Contexto GraphQL con EntityManager y usuario actual
 *
 * @returns Respuesta con artículos, hasMore y total
 *
 * @throws UnauthorizedError - Si el usuario no está autenticado
 * @throws BadRequestError - Si los parámetros de paginación son inválidos
 * @throws ExternalAPIError - Si la API externa retorna un error
 * @throws ServiceUnavailableError - Si no se puede conectar a la API
 * @throws GatewayTimeoutError - Si la API no responde a tiempo
 */
export const getArticles = async (
  _: any,
  { limit = 10, offset = 0 }: PaginationProps,
  { em, currentUser }: ContextProps
) => {
  // Validar autenticación
  if (!currentUser) {
    throw new UnauthorizedError();
  }

  // Crear instancia del servicio
  const articleService = new ArticleService(em);

  // Obtener artículos de la API externa
  return await articleService.getArticles({ limit, offset });
};

// ============= RESOLVER EXPORT =============

export const articleResolvers = {
  Query: {
    getArticles,
  },
};
