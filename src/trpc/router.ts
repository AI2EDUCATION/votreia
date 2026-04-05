import { router } from "./init";
import { agentsRouter } from "./routers/agents";
import { tasksRouter } from "./routers/tasks";
import { leadsRouter } from "./routers/leads";
import { billingRouter } from "./routers/billing";
import { usageRouter } from "./routers/usage";
import { settingsRouter } from "./routers/settings";
import { notificationsRouter } from "./routers/notifications";
import { profileRouter } from "./routers/profile";

export const appRouter = router({
  agents: agentsRouter,
  tasks: tasksRouter,
  leads: leadsRouter,
  billing: billingRouter,
  usage: usageRouter,
  settings: settingsRouter,
  notifications: notificationsRouter,
  profile: profileRouter,
});

export type AppRouter = typeof appRouter;
