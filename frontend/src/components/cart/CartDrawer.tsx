'use client';

import { useAppDispatch, useAppSelector } from '@/store/hooks';
import { removeFromCart, setCartOpen } from '@/store/slices/cartSlice';
import { formatCurrency } from '@/lib/utils';
import { IconX, IconTrash, IconShoppingCart, IconArrowRight } from '@/components/icons';
import Link from 'next/link';

export default function CartDrawer() {
  const dispatch = useAppDispatch();
  const { items, isOpen } = useAppSelector((state) => state.cart);

  if (!isOpen) return null;

  const total = items.reduce((sum, item) => sum + item.costBreakdown.total, 0);

  return (
    <div className="fixed inset-0 z-[100] flex justify-end">
      <div 
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm transition-opacity"
        onClick={() => dispatch(setCartOpen(false))}
      />
      
      <div className="relative flex h-full w-full max-w-md flex-col bg-white shadow-2xl animate-slide-in-right">
        <div className="flex items-center justify-between border-b border-slate-200 p-5">
          <div className="flex items-center gap-2">
            <IconShoppingCart className="h-5 w-5 text-blue-600" />
            <h2 className="text-lg font-bold text-slate-900">Your Cart</h2>
            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
              {items.length}
            </span>
          </div>
          <button
            type="button"
            onClick={() => dispatch(setCartOpen(false))}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
          >
            <IconX className="h-6 w-6" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {items.length === 0 ? (
            <div className="flex h-full flex-col items-center justify-center text-center">
              <div className="flex h-20 w-20 items-center justify-center rounded-full bg-slate-50 text-slate-300">
                <IconShoppingCart className="h-10 w-10" />
              </div>
              <h3 className="mt-4 text-lg font-bold text-slate-900">Your cart is empty</h3>
              <p className="mt-1 text-sm text-slate-500">
                Looks like you haven&apos;t added any print jobs yet.
              </p>
              <Link
                href="/stores"
                onClick={() => dispatch(setCartOpen(false))}
                className="btn-primary mt-6"
              >
                Browse Shops
              </Link>
            </div>
          ) : (
            <div className="space-y-4">
              {items.map((item) => (
                <div key={item.id} className="card relative p-4 transition-all hover:border-blue-200">
                  <button
                    type="button"
                    onClick={() => dispatch(removeFromCart(item.id))}
                    className="absolute right-2 top-2 rounded-md p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                    aria-label="Remove item"
                  >
                    <IconTrash className="h-4 w-4" />
                  </button>

                  <div className="pr-8">
                    <p className="text-xs font-bold uppercase tracking-wider text-blue-600">
                      {item.storeName}
                    </p>
                    <h4 className="mt-1 font-bold text-slate-900">{item.serviceName}</h4>
                    <p className="mt-1 text-xs text-slate-500 line-clamp-2">
                      {item.specifications.quantity}x, {item.specifications.totalPages ? `${item.specifications.totalPages}p, ` : ''}{item.specifications.paperType}, {item.specifications.size}
                    </p>
                    <div className="mt-3 flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-900">
                        {formatCurrency(item.costBreakdown.total)}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {items.length > 0 && (
          <div className="border-t border-slate-200 p-5 bg-slate-50">
            <div className="flex items-center justify-between mb-4">
              <span className="text-base font-medium text-slate-600">Subtotal</span>
              <span className="text-xl font-bold text-slate-900">{formatCurrency(total)}</span>
            </div>
            <Link
              href="/checkout"
              onClick={() => dispatch(setCartOpen(false))}
              className="btn-primary w-full py-4 text-base"
            >
              Checkout Now <IconArrowRight className="ml-2 h-5 w-5" />
            </Link>
            <p className="mt-3 text-center text-xs text-slate-500">
              Tax and delivery calculated at checkout
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
