"use client";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import React from "react";

interface ReusableDeleteDialogProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  title?: React.ReactNode;
  description?: React.ReactNode;
  trigger?: React.ReactNode;
  cancelText?: React.ReactNode;
  actionText?: React.ReactNode;
  onAction?: () => void;
  onCancel?: () => void;
  eventId: Number;
}

const ReusableDeleteDialog: React.FunctionComponent<
  ReusableDeleteDialogProps
> = (props) => {
  const {
    open,
    onOpenChange,
    title,
    description,
    trigger,
    cancelText,
    actionText,
    onAction,
    onCancel,
    eventId,
  } = props;

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      <AlertDialogTrigger asChild>{trigger}</AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {title ?? "Are you absolutely sure?"}
          </AlertDialogTitle>
          <AlertDialogDescription>
            {description ??
              `This action cannot be undone. This will permanently delete ${eventId}.`}
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel onClick={onCancel}>
            {cancelText ?? "Cancel"}
          </AlertDialogCancel>
          <AlertDialogAction onClick={onAction}>
            {actionText ?? "Continue"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
};

export default ReusableDeleteDialog;
