import MyClubView from "@/components/myClubView";
import { getClubStatsById, getmyclub } from "@/lib/actions";

const MyClubPage = async () => {
  const data = await getmyclub();
  const stats = await getClubStatsById(data.id);
  return <MyClubView myClub={data} stats={stats} />;
};

export default MyClubPage;
