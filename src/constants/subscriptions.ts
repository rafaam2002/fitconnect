import { PubSub } from "graphql-subscriptions";

export const MESSAGE_EVENT = "NEW_MESSAGE";
export const FIXED_MESSAGE_EVENT = "NEW_FIXED_MESSAGE";
export const myPubsub = new PubSub();
