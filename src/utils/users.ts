import { Connection, EntityManager, IDatabaseDriver } from "@mikro-orm/core";
import { User } from "../entities/User";
import { UserStats } from "../entities/UserStats";


export const setStats = async (
  em: EntityManager<IDatabaseDriver<Connection>>
) => {
  const userRepo = em.getRepository(User);
  const userStats = await em.findOne(UserStats, {
    id: { $ne: null },
  });
  const isNotActiveUsers = await userRepo.find({
    isActive: false,
  });

  const isBlockedUsers = await userRepo.find({
    isBlocked: true,
  });
  const isNotVerifiedUsers = await userRepo.find({
    isVerified: false,
  });
  const isNewUsers = await userRepo.find({
    created_at: {
      $gte: new Date(Date.now() - 24 * 60 * 60 * 1000), // last 24 hours
    },
  });
  userStats.isNotActiveUsers.set(isNotActiveUsers);
  userStats.isBlockedUsers.set(isBlockedUsers);
  userStats.isNotVerifiedUsers.set(isNotVerifiedUsers);
  userStats.isNewUsers.set(isNewUsers);
  em.persistAndFlush(userStats);
};
