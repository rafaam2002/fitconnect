import { Poll } from "../entities/Poll";

export type PollOptionType = {
    option: string;
    votes: number;
}
export type PollAndSelection = {
    poll: Poll;
    OptionSelected: number | null;
}
