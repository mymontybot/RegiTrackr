import { deadlineRefreshJob } from "@/inngest/jobs/deadline-refresh.job";
import {
  narrativeCacheRefreshCronJob,
  narrativeCacheRefreshEventJob,
} from "@/inngest/jobs/narrative-cache-refresh.job";
import {
  nexusRecalculationCronJob,
  nexusRecalculationEventJob,
} from "@/inngest/jobs/nexus-recalculation.job";
import { reminderDispatchJob } from "@/inngest/jobs/reminder-dispatch.job";
import { thresholdMonitorAllJob } from "@/inngest/jobs/threshold-monitor-all.job";
import { thresholdMonitorStateJob } from "@/inngest/jobs/threshold-monitor.job";

export const inngestFunctions = [
  nexusRecalculationCronJob,
  nexusRecalculationEventJob,
  deadlineRefreshJob,
  reminderDispatchJob,
  narrativeCacheRefreshCronJob,
  narrativeCacheRefreshEventJob,
  thresholdMonitorAllJob,
  thresholdMonitorStateJob,
];
