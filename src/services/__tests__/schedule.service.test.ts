import moment from 'moment';

import { Company } from '../../entities/Company';
import { Schedule } from '../../entities/Schedule';
import { User } from '../../entities/User';
import { ScheduleState, UserRoleEnum } from '../../types/enums';
import { ValidationError } from '../../utils/errors.util';
import { ScheduleService } from '../schedule.service';

// Set environment variable for Stripe to prevent constructor crash
process.env.STRIPE_SECRET_KEY = 'sk_test_mock';

// Helper to create mock collection
function createMockCollection<T>(initialItems: T[] = []): any {
  let items = [...initialItems];
  const coll = {
    getItems: jest.fn(() => items),
    contains: jest.fn((item: any) => items.some((i: any) => i.id === item.id)),
    add: jest.fn((...newItems: any[]) => {
      // Avoid duplicate adds
      for (const ni of newItems) {
        if (!items.some((i: any) => i.id === ni.id)) {
          items.push(ni);
        }
      }
    }),
    remove: jest.fn((...removedItems: any[]) => {
      items = items.filter(
        (i: any) => !removedItems.some((r: any) => r.id === i.id)
      );
    }),
    isInitialized: jest.fn(() => true),
    init: jest.fn(async () => {}),
  };
  Object.defineProperty(coll, 'length', {
    get: () => items.length,
    configurable: true,
  });
  return coll;
}

