import { NextResponse } from "next/server";
import { z } from "zod";

import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const clientSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("existing"), id: z.uuid() }),
  z.object({
    mode: z.literal("new"),
    fullName: z.string().trim().min(2).max(120),
    email: z.email(),
    phone: z.string().trim().min(7).max(30),
    documentId: z.string().trim().min(4).max(30),
    temporaryPassword: z.string().min(8).max(72),
  }),
]);

const vehicleSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("existing"), id: z.uuid() }),
  z.object({
    mode: z.literal("new"),
    brandId: z.uuid(),
    model: z.discriminatedUnion("mode", [
      z.object({ mode: z.literal("existing"), id: z.uuid(), year: z.number().int().min(1900).max(new Date().getFullYear()) }),
      z.object({ mode: z.literal("new"), name: z.string().trim().min(1).max(100), year: z.number().int().min(1900).max(new Date().getFullYear()) }),
    ]),
    color: z.string().trim().min(2).max(50),
    plate: z.string().trim().min(3).max(20),
  }),
]);

const orderSchema = z.object({
  client: clientSchema,
  vehicle: vehicleSchema,
  mechanicId: z.uuid().nullable(),
  appointmentDate: z.iso.date(),
  appointmentTime: z.string().regex(/^(0[8-9]|1[0-7]):(00|30)$|^18:00$/),
  timezoneOffset: z.number().int().min(-840).max(840),
});

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: "Revisa el vehículo y la fecha de la cita." }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Sesión no válida." }, { status: 401 });
  if (user.app_metadata.role !== "garage_owner") return NextResponse.json({ error: "Acceso restringido." }, { status: 403 });

  const admin = createAdminClient();
  if (!admin) return NextResponse.json({ error: "La creación de órdenes no está configurada." }, { status: 503 });
  const { data: garage } = await admin.from("garages").select("id").eq("owner_id", user.id).maybeSingle();
  if (!garage) return NextResponse.json({ error: "Tu cuenta no tiene un taller asignado." }, { status: 403 });

  const input = parsed.data;
  const [appointmentYear, appointmentMonth, appointmentDay] = input.appointmentDate.split("-").map(Number);
  const [appointmentHour, appointmentMinute] = input.appointmentTime.split(":").map(Number);
  const appointmentDate = new Date(Date.UTC(appointmentYear, appointmentMonth - 1, appointmentDay, appointmentHour, appointmentMinute) + input.timezoneOffset * 60_000).toISOString();
  let clientId = input.client.mode === "existing" ? input.client.id : "";
  let vehicleId = input.vehicle.mode === "existing" ? input.vehicle.id : "";
  let createdClient = false;
  let createdVehicle = false;

  if (input.client.mode === "existing") {
    const { data: clientProfile } = await admin.from("profiles").select("id").eq("id", clientId).eq("role", "client").maybeSingle();
    if (!clientProfile) return NextResponse.json({ error: "El cliente seleccionado no existe." }, { status: 404 });
  } else {
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: input.client.email,
      password: input.client.temporaryPassword,
      email_confirm: true,
      app_metadata: { role: "client" },
      user_metadata: { full_name: input.client.fullName, phone: input.client.phone },
    });
    if (authError || !authData.user) return NextResponse.json({ error: authError?.message ?? "No se pudo crear el cliente." }, { status: 400 });
    clientId = authData.user.id;
    createdClient = true;
    const { error: profileError } = await admin.from("profiles").update({ full_name: input.client.fullName, phone: input.client.phone, document_id: input.client.documentId, role: "client" }).eq("id", clientId).select("id").single();
    if (profileError) {
      await admin.auth.admin.deleteUser(clientId);
      return NextResponse.json({ error: "No se pudo sincronizar el perfil del cliente." }, { status: 500 });
    }
  }

  if (input.vehicle.mode === "existing") {
    const { data: vehicle } = await admin.from("vehicles").select("id").eq("id", vehicleId).eq("user_id", clientId).maybeSingle();
    if (!vehicle) {
      if (createdClient) await admin.auth.admin.deleteUser(clientId);
      return NextResponse.json({ error: "El vehículo no pertenece al cliente seleccionado." }, { status: 400 });
    }
  } else {
    const { data: brand } = await admin.from("vehicle_brands").select("id").eq("id", input.vehicle.brandId).eq("is_active", true).maybeSingle();
    if (!brand) {
      if (createdClient) await admin.auth.admin.deleteUser(clientId);
      return NextResponse.json({ error: "La marca seleccionada no está disponible." }, { status: 400 });
    }
    let modelYearId = "";
    if (input.vehicle.model.mode === "existing") {
      const { data: model } = await admin.from("vehicle_models").select("id").eq("id", input.vehicle.model.id).eq("brand_id", brand.id).eq("is_active", true).maybeSingle();
      if (!model) {
        if (createdClient) await admin.auth.admin.deleteUser(clientId);
        return NextResponse.json({ error: "El modelo no pertenece a la marca." }, { status: 400 });
      }
      const { data: modelYear, error: yearError } = await admin.from("vehicle_model_years").upsert({ model_id: model.id, year: input.vehicle.model.year, is_active: true }, { onConflict: "model_id,year" }).select("id").single();
      if (yearError || !modelYear) {
        if (createdClient) await admin.auth.admin.deleteUser(clientId);
        return NextResponse.json({ error: "No se pudo registrar el año del modelo." }, { status: 400 });
      }
      modelYearId = modelYear.id;
    } else {
      const { data: newModel, error: modelError } = await admin.from("vehicle_models").insert({ brand_id: brand.id, name: input.vehicle.model.name }).select("id").single();
      if (modelError || !newModel) {
        if (createdClient) await admin.auth.admin.deleteUser(clientId);
        return NextResponse.json({ error: modelError?.code === "23505" ? "Ese modelo ya existe para la marca." : "No se pudo crear el modelo." }, { status: 400 });
      }
      const { data: newModelYear, error: yearError } = await admin.from("vehicle_model_years").insert({ model_id: newModel.id, year: input.vehicle.model.year }).select("id").single();
      if (yearError || !newModelYear) {
        await admin.from("vehicle_models").delete().eq("id", newModel.id);
        if (createdClient) await admin.auth.admin.deleteUser(clientId);
        return NextResponse.json({ error: "No se pudo crear el año del modelo." }, { status: 400 });
      }
      modelYearId = newModelYear.id;
    }
    const { data: vehicle, error: vehicleError } = await admin.from("vehicles").insert({ user_id: clientId, model_year_id: modelYearId, color: input.vehicle.color, plate: input.vehicle.plate.toUpperCase() }).select("id").single();
    if (vehicleError || !vehicle) {
      if (createdClient) await admin.auth.admin.deleteUser(clientId);
      return NextResponse.json({ error: vehicleError?.code === "23505" ? "Esa placa ya está registrada." : "No se pudo crear el vehículo." }, { status: 400 });
    }
    vehicleId = vehicle.id;
    createdVehicle = true;
  }

  if (input.mechanicId) {
    const { data: mechanic } = await admin.from("mechanics").select("id").eq("id", input.mechanicId).eq("garage_id", garage.id).eq("is_active", true).maybeSingle();
    if (!mechanic) {
      if (createdClient) await admin.auth.admin.deleteUser(clientId);
      else if (createdVehicle) await admin.from("vehicles").delete().eq("id", vehicleId);
      return NextResponse.json({ error: "El mecánico no está activo en tu taller." }, { status: 400 });
    }
  }

  const { data: order, error } = await admin.from("orders").insert({
    garage_id: garage.id,
    vehicle_id: vehicleId,
    mechanic_id: input.mechanicId,
    appointment_date: appointmentDate,
  }).select("id").single();
  if (error) {
    if (createdClient) await admin.auth.admin.deleteUser(clientId);
    else if (createdVehicle) await admin.from("vehicles").delete().eq("id", vehicleId);
    return NextResponse.json({ error: "No se pudo crear la orden." }, { status: 400 });
  }
  return NextResponse.json({ orderId: order.id }, { status: 201 });
}