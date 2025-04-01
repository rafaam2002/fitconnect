import {User} from "../../../entities/User";
import {UserRol} from "../../../types/enums";
import {Poll} from "../../../entities/Poll";
import {Message} from "../../../entities/Message";
import {CustomResponse} from "../errors";
import {Schedule} from "../../../entities/Schedule";
import {ScheduleOptions} from "../../../entities/ScheduleOptions";
import moment from "moment";
import {FORUM} from "../../../constants/forum";
import {
    ContextProps,
    GetConversationProps,
    GetMonthlyScheduleStats,
    GetPollProps,
    GetScheduleProps,
    GetScheduleRangeProps,
    IdProps,
    ScheduleResumeRange,
    ScheduleStatsProps,
    UserListProps
} from "./types";

export const getUsers = async (_: any, args: UserListProps, context: ContextProps) => {
    const {em, currentUser} = context;
    const {textFilter, page} = args;
    if (!currentUser) {
        return CustomResponse(400, "Please login");
    }

    const pagination = {
        limit: 50,
        offset: page * 50,
    };

    const userRepo = em.getRepository(User);

    if (textFilter) {
        const users = await userRepo.find(
            {
                $or: [
                    {nickname: {$ilike: `${textFilter}%`}},
                    {name: {$ilike: `${textFilter}%`}},
                    {surname: {$ilike: `${textFilter}%`}},
                    {email: {$ilike: `${textFilter}%`}},
                ],
            },
            pagination
        );

        return CustomResponse(200, "Users found", true, {users});
    } else if (currentUser.rol === UserRol.BOSS) {
        const users = await userRepo.findAll(pagination);

        return CustomResponse(200, "Users found", true, {users});
    } else {
        return CustomResponse(403, "You are not authorized to perform this action");
    }
};

export const me = async (_: any, args: any, context: ContextProps) => {
    const {em, currentUser} = context;
    const userRepo = em.getRepository(User);

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }
    //falta conseguir el usuario actual
    const me = await userRepo.findOne({id: currentUser.id});
    if (me) {
        return CustomResponse(200, "User found", true, {user: me});
    } else {
        return CustomResponse(404, "User not logged");
    }
};

export const findUser = async (_, args: IdProps, context: ContextProps) => {
    const {em} = context;
    const {id} = args;
    const userRepo = em.getRepository(User);
    const user = await userRepo.findOne({id});

    if (!user) {
        return CustomResponse(404, "User not found");
    }

    return CustomResponse(200, "User found", true, {user});
};

export const getPromotions = async (_: any, args: IdProps, context: ContextProps) => {
    const {em, currentUser} = context;
    const userRepo = em.getRepository(User);

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }
    const user = await userRepo.findOne(
        {id: currentUser.id},
        {populate: ["promotions"]}
    );
    return user.promotions;
};

export const getSchedules = async (_: any, args: GetScheduleProps, context: ContextProps) => {
    const {scheduleId, calculateIsBooked} = args;
    const {em, currentUser} = context;
    const scheduleRepo = em.getRepository(Schedule);

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }

    if (scheduleId) {
        const schedule = await scheduleRepo.findOne(
            {id: scheduleId},
            {populate: ["admin", "users"]}
        );
        if (!schedule) {
            return CustomResponse(404, "Schedule not found");
        } else {
            if (calculateIsBooked) {
                const isBooked = schedule.users
                    .getItems()
                    .some((user) => user.id === currentUser.id);
                return {
                    success: true,
                    code: "200",
                    message: "Schedule found",
                    schedule: {...schedule, isBooked},
                };
            }
            return CustomResponse(200, "Schedule found", true, {schedule});
        }
    }

    const schedules = await scheduleRepo.findAll({
        populate: ["admin", "users"],
    });

    return CustomResponse(200, "Schedules found", true, {schedules});
};

export const getSchedulesFromToday = async (_: any, args: any, context: ContextProps) => {
    const {em, currentUser} = context;
    const scheduleRepo = em.getRepository(Schedule);

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    const schedules = await scheduleRepo.find(
        {
            startDate: {$gte: startOfDay},
        },
        {populate: ["users"]}
    );

    return CustomResponse(200, "Schedules found", true, {schedules});
};

export const getSchedulesResume = async (_: any, args: any, context: ContextProps) => {
    const {em, currentUser} = context;
    const scheduleRepo = em.getRepository(Schedule);
    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));

    const schedules = await scheduleRepo.find(
        {
            startDate: {$gte: startOfDay},
        },
        {populate: ["users"], orderBy: {startDate: "ASC"}}
    );

    const schedulesResume = schedules.map((schedule) => {
        return {
            id: schedule.id,
            startDate: schedule.startDate,
            maxUsers: schedule.maxUsers,
            state: schedule.state,
            ocupancy: schedule.users.length,
        };
    });

    return CustomResponse(200, "Schedules found", true, {schedulesResume});
};

