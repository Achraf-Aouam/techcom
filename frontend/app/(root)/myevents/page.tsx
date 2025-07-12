import { Event } from "@/lib/schemas";
import { DataTable } from "../../../components/data_table";
import { columns } from "./myEventsColumns";
import { ReusableDialog } from "@/components/reusableDialog";
import { CreateButton } from "@/components/createButton";
import EventForm from "@/components/eventForm";
import { getManagedClubEvents } from "@/lib/actions";

export default async function myEventsPage() {
  const data: Array<Event> = await getManagedClubEvents();

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
