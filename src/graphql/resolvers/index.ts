import {authResolvers} from "./auth.resolver";
import {userResolvers} from "./user.resolver";
import {planResolvers} from "./plan.resolver";
import {articleResolvers} from "./article.resolver";
import {s3Resolvers} from "./s3.resolvers";
import {productResolvers} from "./product.resolver";
import {subscriptionResolvers,} from "./subscription.resolver";
import {paymentMethodResolvers} from "./payment-method.resolver";
import {pushTokenResolvers} from "./token.resolver";
import {pollResolvers} from "./poll.resolver";
import {customerResolvers} from "./customer.resolver";

const resolvers = {
    Query: {
        ...subscriptionResolvers.Query,
        ...s3Resolvers.Query,
        ...pushTokenResolvers.Query,
        ...productResolvers.Query,
        ...pollResolvers.Query,
        ...authResolvers.Query,
        ...planResolvers.Query,
        ...customerResolvers.Query,
        ...paymentMethodResolvers.Query,
        ...userResolvers.Query,
        ...articleResolvers.Query,
    },
    Mutation: {
        ...subscriptionResolvers.Mutation,
        ...s3Resolvers.Mutation,
        ...pushTokenResolvers.Mutation,
        ...productResolvers.Mutation,
        ...pollResolvers.Mutation,
        ...authResolvers.Mutation,
        ...planResolvers.Mutation,
        ...customerResolvers.Mutation,
        ...paymentMethodResolvers.Mutation,
        ...userResolvers.Mutation,
        ...articleResolvers.Mutation,
    },
    Subscription: {
        ...userResolvers.Subscription,
    }
}

export default resolvers;
