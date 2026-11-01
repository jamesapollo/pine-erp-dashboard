import { Button } from '@/components/ui/Button';

export function Pagination({
  page,
  perPage,
  total,
  onPageChange,
}: {
  page: number;
  perPage: number;
  total: number;
  onPageChange: (page: number) => void;
}) {
  if (total <= perPage) return null;
  const last = Math.min(page * perPage, total);
  const first = Math.min((page - 1) * perPage + 1, last);

  return (
    <div className="flex items-center justify-between gap-4 border-t border-border-subtle px-5 py-3">
      <span className="text-[13px] tabular-nums text-text-tertiary">
        {first}–{last} of {total}
      </span>
      <div className="flex gap-2">
        <Button
          variant="secondary"
          size="sm"
          disabled={page <= 1}
          onClick={() => onPageChange(page - 1)}
        >
          Previous
        </Button>
        <Button
          variant="secondary"
          size="sm"
          disabled={last >= total}
          onClick={() => onPageChange(page + 1)}
        >
          Next
        </Button>
      </div>
    </div>
  );
}
