export const CustomResponse = (code: number, message: string, status = false, others = null) => ({
    success: status,
    code: code,
    message: message,
    ...others
});
