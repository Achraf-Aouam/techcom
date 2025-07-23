import LoginForm from "@/components/loginForm";
export default function Page() {
  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10 bg-background text-foreground">
      <div className="w-full max-w-sm">
        <LoginForm />
      </div>
    </div>
  );
}