export const getAdminSchedules = async (_: any, args: IdProps, context: ContextProps) => {
    const {em, currentUser} = context;
    const {id} = args;
    const userRepo = em.getRepository(User);

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }

    if (currentUser.rol === UserRol.STANDARD) {
        return CustomResponse(403, "You are not authorized to perform this action");
    }
    const user = await userRepo.findOne(
        {id: currentUser.id},
        {populate: ["adminSchedules"]}
    );
    return user.adminSchedules;
};

export const getNotifications = async (root: any, args: any, context: ContextProps) => {
    const {em, currentUser} = context
    const userRepo = em.getRepository(User);

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }
    const user = await userRepo.findOne(
        {id: currentUser.id},
        {populate: ["notifications"]}
    );

    return CustomResponse(200, "Notifications found", true, {notifications: user.notifications});
};

export const getAdminPolls = async (_: any, args: IdProps, context: ContextProps) => {
    const {em, currentUser} = context;
    const userRepo = em.getRepository(User);

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }

    if (currentUser.rol === UserRol.STANDARD) {
        return CustomResponse(403, "You are not authorized to perform this action");
    }

    const user = await userRepo.findOne(
        {id: currentUser.id},
        {populate: ["adminPolls"]}
    );
    return user.adminPolls;
};

export const getPolls = async (_: any, args: GetPollProps, context: ContextProps) => {
    const {em, currentUser} = context;
    const {pollId, filter} = args;

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }

    const pollRepo = em.getRepository(Poll);

    if (pollId) {
        const poll = await pollRepo.findOne({id: pollId});
        if (!poll) {
            return CustomResponse(404, "Poll not found");
        }
        return CustomResponse(200, "Poll found", true, {poll});
    }

    if (filter) {
        const polls = await pollRepo.find(
            {
                endDate: {$gte: filter.since},
            },
            {populate: ["admin"]}
        );

        return CustomResponse(200, "Polls found", true, {polls});
    }

    const polls = await pollRepo.find(
        {
            endDate: {$gte: moment().format("YYYY-MM-DD HH:mm:ss")},
        }, {populate: ["admin"]});

    return CustomResponse(200, "Polls found", true, {polls});
};

export const getConversation = async (_: any, args: GetConversationProps, context: ContextProps) => {
    const {em, currentUser} = context;
    const {otherUserId, page} = args

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }
    const messageRepo = em.getRepository(Message);
    let filter;
    let forumFields = [];
    if (!otherUserId) {
        //forum
        forumFields = ["isFixed", "fixedDuration"]; //this fields are only available in forum
    }

    otherUserId
        ? (filter = {
            $or: [
                {sender: currentUser.id, receiver: otherUserId},
                {sender: otherUserId, receiver: currentUser.id},
            ],
        })
        : (filter = {
            $or: [
                {sender: currentUser.id},
                {receiver: currentUser.id},
                {receiver: FORUM.id},
            ],
        });

    const messages = await messageRepo.find(filter, {
        orderBy: {created_at: "ASC"},
        limit: 50,
        offset: page * 50,
        populate: ["sender", "receiver"],
        fields: [
            "id",
            "sender.id",
            "sender.profilePicture",
            "sender.nickname",
            "sender.rol",
            "receiver.id",
            "receiver.profilePicture",
            "receiver.nickname",
            "receiver.rol",
            "text",
            "created_at",
            ...forumFields,
        ], //just mandatory fields to optimize query
    });
    // Agrupar mensajes por otro usuario
    const conversationsMap = messages.reduce((acc, message) => {
        const otherUser =
            message.receiver.id === FORUM.id
                ? FORUM.id
                : message.sender.id === currentUser.id
                    ? message.receiver.id
                    : message.sender.id;

        (acc[otherUser] ||= []).push(message); // Sintaxis optimizada para evitar chequeos extra
        return acc;
    }, {});

    // Convertir a array de arrays
    const conversations = Object.values(conversationsMap);

    return CustomResponse(200, "Conversations found", true, {conversations});
};

export const getTodaySchedulesResume = async (_: any, args: any, context: ContextProps) => {
    const {em, currentUser} = context;
    const scheduleRepo = em.getRepository(Schedule);

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }

    const today = new Date();
    const startOfDay = new Date(today.setHours(0, 0, 0, 0));
    const endOfDay = new Date(today.setHours(23, 59, 59, 999));

    const todaySchedules = await scheduleRepo.find(
        {
            startDate: {$gte: startOfDay, $lte: endOfDay},
        },
        {populate: ["users"]}
    );

    const schedulesResume = todaySchedules.map((schedule) => {
        return {
            id: schedule.id,
            startDate: schedule.startDate,
            maxUsers: schedule.maxUsers,
            state: schedule.state,
            ocupancy: schedule.users.length,
        };
    });

    return CustomResponse(200, "Schedules found", true, {schedulesResume});
};

