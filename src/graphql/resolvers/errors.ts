export const UserNotLoggedError = {
  success: false,
  code: "400",
  message: "User not logged",
};



export const notCreatedError = (message: string) => ({
  success: false,
  code: "400",
  message,
});

export const notAuthError = (message: string) => ({
  success: false,
  code: "401",
  message,
});

export const notLoggedError = (message: string) => ({
  success: false,
  code: "402",
  message,
  user: null,
});


