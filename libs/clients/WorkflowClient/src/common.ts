import { initTRPC } from "@trpc/server";

const trpcInstance = initTRPC.create({});

export const appRouter = trpcInstance.router;
export const procedure = trpcInstance.procedure;
