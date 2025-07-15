import { Event } from "@/lib/schemas.server";
import { getBearerToken } from "@/lib/session";
import { DataTable } from "./data_table";
import { columns } from "./columns";

export default async function eventsPage() {
  const token = await getBearerToken();
  const events = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data: Array<Event> = await events.json();

  return (
    <div className="p-4">
      <div className="container mx-auto py-10">
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
}
