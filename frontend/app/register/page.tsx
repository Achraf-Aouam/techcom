"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "@/components/ui/toaster";
import {
  RegisterSchema,
  RegisterData,
  registerUser,
  UserRoleSchema,
  loginUser,
} from "@/lib/authService";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useAuth } from "@/contexts/AuthContext";
import { useEffect } from "react";

export default function RegisterPage() {
  const router = useRouter();
  const { login: authLogin, token, isLoading } = useAuth();

  useEffect(() => {
    if (!isLoading && token) {
      router.push("/profile");
    }
  }, [isLoading, token, router]);

  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<RegisterData>({
    resolver: zodResolver(RegisterSchema),
    defaultValues: {
      role: "STUDENT",
    },
  });

  const onSubmit = async (data: RegisterData) => {
    try {
      await registerUser(data);

      try {
        const loginData = { username: data.email, password: data.password };
        const tokenResponse = await loginUser(loginData);
        authLogin(tokenResponse);
        toast("Registration Successful!", {
          description: "You are now logged in and will be redirected.",
        });
        router.push("/profile");
      } catch (loginError: any) {
        toast("Registration Successful, Login Failed", {
          description: loginError.message || "Please try logging in manually.",
        });
        router.push("/login");
      }
    } catch (error: any) {
      toast("Registration Failed", {
        description:
          error.message || "An unexpected error occurred. Please try again.",
      });
    }
  };

  if (isLoading || token) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gray-100">
        Loading...
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100">
      <div className="w-full max-w-md p-8 space-y-6 bg-white rounded-lg shadow-md">
        <h2 className="text-2xl font-bold text-center">Register</h2>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div>
            <Label htmlFor="student_id">Student ID</Label>
            <Input id="student_id" {...register("student_id")} />
            {errors.student_id && (
              <p className="text-xs text-red-600">
                {errors.student_id.message}
              </p>
            )}
          </div>
          <div>
            <Label htmlFor="name">Full Name</Label>
            <Input id="name" {...register("name")} />
            {errors.name && (
              <p className="text-xs text-red-600">{errors.name.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="email">Email</Label>
            <Input id="email" type="email" {...register("email")} />
            {errors.email && (
              <p className="text-xs text-red-600">{errors.email.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="password">Password</Label>
            <Input id="password" type="password" {...register("password")} />
            {errors.password && (
              <p className="text-xs text-red-600">{errors.password.message}</p>
            )}
          </div>
          <div>
            <Label htmlFor="role">Role</Label>
            <select
              id="role"
              {...register("role")}
              className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {UserRoleSchema.options.map((roleValue: any) => (
                <option key={roleValue} value={roleValue}>
                  {roleValue}
                </option>
              ))}
            </select>
            {errors.role && (
              <p className="text-xs text-red-600">{errors.role.message}</p>
            )}
          </div>
          <Button type="submit" className="w-full" disabled={isSubmitting}>
            {isSubmitting ? "Registering..." : "Register"}
          </Button>
        </form>
        <p className="text-sm text-center text-gray-600">
          Already have an account?{" "}
          <Link
            href="/login"
            className="font-medium text-indigo-600 hover:text-indigo-500"
          >
            Login here
          </Link>
        </p>
      </div>
    </div>
  );
}
