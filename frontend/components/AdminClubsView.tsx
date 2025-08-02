import ClubCard from "@/components/clubCard";
import { ReusableDialog } from "@/components/reusableDialog";
import { CreateButton } from "@/components/createButton";
import ClubForm from "@/components/clubForm";
import { getClubs } from "@/lib/actions";

export default async function AdminClubsView() {
  const data = await getClubs({ active_only: false });
  return (
    <div className="p-4">
      <div className="pt-3 justify-end pr-8 pl-8">
        <ReusableDialog trigger={<CreateButton />} title="Create a club">
          <ClubForm />
        </ReusableDialog>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {data.map((x) => (
          <ClubCard key={x.id} {...x} />
        ))}
      </div>
    </div>
  );
}
