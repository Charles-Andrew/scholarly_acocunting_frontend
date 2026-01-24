import { redirect } from "next/navigation";
import { getSession } from "@/lib/supabase/server";

export default async function Home() {
  const session = await getSession();

  // Redirect based on auth status
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
