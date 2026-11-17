import { cn } from "../../lib/utils"
import lucide from "lucide-react"
// Spacefast serves lucide as one default export, so pick icons off it.
const { Loader2Icon } = lucide as any

function Spinner({ className, ...props }: React.ComponentProps<"svg">) {
  return (
    <Loader2Icon data-slot="spinner" role="status" aria-label="Loading" className={cn("size-4 animate-spin", className)} {...props} />
  )
}

export { Spinner }
