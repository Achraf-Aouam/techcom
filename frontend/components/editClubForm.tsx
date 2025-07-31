"use client";
import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { storage } from "@/lib/firebase";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { updateClub } from "@/lib/actions";
import { Club } from "@/lib/schemas.server";
import {
  ClubUpdateSchema as clubUpdateSchema,
  ClubUpdateType as clubUpdateType,
} from "@/lib/schemas.client";

interface EditClubFormProps {
  club: Club;
  onSuccess?: () => void;
}

const EditClubForm = ({ club, onSuccess }: EditClubFormProps) => {
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<clubUpdateType>({
    resolver: zodResolver(clubUpdateSchema),
    defaultValues: {
      description: club.description || "",
      color_code: club.color_code || "#103105",
    },
  });

  const onSubmit: SubmitHandler<clubUpdateType> = async (data) => {
    console.log(data);
    let image_url: string | null = null;

    if (data.tempFile && data.tempFile.length > 0) {
      const storageRef = ref(storage, `clubImages/${club.name}_${Date.now()}`);
      try {
        await uploadBytes(storageRef, data.tempFile[0]);
        image_url = await getDownloadURL(storageRef);
      } catch (error) {
        console.error("Image upload failed:", error);
        image_url = null;
      }
    }

    const { ...rest } = data;
    const submitData = {
      ...rest,
      ...(image_url && { image_url }),
    };

    console.log(submitData);

    try {
      await updateClub(submitData, club.id);
      reset();
      onSuccess?.();
    } catch (error) {
      console.error("Failed to update club:", error);
    }
  };

  const tempFile = watch("tempFile");
  const imageFile = tempFile?.[0];
  const imagePreview = imageFile ? URL.createObjectURL(imageFile) : null;

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6">
          <div className="grid gap-3">
            <Label>Description</Label>
            <Input
              disabled={isSubmitting}
              type="text"
              {...register("description")}
            />
            {errors.description && (
              <p className="text-sm text-red-500">
                {errors.description.message}
              </p>
            )}
          </div>

          <div className="grid gap-3">
            <Label>Color</Label>
            <Input
              disabled={isSubmitting}
              type="color"
              {...register("color_code")}
            />
            {errors.color_code && (
              <p className="text-sm text-red-500">
                {errors.color_code.message}
              </p>
            )}
          </div>

          <div className="grid gap-3">
            <Label>Club Image</Label>
            <Input
              type="file"
              accept="image/*"
              disabled={isSubmitting}
              {...register("tempFile")}
            />
            {imagePreview && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-1">New Image Preview:</p>
                <img
                  src={imagePreview}
                  alt="Preview"
                  className="rounded-md border max-w-[200px] max-h-[150px] object-contain"
                />
              </div>
            )}
            {!imagePreview && club.image_url && (
              <div className="mt-3">
                <p className="text-sm font-medium mb-1">Current Image:</p>
                <img
                  src={club.image_url}
                  alt="Current club image"
                  className="rounded-md border max-w-[200px] max-h-[150px] object-contain"
                />
              </div>
            )}
          </div>

          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Updating..." : "Update Club"}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default EditClubForm;
