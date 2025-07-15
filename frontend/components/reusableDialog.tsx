"use client";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ReactNode } from "react";
import { Button } from "./ui/button";

interface DialogProps extends React.ComponentProps<typeof Dialog> {
  trigger: ReactNode;
  title: string;
  description?: string;
  children?: ReactNode;
  footer?: ReactNode;
  className?: string;
  contentClassName?: string;
  showCloseButton?: boolean;
  // open?: boolean;
  // onOpenChange?: (open: boolean) => void;
}

export function ReusableDialog({
  trigger,
  title,
  description,
  children,
  footer,
  className,
  contentClassName = "sm:max-w-md",
  showCloseButton = false,
  // open,
  // onOpenChange,
  ...rest
}: DialogProps) {
  return (
    <Dialog {...rest}>
      <DialogTrigger asChild className={className}>
        {trigger}
      </DialogTrigger>
      <DialogContent className={contentClassName}>
        {(title || description) && (
          <DialogHeader>
            {title && <DialogTitle>{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}
        {children}
        {footer ||
          (showCloseButton && (
            <DialogFooter className="sm:justify-start">
              <DialogClose asChild>
                <Button type="button" variant="secondary">
                  Close
                </Button>
              </DialogClose>
            </DialogFooter>
          ))}
      </DialogContent>
    </Dialog>
  );
}
