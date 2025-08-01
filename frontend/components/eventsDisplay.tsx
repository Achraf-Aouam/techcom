"use client";

import { Event } from "@/lib/schemas.client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CalendarIcon, MapPinIcon, ClockIcon, FilterIcon } from "lucide-react";
import Image from "next/image";
import { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";

interface EventsDisplayProps {
  data: Event[];
}

type EventFilter = "ALL" | "CURRENT" | "POSTED" | "PAST";

const EventsDisplay: React.FunctionComponent<EventsDisplayProps> = ({
  data,
}) => {
  const [filter, setFilter] = useState<EventFilter>("ALL");

  const getStatusColor = (status: Event["status"]) => {
    switch (status) {
      case "IDEATION":
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
      case "PLANNING":
        return "bg-blue-100 text-blue-800 hover:bg-blue-200";
      case "POSTED":
        return "bg-green-100 text-green-800 hover:bg-green-200";
      case "PENDING":
        return "bg-yellow-100 text-yellow-800 hover:bg-yellow-200";
      case "CURRENT":
        return "bg-orange-100 text-orange-800 hover:bg-orange-200";
      case "PAST":
        return "bg-red-100 text-red-800 hover:bg-red-200";
      default:
        return "bg-gray-100 text-gray-800 hover:bg-gray-200";
    }
  };

  const formatDateTime = (dateString: string | undefined) => {
    if (!dateString) return null;
    const date = new Date(dateString);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Filter and sort events
  const filteredAndSortedEvents = data
    .filter((event) => {
      if (filter === "ALL") {
        // Show only CURRENT and POSTED by default
        return event.status === "CURRENT" || event.status === "POSTED";
      }
      return event.status === filter;
    })
    .sort((a, b) => {
      // Sort by status priority: CURRENT first, then POSTED, then PAST
      const statusPriority = { CURRENT: 1, POSTED: 2, PAST: 3 };
      const aPriority =
        statusPriority[a.status as keyof typeof statusPriority] || 4;
      const bPriority =
        statusPriority[b.status as keyof typeof statusPriority] || 4;

      if (aPriority !== bPriority) {
        return aPriority - bPriority;
      }

      // If same status, sort by start_time (newest first)
      if (a.start_time && b.start_time) {
        return (
          new Date(b.start_time).getTime() - new Date(a.start_time).getTime()
        );
      }

      return 0;
    });

  const getFilterLabel = (filterType: EventFilter) => {
    switch (filterType) {
      case "ALL":
        return "Current & Posted";
      case "CURRENT":
        return "Current Events";
      case "POSTED":
        return "Posted Events";
      case "PAST":
        return "Past Events";
      default:
        return "All Events";
    }
  };

  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center p-8 text-center">
        <div className="text-gray-500">
          <CalendarIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
          <h3 className="text-lg font-medium mb-2">No events found</h3>
          <p className="text-sm">
            There are no events to display at the moment.
          </p>
        </div>
      </div>
    );
  }

  if (filteredAndSortedEvents.length === 0) {
    return (
      <div className="space-y-4">
        {/* Filter Dropdown */}
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Events</h2>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" className="flex items-center gap-2">
                <FilterIcon className="h-4 w-4" />
                {getFilterLabel(filter)}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={() => setFilter("ALL")}>
                Current & Posted
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("CURRENT")}>
                Current Events
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("POSTED")}>
                Posted Events
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => setFilter("PAST")}>
                Past Events
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        <div className="flex items-center justify-center p-8 text-center">
          <div className="text-gray-500">
            <CalendarIcon className="mx-auto h-12 w-12 mb-4 opacity-50" />
            <h3 className="text-lg font-medium mb-2">
              No {getFilterLabel(filter).toLowerCase()} found
            </h3>
            <p className="text-sm">
              Try selecting a different filter to see more events.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {/* Filter Dropdown */}
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">Events</h2>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="outline" className="flex items-center gap-2">
              <FilterIcon className="h-4 w-4" />
              {getFilterLabel(filter)}
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => setFilter("ALL")}>
              Current & Posted
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("CURRENT")}>
              Current Events
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("POSTED")}>
              Posted Events
            </DropdownMenuItem>
            <DropdownMenuItem onClick={() => setFilter("PAST")}>
              Past Events
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Events Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedEvents.map((event) => (
          <Card
            key={event.id}
            className="overflow-hidden hover:shadow-lg transition-shadow duration-300"
          >
            <div className="relative">
              {event.image_url ? (
                <div className="relative h-48 w-full">
                  <Image
                    src={event.image_url}
                    alt={event.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
                  />
                </div>
              ) : (
                <div className="h-48 w-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center">
                  <CalendarIcon className="h-16 w-16 text-gray-400" />
                </div>
              )}
              <div className="absolute top-2 right-2">
                <Badge className={getStatusColor(event.status)}>
                  {event.status.replace("_", " ")}
                </Badge>
              </div>
            </div>

            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-semibold line-clamp-2">
                {event.name}
              </CardTitle>
            </CardHeader>

            <CardContent className="space-y-3">
              {event.description && (
                <p className="text-sm text-gray-600 line-clamp-3">
                  {event.description}
                </p>
              )}

              <div className="space-y-2">
                {event.location && (
                  <div className="flex items-center text-sm text-gray-500">
                    <MapPinIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span className="truncate">{event.location}</span>
                  </div>
                )}

                {event.start_time && (
                  <div className="flex items-center text-sm text-gray-500">
                    <ClockIcon className="h-4 w-4 mr-2 flex-shrink-0" />
                    <span>{formatDateTime(event.start_time)}</span>
                  </div>
                )}

                {event.end_time && event.start_time && (
                  <div className="flex items-center text-sm text-gray-500 ml-6">
                    <span>to {formatDateTime(event.end_time)}</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default EventsDisplay;
