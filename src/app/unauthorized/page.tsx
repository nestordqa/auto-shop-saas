import Link from "next/link";

export default function UnauthorizedPage() {
  return <main className="grid min-h-dvh place-items-center bg-stone-100 p-4"><section className="max-w-md rounded-lg border border-stone-200 bg-white p-8 text-center"><p className="text-xs font-bold uppercase text-[#d9341d]">Acceso restringido</p><h1 className="mt-2 font-display text-3xl font-bold">Este panel pertenece a otro rol</h1><p className="mt-3 text-stone-600">Tu sesión está activa, pero no tiene permisos para consultar esta sección.</p><Link href="/" className="mt-6 flex min-h-12 items-center justify-center rounded-md bg-stone-900 px-5 font-bold text-white">Volver a mi panel</Link></section></main>;
}