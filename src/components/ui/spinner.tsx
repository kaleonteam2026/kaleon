import { cn } from "@/lib/utils"
import { KaleonLoader } from "./kaleon-loader"

function Spinner({ className, size }: { className?: string; size?: number }) {
  return (
    <KaleonLoader
      className={cn("", className)}
      size={size}
    />
  )
}

export { Spinner }
