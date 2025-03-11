import { PubSub } from "graphql-subscriptions";

const MESSAGE_EVENT = "NEW_MESSAGE";
const pubsub = new PubSub();

export const newMessage = {
  subscribe: () => pubsub.asyncIterableIterator([MESSAGE_EVENT]) as AsyncIterableIterator<{ newMessage: string }>,
};


setInterval(() => {
  pubsub.publish("NEW_MESSAGE", { newMessage: "Nuevo mensaje recibido!" });
}, 2000);
