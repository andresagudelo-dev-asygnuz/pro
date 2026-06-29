// Re-export shared types so existing consumers importing from this file continue to work.
export type { ChatMessage, FullCancha, FullBooking } from "./useMatchDetailData";

import { useMatchDetailData } from "./useMatchDetailData";
import { useMatchDetailActions } from "./useMatchDetailActions";

export function useMatchDetail(matchId: string, userId: string | undefined) {
  const data = useMatchDetailData(matchId, userId);
  const actions = useMatchDetailActions(matchId, userId, data.match, data.waitlist, data.refresh);
  return { ...data, ...actions };
}
