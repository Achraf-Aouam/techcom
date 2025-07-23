import { Event } from "@/lib/schemas.server";
import { DataTable } from "./data_table";
import { columns } from "./adminEventsColumns";
import { getAdminEvents } from "@/lib/actions";

export default async function eventsPage() {
  const data: Array<Event> = await getAdminEvents({
    status_filter: "PENDING",
  });

  return (
    <div className="p-4">
      <div className="container mx-auto py-10">
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
}
