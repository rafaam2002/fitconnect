import { EntityManager, IDatabaseDriver, Connection, MikroORM } from '@mikro-orm/core';

const ASYNC_METHODS_TO_RETRY = [
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
    'count'
];

export function createRetryingEntityManager(orm: MikroORM): EntityManager<IDatabaseDriver<Connection>> {
    const em = orm.em.fork();

    const handler = {
        get(target: EntityManager, propKey: string | symbol, receiver: any) {
            const original = target[propKey];

            if (typeof original === 'function') {
                if (ASYNC_METHODS_TO_RETRY.includes(propKey as string)) {
                    return async function (...args: any[]) {
                        try {
                            return await original.apply(target, args);
                        } catch (error) {
                            if (error.message.includes('Connection ended unexpectedly')) {
                                console.warn(`Mikro-ORM: Connection error on method '${String(propKey)}'. Retrying...`);
                                const newEm = orm.em.fork();
                                const newMethod = newEm[propKey];
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