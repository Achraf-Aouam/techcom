import EventDetailsPage from "@/components/EventDetailsPage";
import { getAttendanceById, getEventById, getEventStats } from "@/lib/actions";

const EventPage = async ({ params }: { params: { event_id: string } }) => {
  const { event_id } = await params;
  const eventData = await getEventById(Number(event_id));
  const attendanceData = await getAttendanceById(Number(event_id));
  const stats = await getEventStats(Number(event_id));
  return (
    <EventDetailsPage
      eventData={eventData}
      attendanceData={attendanceData}
      stats={stats}
    />
  );
};

export default EventPage;
