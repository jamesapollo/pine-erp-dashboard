import { type KeyboardEvent, type ReactNode } from 'react';

import { cn } from '@/utils/cn';

type DataTableColumn<Row> = {
  key: string;
  header: string;
  align?: 'left' | 'right';
  width?: number;
  render?: (row: Row) => ReactNode;
};

export function DataTable<Row>({
  columns,
  rows,
  getRowKey,
  onRowClick,
  empty = 'Nothing to show',
  compact = false,
  caption,
}: {
  columns: DataTableColumn<Row>[];
  rows: Row[];
  getRowKey: (row: Row) => string | number;
  onRowClick?: (row: Row) => void;
  empty?: ReactNode;
  compact?: boolean;
  caption: string;
}) {
  function handleRowKeyDown(event: KeyboardEvent<HTMLTableRowElement>, row: Row) {
    if (event.key !== 'Enter' || event.target !== event.currentTarget) return;
    event.preventDefault();
    onRowClick?.(row);
  }

  function readCell(row: Row, column: DataTableColumn<Row>): ReactNode {
    if (column.render) return column.render(row);
    return (row as Record<string, unknown>)[column.key] as ReactNode;
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0 text-[length:var(--text-base)] leading-normal text-text-primary">
        <caption className="sr-only">{caption}</caption>
        <thead>
          <tr>
            {columns.map((column) => (
              <th
                key={column.key}
                scope="col"
                style={column.width ? { width: column.width } : undefined}
                className={cn(
                  'h-9 whitespace-nowrap border-b border-border-default bg-surface-sunken px-3 text-[length:var(--text-xs)] font-medium leading-none text-text-tertiary first:pl-5 last:pr-5',
                  column.align === 'right' ? 'text-right tabular-nums' : 'text-left',
                )}
              >
                {column.header}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-5 py-12 text-center text-text-tertiary">
                {empty}
              </td>
            </tr>
          ) : (
            rows.map((row) => (
              <tr
                key={getRowKey(row)}
                tabIndex={onRowClick ? 0 : undefined}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (event) => handleRowKeyDown(event, row) : undefined}
                className={cn(
                  'transition-colors duration-[120ms] ease-out hover:bg-surface-hover [&:last-child>td]:border-b-0',
                  onRowClick &&
                    'cursor-pointer focus-visible:bg-surface-hover focus-visible:shadow-focus focus-visible:outline-none',
                )}
              >
                {columns.map((column) => (
                  <td
                    key={column.key}
                    className={cn(
                      'border-b border-border-subtle px-3 align-middle first:pl-5 last:pr-5',
                      compact ? 'h-10' : 'h-12',
                      column.align === 'right' && 'text-right tabular-nums',
                    )}
                  >
                    {readCell(row, column)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}
