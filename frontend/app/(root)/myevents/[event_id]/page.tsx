import EventDetailsPage from "@/components/EventDetailsPage";
import { getAttendanceById, getEventById } from "@/lib/actions";

const EventPage = async ({ params }: { params: { event_id: string } }) => {
  const { event_id } = await params;
  const eventData = await getEventById(Number(event_id));
  const attendanceData = await getAttendanceById(Number(event_id));
  return (
    <EventDetailsPage eventData={eventData} attendanceData={attendanceData} />
  );
};

export default EventPage;
