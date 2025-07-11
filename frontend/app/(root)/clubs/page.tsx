import ClubCard from "@/components/clubCard";

import { ReusableDialog } from "@/components/reusableDialog";
import { CreateButton } from "@/components/createButton";
import ClubForm from "@/components/clubForm";

const ClubsPage = async () => {
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_API_BASE_URL}/clubs?active_only=False`
  );
  const data: Array<any> = await response.json();
  console.log(data);
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
};

export default ClubsPage;
