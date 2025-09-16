import {
    findUser,
    getAdminStats,
    getConversation,
    getMonthlySchedules,
    getNotifications,
    getPolls,
    getScheduleOptions,
    getSchedules,
    getSchedulesFromToday,
    getSchedulesRange,
    getSchedulesResume,
    getSchedulesResumeRange,
    getSchedulesStats,
    getTodaySchedulesResume,
    getTrainingTasks,
    getUsers,
    getUserWeights,
    me,
    sendEmailVerification,
} from "./user/queries";
import {login, loginWithId} from "./auth/queries";
import {forgotPassword, loginWithGoogle, sendChangePasswordEmail, updatePassword} from "./auth/mutations";
import {
    addUserToSchedule,
    addUserWeight,
    changeScheduleStatus,
    createMessage,
    createSchedule,
    createScheduleDevelopment,
    createTrainingTask,
    createUser,
    fixMessage,
    removeSchedule,
    removeTrainingTask,
    removeUserFromSchedule,
    removeUserWeight,
    unfixMessage,
    updateScheduleOptions,
    updateUser,
    updateUserPicture,
} from "./user/mutations";
import {createPlan, getPlan, getPlanByStripeId, listPlans, removePlan, updatePlan} from "./plan/mutations";
import {fixedMessages, newMessage} from "./user/subscriptions";
import {getProducts} from "./product/queries";
import {getArticles} from "./article/queries";
import {getPresignedUrl} from "./s3/queries";
import {createProduct, removeProduct, updateProductPicture} from "./product/mutations";
import {refreshToken} from "./refresh-token/mutations";
import {createSubscription,} from "./subscription/mutations";
import {
    attachPaymentMethod,
    confirmSetupIntent,
    createSetupIntent,
    listUserPaymentMethods,
    markPaymentMethodAsExpired, removePaymentMethod, setDefaultPaymentMethod, updatePaymentMethodMetadata,
} from "./paymentMethod/mutations";
import {registerToken, removePushToken, sendNotification} from "./push-token/mutations";
import {createOrChangePollVote, createPoll, deletePollVote, removePolls} from "./poll/mutations";
import {createCustomer, deactivateCustomer, updateCustomer} from "./customer/mutations";
import {getCustomer, getCustomerByUserId} from "./customer/queries";
import GraphQLJSON from 'graphql-type-json';

const resolvers = {
    JSON: GraphQLJSON,
    Query: {
        //Auth
        login,
        loginWithId,
        //User
        getUsers,
        findUser,
        getUserWeights,
        me,
        //Polls
        getPolls,
        //Schedules
        getSchedules,
        getSchedulesResume,
        getScheduleOptions,
        getConversation,
        getTodaySchedulesResume,
        getSchedulesFromToday,
        getSchedulesRange,
        getSchedulesResumeRange,
        getSchedulesStats,
        getMonthlySchedules,
        //Plan
        listPlans,
        getPlanByStripeId,
        getPlan,
        //Product
        getProducts,
        //Articles
        getArticles,
        //Admin
        getAdminStats,
        getTrainingTasks,
        getPresignedUrl,
        //Payments
        listUserPaymentMethods,
        //System
        getNotifications,
        sendEmailVerification,
        getCustomer,
        getCustomerByUserId
    },
    Mutation: {
        //User
        updateUser,
        createUser,
        updateUserPicture,
        updatePassword,
        forgotPassword,
        createMessage,
        removeUserWeight,
        addUserWeight,
        //Poll
        createPoll,
        createOrChangePollVote,
        deletePollVote,
        removePolls,
        //Plan
        createPlan,
        updatePlan,
        removePlan,
        //Subscription
        createSubscription,
        changeScheduleStatus,
        //Schedule
        createScheduleDevelopment,
        addUserToSchedule,
        createSchedule,
        removeSchedule,
        removeUserFromSchedule,
        //Messages
        unfixMessage,
        fixMessage,
        createTrainingTask,
        removeTrainingTask,
        //Product
        createProduct,
        updateProductPicture,
        removeProduct,
        //Auth
        registerToken,
        removePushToken,
        updateScheduleOptions,
        loginWithGoogle,
        sendChangePasswordEmail,
        refreshToken,
        //Payments
        createSetupIntent,
        confirmSetupIntent,
        attachPaymentMethod,
        removePaymentMethod,
        setDefaultPaymentMethod,
        updatePaymentMethodMetadata,
        markPaymentMethodAsExpired,
        //System
        sendNotification,
        //Customer
        createCustomer,
        updateCustomer,
        deactivateCustomer,

    },
    Subscription: {
        newMessage,
        fixedMessages,
    },
};

export default resolvers;
