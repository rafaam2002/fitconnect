export const notLoggedError = (message: string) => ({
    success: false,
    code: "402",
    message,
    user: null,
});

export const CustomResponse = (code: number, message: string, status = false, others = null) => ({
    success: status,
    code: code,
    message: message,
    ...others
});
