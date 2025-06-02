"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { ColumnDef, Row } from "@tanstack/react-table";
import { DataTable } from "@/components/ui/data-table";
import { useAuth } from "@/contexts/AuthContext";
import { UserInDb } from "@/lib/types";

export const columns: ColumnDef<UserInDb>[] = [
  {
    accessorKey: "id",
    header: "ID",
  },
  {
    accessorKey: "student_id",
    header: "Student ID",
  },
  {
    accessorKey: "name",
    header: "Name",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
  {
    accessorKey: "role",
    header: "Role",
  },
  {
    accessorKey: "wants_email_notif",
    header: "Email Notifications",
    cell: ({ row }: { row: Row<UserInDb> }) =>
      row.original.wants_email_notif ? "Yes" : "No",
  },
  {
    accessorKey: "created_at",
    header: "Created At",
    cell: ({ row }: { row: Row<UserInDb> }) =>
      new Date(row.original.created_at).toLocaleDateString(),
  },
];

export default function AdminMembersPage() {
  const [members, setMembers] = useState<UserInDb[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();
  const { token } = useAuth();

  useEffect(() => {
    const fetchMembers = async () => {
      if (!token) {
        setError("Authentication token not found.");
        setLoading(false);
        return;
      }
      try {
        const response = await fetch("http://127.0.0.1:8000/api/v1/users/", {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (!response.ok) {
          throw new Error(`Failed to fetch members: ${response.statusText}`);
        }
        const data = await response.json();
        setMembers(data);
      } catch (err: any) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [token]);

  const handleRowClick = (member: UserInDb) => {
    router.push(`/admin/members/${member.id}`);
  };

  if (loading) return <p>Loading members...</p>;
  if (error) return <p>Error loading members: {error}</p>;

  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-4">Manage Members</h1>
      <DataTable
        columns={columns}
        data={members}
        onRowClick={handleRowClick}
        createNewLabel="Create New Member"
        createNewPath="/admin/members/new"
      />
    </div>
  );
}
