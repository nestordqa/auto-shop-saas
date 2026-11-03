import type { SpecialtyOption } from "@/lib/mechanics";

/** Checkboxes named "specialties": read them with `FormData.getAll("specialties")`. None checked means general. */
export function SpecialtyPicker({ options, defaultValue }: { options: SpecialtyOption[]; defaultValue: readonly string[] }) {
  return (
    <fieldset className="grid gap-2">
      <legend className="mb-1 text-sm font-bold">Especialidades <span className="font-normal text-stone-500">(elige todas las que apliquen)</span></legend>
      <div className="grid gap-2 sm:grid-cols-2">
        {options.map((option) => (
          <label key={option.key} className="flex min-h-11 cursor-pointer items-center gap-2 rounded-md border border-stone-300 px-3 text-sm has-checked:border-[#ef3f26] has-checked:bg-red-50/40">
            <input type="checkbox" name="specialties" value={option.key} defaultChecked={defaultValue.includes(option.key)} className="size-4 accent-[#ef3f26]" />
            {option.label}
          </label>
        ))}
      </div>
      <span className="text-xs text-stone-500">Definen las reparaciones que aparecen al diagnosticar. «Mecánica general» las muestra todas.</span>
    </fieldset>
  );
}
