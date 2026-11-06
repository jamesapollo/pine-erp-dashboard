import { type ReactNode } from 'react';

import { type Order } from '@/types/sales';
import { ProductThumbnail } from '@/components/products/ProductThumbnail';
import { DetailRow } from '@/components/sales/DetailRow';
import { Badge } from '@/components/ui/Badge';
import { Card } from '@/components/ui/Card';
import { DataTable } from '@/components/ui/DataTable';
import { OrderRef } from '@/components/ui/OrderRef';
import { formatMoney } from '@/utils/money';

// `feeAction` sits beside the delivery fee, for the button that sets or changes it.
export function OrderItemsCard({ order, feeAction }: { order: Order; feeAction?: ReactNode }) {
  const { delivery_charge: deliveryCharge } = order;
  const hasSavings = Number(order.discount_total.amount) > 0;

  return (
    <Card
      title="Items"
      subtitle="Prices as charged at checkout"
      flush
      footer={
        <dl className="m-0 w-[280px]">
          <DetailRow label="Subtotal">{formatMoney(order.subtotal)}</DetailRow>
          {hasSavings ? (
            <DetailRow label="Offer savings">−{formatMoney(order.discount_total)}</DetailRow>
          ) : null}
          <DetailRow label={`Delivery · ${deliveryCharge.zone_name ?? 'No zone'}`}>
            <span className="inline-flex items-center gap-2">
              {deliveryCharge.pending_quote ? (
                <Badge size="sm" tone="warning">
                  Pending quote
                </Badge>
              ) : (
                formatMoney(deliveryCharge.fee)
              )}
              {feeAction}
            </span>
          </DetailRow>
          <div className="mt-1.5 border-t border-border-default pt-2">
            <DetailRow label={deliveryCharge.pending_quote ? 'Total so far' : 'Total'} isEmphasised>
              {formatMoney(order.grand_total)}
            </DetailRow>
          </div>
        </dl>
      }
    >
      <DataTable
        caption="Items"
        rows={order.lines}
        getRowKey={(line) => line.id}
        columns={[
          {
            key: 'product',
            header: 'Product',
            render: (line) => (
              <div className="flex items-center gap-3">
                <ProductThumbnail
                  image={
                    line.image_url ? { url: line.image_url, alt_text: line.product_name } : null
                  }
                />
                <div>
                  <div className="font-medium">{line.product_name}</div>
                  <div className="text-xs text-text-tertiary">{line.variant_label}</div>
                </div>
              </div>
            ),
          },
          { key: 'sku', header: 'SKU', render: (line) => <OrderRef value={line.sku} plain /> },
          { key: 'quantity', header: 'Qty', align: 'right' },
          {
            key: 'unit_price_paid',
            header: 'Unit',
            align: 'right',
            render: (line) => formatMoney(line.unit_price_paid),
          },
          {
            key: 'line_total',
            header: 'Line total',
            align: 'right',
            render: (line) => <span className="font-medium">{formatMoney(line.line_total)}</span>,
          },
        ]}
      />
    </Card>
  );
}
