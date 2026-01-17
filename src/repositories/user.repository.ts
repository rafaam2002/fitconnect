import { EntityRepository } from '@mikro-orm/postgresql';

import { User } from '../entities/User';

export class UserRepository extends EntityRepository<User> {}
