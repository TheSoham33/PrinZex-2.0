import {
  ORDER_STATUS_DOT,
  ORDER_STATUS_LABELS,
  ORDER_STATUS_STYLES,
  type OrderStatus,
} from '@/lib/types/orders';

interface OrderStatusBadgeProps {
  status: OrderStatus;
  size?: 'sm' | 'md';
}

export default function OrderStatusBadge({ status, size = 'sm' }: OrderStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full font-semibold ring-1 ring-inset ${
        ORDER_STATUS_STYLES[status]
      } ${size === 'sm' ? 'px-2.5 py-1 text-xs' : 'px-3 py-1.5 text-sm'}`}
    >
      <span className={`h-1.5 w-1.5 rounded-full ${ORDER_STATUS_DOT[status]}`} />
      {ORDER_STATUS_LABELS[status]}
    </span>
  );
}
