import "server-only";

import { PDFDocument, rgb, StandardFonts, type PDFFont, type PDFPage } from "pdf-lib";

import { EXTRA_VEHICLE_FEE, PLANS, planSummary, RATE_NOTE } from "@/lib/plans";
import { EXTRA_BRANCH_FEE } from "@/lib/billing-branches";
import { NUT_PATH, T_PATH } from "@/lib/brand";
import { contractCode, contractTitle, CYCLE_DESCRIPTIONS, CYCLE_LABELS, formatDate, LOCK_AFTER_DAYS, TRIAL_DAYS, type Contract } from "@/lib/contracts";

export type ContractPdfInput = {
  contract: Contract;
  garage: { name: string; address: string };
  /** Active branches, main first; listed when there is more than one. */
  branches?: { name: string; address: string }[];
  owner: { fullName: string; documentId: string | null; phone: string | null; email: string | null };
  /** TorkeOS signer printed on the contract (admin signature). */
  provider?: { name: string; position: string; image: string } | null;
  /** The owner's signature, once signed in the app. */
  ownerSignature?: { image: string; name: string; signedAt: string } | null;
};

const signal = rgb(0.937, 0.247, 0.149);
const ink = rgb(0.09, 0.1, 0.12);
const muted = rgb(0.4, 0.4, 0.4);
const margin = 56;

