import { useState, useEffect } from "react";
import {
  jobHistoryService,
  JobHistoryEntry,
} from "../services/jobHistoryService";

export function useJobHistory() {
  const [jobs, setJobs] = useState<JobHistoryEntry[]>([]);

  useEffect(() => {
    const unsubscribe = jobHistoryService.subscribe(setJobs);
    return unsubscribe;
  }, []);

  return {
    jobs,
    getJob: (jobId: string) => jobHistoryService.getJob(jobId),
    clearHistory: () => jobHistoryService.clearHistory(),
    getStatistics: () => jobHistoryService.getStatistics(),
  };
}
