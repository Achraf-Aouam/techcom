"use client";

import { Card } from "@/components/ui/card";
import { DataTable } from "@/components/data_table";
import { columns } from "./attendeesTablecolumns";
import { Event } from "@/lib/schemas.server";
import { Button } from "@/components/ui/button";
import { User } from "@/lib/schemas.client";
import { ReusableDialog } from "./reusableDialog";

interface EventDetailsPageProps {
  eventData: Event;
  attendanceData: User[];
  stats: {
    total_attendance: number;
    attendance_rate: number;
    member_attendance_rate: number;
    non_member_attendance: number;
  };
}

export default function EventDetailsPage({
  eventData,
  attendanceData,
  stats,
}: EventDetailsPageProps) {
  return (
    <div className="p-6 space-y-8">
      <Card className="p-6 flex flex-col md:flex-row items-center gap-6 shadow-lg">
        {eventData.image_url && (
          <ReusableDialog
            title="Image Preview"
            trigger={
              <img
                src={eventData.image_url}
                alt={eventData.name}
                className="w-32 h-32 object-cover rounded-lg border"
              />
            }
          >
            <img
              src={eventData.image_url}
              alt={eventData.name}
              className="w-full h-full  rounded-lg border"
            />
          </ReusableDialog>
        )}
        <div className="flex-1 w-full">
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
          <div className="mb-2">
            <span className="font-semibold">End:</span>{" "}
            {eventData.end_time
              ? new Date(eventData.end_time).toLocaleString()
              : "N/A"}
          </div>
          <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="border-2 rounded-lg p-3 text-center">
              <div className="text-sm text-gray-50">Total Attendance</div>
              <div className="text-lg font-bold">{stats.total_attendance}</div>
            </div>
            <div className="border-2 rounded-lg p-3 text-center">
              <div className="text-sm text-gray-50">Attendance Rate</div>
              <div className="text-lg font-bold">{stats.attendance_rate}%</div>
            </div>
            <div className=" border-2 rounded-lg p-3 text-center">
              <div className="text-sm text-gray-50">Member Attendance Rate</div>
              <div className="text-lg font-bold">
                {stats.member_attendance_rate}%
              </div>
            </div>
            <div className="border-2 rounded-lg p-3 text-center">
              <div className="text-sm text-gray-50">Non-Member Attendance</div>
              <div className="text-lg font-bold">
                {stats.non_member_attendance}
              </div>
            </div>
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