/** A4 contract with the TorkeOS mark; Helvetica (WinAnsi) covers Spanish accents and ñ. */
export async function buildContractPdf({ contract, garage, owner, branches = [], provider, ownerSignature }: ContractPdfInput) {
  const pdf = await PDFDocument.create();
  pdf.setTitle(`${contractTitle(contract)} ${contractCode(contract.number)} - ${garage.name}`);
  pdf.setAuthor("TorkeOS");
  const regular = await pdf.embedFont(StandardFonts.Helvetica);
  const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
  let page = pdf.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const textWidth = width - margin * 2;
  let y = height - margin;

  const ensureSpace = (needed: number) => {
    if (y - needed > margin + 20) return;
    page = pdf.addPage([595.28, 841.89]);
    y = height - margin;
  };
  const paragraph = (text: string, { font = regular, size = 10.5, color = ink, gap = 6 }: { font?: PDFFont; size?: number; color?: ReturnType<typeof rgb>; gap?: number } = {}) => {
    for (const line of wrap(text, font, size, textWidth)) {
      ensureSpace(size + 4);
      page.drawText(line, { x: margin, y, size, font, color });
      y -= size + 4;
    }
    y -= gap;
  };

  // Header: mark + wordmark on the left, contract code on the right.
  drawMark(page, margin, y + 6, 40);
  page.drawText("TORKE", { x: margin + 50, y: y - 26, size: 22, font: bold, color: ink });
  page.drawText("OS", { x: margin + 50 + bold.widthOfTextAtSize("TORKE", 22), y: y - 26, size: 22, font: bold, color: signal });
  const code = contractCode(contract.number);
  page.drawText(code, { x: width - margin - bold.widthOfTextAtSize(code, 12), y: y - 12, size: 12, font: bold, color: ink });
  const issued = `Emitido el ${formatDate(contract.created_at.slice(0, 10))}`;
  page.drawText(issued, { x: width - margin - regular.widthOfTextAtSize(issued, 9), y: y - 27, size: 9, font: regular, color: muted });
  y -= 52;
  page.drawRectangle({ x: margin, y, width: textWidth, height: 2, color: signal });
  y -= 30;

  paragraph(contractTitle(contract).toUpperCase(), { font: bold, size: 16, gap: 4 });
  paragraph(contract.kind === "trial" ? `Primer mes de prueba · 0 USD · vence el ${formatDate(contract.end_date!)}` : contract.plan ? planSummary(contract.plan) : `Cobro ${CYCLE_LABELS[contract.billing_cycle!].toLowerCase()} · comisión del ${Number(contract.commission_percent)}%`, { size: 11, color: signal, gap: 14 });

  paragraph("PARTES", { font: bold, size: 11, gap: 2 });
  paragraph("Proveedor: TorkeOS, plataforma de gestión para talleres automotrices.");
  if (branches.length > 1) {
    paragraph(`Taller: ${garage.name}, con ${branches.length} sucursales:`, { gap: 2 });
    branches.forEach((branch) => paragraph(`•  ${branch.name}: ${branch.address}.`, { gap: 2 }));
    y -= 4;
  } else paragraph(`Taller: ${garage.name}, ubicado en ${garage.address}.`);
  paragraph(`Representante: ${owner.fullName}${owner.documentId ? `, documento ${owner.documentId}` : ""}${owner.email ? `, ${owner.email}` : ""}${owner.phone ? `, teléfono ${owner.phone}` : ""}.`, { gap: 14 });

  paragraph("CLÁUSULAS", { font: bold, size: 11, gap: 4 });
  clauses(contract).forEach(([title, body], index) => {
    paragraph(`${index + 1}. ${title}`, { font: bold, size: 10.5, gap: 1 });
    paragraph(body, { gap: 8 });
  });

  // Signatures: image above the line, then name and position (TorkeOS) or name and garage (owner).
  ensureSpace(150);
  y -= 80;
  const columnWidth = (textWidth - 40) / 2;
  const columns = [
    { name: provider?.name ?? "TorkeOS", lines: [provider?.position ? `${provider.position} · TorkeOS` : "Proveedor · TorkeOS"], image: provider?.image },
    { name: ownerSignature?.name ?? owner.fullName, lines: [garage.name, ownerSignature ? `Firmado el ${formatDateTime(ownerSignature.signedAt)}` : "Pendiente de firma"], image: ownerSignature?.image },
  ];
  for (const [index, column] of columns.entries()) {
    const x = margin + index * (columnWidth + 40);
    if (column.image) {
      const png = await pdf.embedPng(column.image);
      const scale = Math.min(columnWidth / png.width, 60 / png.height);
      page.drawImage(png, { x, y: y + 4, width: png.width * scale, height: png.height * scale });
    }
    page.drawLine({ start: { x, y }, end: { x: x + columnWidth, y }, thickness: 0.8, color: muted });
    page.drawText(column.name, { x, y: y - 14, size: 10, font: bold, color: ink });
    column.lines.forEach((line, lineIndex) => page.drawText(line, { x, y: y - 27 - lineIndex * 12, size: 9, font: regular, color: muted }));
  }

  pdf.getPages().forEach((item, index, pages) => {
    const footer = `TorkeOS · ${code} · Página ${index + 1} de ${pages.length}`;
    item.drawText(footer, { x: (width - regular.widthOfTextAtSize(footer, 8)) / 2, y: 30, size: 8, font: regular, color: muted });
  });

  return pdf.save();
}

