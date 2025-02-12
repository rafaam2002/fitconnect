import { Schedule } from "../entities/Schedule";
import { User } from "../entities/User";
import { ScheduleState } from "./enums";

export type ScheduleBooked = Schedule & { isBooked?: boolean };