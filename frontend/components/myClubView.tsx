"use client";
import { Club } from "@/lib/schemas.server";
import { FunctionComponent, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ReusableDialog } from "@/components/reusableDialog";
import { Button } from "@/components/ui/button";
import { Pencil } from "lucide-react";
import EditClubForm from "@/components/editClubForm";
import { useRouter } from "next/navigation";

interface MyClubViewprops {
  myClub: Club;
  stats: {
    total_events: number;
    total_members: number;
    avg_attendance_per_event: number;
  };
}

const MyClubView: FunctionComponent<MyClubViewprops> = ({ myClub, stats }) => {
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const router = useRouter();

  const handleEditSuccess = () => {
    setIsEditDialogOpen(false);
    router.refresh(); // Refresh the page to show updated data
  };

  const displayStats = [
    { label: "Events", value: stats.total_events },
    { label: "Members", value: stats.total_members },
    { label: "Avg Attendance", value: stats.avg_attendance_per_event },
  ];
  return (
    <div className="min-h-screen  bg-muted flex flex-col items-center py-10">
      <div className="w-full  max-w-6xl bg-background rounded-xl shadow-lg p-8 flex flex-col gap-8">
        <div className="flex flex-col md:flex-row gap-8 items-center">
          <ReusableDialog
            trigger={
              <img
                src={myClub.image_url || "/placeholder.svg"}
                alt={myClub.name}
                className="w-40 h-40 object-cover rounded-xl border"
              />
            }
            title={myClub.name}
            contentClassName="max-w-2xl"
            showCloseButton
          >
            <img
              src={myClub.image_url || "/placeholder.svg"}
              alt={myClub.name}
              className="w-full h-auto rounded-xl"
            />
          </ReusableDialog>
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex items-center justify-between">
              <h1 className="text-3xl font-bold">{myClub.name}</h1>
              <ReusableDialog
                open={isEditDialogOpen}
                onOpenChange={setIsEditDialogOpen}
                trigger={
                  <Button variant="outline" size="sm">
                    <Pencil className="h-4 w-4 mr-2" />
                    Edit Club
                  </Button>
                }
                title="Edit Club"
                contentClassName="max-w-md"
              >
                <EditClubForm club={myClub} onSuccess={handleEditSuccess} />
              </ReusableDialog>
            </div>
            <p className="text-muted-foreground">
              {myClub.description || "No description provided."}
            </p>
            <div className="flex gap-2 mt-2">
              {myClub.is_active && (
                <span className="px-2 py-1 text-xs rounded bg-green-100 text-green-800">
                  Active
                </span>
              )}
              {myClub.color_code && (
                <span
                  className="w-5 h-5 rounded-full border"
                  style={{ backgroundColor: myClub.color_code }}
                  title="Club color"
                />
              )}
            </div>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          {displayStats.map((stat) => (
            <Card key={stat.label} className="flex-1">
              <CardHeader>
                <CardTitle className="text-center text-lg">
                  {stat.label}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-center">
                  {stat.value}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
        <div className="text-xs text-muted-foreground text-right">
          Created: {new Date(myClub.created_at).toLocaleDateString()} | Updated:{" "}
          {new Date(myClub.updated_at).toLocaleDateString()}
        </div>
      </div>
    </div>
  );
};

export default MyClubView;
