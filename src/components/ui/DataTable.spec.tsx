import { render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

import { DataTable } from '@/components/ui/DataTable';

type Row = { id: number; name: string; price: string };

const rows: Row[] = [
  { id: 1, name: 'Mug', price: '450.00' },
  { id: 2, name: 'Kettle', price: '2,100.00' },
];

const columns = [
  { key: 'name', header: 'Name' },
  {
    key: 'price',
    header: 'Price (KES)',
    align: 'right' as const,
    render: (row: Row) => `KES ${row.price}`,
  },
];

describe('DataTable', () => {
  it('renders headers and cells', () => {
    render(
      <DataTable caption="Products" columns={columns} rows={rows} getRowKey={(row) => row.id} />,
    );
    expect(screen.getByRole('table', { name: 'Products' })).toBeVisible();
    expect(screen.getByRole('columnheader', { name: 'Price (KES)' })).toBeVisible();
    expect(screen.getByRole('cell', { name: 'Kettle' })).toBeVisible();
    expect(screen.getByRole('cell', { name: 'KES 450.00' })).toBeVisible();
  });

  it('shows the empty content when there are no rows', () => {
    render(
      <DataTable
        caption="Products"
        columns={columns}
        rows={[]}
        getRowKey={(row: Row) => row.id}
        empty="No products yet"
      />,
    );
    expect(screen.getByText('No products yet')).toBeVisible();
  });

  it('calls onRowClick with the clicked row', async () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        caption="Products"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        onRowClick={onRowClick}
      />,
    );
    await userEvent.click(screen.getByRole('cell', { name: 'Kettle' }));
    expect(onRowClick).toHaveBeenCalledWith(rows[1]);
  });

  it('calls onRowClick when Enter is pressed on a focused row', async () => {
    const onRowClick = vi.fn();
    render(
      <DataTable
        caption="Products"
        columns={columns}
        rows={rows}
        getRowKey={(row) => row.id}
        onRowClick={onRowClick}
      />,
    );
    screen.getByRole('row', { name: /Mug/ }).focus();
    await userEvent.keyboard('{Enter}');
    expect(onRowClick).toHaveBeenCalledWith(rows[0]);
  });
});
