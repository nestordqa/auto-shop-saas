import { NextResponse } from "next/server";
import { z } from "zod";

import { placeholderEmail, placeholderPassword } from "@/lib/client-accounts";
import { phoneSchema } from "@/lib/phone";
import { authorizeStaffRequest, resolveStaffBranch } from "@/lib/auth/garage-staff";
import { notifyAppointmentCreated, notifyMechanicAssigned } from "@/lib/notifications";
import { getOpenOrderForVehicle, openOrderMessage } from "@/lib/order-status";

const clientSchema = z.discriminatedUnion("mode", [
  z.object({ mode: z.literal("existing"), id: z.uuid() }),
  z.object({
    mode: z.literal("new"),
    fullName: z.string().trim().min(2).max(120),
    /** Without email the client gets no app access: the garage informs them by WhatsApp and can give access later. */
    email: z.union([z.literal(""), z.email()]).optional(),
    phone: phoneSchema,
    documentId: z.union([z.literal(""), z.string().trim().min(4).max(30)]).optional(),
    temporaryPassword: z.union([z.literal(""), z.string().min(8).max(72)]).optional(),
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
  branchId: z.uuid().nullable().optional(),
  appointmentDate: z.iso.date(),
  appointmentTime: z.string().regex(/^([01]\d|2[0-3]):(00|30)$/),
  timezoneOffset: z.number().int().min(-840).max(840),
});

const FIELD_ERRORS: Record<string, string> = {
  "client.fullName": "Escribe el nombre completo del cliente.",
  "client.email": "El correo del cliente no es válido.",
  "client.phone": "El teléfono del cliente no es válido. Ejemplo: 0412 123 4567.",
  "client.documentId": "La cédula o RIF debe tener entre 4 y 30 caracteres.",
  "client.temporaryPassword": "La contraseña temporal debe tener entre 8 y 72 caracteres.",
  "vehicle.brandId": "Elige la marca del vehículo.",
  "vehicle.model": "Elige o escribe el modelo del vehículo.",
  "vehicle.color": "Escribe el color del vehículo.",
  "vehicle.plate": "La placa debe tener entre 3 y 20 caracteres.",
  "mechanicId": "El mecánico seleccionado no es válido.",
  appointmentDate: "Elige la fecha de la cita.",
  appointmentTime: "Elige la hora de la cita.",
};

function validationMessage(path: PropertyKey[]) {
  const keys = path.map(String);
  for (let length = keys.length; length > 0; length--) {
    const message = FIELD_ERRORS[keys.slice(0, length).join(".")];
    if (message) return message;
  }
  return "Revisa los datos del cliente, el vehículo y la cita.";
}

export async function POST(request: Request) {
  const parsed = orderSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) return NextResponse.json({ error: validationMessage(parsed.error.issues[0]?.path ?? []) }, { status: 400 });

  const auth = await authorizeStaffRequest({ allowReception: true, unavailable: "La creación de órdenes no está configurada." });
  if (!auth.ok) return auth.response;
  const { admin } = auth;
  const garage = { id: auth.staff.garageId };

  const input = parsed.data;
  const branchId = await resolveStaffBranch(admin, auth.staff, input.branchId);
  if (!branchId) return NextResponse.json({ error: "La sucursal seleccionada no es válida." }, { status: 400 });
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
    const withAccess = Boolean(input.client.email);
    if (withAccess && !input.client.temporaryPassword) return NextResponse.json({ error: FIELD_ERRORS["client.temporaryPassword"] }, { status: 400 });
    const { data: authData, error: authError } = await admin.auth.admin.createUser({
      email: withAccess ? input.client.email! : placeholderEmail(),
      password: withAccess ? input.client.temporaryPassword! : placeholderPassword(),
      email_confirm: true,
      app_metadata: { role: "client" },
      user_metadata: { full_name: input.client.fullName, phone: input.client.phone },
    });
    if (authError || !authData.user) {
      const exists = authError?.code === "email_exists" || /already|registered/i.test(authError?.message ?? "");
      return NextResponse.json({ error: exists ? "Ya existe una cuenta con ese correo. Búscala en «Buscar cliente» o usa otro correo." : "No se pudo crear el cliente. Revisa sus datos." }, { status: exists ? 409 : 400 });
    }
    clientId = authData.user.id;
    createdClient = true;
    // A client registered by the garage starts in the garage's state and city (they can change it in Configuración).
    const { data: garageLocation } = await admin.from("garages").select("country_code, state_id, city_id").eq("id", garage.id).maybeSingle();
    const { error: profileError } = await admin.from("profiles").update({ ...(garageLocation ?? {}), full_name: input.client.fullName, phone: input.client.phone, document_id: input.client.documentId || null, role: "client" }).eq("id", clientId).select("id").single();
    if (profileError) {
      await admin.auth.admin.deleteUser(clientId);
      if (profileError.code === "23505") return NextResponse.json({ error: "Ya existe un cliente con esa cédula o teléfono. Búscalo en «Buscar cliente»." }, { status: 409 });
      return NextResponse.json({ error: "No se pudo guardar el perfil del cliente." }, { status: 500 });
    }
  }

  if (input.vehicle.mode === "existing") {
    const { data: vehicle } = await admin.from("vehicles").select("id").eq("id", vehicleId).eq("user_id", clientId).maybeSingle();
    if (!vehicle) {
      if (createdClient) await admin.auth.admin.deleteUser(clientId);
      return NextResponse.json({ error: "El vehículo no pertenece al cliente seleccionado." }, { status: 400 });
    }
    const openOrder = await getOpenOrderForVehicle(admin, vehicle.id);
    if (openOrder) return NextResponse.json({ error: openOrderMessage(openOrder.status) }, { status: 409 });
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
    const { data: mechanic } = await admin.from("mechanics").select("id").eq("id", input.mechanicId).eq("garage_id", garage.id).eq("branch_id", branchId).eq("is_active", true).maybeSingle();
    if (!mechanic) {
      if (createdClient) await admin.auth.admin.deleteUser(clientId);
      else if (createdVehicle) await admin.from("vehicles").delete().eq("id", vehicleId);
      return NextResponse.json({ error: "El mecánico no está activo en esta sucursal." }, { status: 400 });
    }
  }

  const { data: order, error } = await admin.from("orders").insert({
    garage_id: garage.id,
    branch_id: branchId,
    vehicle_id: vehicleId,
    mechanic_id: input.mechanicId,
    appointment_date: appointmentDate,
  }).select("id").single();
  if (error) {
    if (createdClient) await admin.auth.admin.deleteUser(clientId);
    else if (createdVehicle) await admin.from("vehicles").delete().eq("id", vehicleId);
    if (error.code === "23505") {
      const openOrder = createdVehicle ? null : await getOpenOrderForVehicle(admin, vehicleId);
      return NextResponse.json({ error: openOrder ? openOrderMessage(openOrder.status) : "Ese horario ya está reservado en esta sucursal. Elige otro." }, { status: 409 });
    }
    return NextResponse.json({ error: "No se pudo crear la orden." }, { status: 400 });
  }
  const actor = { id: auth.user.id, role: auth.staff.role };
  notifyAppointmentCreated(order.id, actor);
  if (input.mechanicId) notifyMechanicAssigned(order.id, input.mechanicId, actor);
  return NextResponse.json({ orderId: order.id }, { status: 201 });
}