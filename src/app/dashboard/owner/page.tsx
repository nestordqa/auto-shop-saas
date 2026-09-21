import { redirect } from "next/navigation";

export default async function OwnerDashboardPage() {
  redirect("/dashboard/owner/orders");
}