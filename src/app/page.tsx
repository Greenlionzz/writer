import { redirect } from "next/navigation";

/** Fabula is account-free — the app is the landing page. */
export default function Home() {
  redirect("/dashboard");
}