function clauses(contract: Contract): [string, string][] {
  const start = formatDate(contract.start_date);
  const service: [string, string] = ["Objeto", "TorkeOS otorga al Taller acceso a su plataforma para gestionar citas, recepción de vehículos, órdenes de trabajo, diagnósticos, presupuestos, equipo y notificaciones a sus clientes."];
  const data: [string, string] = ["Datos", "La información de clientes, vehículos y órdenes registrada por el Taller le pertenece. TorkeOS la trata de forma confidencial y solo para prestar el servicio."];
  if (contract.kind === "trial") {
    return [
      service,
      ["Vigencia", `El período de prueba dura ${TRIAL_DAYS} días calendario, desde el ${start} hasta el ${formatDate(contract.end_date!)}, ambos inclusive.`],
      ["Costo", "Este primer mes tiene un costo de 0 USD: se otorga como cortesía, sin cargo alguno para el Taller y con acceso a todas las funciones de la plataforma."],
      ["Vencimiento y plan", `Al vencer la prueba, el Taller deberá elegir uno de los planes de pago (Bujía, Alternador o Pistón) desde su panel en TorkeOS, que emitirá el contrato correspondiente con vigencia desde ese día. Mientras no elija un plan, la plataforma se lo recordará; si pasan más de ${LOCK_AFTER_DAYS} días sin plan ni pago, el acceso del Taller y su equipo se suspende hasta regularizarse, sin que se pierdan sus datos. Los clientes del Taller nunca pierden acceso.`],
      data,
    ];
  }
  const cycle = contract.billing_cycle!;
  const percent = Number(contract.commission_percent);
  const plan = contract.plan ? PLANS[contract.plan] : null;
  const fee: [string, string] = !plan
    ? ["Tarifa", `El Taller pagará a TorkeOS una comisión del ${percent}% sobre el monto total de los presupuestos aceptados por sus clientes a través de la plataforma. Si en un período no hay presupuestos aceptados, no hay comisión que pagar.`]
    : plan.kind === "subscription"
      ? ["Plan " + plan.name, `El Taller pagará a TorkeOS una suscripción de ${plan.price} USD al mes, que incluye hasta ${plan.vehicleLimit} vehículos atendidos por mes (órdenes creadas en el período). Cada vehículo adicional sobre ese límite se cobra a ${EXTRA_VEHICLE_FEE} USD en el mismo período.`]
      : ["Plan " + plan.name, `El Taller pagará a TorkeOS una comisión del ${plan.percent}% sobre el monto total de los presupuestos aceptados por sus clientes a través de la plataforma, con un mínimo de ${plan.minimum} USD y un máximo de ${plan.maximum} USD al mes (proporcionales en los ciclos semanal y quincenal). Los vehículos atendidos son ilimitados.`];
  return [
    service,
    fee,
    ["Moneda", `Los montos están expresados en dólares estadounidenses y pueden pagarse en bolívares a ${RATE_NOTE} del día del pago.`],
    ["Sucursales", `La sucursal principal está incluida. Cada sucursal adicional activa suma ${EXTRA_BRANCH_FEE} USD al mes, que se cobran junto con cada período (en los ciclos semanal y quincenal, la parte proporcional).`],
    ["Ciclo de cobro", `El cobro se liquida ${CYCLE_DESCRIPTIONS[cycle]}, contados desde el ${start}. El pago vence el día de cierre de cada período.`],
    ["Vigencia", `Este contrato rige desde el ${start}${contract.end_date ? ` hasta el ${formatDate(contract.end_date)}` : " por tiempo indefinido"}. Cualquiera de las partes puede terminarlo avisando por escrito con 15 días de anticipación; los períodos ya cerrados deben pagarse. El Taller puede solicitar un cambio de plan, que aplicará desde un nuevo contrato.`],
    ["Falta de pago", `Durante la mora TorkeOS enviará avisos de pago pendiente. Si pasan ${LOCK_AFTER_DAYS} días sin pagar un período vencido, se suspenderá el acceso del Taller (dueño, encargados y mecánicos) hasta regularizar el pago, sin que pierda sus datos; sus clientes conservan su acceso.`],
    data,
  ];
}

function drawMark(page: PDFPage, x: number, y: number, size: number) {
  const scale = size / 120;
  page.drawSvgPath(NUT_PATH, { x, y, scale, color: signal });
  page.drawSvgPath(T_PATH, { x, y, scale, color: rgb(1, 1, 1) });
}

function wrap(text: string, font: PDFFont, size: number, maxWidth: number) {
  const lines: string[] = [];
  let line = "";
  for (const word of text.split(/\s+/)) {
    const candidate = line ? `${line} ${word}` : word;
    if (font.widthOfTextAtSize(candidate, size) <= maxWidth) line = candidate;
    else {
      if (line) lines.push(line);
      line = word;
    }
  }
  if (line) lines.push(line);
  return lines;
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat("es-VE", { dateStyle: "medium", timeStyle: "short", timeZone: "America/Caracas" }).format(new Date(value)).replace(/[\u202f\u00a0]/g, " "); // WinAnsi has no narrow spaces
}
