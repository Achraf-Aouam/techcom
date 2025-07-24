"use client";

import { Card } from "@/components/ui/card";
import { Table } from "@/components/ui/table";
import { DataTable } from "@/components/data_table";
import { columns } from "./attendeesTablecolumns";
import { Event } from "@/lib/schemas.server";
import { Button } from "@/components/ui/button";
import { User } from "@/lib/schemas.client";

interface EventDetailsPageProps {
  eventData: Event;
  attendanceData: User[];
}

export default function EventDetailsPage({
  eventData,
  attendanceData,
}: EventDetailsPageProps) {
  return (
    <div className="p-6 space-y-8">
      <Card className="p-6 flex flex-col md:flex-row items-center gap-6 shadow-lg">
        {eventData.image_url && (
          <img
            src={eventData.image_url}
            alt={eventData.name}
            className="w-32 h-32 object-cover rounded-lg border"
          />
        )}
        <div className="flex-1">
          <h2 className="text-2xl font-bold mb-2">{eventData.name}</h2>
          <div className="mb-2 text-gray-600">
            {eventData.description || "No description"}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Location:</span>{" "}
            {eventData.location || "N/A"}
          </div>
          <div className="mb-2">
            <span className="font-semibold">Status:</span>{" "}
            <Button disabled className="ml-2">
              {eventData.status}
            </Button>
          </div>
          <div className="mb-2">
            <span className="font-semibold">Start:</span>{" "}
            {eventData.start_time
              ? new Date(eventData.start_time).toLocaleString()
              : "N/A"}
          </div>
          <div>
            <span className="font-semibold">End:</span>{" "}
            {eventData.end_time
              ? new Date(eventData.end_time).toLocaleString()
              : "N/A"}
          </div>
        </div>
      </Card>
      <div>
        <h3 className="text-xl font-semibold mb-4">Attendees</h3>
        <DataTable columns={columns} data={attendanceData} />
      </div>
    </div>
  );
}
