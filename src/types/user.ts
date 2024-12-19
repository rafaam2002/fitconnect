export type UserType = {
    id: string;
    username: string;
    email: string;
    created_at: Date;
    updated_at: Date;
    deleted_at: Date;
    rol: string;
    isActive: boolean;
    isBlocked: boolean;
    profilePicture: string;
    phoneNumber: string;
    nickname: string;
    startPaymentDate: Date;
    endSubscriptionDate: Date;
}