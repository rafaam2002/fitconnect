const createPermissions = (moduleName: string) => {
  const read = `${moduleName}:read`;
  const create = `${moduleName}:create`;
  const update = `${moduleName}:update`;
  const del = `${moduleName}:delete`;

  return {
    READ: [read],
    CREATE: [create],
    UPDATE: [update],
    DELETE: [del],
    READ_CREATE: [read, create],
    READ_UPDATE: [read, update],
    READ_DELETE: [read, del],
    READ_CREATE_UPDATE: [read, create, update],
    READ_CREATE_DELETE: [read, create, del],
    READ_UPDATE_DELETE: [read, update, del],
    READ_CREATE_UPDATE_DELETE: [read, create, update, del],
    CREATE_UPDATE_DELETE: [create, update, del],
    CREATE_UPDATE: [create, update],
    CREATE_DELETE: [create, del],
    UPDATE_DELETE: [update, del],
  };
};

export const schedulesPermissions = createPermissions('schedules');
export const pollsPermissions = createPermissions('polls');
export const productsPermissions = createPermissions('products');
export const articlesPermissions = createPermissions('articles');
export const statsPermissions = createPermissions('stats');
export const workoutsPermissions = createPermissions('workouts');
export const chatsPermissions = createPermissions('chats');
export const userWeightsPermissions = createPermissions('user_weights');

export const usersPermissions = createPermissions('users');
export const companiesPermissions = createPermissions('companies');

export const plansPermissions = createPermissions('plans');

export const subcriptionsPermissions = createPermissions('subcriptions');



