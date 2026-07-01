import { cn } from "@/lib/utils";

interface KaleonLoaderProps {
  className?: string;
  size?: number;
}

/**
 * A three-dot bouncing loader using CSS pseudo-elements.
 * Replaces Lucide Loader2 / animate-spin throughout the app.
 */
export function KaleonLoader({ className, size = 15 }: KaleonLoaderProps) {
  return (
    <span
      className={cn("kaleon-loader", className)}
      role="status"
      aria-label="Loading"
      style={{ width: size, height: size }}
    />
  );
}
