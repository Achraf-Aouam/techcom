"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef, Row } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { useAuth } from "@/contexts/AuthContext";
import { EventInDb } from "@/lib/types";

export const columns: ColumnDef<EventInDb>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "location",
    header: "Location",
  },
  {
    accessorKey: "status",
    header: "Status",
  },
  {
    accessorKey: "club_id",
    header: "Club ID",
  },
  {
    accessorKey: "start_time",
    header: "Start Time",
    cell: ({ row }: { row: Row<EventInDb> }) =>
      row.original.start_time
        ? new Date(row.original.start_time).toLocaleString()
        : "N/A",
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }: { row: Row<EventInDb> }) =>
      new Date(row.original.created_at).toLocaleDateString(),
  },
];

export default function AdminEventsPage() {
  const [events, setEvents] = useState<EventInDb[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { token } = useAuth();

  useEffect(() => {
    const fetchEvents = async () => {
      if (!token) {
        setError("Authentication token not found.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch("http://127.0.0.1:8000/api/v1/events/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch events: ${response.statusText}`);
        }
        const data = await response.json();
        setEvents(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [token]);

  const handleRowClick = (event: EventInDb) => {
    router.push(`/admin/events/${event.id}`);
  };

  if (loading) return <p>Loading events...</p>;
  if (error) return <p>Error loading events: {error}</p>;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Manage Events</h1>
      <DataTable
        columns={columns}
        data={events}
        onRowClick={handleRowClick}
        createNewLabel="Create New Event"
        createNewPath="/admin/events/new"
      />
    </div>
  );
}
