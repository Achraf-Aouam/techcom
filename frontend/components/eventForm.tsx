"use client";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { storage } from "@/lib/firebase";
import {
  ref,
  uploadBytes,
  getDownloadURL,
  deleteObject,
} from "firebase/storage";
import { Input } from "./ui/input";
import { Label } from "./ui/label";

import { Button } from "./ui/button";

import { createEvent, updateEvent } from "@/lib/actions";
import {
  EventCreateSchema as EventSchema,
  EventCreateType,
} from "@/lib/schemas.client";
import { Event } from "@/lib/schemas.client";
import { FunctionComponent } from "react";

interface EventFormProps {
  ogData?: Event;
}

const EventForm: FunctionComponent<EventFormProps> = ({ ogData }) => {
  const isUpdate = !!ogData;
  const eventid = isUpdate ? ogData.id : null;
  const og_image_url = isUpdate ? ogData.image_url : null;

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<EventCreateType>({
    resolver: zodResolver(EventSchema),
    defaultValues: ogData
      ? { ...ogData, tempFile: undefined }
      : { status: "IDEATION" },
  });

  // case if we update name and there was no image -> do nothing pass ✅
  // upd name an there was an image left same -> update image ref✅
  // update name and there was an image that got updated -> delete old image with old name ✅ and upload new with new name✅
  //update only image ✅

  const onSubmit: SubmitHandler<EventCreateType> = async (data) => {
    console.log(data);
    let image_url: string | null = null;
    if (isUpdate && data.name != ogData.name) {
      if (og_image_url && og_image_url != "") {
        const oldstorageRef = ref(storage, `eventImages/${ogData.name}`);
        const storageRef = ref(storage, `eventImages/${data.name}`);
        if (data.tempFile && data.tempFile.length > 0 && data.tempFile[0]) {
          deleteObject(oldstorageRef)
            .then(() => {
              console.log("old image deleted");
            })
            .catch((error) => {
              console.log(error);
            });
        } else {
          try {
            // Get the old image as a blob
            const oldImageUrl = await getDownloadURL(oldstorageRef);
            const response = await fetch(oldImageUrl);
            const blob = await response.blob();

            // Upload the blob to the new storage ref
            await uploadBytes(storageRef, blob);
            image_url = await getDownloadURL(storageRef);

            // Delete the old image
            await deleteObject(oldstorageRef);
            console.log("Image moved to new name and old image deleted");
          } catch (err) {
            console.error("Failed to move image to new name:", err);
            image_url = og_image_url;
          }
        }
      }
    }

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
    isUpdate
      ? updateEvent(submitData, eventid!).then(() => {
          console.log("we are updating");
          reset();
        })
      : createEvent(submitData).then(() => {
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
          {errors.name && <p className="error">{errors.name.message}</p>}
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
          {errors.name && <p className="error">{errors.name.message}</p>}
        </div>
        <div className="grid gap-3">
          <Label>Image</Label>
          <Input
            disabled={isSubmitting}
            type="file"
            accept="image/*"
            {...register("tempFile")}
          />
          {og_image_url && (
            <div className="mt-3">
              <p className="text-sm font-medium mb-1">
                original image Preview:
              </p>
              <img
                src={og_image_url}
                alt="Preview"
                className="rounded-md border max-w-[200px] max-h-[150px] object-contain"
              />
            </div>
          )}
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
