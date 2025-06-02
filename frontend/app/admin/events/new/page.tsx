"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Button } from "@/components/ui/button";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { useToast } from "@/components/ui/use-toast";
import { useEffect, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { ClubInDb, EventStatusType } from "@/lib/types";

// Define an enum for EventStatusType to be used at runtime
const EventStatusTypeEnum = {
  IDEATION: "IDEATION",
  PLANNING: "PLANNING",
  POSTED: "POSTED",
  CURRENT: "CURRENT",
  PAST: "PAST",
} as const;

const eventFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().nullable().optional(),
  location: z.string().min(1, "Location is required"),
  status: z.nativeEnum(EventStatusTypeEnum),
  image_url: z.string().url().nullable().optional(),
  start_time: z.string().datetime({ offset: true }).nullable().optional(),
  end_time: z.string().datetime({ offset: true }).nullable().optional(),
  club_id: z.coerce
    .number()
    .int()
    .positive("Club ID must be a positive integer"),
});

type EventFormValues = z.infer<typeof eventFormSchema>;

const defaultValues: Partial<EventFormValues> = {
  name: "",
  description: "",
  location: "",
  image_url: "",
  status: EventStatusTypeEnum.IDEATION,
  start_time: new Date().toISOString(),
  end_time: new Date().toISOString(),
  club_id: undefined,
};

export default function NewEventPage() {
  const { toast } = useToast();
  const { token } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [clubs, setClubs] = useState<ClubInDb[]>([]);

  const form = useForm<EventFormValues>({
    resolver: zodResolver(eventFormSchema),
    defaultValues,
    mode: "onChange",
  });

  useEffect(() => {
    const fetchClubs = async () => {
      if (!token) return;
      // Set loading true when fetching clubs as well
      const prevIsLoading = isLoading;
      setIsLoading(true);
      try {
        const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
        const response = await fetch(`${apiBaseUrl}/clubs/?active_only=true`, {
          headers: {
            Authorization: `Bearer ${token}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setClubs(data);
          if (data.length > 0 && !form.getValues("club_id")) {
            // Optionally set a default club if none is selected
            // form.setValue("club_id", data[0].id);
          }
        } else {
          toast({
            title: "Error fetching clubs",
            description: "Could not load the list of clubs.",
            variant: "destructive",
          });
        }
      } catch (error) {
        toast({
          title: "Network Error",
          description: "Failed to connect to the server to fetch clubs.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(prevIsLoading); // Restore previous loading state
      }
    };
    fetchClubs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, toast]); // form.setValue might cause re-renders if included, consider alternatives

  async function onSubmit(data: EventFormValues) {
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create an event.",
        variant: "destructive",
      });
      return;
    }

    setIsLoading(true);
    try {
      const apiBaseUrl = process.env.NEXT_PUBLIC_API_BASE_URL;
      const payload = {
        ...data,
        description: data.description || null,
        image_url: data.image_url || null,
        start_time: data.start_time
          ? new Date(data.start_time).toISOString()
          : null,
        end_time: data.end_time ? new Date(data.end_time).toISOString() : null,
      };
      const response = await fetch(`${apiBaseUrl}/events/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.status === 201) {
        toast({
          title: "Event Created",
          description: "The new event has been successfully created.",
        });
        router.push("/admin/events");
      } else {
        const errorData = await response.json();
        toast({
          title: "Error Creating Event",
          description:
            errorData.detail?.[0]?.msg ||
            errorData.detail ||
            "An unexpected error occurred.",
          variant: "destructive",
        });
      }
    } catch (error) {
      toast({
        title: "Network Error",
        description: "Failed to connect to the server.",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  }

  const formatDateTimeLocal = (
    isoString: string | null | undefined
  ): string => {
    if (!isoString) return "";
    try {
      // Ensure it's a valid date string before attempting to slice
      const date = new Date(isoString);
      if (isNaN(date.getTime())) return "";
      return date.toISOString().slice(0, 16);
    } catch (e) {
      return "";
    }
  };

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create New Event</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter event name" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="description"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Description</FormLabel>
                <FormControl>
                  <Input
                    placeholder="Enter event description"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="location"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Location</FormLabel>
                <FormControl>
                  <Input placeholder="Enter event location" {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="status"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Status</FormLabel>
                <Select
                  onValueChange={field.onChange}
                  defaultValue={field.value}
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select event status" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {Object.values(EventStatusTypeEnum).map((statusValue) => (
                      <SelectItem key={statusValue} value={statusValue}>
                        {statusValue}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="image_url"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Image URL</FormLabel>
                <FormControl>
                  <Input
                    type="url"
                    placeholder="https://example.com/image.png"
                    {...field}
                    value={field.value ?? ""}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="start_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Start Time</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    {...field}
                    value={formatDateTimeLocal(field.value)}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="end_time"
            render={({ field }) => (
              <FormItem>
                <FormLabel>End Time</FormLabel>
                <FormControl>
                  <Input
                    type="datetime-local"
                    {...field}
                    value={formatDateTimeLocal(field.value)}
                    onChange={(e) =>
                      field.onChange(
                        e.target.value
                          ? new Date(e.target.value).toISOString()
                          : null
                      )
                    }
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="club_id"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Club</FormLabel>
                <Select
                  onValueChange={(value: string) =>
                    field.onChange(parseInt(value))
                  }
                  value={field.value?.toString()} // Ensure value is a string for Select
                  defaultValue={field.value?.toString()} // Ensure defaultValue is a string
                >
                  <FormControl>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a club" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {clubs.length === 0 && !isLoading && (
                      <SelectItem value="no-clubs" disabled>
                        No active clubs found.
                      </SelectItem>
                    )}
                    {isLoading && (
                      <SelectItem value="loading-clubs" disabled>
                        Loading clubs...
                      </SelectItem>
                    )}
                    {clubs.map((club) => (
                      <SelectItem key={club.id} value={club.id.toString()}>
                        {club.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Event"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
