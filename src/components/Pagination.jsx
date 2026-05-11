'use client';

export default function Pagination({ currentPage, totalPages, onPageChange, totalItems, itemsPerPage }) {
  if (totalPages <= 1) return null;

  const pages = [];
  const showPages = 5;
  let startPage = Math.max(1, currentPage - Math.floor(showPages / 2));
  let endPage = Math.min(totalPages, startPage + showPages - 1);
  if (endPage - startPage < showPages - 1) startPage = Math.max(1, endPage - showPages + 1);

  for (let i = startPage; i <= endPage; i++) pages.push(i);

  const from = (currentPage - 1) * itemsPerPage + 1;
  const to = Math.min(currentPage * itemsPerPage, totalItems);

  const btnBase = 'w-8 h-8 rounded-lg text-sm font-semibold transition-all flex items-center justify-center';

  return (
    <div className="flex items-center justify-between px-5 py-3.5 border-t border-[#eef1f7]">
      <p style={{ fontSize: '12px', color: '#94a3b8', fontWeight: 500 }}>
        {from}–{to} sur <span style={{ color: '#0f172a', fontWeight: 700 }}>{totalItems}</span>
      </p>
      <div className="flex items-center gap-1">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          className={`${btnBase} border border-[#eef1f7] bg-white text-[#64748b] hover:bg-[#f8fafd] disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        {startPage > 1 && (
          <>
            <button onClick={() => onPageChange(1)} className={`${btnBase} border border-[#eef1f7] bg-white text-[#64748b] hover:bg-[#f8fafd]`}>1</button>
            {startPage > 2 && <span className="w-8 h-8 flex items-center justify-center text-[#94a3b8] text-xs">…</span>}
          </>
        )}
        {pages.map(p => (
          <button
            key={p}
            onClick={() => onPageChange(p)}
            className={`${btnBase} ${p === currentPage
              ? 'bg-blue-600 text-white border border-blue-600 shadow-sm'
              : 'border border-[#eef1f7] bg-white text-[#64748b] hover:bg-[#f8fafd]'
            }`}
          >
            {p}
          </button>
        ))}
        {endPage < totalPages && (
          <>
            {endPage < totalPages - 1 && <span className="w-8 h-8 flex items-center justify-center text-[#94a3b8] text-xs">…</span>}
            <button onClick={() => onPageChange(totalPages)} className={`${btnBase} border border-[#eef1f7] bg-white text-[#64748b] hover:bg-[#f8fafd]`}>{totalPages}</button>
          </>
        )}
        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          className={`${btnBase} border border-[#eef1f7] bg-white text-[#64748b] hover:bg-[#f8fafd] disabled:opacity-40 disabled:cursor-not-allowed`}
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
          </svg>
        </button>
      </div>
    </div>
  );
}
