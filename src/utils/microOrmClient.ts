import {MikroORM} from "@mikro-orm/core";
import config from "../mikro-orm.config";


export const initORM = async () => {
  return await MikroORM.init(config);
};
