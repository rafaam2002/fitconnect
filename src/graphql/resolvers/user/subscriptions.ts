import { PubSub } from "graphql-subscriptions";
const pubsub = new PubSub();

export const probe = {
  subscribe: () => pubsub.asyncIterableIterator(["PROBE"]),
};
