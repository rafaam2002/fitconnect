import {EntityManager} from "@mikro-orm/core";
import {User} from "../../../entities/User";
import bcrypt from 'bcrypt'
import jwt from 'jsonwebtoken'


const forgotPassword = async (_, {email}, {em}: { em: EntityManager }) => {
    const user = await em.findOne(User, {email});
    if (!user) {
        return {
            success: false,
            code: '400',
            message: 'No existe un usuario con ese email',
            user: null,
            token: null
        }
    }

    const resetToken = jwt.sign({id: user.id}, process.env.JWT_SECRET, {expiresIn: '15m'});

    console.log(`Reset token for ${email}: ${resetToken}`);
    return {
        success: true,
        code: '201',
        message: 'Se ha enviado un correo con las instrucciones para recuperar tu contraseña',
        user: null,
        token: null
    }
}

const changePassword = async(_, { input }, { currentUser, em })=>{
    const user = await em.findOne(User, {id: currentUser.id});
    if (!user) {
        return {
            success: false,
            code: '400',
            message: 'No existe el usuario',
            user: null,
            token: null
        }
    }

    const passwordCorrect = await bcrypt.compare(input.currentPassword, user.password);
    if (!passwordCorrect) {
        return {
            success: false,
            code: '400',
            message: 'La contraseña actual no es correcta',
            user: null,
            token: null
        }
    }

    user.password =  await bcrypt.hash(input.newPassword, 10);;
    await em.persistAndFlush(user);

    return {
        success: true,
        code: '200',
        message: 'Contraseña cambiada satisfactoriamente',
        user: null,
        token: null
    }
}

export {
    forgotPassword,
    changePassword
}
