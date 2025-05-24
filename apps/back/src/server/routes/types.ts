import type { Hono } from "hono";
import type { HandlerInterface } from "hono/types";

export interface RouteDefinition<
  Env extends Record<string, unknown> = Record<string, unknown>
> {
  path: string;
  method: "get" | "post" | "put" | "delete" | "options" | "patch";
  handler: HandlerInterface<Env>;
}
