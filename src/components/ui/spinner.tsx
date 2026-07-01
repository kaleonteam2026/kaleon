import { cn } from "@/lib/utils"
import { KaleonLoader } from "./kaleon-loader"

function Spinner({ className, ...props }: React.ComponentProps<"span">) {
  return (
    <KaleonLoader
      role="status"
      aria-label="Loading"
      className={cn("", className)}
      {...(props as Record<string, unknown>)}
    />
  )
}

export { Spinner }
