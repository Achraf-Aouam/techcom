"use client";

import * as React from "react";
import { Toaster as Sonner, toast as sonnerToast } from "sonner";

type ToasterProps = React.ComponentProps<typeof Sonner>;

const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      className="toaster group"
      toastOptions={{
        classNames: {
          toast:
            "group toast group-[.toaster]:bg-background group-[.toaster]:text-foreground group-[.toaster]:border-border group-[.toaster]:shadow-lg",
          description: "group-[.toast]:text-muted-foreground",
          actionButton:
            "group-[.toast]:bg-primary group-[.toast]:text-primary-foreground",
          cancelButton:
            "group-[.toast]:bg-muted group-[.toast]:text-muted-foreground",
        },
      }}
      {...props}
    />
  );
};

// Custom toast function to include status code
const toast = (
  message: string,
  options?: {
    status?: number;
    description?: string;
    action?: { label: string; onClick: () => void };
  }
) => {
  const fullMessage = options?.status
    ? `Error ${options.status}: ${message}`
    : message;
  if (options?.status && options.status >= 400) {
    sonnerToast.error(fullMessage, {
      description: options.description,
      action: options.action,
    });
  } else {
    sonnerToast(fullMessage, {
      description: options.description,
      action: options.action,
    });
  }
};

export { Toaster, toast };
