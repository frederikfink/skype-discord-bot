import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { periodLabels, type Period } from "@repo/db/periods";
import Link from "next/link";

const periods: Period[] = ["day", "week", "month", "ytd", "all"];

export function PeriodFilter({ current }: { current: Period }) {
  return (
    <div className="flex flex-wrap justify-center gap-2">
      {periods.map((period) => (
        <Link
          key={period}
          href={period === "all" ? "/" : `/?period=${period}`}
          className={cn(
            buttonVariants({
              variant: "default",
              size: "sm",
            }),
            "xp-btn",
            current === period && "xp-btn-active",
          )}
        >
          {periodLabels[period]}
        </Link>
      ))}
    </div>
  );
}
