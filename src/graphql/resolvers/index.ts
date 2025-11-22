import { authResolvers } from "./auth.resolver";
import { userResolvers } from "./user.resolver";
import { planResolvers } from "./plan.resolver";
import { articleResolvers } from "./article.resolver";
import { s3Resolvers } from "./s3.resolvers";
import { productResolvers } from "./product.resolver";
import { subscriptionResolvers } from "./subscription.resolver";
import { paymentMethodResolvers } from "./payment-method.resolver";
import { pushTokenResolvers } from "./token.resolver";
import { pollResolvers } from "./poll.resolver";
import { customerResolvers } from "./customer.resolver";
import { transactionResolvers } from "./transaction.resolver";
import { merge } from "lodash";
import { companyResolvers } from "./company.resolver";

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
  userResolvers,
  articleResolvers,
  companyResolvers
);

export default resolvers;
