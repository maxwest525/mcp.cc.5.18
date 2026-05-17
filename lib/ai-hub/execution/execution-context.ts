import type { ExecutionContext, ExecutionRoute } from "../types";

export function buildExecutionContext(args: {
  userId: string;
  message: string;
  route: ExecutionRoute;
  threadId?: string | null;
  knowledgeScope?: string;
}): ExecutionContext {
  return {
    userId: args.userId,
    message: args.message,
    route: args.route,
    threadId: args.threadId ?? null,
    knowledgeScope: args.knowledgeScope,
  };
}
