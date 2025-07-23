"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Event } from "@/lib/schemas.server";
import { ReusableDialog } from "@/components/reusableDialog";
import { Button } from "@/components/ui/button";
import EventReviewCard from "@/components/eventReviewCard";

export const columns: ColumnDef<Event>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "description",
    header: "description",
  },
  {
    accessorKey: "start_time",
    header: () => <div className="text-right pr-2">Start Time</div>,
    cell: ({ row }) => {
      const datetime: string | null = row.getValue("start_time");
      if (!datetime) {
        return <div className="text-right pr-2 text-gray-500 italic">N/A</div>;
      }
      const date = new Date(datetime);
      const formatted = date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return <div className="text-right pr-2">{formatted}</div>;
    },
  },
  {
    id: "fulldetails",
    header: "Full Details",
    cell: ({ row }) => {
      const rowdata = row.original;
      return (
        <ReusableDialog
          title="Event Review"
          trigger={<Button variant={"outline"}>Show details</Button>}
        >
          <EventReviewCard data={rowdata} />
        </ReusableDialog>
      );
    },
  },
];
