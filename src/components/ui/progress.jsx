import * as React from "react"

import { cn } from "@/lib/utils"

function Progress({
  className,
  value,
  ...props
}) {
  return (
    <div
      data-slot="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={value || 0}
      className={cn(
        "relative flex h-1 w-full items-center overflow-x-hidden rounded-full bg-gray-800",
        className
      )}
      {...props}>
      <div
        data-slot="progress-indicator"
        className="h-full w-full flex-1 bg-primary transition-all"
        style={{ transform: `translateX(-${100 - (value || 0)}%)` }} />
    </div>
  );
}

export { Progress }
