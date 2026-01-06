export const CustomResponse = (code: number, message: string, status = false, others?: any) => ({
    success: status,
    code: code,
    message: message,
    ...others
});
