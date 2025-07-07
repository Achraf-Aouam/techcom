"use client";

import { ColumnDef } from "@tanstack/react-table";

import { Event } from "@/lib/schemas";

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
    header: "Status",
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "start_time",
    header: "Start Time",
  },
];
