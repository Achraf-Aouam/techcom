import { getDecodedToken } from "@/lib/session";
import dynamic from "next/dynamic";

const AdminClubsView = dynamic(() => import("@/components/AdminClubsView"));
const StudentClubsView = dynamic(() => import("@/components/StudentClubsView"));

export default async function ClubsPage() {
  const decodedToken = await getDecodedToken();
  const is_admin = decodedToken?.roles === "SAO_ADMIN";
  // You can add more role checks if needed
  return is_admin ? <AdminClubsView /> : <StudentClubsView />;
}
