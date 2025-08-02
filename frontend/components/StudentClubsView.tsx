import ClubCard from "@/components/clubCard";
import { getClubs } from "@/lib/actions";
import { Club } from "@/lib/schemas.server";

export default async function StudentClubsView() {
  // Only show active clubs to students
  const data: Club[] = await getClubs({ active_only: true });
  return (
    <div className="p-4">
      <h2 className="text-2xl font-bold mb-4">Active Clubs</h2>
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
        {data.map((x) => (
          <ClubCard key={x.id} {...x} />
        ))}
      </div>
    </div>
  );
}
