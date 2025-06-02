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
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useToast } from "@/components/ui/use-toast";
import { useContext, useState } from "react";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";

const clubFormSchema = z.object({
  name: z.string().min(1, "Name is required").max(255),
  description: z.string().nullable().optional(),
  image_url: z.string().url().nullable().optional(),
  color_code: z
    .string()
    .regex(/^#(?:[0-9a-fA-F]{3}){1,2}$/, "Invalid color code")
    .nullable()
    .optional(),
  is_active: z.boolean().optional(),
});

type ClubFormValues = z.infer<typeof clubFormSchema>;

const defaultValues: Partial<ClubFormValues> = {
  name: "",
  description: "",
  image_url: "",
  color_code: "#103105",
  is_active: true,
};

export default function NewClubPage() {
  const { toast } = useToast();
  const { token } = useAuth();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const form = useForm<ClubFormValues>({
    resolver: zodResolver(clubFormSchema),
    defaultValues,
    mode: "onChange",
  });

  async function onSubmit(data: ClubFormValues) {
    if (!token) {
      toast({
        title: "Authentication Error",
        description: "You must be logged in to create a club.",
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
        color_code: data.color_code || "#103105",
        is_active: data.is_active === undefined ? true : data.is_active,
      };
      const response = await fetch(`${apiBaseUrl}/clubs/`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        toast({
          title: "Club Created",
          description: "The new club has been successfully created.",
        });
        router.push("/admin/clubs");
      } else {
        const errorData = await response.json();
        toast({
          title: "Error Creating Club",
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

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-2xl font-bold mb-4">Create New Club</h1>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-8">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Name</FormLabel>
                <FormControl>
                  <Input placeholder="Enter club name" {...field} />
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
                    placeholder="Enter club description"
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
            name="color_code"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Color Code</FormLabel>
                <FormControl>
                  <Input
                    type="color"
                    {...field}
                    value={field.value ?? "#103105"}
                  />
                </FormControl>
                <FormDescription>Default is #103105.</FormDescription>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="is_active"
            render={({ field }) => (
              <FormItem className="flex flex-row items-start space-x-3 space-y-0 rounded-md border p-4">
                <FormControl>
                  <Checkbox
                    checked={field.value}
                    onCheckedChange={field.onChange}
                  />
                </FormControl>
                <div className="space-y-1 leading-none">
                  <FormLabel>Active</FormLabel>
                  <FormDescription>
                    Is the club currently active?
                  </FormDescription>
                </div>
              </FormItem>
            )}
          />
          <Button type="submit" disabled={isLoading}>
            {isLoading ? "Creating..." : "Create Club"}
          </Button>
        </form>
      </Form>
    </div>
  );
}
