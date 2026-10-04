import { useMode } from "@/lib/theme"
import { Toaster as Sonner, type ToasterProps } from "sonner"
import { CheckCircleIcon, InformationCircleIcon, ExclamationTriangleIcon, XCircleIcon, ArrowPathIcon } from "@heroicons/react/20/solid"

/** Sonner with its own look, following light or dark mode. */
const Toaster = (props: ToasterProps) => {
  const mode = useMode()

  return (
    <Sonner
      theme={mode}
      className="toaster group"
      icons={{
        success: <CheckCircleIcon className="size-5" />,
        info: <InformationCircleIcon className="size-5" />,
        warning: <ExclamationTriangleIcon className="size-5" />,
        error: <XCircleIcon className="size-5" />,
        loading: <ArrowPathIcon className="size-5 animate-spin" />,
      }}
      {...props}
    />
  )
}

export { Toaster }
