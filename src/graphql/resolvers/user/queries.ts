import {EntityManager} from "@mikro-orm/core";
import {User} from "../../../entities/User";
import {UserRol} from "../../../types/enums";
import {Poll} from "../../../entities/Poll";
import {CustomPollRepository} from "../../../customRepositories/pollRepository";
import {UserType} from "../../../types";

const allUsers = async (root: any, arg: any, {em}: { em: EntityManager }) => {
    const userRepo = em.getRepository(User);
    const users = await userRepo.findAll();

    return {
        success: true,
        code: "200",
        message: "Users found",
        users: users,
    }
};

const me = async (
    root: any,
    args: any,
    {em, currentUser}: { em: EntityManager; currentUser: UserType }
) => {
    const userRepo = em. getRepository(User);

    if (!currentUser) {
        return null;
    }
    //falta conseguir el usuario actual
    const me = await userRepo.findOne({id: currentUser.id});
    if (me) {
        return {
            success: true,
            code: "200",
            message: "User found",
            user: me,
        };
    } else {
        return {
            success: false,
            code: "404",
            message: "User not logged",
            user: null,
        };
    }
};

const findUser = async (
    _,
    args: { id: string },
    {em}: { em: EntityManager }
) => {
    const userRepo = em.getRepository(User);

    const {id} = args;
    const user = await userRepo.findOne({id});

    if (!user) {
        return {
            success: false,
            code: "404",
            message: "User not found",
            user: null,
        };
    }
    return {
        success: true,
        code: 200,
        message: "User found",
        user,
    };;
};

const currentUser = async (_, __, {currentUser}) => {
    if (!currentUser) {
        return {
            success: true,
            code: "200",
            message: "User found",
            user: currentUser,
        };
    } else {
        return {
            success: false,
            code: "404",
            message: "User not logged",
            user: null,
        };
    }
}

const getMessagesSent = async (
    _: any,
    args: { id: string },
    {em, currentUser}: { em: EntityManager; currentUser: UserType }
) => {
    const userRepo = em.getRepository(User);

    if (!currentUser) {
        return {
            success: false,
            code: "400",
            message: "User not logged",
        };
    }
    const user = await userRepo.findOne(
        {id: currentUser.id},
        {populate: ["messagesSent"]}
    );
    return user.messagesSent;
};

const getMessagesReceived = async (
    _: any,
    args: { id: string },
    {em, currentUser}: { em: EntityManager; currentUser: UserType }
) => {
    const userRepo = em.getRepository(User);

    if (!currentUser) {
        return {
            success: false,
            code: "400",
            message: "User not logged",
        };
    }
    const user = await userRepo.findOne(
        {id: currentUser.id},
        {populate: ["messagesReceived"]}
    );
    return user.messagesReceived;
};

const getPromotions = async (
    _: any,
    args: { id: string },
    {em, currentUser}: { em: EntityManager; currentUser: UserType }
) => {
    const userRepo = em.getRepository(User);

    if (!currentUser) {
        return {
            success: false,
            code: "400",
            message: "User not logged",
        };
    }
    const user = await userRepo.findOne(
        {id: currentUser.id},
        {populate: ["promotions"]}
    );
    return user.promotions;
};

const getSchedules = async (
    _:any,
    args: { id: string },
    {em, currentUser}: { em: EntityManager; currentUser: UserType }
) => {
    const userRepo = em.getRepository(User);

    if (!currentUser) {
        return {
            success: false,
            code: "400",
            message: "User not logged",
        };
    }
    const user = await userRepo.findOne(
        {id: currentUser.id},
        {populate: ["schedules"]}
    );
    return user.schedules;
};

const getAdminSchedules = async (
    root: any,
    args: { id: string },
    {em, currentUser}: { em: EntityManager; currentUser: UserType }
) => {
    const userRepo = em.getRepository(User);

    if (!currentUser) {
        return {
            success: false,
            code: "400",
            message: "User not logged",
        };
    }
    if (currentUser.rol === UserRol.STANDARD) {
        return {
            success: false,
            code: "400",
            message: "You are not authorized to perform this action",
        };
    }
    const user = await userRepo.findOne(
        {id: currentUser.id},
        {populate: ["adminSchedules"]}
    );
    return user.adminSchedules;
}

const getNotifications = async (
    root: any,
    args: { id: string },
    {em, currentUser}: { em: EntityManager; currentUser: UserType }
) => {
    const userRepo = em.getRepository(User);

    if (!currentUser) {
        return {
            success: false,
            code: "400",
            message: "User not logged",
        };
    }
    const user = await userRepo.findOne(
        {id: currentUser.id},
        {populate: ["notifications"]}
    );
    return user.notifications;
};

const getAdminPolls = async (
    root: any,
    args: { id: string },
    {em, currentUser}: { em: EntityManager; currentUser: UserType }
) => {
    const userRepo = em.getRepository(User);

    if (!currentUser) {
        return {
            success: false,
            code: "400",
            message: "User not logged",
        };
    }
    if (currentUser.rol === UserRol.STANDARD) {
        return {
            success: false,
            code: "400",
            message: "You are not authorized to perform this action",
        };
    }
    const user = await userRepo.findOne(
        {id: currentUser.id},
        {populate: ["adminPolls"]}
    );
    return user.adminPolls;
}

const getPolls = async (
    root: any,
    args: { id: string },
    {em, currentUser}: { em: EntityManager; currentUser: UserType }
) => {
    const userRepo = em.getRepository(User);
    const pollRepo = em.getRepository(Poll);

    const pollsandOptionSelected = await pollRepo.getPollsAndSelectionByUser(currentUser.id);


    // if (!currentUser) {
    //   return {
    //     success: false,
    //     code: "400",
    //     message: "User not logged",
    //   };
    // }
    // const {pollOptionSelections} = await userRepo.findOne(
    //   { id: currentUser.id },
    //   { populate: ["pollOptionSelections"] }
    // );


}


export {
    allUsers,
    me,
    findUser,
    getMessagesSent,
    getMessagesReceived,
    getSchedules,
    getPromotions,
    getAdminSchedules,
    getNotifications,
    getAdminPolls,
    getPolls,
    currentUser
};
