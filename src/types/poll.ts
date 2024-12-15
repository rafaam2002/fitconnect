import { Poll } from "../entities/Poll";

export type PollAndSelection = {
    poll: Poll;
    OptionSelected: number | null;
}
