import { Factory } from '@mikro-orm/seeder';
import { faker } from '@faker-js/faker';
import { EntityManager } from '@mikro-orm/core';
import { Schedule } from '../entities/Schedule';
import { ScheduleState, ScheduleType } from '../types/enums';
import moment from 'moment';

export class ScheduleFactory extends Factory<Schedule> {
  model = Schedule;

  constructor(em: EntityManager) {
    super(em);
    this.model = Schedule;
  }

  definition(): Partial<Schedule> {
    const startDate = faker.helpers.arrayElement([
      moment(faker.date.past({ years: 1 })).toDate(), // Fecha de hasta 6 meses en el pasado
      moment(faker.date.soon({ days: 14 })).toDate(), // Fecha dentro de los próximos 14 días
    ]);
    // const startDate = moment(faker.date.soon({ days: 14 })).toDate();

    const endDate = moment(startDate).add(1, 'hour').toDate(); // Añadir 1 hora a startDate

    return {
      title: faker.lorem.words(2),
      description: faker.datatype.boolean() ? faker.lorem.sentence() : null,
      startDate,
      endDate,
      age: faker.helpers.arrayElement([null, 14, 18, 6]),
      maxUsers: faker.helpers.rangeToNumber({ min: 15, max: 20 }),
      state: faker.helpers.weightedArrayElement([
        { value: ScheduleState.AVAILABLE, weight: 0.9 },
        { value: ScheduleState.CANCELLED, weight: 0.1 },
      ]),
      type: faker.helpers.arrayElement(Object.values(ScheduleType)),
    };
  }
}
