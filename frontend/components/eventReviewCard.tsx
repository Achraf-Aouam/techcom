"use client";

import { FunctionComponent } from "react";
import { Event } from "@/lib/schemas.client";

interface EventReviewCardProps {
  data: Event;
}

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { adminEventReview } from "@/lib/actions";

const EventReviewCard: FunctionComponent<EventReviewCardProps> = ({ data }) => {
  return (
    <Card className="w-full max-w-md mx-auto p-4">
      <CardHeader>
        <CardTitle className="text-2xl font-bold mb-2">{data.name}</CardTitle>
        <div className="text-sm text-gray-500 mb-1">
          Status:{" "}
          <span className="font-medium text-primary">{data.status}</span>
        </div>
      </CardHeader>
      <CardContent>
        {data.image_url && (
          <img
            src={data.image_url}
            alt={data.name}
            className="w-full h-48 object-cover rounded mb-4 border"
          />
        )}
        <div className="mb-2">
          <span className="font-semibold">Description: </span>
          <span>
            {data.description || (
              <span className="italic text-gray-400">No description</span>
            )}
          </span>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Location: </span>
          <span>
            {data.location || (
              <span className="italic text-gray-400">No location</span>
            )}
          </span>
        </div>
        <div className="mb-2">
          <span className="font-semibold">Start Time: </span>
          <span>
            {data.start_time ? (
              new Date(data.start_time).toLocaleString()
            ) : (
              <span className="italic text-gray-400">N/A</span>
            )}
          </span>
        </div>
        <div className="mb-4">
          <span className="font-semibold">End Time: </span>
          <span>
            {data.end_time ? (
              new Date(data.end_time).toLocaleString()
            ) : (
              <span className="italic text-gray-400">N/A</span>
            )}
          </span>
        </div>
        <div className="flex gap-4 justify-end mt-6">
          <Button
            onClick={() => {
              adminEventReview(data.id, true)
                .then(() => window.location.reload())
                .catch((err) => {
                  console.log(err);
                });
            }}
            variant="default"
            className="px-6 bg-green-600 hover:bg-green-700 text-white"
          >
            Accept
          </Button>
          <Button
            onClick={() => {
              adminEventReview(data.id, false)
                .then(() => window.location.reload())
                .catch((err) => {
                  console.log(err);
                });
            }}
            variant="default"
            className="px-6 bg-red-500 hover:bg-red-700 text-white"
          >
            Deny
          </Button>
        </div>
      </CardContent>
    </Card>
  );
};

export default EventReviewCard;
