import ClubCard from "@/components/clubCard";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { ReusableDialog } from "@/components/reusableDialog";
import { CreateButton } from "@/components/createButton";
import ClubForm from "@/components/clubForm";

const ClubsPage = async () => {
  const response = await fetch(`${process.env.NEXT_PUBLIC_API_BASE_URL}/clubs`);
  const data: Array<any> = await response.json();
  console.log(data);
  return (
    <div className="p-4">
      <div className="pt-3 justify-end pr-8 pl-8">
        <ReusableDialog trigger={<CreateButton />} title="Test">
          <ClubForm />
        </ReusableDialog>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {data.map((x) => (
          <ClubCard {...x} />
        ))}
      </div>
    </div>
  );
};

export default ClubsPage;
