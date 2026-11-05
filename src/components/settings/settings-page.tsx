import { redirect } from "next/navigation";

import { BookingLinkSection, GarageForm, PasswordForm, ProfileForm } from "@/components/settings/settings-forms";
import { siteUrl } from "@/lib/seo";
import { getLocationOptions } from "@/lib/locations-data";
import { specialtyKeysFrom } from "@/lib/mechanics";
import { getSpecialties } from "@/lib/specialties-data";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Configuración for every role: personal data and password; owners also edit their garage. */
export async function SettingsPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");
  const dataClient = createAdminClient() ?? supabase;
  const isOwner = user.app_metadata.role === "garage_owner";
  const isClient = user.app_metadata.role === "client";
  const [{ data: profile }, { data: garage }, specialtyRows, states] = await Promise.all([
    dataClient.from("profiles").select("full_name, phone, phone_2, document_id, state_id, city_id").eq("id", user.id).maybeSingle(),
    isOwner ? dataClient.from("garages").select("name, slug, specialty, specialties, address, map_location, state_id, city_id").eq("owner_id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    isOwner ? getSpecialties(createAdminClient()) : Promise.resolve([]),
    isOwner || isClient ? getLocationOptions(dataClient) : Promise.resolve([]),
  ]);
  const specialtyOptions = specialtyRows.map(({ key, label }) => ({ key, label }));

  return (
    <div className="mx-auto w-full max-w-3xl px-4 py-5 sm:px-6 sm:py-8">
      <h1 className="font-display text-3xl font-bold sm:text-4xl">Configuración</h1>
      <p className="mt-1 text-sm text-stone-600">Actualiza tus datos{isOwner ? " y los de tu taller" : ""}.</p>
      <div className="mt-6 grid gap-5">
        <ProfileForm values={{ fullName: profile?.full_name ?? "", email: user.email ?? "", phone: profile?.phone ?? "", phone2: profile?.phone_2 ?? "", documentId: profile?.document_id ?? "" }} location={isClient ? { states, value: { stateId: profile?.state_id ?? null, cityId: profile?.city_id ?? null } } : undefined} />
        {garage && <BookingLinkSection url={`${siteUrl}/${garage.slug}`} garageName={garage.name} />}
        {garage && <GarageForm values={{ name: garage.name, specialties: (garage.specialties as string[] | null) ?? specialtyKeysFrom(garage.specialty, specialtyOptions), address: garage.address, mapLocation: garage.map_location ?? "", stateId: garage.state_id, cityId: garage.city_id }} specialtyOptions={specialtyOptions} states={states} />}
        <PasswordForm />
      </div>
    </div>
  );
}
