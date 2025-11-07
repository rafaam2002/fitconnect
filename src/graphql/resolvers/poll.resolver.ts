import {
  ContextProps,
  DeletePollProps,
  DeletePollsProps,
  PollProps,
  VoteProps,
} from "../../types/resolvers";
import { GraphQLError } from "graphql";
import { CustomResponse } from "./errors";
import { User } from "../../entities/User";
import { sendPushNotification } from "../../utils/notifications";
import { Poll } from "../../entities/Poll";
import { PollVote } from "../../entities/PollVote";
import moment from "moment";
import { UserRole } from "../../types/enums";

export const createPoll = async (
  _: any,
  args: PollProps,
  context: ContextProps
) => {
  const { poll } = args;
  const { title, endDate } = poll;
  let { options } = poll;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  if (
    currentUser.role !== UserRole.COACH &&
    currentUser.role !== UserRole.BOSS
  ) {
    return CustomResponse(403, "You are not authorized to perform this action");
  }

  options = options.filter((option) => option.trim() !== "");

  if (moment(endDate).isBefore(new Date())) {
    return CustomResponse(400, "End date must be in the future");
  }

  try {
    const newPoll = em.create(Poll, {
      endDate: moment(endDate).toDate(),
      title,
      options,
      admin: em.getReference(User, currentUser.id),
    });

    await em.persistAndFlush(newPoll);

    // Send notification to all users
    const users = await em.find(User, {}, { populate: ["pushTokens"] });
    const notificationTitle = "¡Nueva encuesta disponible!";
    const notificationBody = title;
    const notificationData = {
      type: "new_poll",
      pollId: newPoll.id,
    };

    users.forEach((user) => {
      if (user.pushTokens && user.pushTokens.length > 0) {
        user.pushTokens.getItems().forEach((pushToken) => {
          sendPushNotification(
            pushToken.token,
            notificationTitle,
            notificationBody,
            notificationData
          );
        });
      }
    });

    return CustomResponse(200, "Poll created successfully", true, {
      poll: newPoll,
    });
  } catch (error) {
    console.error(error);

    return CustomResponse(500, "Error creating poll");
  }
};

export const createOrChangePollVote = async (
  _: any,
  args: VoteProps,
  context: ContextProps
) => {
  const { vote } = args;
  const { pollId, option } = vote;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const pollRepo = em.getRepository(Poll);

  const poll = await pollRepo.findOne({ id: pollId });

  if (!poll) {
    return CustomResponse(404, "Poll not found");
  }

  if (poll.endDate < new Date()) {
    return CustomResponse(403, "Poll has ended");
  }
  if (option < 0 || option >= poll.options.length) {
    return CustomResponse(400, "Invalid option");
  }
  const newPollVote = em.create(PollVote, {
    poll,
    user: em.getReference(User, currentUser.id),
  });

  try {
    newPollVote.optionSelected = option;

    await em.persistAndFlush(newPollVote);
  } catch (error) {
    return CustomResponse(500, "Error creating vote");
  }

  return CustomResponse(200, "Vote created successfully", true, {
    vote: newPollVote,
  });
};

export const deletePollVote = async (
  _: any,
  args: DeletePollProps,
  context: ContextProps
) => {
  const { pollId } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  const pollVoteRepo = em.getRepository(PollVote);
  const pollVote = await pollVoteRepo.findOne({
    user: currentUser.id,
    poll: pollId,
  });

  if (!pollVote) {
    return CustomResponse(404, "Poll Vote not found");
  }

  await em.removeAndFlush(pollVote);

  return CustomResponse(200, "Poll Vote deleted successfully", true);
};

export const removePolls = async (
  _: any,
  args: DeletePollsProps,
  context: ContextProps
) => {
  const { ids } = args;
  const { em, currentUser } = context;

  if (!currentUser) {
    throw new GraphQLError("Please login, token_expired", {
      extensions: {
        code: "UNAUTHENTICATED",
        http: { status: 401 },
      },
    });
  }

  if (!ids || ids.length === 0) {
    return CustomResponse(400, "At least one poll ID is required");
  }

  const pollRepo = em.getRepository(Poll);
  const pollVoteRepo = em.getRepository(PollVote);

  // Buscar las encuestas que existen con los IDs proporcionados
  const polls = await pollRepo.find({
    id: { $in: ids },
    // user: currentUser.id
  });

  if (polls.length === 0) {
    return CustomResponse(404, "No polls found with the provided IDs");
  }

  if (polls.length !== ids.length) {
    const foundIds = polls.map((poll) => poll.id);
    const notFoundIds = ids.filter((id) => !foundIds.includes(id));
    return CustomResponse(
      404,
      `Some polls not found: ${notFoundIds.join(", ")}`
    );
  }

  try {
    await pollVoteRepo.nativeDelete({
      poll: { $in: ids },
    });

    await em.removeAndFlush(polls);

    return CustomResponse(
      200,
      `${polls.length} poll(s) and associated votes deleted successfully`,
      true
    );
  } catch (error) {
    console.error("Error deleting polls:", error);
    return CustomResponse(500, "Error occurred while deleting polls");
  }
};

export const pollResolvers = {
  Query: {},
  Mutation: {
    createPoll,
    createOrChangePollVote,
    deletePollVote,
    removePolls,
  },
};
