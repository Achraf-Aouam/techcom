"use client";

import { z } from "zod";
import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";

import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const clubSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  imageUrl: z.string().optional(),
  colorCode: z.string().optional(),
  isActive: z.boolean().optional(),
  managerId: z.coerce.number().optional(),
  tempFile: z.instanceof(FileList).optional().nullable(),
});

type clubType = z.infer<typeof clubSchema>;

const onSubmit: SubmitHandler<clubType> = (data) => {
  console.log(data);
};

const ClubForm = () => {
  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<clubType>({
    resolver: zodResolver(clubSchema),
    defaultValues: {
      colorCode: "#103105",
      isActive: false,
    },
  });

  const tempFile = watch("tempFile");
  const imageFile = tempFile?.[0];
  const imagePreview = imageFile ? URL.createObjectURL(imageFile) : null;

  return (
    <div>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="flex flex-col gap-6">
          <div className="grid gap-3">
            <Label>name</Label>
            <Input disabled={isSubmitting} type="text" {...register("name")} />
          </div>
          <div className="grid gap-3">
            <Label>desscription</Label>
            <Input
              disabled={isSubmitting}
              type="text"
              {...register("description")}
            />
          </div>
          <div className="grid gap-3">
            <Label>color</Label>
            <Input
              disabled={isSubmitting}
              type="color"
              {...register("colorCode")}
            />
          </div>
          <div className="grid gap-3">
            <Label>image url</Label>

            <Input
              type="file"
              accept="image/*"
              disabled={isSubmitting}
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

          <div className="flex gap-3">
            <Label>Is Active :</Label>
            <Controller
              name="isActive"
              control={control}
              render={({ field }) => (
                <Checkbox
                  checked={!!field.value}
                  onCheckedChange={field.onChange}
                  disabled={isSubmitting}
                />
              )}
            />
          </div>
          <div className="flex gap-3">
            <Label>Manager</Label>
          </div>

          <Button type="submit">Submit</Button>
        </div>
      </form>
    </div>
  );
};

export default ClubForm;
