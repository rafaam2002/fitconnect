import { MikroORM } from "@mikro-orm/core";
import  config  from "../mikro-orm.config";

export const initORM = async () => {
  const orm = await MikroORM.init(config);
  return orm;
};
