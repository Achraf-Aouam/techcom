import { Event } from "@/lib/schemas";
import { getBearerToken, getDecodedToken } from "@/lib/session";
import { DataTable } from "./data_table";
import { columns } from "./columns";
import { ReusableDialog } from "@/components/reusableDialog";
import { CreateButton } from "@/components/createButton";
import EventForm from "@/components/eventForm";

export default async function myEventsPage() {
  const token = await getBearerToken();
  const decodedToken = await getDecodedToken();

  if (!token || !decodedToken) {
    throw new Error("Authentication required.");
  }

  const events = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/events/?club_id=${decodedToken.managed_club}`,
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }
  );
  const data: Array<Event> = await events.json();
  return (
    <div className="p-4">
      <div className="pt-3 justify-end pr-8 pl-8">
        <ReusableDialog trigger={<CreateButton />} title="Test">
          {/* <ClubForm /> */}
          <EventForm />
        </ReusableDialog>
      </div>
      <div className="container mx-auto py-10 px-8">
        <DataTable columns={columns} data={data} />
      </div>
    </div>
  );
}
