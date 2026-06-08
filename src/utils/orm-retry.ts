import {
  Connection,
  EntityManager,
  IDatabaseDriver,
  MikroORM,
} from '@mikro-orm/core';

const ASYNC_METHODS_TO_RETRY = new Set([
  'find',
  'findOne',
  'findOneOrFail',
  'persist',
  'flush',
  'remove',
  'nativeInsert',
  'nativeUpdate',
  'nativeDelete',
  'map',
  'populate',
  'count',
  'findAndCount',
  'findAll',
  'findByCursor',
]);

function wrapWithProxy(
  em: EntityManager<IDatabaseDriver<Connection>>,
  orm: MikroORM,
  disableTenantFilter: boolean
): EntityManager<IDatabaseDriver<Connection>> {
  // If disabling tenant filter, try to disable it globally on the EntityManager instance level.
  // This prevents errors like "No arguments provided for filter..." on nested queries or relations.
  if (disableTenantFilter && typeof (em as any).addFilter === 'function') {
    try {
      // Overwrite the filter globally with a dummy condition active by default.
      // This overrides and bypasses the entity-level filters of the same name.
      (em as any).addFilter('companyContext', {}, undefined, true);
    } catch (e) {
      console.warn('Could not disable companyContext via addFilter:', e);
    }
  }

  const handler: ProxyHandler<EntityManager<IDatabaseDriver<Connection>>> = {
    get(target: EntityManager, propKey: string | symbol, receiver: any) {
      if (propKey === 'fork') {
        return function (options?: any) {
          const forked = target.fork(options);
          return wrapWithProxy(forked, orm, disableTenantFilter);
        };
      }

      if (propKey === 'transactional') {
        return function (cb: (em: any) => Promise<any>, options?: any) {
          return target.transactional(tem => {
            const wrappedTem = wrapWithProxy(tem, orm, disableTenantFilter);
            return cb(wrappedTem);
          }, options);
        };
      }

      if (propKey === 'getRepository') {
        return function (entityName: any) {
          const repo = target.getRepository(entityName);
          (repo as any).em = receiver;
          return repo;
        };
      }

      const original = (target as unknown as Record<string | symbol, unknown>)[
        propKey
      ];

      if (typeof original === 'function') {
        // Intercept query methods to inject filters object when tenant filtering is disabled
        if (disableTenantFilter) {
          const isIndex1 = ['findAll'].includes(propKey as string);
          const isIndex2 = [
            'find',
            'findOne',
            'findOneOrFail',
            'count',
            'nativeDelete',
            'findAndCount',
            'findByCursor',
            'populate',
          ].includes(propKey as string);
          const isIndex3 = ['nativeUpdate'].includes(propKey as string);

          if (isIndex1 || isIndex2 || isIndex3) {
            return async function (...args: any[]) {
              const optionsIdx = isIndex1 ? 1 : isIndex2 ? 2 : 3;
              const options = args[optionsIdx] || {};
              args[optionsIdx] = {
                ...options,
                filters: {
                  ...(options.filters === false ? {} : options.filters),
                  companyContext: false,
                },
              };

              try {
                return await original.apply(target, args);
              } catch (error: any) {
                if (
                  error.message.includes('Connection ended unexpectedly') ||
                  error.message.includes('ECONNRESET')
                ) {
                  console.warn(
                    `Mikro-ORM: Connection error on method '${String(propKey)}'. Retrying...`
                  );
                  const newEm = orm.em.fork();
                  const newMethod = (
                    newEm as unknown as Record<string | symbol, unknown>
                  )[propKey];
                  if (typeof newMethod === 'function') {
                    const newArgs = [...args];
                    newArgs[optionsIdx] = args[optionsIdx];
                    return await newMethod.apply(newEm, newArgs);
                  }
                }
                throw error;
              }
            };
          }
        }

        // Standard retry logic for other async methods
        if (ASYNC_METHODS_TO_RETRY.has(propKey as string)) {
          return async function (...args: any[]) {
            try {
              return await original.apply(target, args);
            } catch (error: any) {
              if (
                error.message.includes('Connection ended unexpectedly') ||
                error.message.includes('ECONNRESET')
              ) {
                console.warn(
                  `Mikro-ORM: Connection error on method '${String(propKey)}'. Retrying...`
                );
                const newEm = orm.em.fork();
                const newMethod = (
                  newEm as unknown as Record<string | symbol, unknown>
                )[propKey];
                if (typeof newMethod === 'function') {
                  return await newMethod.apply(newEm, args);
                }
              }
              throw error;
            }
          };
        }

        return original.bind(target);
      }

      return original;
    },
  };

  return new Proxy(em, handler);
}

export function createRetryingEntityManager(
  orm: MikroORM,
  disableTenantFilter = false
): EntityManager<IDatabaseDriver<Connection>> {
  const em = orm.em.fork();
  return wrapWithProxy(em, orm, disableTenantFilter);
}
