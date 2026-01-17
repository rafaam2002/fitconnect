import { PollService } from '../../services/poll.service';
import {
  ContextProps,
  DeletePollProps,
  DeletePollsProps,
  GetPollProps,
  IdProps,
  PollProps,
  VoteProps,
} from '../../types/resolvers';
import { handleError } from '../../utils/errors.util';

// ===== QUERY RESOLVERS =====

export const getPolls = async (
  _: any,
  args: GetPollProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { pollId, filter } = args;

    const pollService = new PollService(em);
    return await pollService.getPolls(currentUser, pollId, filter?.since);
  } catch (error: any) {
    return handleError(error);
  }
};

export const getAdminPolls = async (
  _: any,
  __: IdProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;

    const pollService = new PollService(em);
    return await pollService.getAdminPolls(currentUser);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== MUTATION RESOLVERS =====

export const createPoll = async (
  _: any,
  args: PollProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { poll } = args;
    const { title, endDate, options } = poll;

    const pollService = new PollService(em);
    return await pollService.createPoll(currentUser, title, endDate, options);
  } catch (error: any) {
    return handleError(error);
  }
};

export const createOrChangePollVote = async (
  _: any,
  args: VoteProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { vote } = args;
    const { pollId, option } = vote;

    const pollService = new PollService(em);
    return await pollService.createOrChangePollVote(
      currentUser,
      pollId,
      option
    );
  } catch (error: any) {
    return handleError(error);
  }
};

export const deletePollVote = async (
  _: any,
  args: DeletePollProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { pollId } = args;

    const pollService = new PollService(em);
    return await pollService.deletePollVote(currentUser, pollId);
  } catch (error: any) {
    return handleError(error);
  }
};

export const removePolls = async (
  _: any,
  args: DeletePollsProps,
  context: ContextProps
) => {
  try {
    const { em, currentUser } = context;
    const { ids } = args;

    const pollService = new PollService(em);
    return await pollService.removePolls(currentUser, ids);
  } catch (error: any) {
    return handleError(error);
  }
};

// ===== EXPORT RESOLVERS =====

export const pollResolvers = {
  Query: {
    getPolls,
    getAdminPolls,
  },
  Mutation: {
    createPoll,
    createOrChangePollVote,
    deletePollVote,
    removePolls,
  },
};
