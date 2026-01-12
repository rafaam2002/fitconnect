import { Migrator } from '@mikro-orm/migrations';
import { SeedManager } from '@mikro-orm/seeder/SeedManager';
import dotenv from 'dotenv';

import { Article } from './entities/Article';
import { Invoice } from './entities/Invoice';
import { Message } from './entities/Message';
import { PaymentMethod } from './entities/PaymentMethod';
import { Plan } from './entities/Plan';
import { Poll } from './entities/Poll';
import { PollVote } from './entities/PollVote';
import { Product } from './entities/Product';
import { Promotion } from './entities/Promotion';
import { PushToken } from './entities/PushToken';
import { RefreshToken } from './entities/RefreshToken';
import { Schedule } from './entities/Schedule';
import { ScheduleOptions } from './entities/ScheduleOptions';
import { ScheduleProgrammed } from './entities/ScheduleProgrammed';
import { StripeCustomer } from './entities/StripeCustomer';
import { Subscription } from './entities/Subscription';
import { TrainingTask } from './entities/TraningITask';
import { Transaction } from './entities/Transaction';
import { User } from './entities/User';
import { UserWeight } from './entities/UserWeight';
import { WebhookEventLog } from './entities/WebhookEventLog';

dotenv.config();

export default {
  entities: [
    Article,
    Invoice,
    Message,
    PaymentMethod,
    Plan,
    Poll,
    PollVote,
    Product,
    Promotion,
    PushToken,
    RefreshToken,
    Schedule,
    ScheduleOptions,
    ScheduleProgrammed,
    StripeCustomer,
    Subscription,
    TrainingTask,
    Transaction,
    User,
    UserWeight,
    WebhookEventLog,
  ],
  clientUrl: process.env.DATABASE_URL,
  // dbName: process.env.DB_NAME || "fitconnect_db",
  // user: process.env.DB_USERNAME || "postgres",
  // password: process.env.DB_PASSWORD || "Pececitos1$",
  // host: process.env.DB_HOST || "localhost",
  port: parseInt(process.env.DB_PORT) || 5432,
  allowGlobalContext: true,
  driver: require('@mikro-orm/postgresql').PostgreSqlDriver,
  extensions: [Migrator, SeedManager],
  debug: false, //process.env.NODE_ENV !== 'production',
  driverOptions: {
    connection: {
      ssl:
        process.env.NODE_ENV === 'production'
          ? { rejectUnauthorized: false }
          : false,
    },
    family: 4,
  },
  pool: {
    min: 2,
    max: 10,
    idleTimeoutMillis: 30000,
    reapIntervalMillis: 1000,
    propagateCreateError: false,
  },
  //subscribers : [PollVoteSubscriber],
  //    EntityRepository: [CustomPollRepository],
};
