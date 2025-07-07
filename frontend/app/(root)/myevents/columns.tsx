"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Event } from "@/lib/schemas";
import { Button } from "@/components/ui/button";
import { ReusableDialog } from "@/components/reusableDialog";

import { MoreHorizontal } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

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
    accessorKey: "status",
    header: () => <div>Status</div>,
    cell: ({ row }) => {
      const value: string = row.getValue("status");
      const getStatusStyle = (status: string) => {
        switch (status) {
          case "ideation".toUpperCase():
            return "bg-blue-100 text-blue-800";
          case "planning".toUpperCase():
            return "bg-purple-100 text-purple-800";
          case "current".toUpperCase():
            return "bg-green-100 text-green-800";
          case "posted".toUpperCase():
            return "bg-orange-100 text-orange-800";
          case "past".toUpperCase():
            return "bg-gray-200 text-gray-700";
          default:
            return "bg-yellow-100 text-yellow-800";
        }
      };
      return (
        <Button disabled className={getStatusStyle(value)}>
          {value}
        </Button>
      );
    },
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "image_url",
    header: "Event image",
    cell: ({ row }) => {
      const imageurl = row.getValue("image_url");
      if (!imageurl) {
        return <span className="text-gray-500 italic">no image yet</span>;
      }
      const preview = (
        <img
          src={imageurl as string}
          alt="Event"
          className="h-12 w-12 object-cover rounded"
        />
      );
      return (
        <ReusableDialog trigger={preview} title="IMAGE">
          <img
            src={imageurl as string}
            alt="Event"
            className=" w-10xl object-cover rounded"
          />
        </ReusableDialog>
      );
    },
  },
  {
    accessorKey: "start_time",
    header: () => <div className="text-right pr-2">Start Time</div>,
    cell: ({ row }) => {
      const datetime: string = row.getValue("start_time");
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
    accessorKey: "end_time",
    header: () => <div className="text-right pr-2">End Time</div>,
    cell: ({ row }) => {
      const datetime: string = row.getValue("end_time");
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
    id: "actions",
    header: "Actions",
    cell: ({ row }) => {
      const payment = row.original;

      return (
        <div className="">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 rotate-90">
                <span className="sr-only">Open menu</span>
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuLabel>Actions</DropdownMenuLabel>
              <DropdownMenuItem
              // onClick={() => navigator.clipboard.writeText(payment.id)}
              >
                Copy payment ID
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem>View customer</DropdownMenuItem>
              <DropdownMenuItem>View payment details</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      );
    },
  },
];
