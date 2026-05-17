import { supabase } from "@/integrations/supabase/client";
import type { ExecutionContext, ExecutionResult } from "../types";
import { hubEvents } from "./execution-events";

/**
 * Single canonical entrypoint: runs an ExecutionContext through the
 * `ai-command-execute` edge function. All Hub UIs should call this rather
 * than invoking the edge function directly.
 */
export async function routeAIRequest(ctx: ExecutionContext): Promise<ExecutionResult> {
  hubEvents.emit("execution-started", { route: ctx.route });
  const { data, error } = await supabase.functions.invoke("ai-command-execute", {
    body: {
      thread_id: ctx.threadId,
      message: ctx.message,
      route: ctx.route,
    },
  });
  if (error) {
    const result: ExecutionResult = {
      ok: false,
      thread_id: ctx.threadId,
      reply: `⚠️ ${error.message}`,
      elapsed_ms: 0,
      provider: ctx.route.provider,
      model: ctx.route.model,
      agent: ctx.route.agent,
      execution_id: null,
      status: "failed",
      error: error.message,
    };
    hubEvents.emit("execution-completed", { ok: false, reply: result.reply });
    return result;
  }
  const result = data as ExecutionResult;
  hubEvents.emit("execution-completed", { ok: !!result?.ok, reply: result?.reply ?? "" });
  return result;
}

/**
 * Tool execution surface (read-only inspection). Routes through
 * `ai-hub-tools` edge function so secrets stay server-side.
 */
export async function executeToolCall(name: string, args: Record<string, unknown> = {}): Promise<unknown> {
  const { data, error } = await supabase.functions.invoke("ai-hub-tools", {
    body: { name, args },
  });
  if (error) throw error;
  if (!data?.ok) throw new Error(data?.error ?? "tool execution failed");
  return data.result;
}
