import { ChevronLeft, ChevronRight } from "lucide-react";
import Link from "next/link";

type TablePaginationProps = {
  currentPage: number;
  pageSize: number;
  pathname: string;
  searchParams: Record<string, string>;
  totalItems: number;
  pageParam?: string;
};

export function TablePagination({
  currentPage,
  pageSize,
  pathname,
  searchParams,
  totalItems,
  pageParam = "page",
}: TablePaginationProps) {
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const firstItem = totalItems ? (currentPage - 1) * pageSize + 1 : 0;
  const lastItem = Math.min(currentPage * pageSize, totalItems);
  const visiblePages = Array.from({ length: totalPages }, (_, index) => index + 1)
    .filter((page) => page === 1 || page === totalPages || Math.abs(page - currentPage) <= 1);

  function href(page: number) {
    const params = new URLSearchParams(searchParams);
    if (page === 1) params.delete(pageParam);
    else params.set(pageParam, String(page));
    const query = params.toString();
    return query ? `${pathname}?${query}` : pathname;
  }

  return <nav aria-label="Paginación de tabla" className="flex flex-col gap-3 border-t border-stone-200 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
    <p className="text-sm text-stone-500">Mostrando {firstItem}-{lastItem} de {totalItems}</p>
    {totalPages > 1 && <div className="flex items-center gap-1">
      <PageLink href={href(currentPage - 1)} disabled={currentPage === 1} label="Página anterior"><ChevronLeft size={18} /></PageLink>
      {visiblePages.map((page, index) => <span key={page} className="contents">
        {index > 0 && page - visiblePages[index - 1] > 1 && <span className="grid size-10 place-items-center text-stone-400">…</span>}
        <Link href={href(page)} aria-current={page === currentPage ? "page" : undefined} className={`grid size-10 place-items-center rounded-md text-sm font-bold ${page === currentPage ? "bg-stone-900 text-white" : "hover:bg-stone-100"}`}>{page}</Link>
      </span>)}
      <PageLink href={href(currentPage + 1)} disabled={currentPage === totalPages} label="Página siguiente"><ChevronRight size={18} /></PageLink>
    </div>}
  </nav>;
}

function PageLink({ href, disabled, label, children }: { href: string; disabled: boolean; label: string; children: React.ReactNode }) {
  if (disabled) return <span aria-disabled="true" className="grid size-10 place-items-center rounded-md text-stone-300">{children}</span>;
  return <Link href={href} aria-label={label} className="grid size-10 place-items-center rounded-md hover:bg-stone-100">{children}</Link>;
}