"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { storage } from "@/lib/firebase";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

import { Button } from "./ui/button";

import { createEvent } from "@/lib/actions";
import {
  EventCreateSchema as EventSchema,
  EventCreateType as EventType,
} from "@/lib/schemas";

const EventForm = () => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventType>({
    resolver: zodResolver(EventSchema),
    defaultValues: { status: "IDEATION" },
  });

  const onSubmit: SubmitHandler<EventType> = async (data) => {
    console.log(data);
    let image_url: string | null = null;

    if (data.tempFile && data.tempFile.length > 0 && data.tempFile[0]) {
      const storageRef = ref(storage, `eventImages/${data.name}`);
      try {
        await uploadBytes(storageRef, data.tempFile[0]);
        image_url = await getDownloadURL(storageRef);
      } catch (error) {
        console.error("Image upload failed:", error);
        image_url = null;
      }
    }

    const { tempFile, ...rest } = data;
    const submitData = { ...rest, image_url: image_url };
    console.log(submitData);
    createEvent(submitData).then(() => {
      reset();
    });
  };

  const tempFile = watch("tempFile");
  const imageFile = tempFile?.[0];
  const imagePreview = imageFile ? URL.createObjectURL(imageFile) : null;

  return (
    <form onSubmit={handleSubmit(onSubmit)}>
      <div className="flex flex-col gap-6">
        <div className="grid gap-3">
          <Label>Name</Label>
          <Input disabled={isSubmitting} type="text" {...register("name")} />
        </div>
        <div className="grid gap-3">
          <Label>description</Label>
          <Input
            disabled={isSubmitting}
            type="text"
            {...register("description")}
          />
        </div>
        <div className="grid gap-3">
          <Label>Location</Label>
          <Input
            disabled={isSubmitting}
            type="text"
            {...register("location")}
          />
        </div>
        <div className="grid gap-3">
          <Label>Image</Label>
          <Input
            disabled={isSubmitting}
            type="file"
            accept="image/*"
            {...register("tempFile")}
          />
          {imagePreview && (
            <div className="mt-3">
              <p className="text-sm font-medium mb-1">Preview:</p>
              <img
                src={imagePreview}
                alt="Preview"
                className="rounded-md border max-w-[200px] max-h-[150px] object-contain"
              />
            </div>
          )}
        </div>
        <div className="grid gap-3">
          <Label>Start time</Label>
          <Input
            disabled={isSubmitting}
            type="datetime-local"
            {...register("start_time")}
          />
        </div>
        <div className="grid gap-3">
          <Label>End time</Label>
          <Input
            disabled={isSubmitting}
            type="datetime-local"
            {...register("end_time")}
          />
        </div>
        <Button type="submit">Submit</Button>
      </div>
    </form>
  );
};

export default EventForm;
