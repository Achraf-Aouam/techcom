"use client";

import { useState, useEffect } from "react";
import { string, z } from "zod";
import { useForm, SubmitHandler, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

import { storage } from "@/lib/firebase";
import { User } from "@/lib/schemas";

import { Button } from "./ui/button";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { Checkbox } from "./ui/checkbox";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";

import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Check, ChevronsUpDown } from "lucide-react";
import { cn } from "@/lib/utils";
import { createClub, getAllUsers } from "@/lib/actions";

const clubSchema = z.object({
  name: z.string().min(1, "Name is required"),
  description: z.string().optional(),
  // imageUrl: z.string().optional(),
  color_code: z.string().optional(),
  is_active: z.boolean().optional(),
  // managerId: z.string().optional(),
  managerId: z.coerce.number().optional(),

  tempFile: z.instanceof(FileList).optional().nullable(),
});

type clubType = z.infer<typeof clubSchema>;

const onSubmit: SubmitHandler<clubType> = async (data) => {
  console.log(data);
  let image_url: string | null = null;

  if (data.tempFile) {
    const storageRef = ref(storage, `clubImages/${data.name}`);
    try {
      await uploadBytes(storageRef, data.tempFile[0]);
      image_url = await getDownloadURL(storageRef);
    } catch (error) {
      console.error("Image upload failed:", error);
      image_url = null;
    }
  }

  const { tempFile, managerId, ...rest } = data;
  const submitData = { ...rest, image_url: image_url };
  console.log(submitData);
  createClub(submitData);
};

type dropdownrow = {
  label: string;
  value: number;
};

const ClubForm = () => {
  const [users, setUsers] = useState<Array<dropdownrow>>([]);

  useEffect(() => {
    getAllUsers().then((fetchedUsers) => {
      setUsers(
        fetchedUsers.map((user) => ({
          label: user.email || "no email",
          value: user.id,
        }))
      );
    });
  }, []);

  const {
    register,
    handleSubmit,
    control,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<clubType>({
    resolver: zodResolver(clubSchema),
    defaultValues: {
      color_code: "#103105",
      is_active: false,
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
              {...register("color_code")}
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
              name="is_active"
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
          <Controller
            name="managerId"
            control={control}
            render={({ field }) => (
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    role="combobox"
                    className={cn(
                      "w-[200px] justify-between",
                      !field.value && "text-muted-foreground"
                    )}
                  >
                    {field.value
                      ? users.find((user) => user.value === field.value)?.label
                      : "Select user"}
                    <ChevronsUpDown className="opacity-50" />
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-[200px] p-0">
                  <Command>
                    <CommandInput
                      placeholder="Search manager..."
                      className="h-9"
                    />
                    <CommandList>
                      <CommandEmpty>No user found.</CommandEmpty>
                      <CommandGroup>
                        {users.map((user) => (
                          <CommandItem
                            value={user.label}
                            key={user.value}
                            onSelect={() => {
                              field.onChange(user.value);
                            }}
                          >
                            {user.label}
                            <Check
                              className={cn(
                                "ml-auto",
                                user.value === field.value
                                  ? "opacity-100"
                                  : "opacity-0"
                              )}
                            />
                          </CommandItem>
                        ))}
                      </CommandGroup>
                    </CommandList>
                  </Command>
                </PopoverContent>
              </Popover>
            )}
          />

          <Button type="submit">Submit</Button>
        </div>
      </form>
    </div>
  );
};

export default ClubForm;
