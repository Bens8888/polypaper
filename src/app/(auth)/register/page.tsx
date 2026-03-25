import { redirect } from "next/navigation";

import { auth } from "@/lib/auth";
import { getAppConfig } from "@/lib/config";
import { AuthForm } from "@/components/auth/auth-form";

export const metadata = {
  title: "Register",
};

export default async function RegisterPage() {
  const session = await auth();

  if (session?.user?.id) {
    redirect("/dashboard");
  }

  const config = getAppConfig();

  return (
    <div className="py-8">
      <AuthForm
        mode="register"
        demoEmail={config.demoCredentials.email}
        demoPassword={config.demoCredentials.password}
      />
    </div>
  );
}