export const getSchedulesRange = async (_: any, args: GetScheduleRangeProps, context: ContextProps) => {
    const {em, currentUser} = context;
    const {startDate, endDate, mySchedules, calculateIsBooked} = args;
    const scheduleRepo = em.getRepository(Schedule);

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }

    const startOfDay = moment(startDate).format("YYYY/MM/DD HH:mm:ss");
    const endOfDay = moment(endDate).format("YYYY/MM/DD HH:mm:ss");

    const schedules = await scheduleRepo.find(
        {
            startDate: {$gte: startOfDay, $lte: endOfDay},
        },
        {populate: ["users", "admin"]}
    );

    schedules.map((schedule) => {
        schedule.startDate = moment(
            new Date(schedule.startDate).toISOString().slice(0, 19).replace("T", " ")
        ).toDate();

        schedule.endDate = moment(
            new Date(schedule.endDate).toISOString().slice(0, 19).replace("T", " ")
        ).toDate();
    });

    if (mySchedules) {
        const myUser = em.getReference(User, currentUser.id);
        const mySchedules = schedules.filter(
            (schedule) => schedule.admin === myUser
        );

        return CustomResponse(200, "Schedules found", true, {schedules: mySchedules});
    }
    if (calculateIsBooked) {
        const schedulesIsBooked = schedules.map((schedule) => {
            const isBooked = schedule.users
                .getItems()
                .some((user) => user.id === currentUser.id);
            return {...schedule, isBooked};
        });

        return CustomResponse(200, "Schedules found", true, {schedules: schedulesIsBooked});
    }

    return CustomResponse(200, "Schedules found", true, {schedules});
};

export const getSchedulesResumeRange = async (_: any, args: ScheduleResumeRange, context: ContextProps) => {
    const {em, currentUser} = context;
    const {startDate, endDate, calculateIsBooked} = args;
    const scheduleRepo = em.getRepository(Schedule);

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }

    const startOfDay = new Date(startDate);
    const endOfDay = new Date(endDate);

    const schedules = await scheduleRepo.find(
        {
            startDate: {$gte: startOfDay, $lte: endOfDay},
        },
        {populate: ["users", "admin"]}
    );

    schedules.map((schedule) => {
        schedule.startDate = moment(
            new Date(schedule.startDate).toISOString().slice(0, 19).replace("T", " ")
        ).toDate();

        schedule.endDate = moment(
            new Date(schedule.endDate).toISOString().slice(0, 19).replace("T", " ")
        ).toDate();

        return schedule;
    });

    if (calculateIsBooked) {
        const schedulesResumeIsBooked = schedules.map((schedule) => {
            const isBooked = schedule.users
                .getItems()
                .some((user) => user.id === currentUser.id);
            return {
                id: schedule.id,
                startDate: schedule.startDate,
                maxUsers: schedule.maxUsers,
                state: schedule.state,
                ocupancy: schedule.users.length,
                isBooked,
            };
        });

        return CustomResponse(200, "Schedules found", true, {schedulesResume: schedulesResumeIsBooked});
    }

    const schedulesResume = schedules.map((schedule) => {
        return {
            id: schedule.id,
            startDate: schedule.startDate,
            maxUsers: schedule.maxUsers,
            state: schedule.state,
            ocupancy: schedule.users.length,
        };
    });

    return CustomResponse(200, "Schedules found", true, {schedulesResume});
};

export const getScheduleOptions = async (_: any, args: any, context: ContextProps) => {
    const {em, currentUser} = context

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }
    const scheduleOptionRepo = em.getRepository(ScheduleOptions);
    const scheduleOptions = await scheduleOptionRepo.findAll();

    return CustomResponse(200, "Schedule options found", true, {scheduleOptions: scheduleOptions[0]});
};

export const getAdminStats = async (_: any, arg: any, context: ContextProps) => {
    const {em, currentUser} = context;

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    }
    if (currentUser.rol !== UserRol.BOSS) {
        return CustomResponse(403, "You are not authorized to perform this action");
    }
    const userRepo = em.getRepository(User);
    const knex = em.getKnex();

    const result = await knex("user as u").select([
        knex.raw("COUNT(u.id) as totalUsers"),
        knex.raw("COUNT(CASE WHEN u.is_active = true THEN 1 END) as activeUsers"),
        knex.raw("COUNT(CASE WHEN u.is_blocked = true THEN 1 END) as blockedUsers"),
        knex.raw(
            "COUNT(CASE WHEN u.is_active = false THEN 1 END) as inactiveUsers"
        ),
    ]);
    const users = await userRepo.findAll();


    const stats = {
        users: result[0],
        schedules: 0,
        polls: 0,
        plans: 0,
        subscriptions: 0,
        transactions: 0,
        notifications: 0,
    };
    return CustomResponse(200, "Stats found", true, {stats});
};

