// app/login/page.tsx
"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { LoginInput, LoginSchema } from "@/lib/schemas";
import { loginAction, FormState } from "@/lib/actions";
import { useFormState, useFormStatus } from "react-dom";

// A component to show pending status on the submit button
function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} className="your-button-styles">
      {pending ? "Logging in..." : "Login"}
    </button>
  );
}

export default function LoginPage() {
  const [state, formAction] = useFormState<FormState, FormData>(loginAction, {
    message: "",
    success: false,
  });

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema), // Client-side validation
    defaultValues: {
      username: "",
      password: "",
    },
  });

  return (
    <div className="login-container">
      <h1>Login</h1>
      <form action={formAction} className="login-form">
        <div>
          <label htmlFor="username">Email or Student ID</label>
          <input
            id="username"
            type="text"
            {...register("username")}
            className="your-input-styles"
          />
          {errors.username && (
            <p className="error-text">{errors.username.message}</p>
          )}
        </div>
        <div>
          <label htmlFor="password">Password</label>
          <input
            id="password"
            type="password"
            {...register("password")}
            className="your-input-styles"
          />
          {errors.password && (
            <p className="error-text">{errors.password.message}</p>
          )}
        </div>

        {/* Display server-side error message */}
        {!state.success && state.message && (
          <p className="error-text">{state.message}</p>
        )}

        <SubmitButton />
      </form>
    </div>
  );
}
