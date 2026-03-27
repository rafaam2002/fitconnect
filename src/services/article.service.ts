import { EntityManager } from '@mikro-orm/core';

import { Article } from '../entities/Article';
import { ServiceResponse } from '../types/common.type';
import {
  BadRequestError,
  createServiceResponse,
  ExternalAPIError,
  GatewayTimeoutError,
  handleExternalAPIError,
  ServiceUnavailableError,
} from '../utils/errors.util';

import { BaseService } from './base.service';

// ============= INTERFACES =============

export interface GetArticlesInput {
  limit: number;
  offset: number;
}

export interface ArticlesResponse {
  articles: Article[];
  hasMore: boolean;
  total: number;
}

interface ExternalAPIResponse {
  data?: Article[];
  articles?: Article[];
  total?: number;
  count?: number;
  [key: string]: any;
}

// ============= ARTICLE SERVICE =============

export class ArticleService extends BaseService {
  private readonly apiBaseUrl: string;
  private readonly apiTimeout: number = 10000; // 10 segundos
  private readonly apiName: string = 'Articles API';

  constructor(em: EntityManager) {
    super(em);

    // Obtener URL de la API desde variables de entorno
    this.apiBaseUrl =
      process.env.ARTICLES_API_URL || 'https://api.example.com/articles';

    if (!process.env.ARTICLES_API_URL) {
      console.warn('ARTICLES_API_URL not set, using default:', this.apiBaseUrl);
    }
  }

  /**
   * Obtener artículos desde API externa con paginación
   */
  async getArticlesOld(input: GetArticlesInput): Promise<ServiceResponse> {
    const { limit, offset } = input;

    // Validar parámetros de paginación
    this.validatePaginationParams(limit, offset);

    try {
      // Construir URL con query parameters
      const url = this.buildArticlesURL(limit, offset);

      // Hacer request a la API externa con timeout
      const response = await this.fetchWithTimeout(url, this.apiTimeout);

      // Validar que la respuesta sea OK
      if (!response.ok) {
        await this.handleNonOkResponse(response);
      }

      // Parsear respuesta JSON
      const data = await this.parseJSONResponse(response);

      // Extraer y validar datos de la respuesta
      const articlesData = this.extractArticlesData(data);

      const articles = this.buildArticlesResponse(articlesData, limit, offset);

      return createServiceResponse(
        200,
        'Articles fetched successfully',
        true,
        articles
      );
    } catch (error: any) {
      // Si ya es uno de nuestros errores custom, re-lanzarlo
      if (
        error instanceof BadRequestError ||
        error instanceof ExternalAPIError ||
        error instanceof ServiceUnavailableError ||
        error instanceof GatewayTimeoutError
      ) {
        throw error;
      }

      // Manejar otros errores de fetch/network
      handleExternalAPIError(error, this.apiName);
      throw error;
    }
  }

  async getArticles(input: GetArticlesInput): Promise<ServiceResponse> {
    const { limit, offset } = input;

    const articleRepo = this.em.getRepository(Article);
    const articles = await articleRepo.find(
      {},
      {
        limit,
        offset,
      }
    );

    return createServiceResponse(200, 'Articles fetched successfully', true, {
      articles,
    });
  }

  // ============= MÉTODOS PRIVADOS HELPER =============

  /**
   * Validar parámetros de paginación
   */
  private validatePaginationParams(limit: number, offset: number): void {
    if (limit <= 0 || limit > 100) {
      throw new BadRequestError('Limit must be between 1 and 100');
    }

    if (offset < 0) {
      throw new BadRequestError('Offset must be greater than or equal to 0');
    }
  }

  /**
   * Construir URL con parámetros de query
   */
  private buildArticlesURL(limit: number, offset: number): string {
    const url = new URL(this.apiBaseUrl);
    url.searchParams.append('limit', limit.toString());
    url.searchParams.append('offset', offset.toString());
    return url.toString();
  }