export const getSchedulesStats = async (_: any, args: ScheduleStatsProps, context: ContextProps) => {
    const {em, currentUser} = context;
    const {month} = args;

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    } else if (currentUser.rol !== UserRol.BOSS) {
        return CustomResponse(403, "You are not authorized to perform this action");
    }

    const startOfMonth = moment().month(month).startOf("month").toDate();
    const endOfMonth = moment().month(month).endOf("month").toDate();

    const ScheduleRepo = em.getRepository(Schedule);
    const schedulesFirstMonth = await ScheduleRepo.find(
        {
            startDate: {$gte: startOfMonth, $lte: endOfMonth},
        },
        {fields: ["maxUsers", "startDate", "users"]}
    );

    // Agrupación y resumen (como en el ejemplo anterior)
    const groupedSchedulesFirstMonth = schedulesFirstMonth.reduce(
        (acc, schedule) => {
            const dayAndTime = moment(schedule.startDate).format("ddd HH:mm");

            if (!acc[dayAndTime]) {
                acc[dayAndTime] = [];
            }

            acc[dayAndTime].push(schedule);

            return acc;
        },
        {} as Record<string, typeof schedulesFirstMonth>
    );

    const schedulesSummaryFirstMonth = Object.entries(
        groupedSchedulesFirstMonth
    ).map(([dayAndTime, group]: [string, any]) => {
        const totalRatio = group.reduce(
            (sum, schedule) => sum + schedule.users.length / schedule.maxUsers,
            0
        );

        const averageRatio = totalRatio / group.length;
        return {
            dayAndTime,
            ratio: averageRatio, // Media del ratio
        };
    });

    const startPastMonth = moment()
        .month(month - 1)
        .startOf("month")
        .toDate();
    const endPastMonth = moment()
        .month(month - 1)
        .endOf("month")
        .toDate();

    const schedulesPastMonth = await ScheduleRepo.find(
        {
            startDate: {$gte: startPastMonth, $lte: endPastMonth},
        },
        {fields: ["maxUsers", "startDate", "users"]}
    );

    // Agrupación y resumen (como en el ejemplo anterior)
    const groupedSchedulesPastMonth = schedulesPastMonth.reduce(
        (acc, schedule) => {
            const dayAndTime = moment(schedule.startDate).format("ddd HH:mm");

            if (!acc[dayAndTime]) {
                acc[dayAndTime] = [];
            }

            acc[dayAndTime].push(schedule);

            return acc;
        },
        {} as Record<string, typeof schedulesPastMonth>
    );

    const schedulesSummaryPastMonth = Object.entries(
        groupedSchedulesPastMonth
    ).map(([dayAndTime, group]: [string, any]) => {
        const totalRatio = group.reduce(
            (sum, schedule) => sum + schedule.users.length / schedule.maxUsers,
            0
        );

        const averageRatio = totalRatio / group.length;
        return {
            dayAndTime,
            ratio: averageRatio, // Media del ratio
        };
    });

    return CustomResponse(200, "Schedules found", true, {stats: [schedulesSummaryFirstMonth, schedulesSummaryPastMonth]});
};

export const getMonthlySchedules = async (_: any, args: GetMonthlyScheduleStats, context: ContextProps) => {
    const {em, currentUser} = context;
    const {month, startHour} = args;

    if (!currentUser) {
        return CustomResponse(401, "Please login");
    } else if (currentUser.rol !== UserRol.BOSS) {
        return CustomResponse(403, "You are not authorized to perform this action");
    }
    const startOfMonth = moment().month(month).startOf("month").toDate();
    const endOfMonth = moment().month(month).endOf("month").toDate();
    const monthlySchedules = await em.find(
        Schedule,
        {
            startDate: {$gte: startOfMonth, $lte: endOfMonth},
        },
        {populate: ["users"]}
    );
    const matchHourSchedules = monthlySchedules.filter((schedule) => {
        return moment(Number(schedule.startDate)).format("ddd HH:mm") === startHour;
    });
    if (matchHourSchedules.length > 0)
        return CustomResponse(200, "Schedules found", true, {schedules: matchHourSchedules});
    else
        return CustomResponse(404, "No schedules found");
};
