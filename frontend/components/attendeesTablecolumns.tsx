import { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { User } from "@/lib/schemas.client";

export const columns: ColumnDef<User>[] = [
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "student_id",
    header: "Student ID",
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const value: string = row.getValue("status");
      const getStatusStyle = (status: string) => {
        switch (status.toUpperCase()) {
          case "ATTENDED":
            return "bg-green-100 text-green-800";
          case "ABSENT":
            return "bg-red-100 text-red-800";
          default:
            return "bg-gray-100 text-gray-800";
        }
      };
      return (
        <Button disabled className={getStatusStyle(value)}>
          {value}
        </Button>
      );
    },
  },
  {
    accessorKey: "attended_at",
    header: "Attended At",
    cell: ({ row }) => {
      const datetime: string | null = row.getValue("attended_at");
      if (!datetime) {
        return <span className="text-gray-500 italic">N/A</span>;
      }
      const date = new Date(datetime);
      const formatted = date.toLocaleString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
      return <span>{formatted}</span>;
    },
  },
];
