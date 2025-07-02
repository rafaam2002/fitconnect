import {EntityManager} from "@mikro-orm/core";
import {User} from "../../../entities/User";
import bcrypt from "bcrypt";
import jwt from "jsonwebtoken";
import {ChangePasswordSchema} from "../../../validation/schemas";
import {verifyGoogleToken} from "../../../utils/users";
import {CustomResponse} from "../errors";
import {UserProviderType} from "../../../types/enums";

const forgotPassword = async (_, {email}, {em}: { em: EntityManager }) => {
    const user = await em.findOne(User, {email});
    if (!user) {
        return {
            success: false,
            code: "400",
            message: "No existe un usuario con ese email",
            user: null,
            token: null,
        };
    }

    const resetToken = jwt.sign({id: user.id}, process.env.JWT_SECRET, {
        expiresIn: "15m",
    });

    console.log(`Reset token for ${email}: ${resetToken}`);
    return {
        success: true,
        code: "201",
        message:
            "Se ha enviado un correo con las instrucciones para recuperar tu contraseña",
        user: null,
        token: null,
    };
};

const updatePassword = async (
    _,
    {
        password: {currentPassword, newPassword, confirmPassword},
    }: {
        password: {
            currentPassword: string;
            newPassword: string;
            confirmPassword: string;
        };
    },
    {currentUser, em}
) => {
    if (!currentUser) {
        return {
            success: false,
            code: "400",
            message: "Please login",
            user: null,
            token: null,
        };
    }

    try {
        ChangePasswordSchema.parse({
            currentPassword,
            newPassword,
            confirmPassword,
        });
    } catch (error) {
        return {
            success: false,
            code: "400",
            message: "Validation error",
            user: null,
        };
    }

    const user = await em.findOne(
        User,
        {id: currentUser.id},
        {populate: ["password"]}
    );
    if (!user) {
        return {
            success: false,
            code: "400",
            message: "No user found",
            user: null,
            token: null,
        };
    }

    const passwordCorrect = await bcrypt.compare(currentPassword, user.password);
    if (!passwordCorrect) {
        return {
            success: false,
            code: "400",
            message: "Current password is incorrect",
            user: null,
            token: null,
        };
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await em.persistAndFlush(user);

    return {
        success: true,
        code: "200",
        message: "password changed successfully",
        user: null,
        token: null,
    };
};

async function loginWithGoogle(_: any, args: any, {em}) {
    const {id_token} = args;

    const googleData = await verifyGoogleToken(id_token);
    if (!googleData) return CustomResponse(401, 'No Google user found');

    const {email, name, picture} = googleData;

    // Buscar usuario
    let user = await em.findOne(User, {email});

    // Si no existe, lo creamos
    if (!user) {
        user = em.create(User, {
            email,
            name,
            nickname: email.split('@')[0],
            provider: UserProviderType.GOOGLE,
        });
        await em.persistAndFlush(user);
    }

    // Generamos JWT
    const token = jwt.sign({id: user.id, email: user.email}, process.env.JWT_SECRET!);

    return CustomResponse(200, 'User logged in successfully', true, {tokens: {token}, user});
}

export {forgotPassword, updatePassword, loginWithGoogle};
