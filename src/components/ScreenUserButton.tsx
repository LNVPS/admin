import { ShieldExclamationIcon } from "@heroicons/react/24/outline";
import { useState } from "react";
import { useAdminApi } from "../hooks/useAdminApi";
import { toastService } from "../services/toastService";
import { Button } from "./Button";

export function ScreenUserButton({ userId }: { userId: number }) {
  const adminApi = useAdminApi();
  const [screening, setScreening] = useState(false);

  const handleScreen = async () => {
    setScreening(true);
    try {
      const out = await adminApi.screenUser(userId);
      const summary = out.held
        ? "Orders are on hold, review the new matches"
        : out.review
          ? "Flagged for review, nothing is held"
          : "No matches";
      toastService.success("Screening done", `${summary}. New matches: ${out.new_matches.length}`);
    } catch (e) {
      toastService.error("Failed to screen customer", e instanceof Error ? e.message : undefined);
    } finally {
      setScreening(false);
    }
  };

  return (
    <Button
      size="sm"
      variant="secondary"
      onClick={handleScreen}
      disabled={screening}
      className="flex items-center gap-1.5"
    >
      <ShieldExclamationIcon className="h-3.5 w-3.5" />
      <span>{screening ? "Screening..." : "Screen now"}</span>
    </Button>
  );
}
