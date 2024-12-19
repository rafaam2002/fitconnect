export const userAuthSuccess = (message: string, user: any, token: string) => ({
  success: true,
  code: "200",
  message,
  user,
  token,
});

export const createdSuccess = (message: string, entity: any, token : any | null) => ({
  success: true,
  code: "201",
  message,
  entity,
  token,
});
