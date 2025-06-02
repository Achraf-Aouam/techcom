"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef, Row } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { useAuth } from "@/contexts/AuthContext";
import { ClubInDb } from "@/lib/types";

export const columns: ColumnDef<ClubInDb>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "description",
    header: "Description",
  },
  {
    accessorKey: "is_active",
    header: "Active",
    cell: ({ row }: { row: Row<ClubInDb> }) =>
      row.original.is_active ? "Yes" : "No",
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }: { row: Row<ClubInDb> }) =>
      new Date(row.original.created_at).toLocaleDateString(),
  },
];

export default function AdminClubsPage() {
  const [clubs, setClubs] = useState<ClubInDb[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { token } = useAuth();

  useEffect(() => {
    const fetchClubs = async () => {
      if (!token) {
        setError("Authentication token not found.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch("http://127.0.0.1:8000/api/v1/clubs/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch clubs: ${response.statusText}`);
        }
        const data = await response.json();
        setClubs(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchClubs();
  }, [token]);

  const handleRowClick = (club: ClubInDb) => {
    router.push(`/admin/clubs/${club.id}`);
  };

  if (loading) return <p>Loading clubs...</p>;
  if (error) return <p>Error loading clubs: {error}</p>;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Manage Clubs</h1>
      <DataTable
        columns={columns}
        data={clubs}
        onRowClick={handleRowClick}
        createNewLabel="Create New Club"
        createNewPath="/admin/clubs/new"
      />
    </div>
  );
}
