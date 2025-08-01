import { Event } from "@/lib/schemas.server";
import { DataTable } from "./data_table";
import { columns } from "./adminEventsColumns";
import { getEvents } from "@/lib/actions";
import { useAuth } from "@/context/AuthContext";
import EventsDisplay from "@/components/eventsDisplay";

export default async function eventsPage() {
  const { user } = useAuth();
  const is_admin = user?.role === "SAO_ADMIN";
  const data: Array<Event> = is_admin
    ? await getEvents({
        status_filter: "PENDING",
      })
    : await getEvents();

  return (
    <div className="p-4">
      <div className="container mx-auto py-10">
        {is_admin ? (
          <DataTable columns={columns} data={data} />
        ) : (
          <EventsDisplay data={data} />
        )}
      </div>
    </div>
  );
}