describe('ScheduleService - Waitlist and Booking Limits logic', () => {
  let scheduleService: ScheduleService;
  let mockEntityManager: any;
  let mockScheduleRepo: any;
  let scheduleOptions: any;

  beforeEach(() => {
    mockScheduleRepo = {
      findOne: jest.fn(),
    };

    mockEntityManager = {
      getRepository: jest.fn(() => mockScheduleRepo),
      findOne: jest.fn(),
      persist: jest.fn(),
      flush: jest.fn(async () => {}),
    };

    scheduleService = new ScheduleService(mockEntityManager as any);

    scheduleOptions = {
      id: 'opt-1',
      maxActiveReservations: 2,
      sameDayBookingAllowed: false,
      maxAdvanceBookingDays: 7,
    };
  });

  describe('addUserToSchedule', () => {
    it('should throw error when max active reservations are reached', async () => {
      const currentUser = { id: 'user-1', contextRole: UserRoleEnum.STANDARD };

      const user = new User({} as any);
      user.id = 'user-1';
      user.schedules = createMockCollection([
        { id: 'sch-old-1', state: ScheduleState.AVAILABLE },
        { id: 'sch-old-2', state: ScheduleState.AVAILABLE },
      ]);
      user.waitListSchedules = createMockCollection([]);

      const schedule = new Schedule({
        startDate: moment().add(1, 'day').valueOf(),
        maxUsers: 5,
        admin: { id: 'admin-1' } as any,
      } as any);
      schedule.id = 'sch-new';
      schedule.state = ScheduleState.AVAILABLE;
      schedule.users = createMockCollection([]);
      schedule.waitListUsers = createMockCollection([]);

      mockEntityManager.findOne.mockImplementation((entity: any) => {
        if (entity === User) return user;
        if (entity === Company) return { scheduleOptions };
        return null;
      });
      mockScheduleRepo.findOne.mockResolvedValue(schedule);

      await expect(
        scheduleService.addUserToSchedule(currentUser as any, 'sch-new')
      ).rejects.toThrow(ValidationError);
    });

    it('should throw error when same day booking is not allowed and user already has a booking that day', async () => {
      const currentUser = { id: 'user-1', contextRole: UserRoleEnum.STANDARD };

      const user = new User({} as any);
      user.id = 'user-1';
      const today = moment().add(1, 'day');
      user.schedules = createMockCollection([
        {
          id: 'sch-old-1',
          state: ScheduleState.AVAILABLE,
          startDate: today.valueOf(),
        },
      ]);
      user.waitListSchedules = createMockCollection([]);

      const schedule = new Schedule({
        startDate: today.clone().add(2, 'hours').valueOf(),
        maxUsers: 5,
        admin: { id: 'admin-1' } as any,
      } as any);
      schedule.id = 'sch-new';
      schedule.state = ScheduleState.AVAILABLE;
      schedule.users = createMockCollection([]);
      schedule.waitListUsers = createMockCollection([]);

      mockEntityManager.findOne.mockImplementation((entity: any) => {
        if (entity === User) return user;
        if (entity === Company) return { scheduleOptions };
        return null;
      });
      mockScheduleRepo.findOne.mockResolvedValue(schedule);

      await expect(
        scheduleService.addUserToSchedule(currentUser as any, 'sch-new')
      ).rejects.toThrow(ValidationError);
    });

    it('should clean up other waitlists when user reaches limits by booking', async () => {
      const currentUser = { id: 'user-1', contextRole: UserRoleEnum.STANDARD };

      const user = new User({} as any);
      user.id = 'user-1';

      const oldSchedule = { id: 'sch-old-1', state: ScheduleState.AVAILABLE };
      user.schedules = createMockCollection([oldSchedule]);

      const waitlistSchedule1 = {
        id: 'sch-wait-1',
        startDate: moment().add(2, 'days').valueOf(),
        waitListUsers: createMockCollection([{ id: 'user-1' }]),
      };

      const waitlistSchedule2 = {
        id: 'sch-wait-2',
        startDate: moment().add(3, 'days').valueOf(),
        waitListUsers: createMockCollection([{ id: 'user-1' }]),
      };

      user.waitListSchedules = createMockCollection([
        waitlistSchedule1,
        waitlistSchedule2,
      ]);

      const schedule = new Schedule({
        startDate: moment().add(1, 'day').valueOf(),
        maxUsers: 5,
        admin: { id: 'admin-1' } as any,
      } as any);
      schedule.id = 'sch-new';
      schedule.state = ScheduleState.AVAILABLE;
      schedule.users = createMockCollection([]);
      schedule.waitListUsers = createMockCollection([]);

      mockEntityManager.findOne.mockImplementation((entity: any) => {
        if (entity === User) return user;
        if (entity === Company) return { scheduleOptions };
        return null;
      });
      mockScheduleRepo.findOne.mockResolvedValue(schedule);

      const response = await scheduleService.addUserToSchedule(
        currentUser as any,
        'sch-new'
      );

      expect(response.success).toBe(true);
      // Limits reached: max reservations = 2.
      // So user should be removed from all other waitlists!
      expect(waitlistSchedule1.waitListUsers.getItems().length).toBe(0);
      expect(waitlistSchedule2.waitListUsers.getItems().length).toBe(0);
      expect(mockEntityManager.persist).toHaveBeenCalledWith(waitlistSchedule1);
      expect(mockEntityManager.persist).toHaveBeenCalledWith(waitlistSchedule2);
    });
  });

  describe('removeUserFromSchedule & promotion', () => {
    it('should promote the next valid user from waitlist and skip invalid ones', async () => {
      const currentUser = { id: 'user-admin', contextRole: UserRoleEnum.ADMIN };

      const userToRemove = new User({} as any);
      userToRemove.id = 'user-to-remove';

      // User 1 on waitlist: has reached limits (2 bookings), should be skipped and cleaned up
      const waitlistUser1 = new User({} as any);
      waitlistUser1.id = 'user-wl-1';
      waitlistUser1.schedules = createMockCollection([
        { id: 's1', state: ScheduleState.AVAILABLE },
        { id: 's2', state: ScheduleState.AVAILABLE },
      ]);
      const otherWaitlistSchedule = {
        id: 'sch-other-wait',
        startDate: moment().add(2, 'days').valueOf(),
        waitListUsers: createMockCollection([{ id: 'user-wl-1' }]),
      };
      waitlistUser1.waitListSchedules = createMockCollection([
        otherWaitlistSchedule,
      ]);

      // User 2 on waitlist: valid, should be promoted
      const waitlistUser2 = new User({} as any);
      waitlistUser2.id = 'user-wl-2';
      waitlistUser2.schedules = createMockCollection([]);
      waitlistUser2.waitListSchedules = createMockCollection([]);

      const schedule = new Schedule({
        startDate: moment().add(1, 'day').valueOf(),
        maxUsers: 5,
        admin: { id: 'admin-1' } as any,
      } as any);
      schedule.id = 'sch-target';
      schedule.state = ScheduleState.AVAILABLE;

      // Initially schedule contains userToRemove, and others on waitlist
      schedule.users = createMockCollection([userToRemove]);
      schedule.waitListUsers = createMockCollection([
        waitlistUser1,
        waitlistUser2,
      ]);

      mockScheduleRepo.findOne.mockResolvedValue(schedule);

      mockEntityManager.findOne.mockImplementation(
        (entity: any, query: any) => {
          if (entity === User) {
            if (query.id === 'user-to-remove') return userToRemove;
            if (query.id === 'user-wl-1') return waitlistUser1;
            if (query.id === 'user-wl-2') return waitlistUser2;
          }
          if (entity === Company) return { scheduleOptions };
          return null;
        }
      );

      // Call removeUserFromSchedule
      const response = await scheduleService.removeUserFromSchedule(
        currentUser as any,
        'sch-target',
        'user-to-remove'
      );

      expect(response.success).toBe(true);

      // User 1 should be removed from schedule waitlist and from otherWaitlistSchedule waitlist
      expect(
        schedule.waitListUsers.getItems().some((u: any) => u.id === 'user-wl-1')
      ).toBe(false);
      expect(otherWaitlistSchedule.waitListUsers.getItems().length).toBe(0);
      expect(mockEntityManager.persist).toHaveBeenCalledWith(
        otherWaitlistSchedule
      );

      // User 2 should be promoted to users
      expect(
        schedule.users.getItems().some((u: any) => u.id === 'user-wl-2')
      ).toBe(true);
      expect(
        schedule.waitListUsers.getItems().some((u: any) => u.id === 'user-wl-2')
      ).toBe(false);
    });
  });
});
