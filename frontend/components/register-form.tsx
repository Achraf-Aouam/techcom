"use client";

import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { TypeOf, z } from "zod";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

import { useForm, SubmitHandler } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

// function SubmitButton() {

//   return (

//   );
// }

const formschema = z.object({
  student_id: z.coerce.number(),
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Please enter a valid email"),
  password: z.string().min(8),
});

type FormSchemaType = z.infer<typeof formschema>;

const onSubmit: SubmitHandler<FormSchemaType> = (data) => {
  console.log(data); // { name: "John", email: "...", age: 30 }
  // await apiCall(data);
};

export default function RegisterForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<FormSchemaType>({ resolver: zodResolver(formschema) });

  return (
    <div className="flex flex-col gap-6">
      <Card>
        <CardHeader className="text-center">
          <CardTitle>Register a new account</CardTitle>
          <CardDescription>Create an account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit(onSubmit)}>
            <div className="flex flex-col gap-6">
              <div className="grid gap-3">
                <Label htmlFor="name">Full Name</Label>
                <Input
                  id="name"
                  type="text"
                  placeholder="John Example"
                  {...register("name")}
                />
                {errors.name && (
                  <p className="text-sm font-medium text-destructive">
                    {errors.name.message}
                  </p>
                )}
              </div>
              <div className="grid gap-3">
                <Label htmlFor="email">Email adress</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="m@example.com"
                  {...register("email")}
                />
                {errors.email && (
                  <p className="text-sm font-medium text-destructive">
                    {errors.email.message}
                  </p>
                )}
              </div>
              <div className="grid gap-3">
                <Label htmlFor="id">your Id</Label>
                <Input
                  id="id"
                  type="number"
                  placeholder="m@example.com"
                  {...register("student_id")}
                />
                {errors.student_id && (
                  <p className="text-sm font-medium text-destructive">
                    {errors.student_id.message}
                  </p>
                )}
              </div>
              <div className="grid gap-3">
                <div className="flex items-center">
                  <Label htmlFor="password">Password</Label>
                  {/* <a
                            href="#"
                            className="ml-auto inline-block text-sm underline-offset-4 hover:underline"
                          >
                            Forgot your password?
                          </a> */}
                </div>
                <Input
                  id="password"
                  type="password"
                  {...register("password")}
                />
                {errors.password && (
                  <p className="text-sm font-medium text-destructive">
                    {errors.password.message}
                  </p>
                )}
              </div>

              <div className="flex flex-col gap-3">
                <Button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-full"
                >
                  {isSubmitting ? "Signing in" : "Sign Up"}
                </Button>
              </div>
            </div>
            <div className="mt-4 text-center text-sm">
              Alreadt have an account?{" "}
              <a href="/login" className="underline underline-offset-4">
                Sign in
              </a>
            </div>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
