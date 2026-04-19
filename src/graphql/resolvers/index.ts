import { merge } from 'lodash';

import { articleResolvers } from './article.resolver';
import { authResolvers } from './auth.resolver';
import companyResolvers from './company.resolver';
import { customerResolvers } from './customer.resolver';
import { paymentMethodResolvers } from './payment-method.resolver';
import { permissionResolvers } from './permission.resolver';
import { planResolvers } from './plan.resolver';
import { pollResolvers } from './poll.resolver';
import { productResolvers } from './product.resolver';
import { s3Resolvers } from './s3.resolvers';
import { scheduleResolvers } from './schedule.resolver';
import { subscriptionResolvers } from './subscription.resolver';
import { superAdminResolvers } from './superadmin.resolver';
import { pushTokenResolvers } from './token.resolver';
import { transactionResolvers } from './transaction.resolver';
import { userResolvers } from './user.resolver';

const resolvers = merge(
  transactionResolvers,
  subscriptionResolvers,
  s3Resolvers,
  pushTokenResolvers,
  productResolvers,
  pollResolvers,
  authResolvers,
  planResolvers,
  customerResolvers,
  paymentMethodResolvers,
  permissionResolvers,
  userResolvers,
  articleResolvers,
  companyResolvers,
  scheduleResolvers,
  superAdminResolvers
);

export default resolvers;
