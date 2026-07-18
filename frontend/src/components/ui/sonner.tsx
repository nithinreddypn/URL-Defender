import { Toaster as Sonner } from "sonner";
import { CheckCircle2, AlertTriangle, ShieldAlert, Info, Loader2, X } from "lucide-react";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      position="top-right"
      offset={20}
      gap={12}
      visibleToasts={4}
      closeButton
      icons={{
        success: (
          <CheckCircle2
            className="urld-toast__svg urld-toast__svg--success h-[20px] w-[20px]"
            strokeWidth={2.25}
          />
        ),
        error: (
          <ShieldAlert
            className="urld-toast__svg urld-toast__svg--error h-[20px] w-[20px]"
            strokeWidth={2.25}
          />
        ),
        warning: (
          <AlertTriangle
            className="urld-toast__svg urld-toast__svg--warning h-[20px] w-[20px]"
            strokeWidth={2.25}
          />
        ),
        info: (
          <Info
            className="urld-toast__svg urld-toast__svg--info h-[20px] w-[20px]"
            strokeWidth={2.25}
          />
        ),
        loading: <Loader2 className="h-[20px] w-[20px] animate-spin" strokeWidth={2.25} />,
        close: <X className="h-3.5 w-3.5" strokeWidth={2.5} />,
      }}
      toastOptions={{
        duration: 4200,
        classNames: {
          toast: "urld-toast",
          title: "urld-toast__title",
          description: "urld-toast__desc",
          icon: "urld-toast__icon",
          content: "urld-toast__content",
          closeButton: "urld-toast__close",
          actionButton: "urld-toast__action",
          cancelButton: "urld-toast__cancel",
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