  /**
   * Hacer fetch con timeout
   */
  private async fetchWithTimeout(
    url: string,
    timeoutMs: number
  ): Promise<Response> {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

    try {
      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
          // Agregar API key si es necesario
          ...(process.env.ARTICLES_API_KEY && {
            Authorization: `Bearer ${process.env.ARTICLES_API_KEY}`,
          }),
        },
      });

      clearTimeout(timeoutId);
      return response;
    } catch (error: any) {
      clearTimeout(timeoutId);

      // Error de abort = timeout
      if (error.name === 'AbortError') {
        throw new GatewayTimeoutError(
          'Request to external API timed out',
          timeoutMs
        );
      }

      // Error de red (no internet, DNS fail, etc.)
      if (
        error.message?.includes('fetch') ||
        error.message?.includes('network')
      ) {
        throw new ServiceUnavailableError(
          'Cannot connect to articles API',
          this.apiName
        );
      }

      throw error;
    }
  }

  /**
   * Manejar respuestas HTTP no exitosas (4xx, 5xx)
   */
  private async handleNonOkResponse(response: Response): Promise<never> {
    let errorMessage: string;

    try {
      const errorData = await response.json();
      errorMessage =
        errorData.message || errorData.error || response.statusText;
    } catch {
      errorMessage = response.statusText || 'Unknown error';
    }

    const status = response.status;

    // 4xx - Error del cliente (nuestra request está mal)
    if (status >= 400 && status < 500) {
      throw new ExternalAPIError(
        `API returned ${status}: ${errorMessage}`,
        this.apiName
      );
    }

    // 5xx - Error del servidor externo
    if (status >= 500) {
      throw new ServiceUnavailableError(
        `API server error ${status}: ${errorMessage}`,
        this.apiName
      );
    }

    // Otros errores
    throw new ExternalAPIError(
      `Unexpected status ${status}: ${errorMessage}`,
      this.apiName
    );
  }

  /**
   * Parsear respuesta JSON con manejo de errores
   */
  private async parseJSONResponse(
    response: Response
  ): Promise<ExternalAPIResponse> {
    try {
      return await response.json();
    } catch (e: any) {
      throw new ExternalAPIError(
        `Invalid JSON response from external API ${e.message}`,
        this.apiName
      );
    }
  }

  /**
   * Extraer datos de artículos de la respuesta
   * Maneja diferentes formatos de respuesta de APIs
   */
  private extractArticlesData(data: ExternalAPIResponse): {
    articles: Article[];
    total: number;
  } {
    // Intentar diferentes estructuras comunes de APIs
    let articles: Article[] | undefined;
    let total: number = 0;

    // Formato 1: { data: [...], total: N }
    if (data.data && Array.isArray(data.data)) {
      articles = data.data;
      total = data.total || data.count || data.data.length;
    }
    // Formato 2: { articles: [...], total: N }
    else if (data.articles && Array.isArray(data.articles)) {
      articles = data.articles;
      total = data.total || data.count || data.articles.length;
    }
    // Formato 3: Array directo
    else if (Array.isArray(data)) {
      articles = data;
      total = data.length;
    }

    // Validar que encontramos artículos
    if (!articles || !Array.isArray(articles)) {
      throw new ExternalAPIError(
        'Invalid response format: expected array of articles',
        this.apiName
      );
    }

    // Validar que cada artículo tenga los campos mínimos requeridos
    this.validateArticles(articles);

    return { articles, total };
  }

  /**
   * Validar estructura de artículos
   */
  private validateArticles(articles: Article[]): void {
    for (const article of articles) {
      if (!article.id || !article.title) {
        throw new ExternalAPIError(
          'Invalid article format: missing required fields (id, title)',
          this.apiName
        );
      }
    }
  }

  /**
   * Construir respuesta normalizada
   */
  private buildArticlesResponse(
    data: { articles: Article[]; total: number },
    _: number,
    offset: number
  ): ArticlesResponse {
    const { articles, total } = data;

    // Calcular si hay más resultados
    const hasMore = offset + articles.length < total;

    return {
      articles,
      hasMore,
      total,
    };
  }
}
