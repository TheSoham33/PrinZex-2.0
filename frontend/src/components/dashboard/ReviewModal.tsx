'use client';

import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiRequest } from '@/lib/api/client';
import { IconStar, IconX, IconCheckCircle, IconAlertCircle } from '@/components/icons';

interface ReviewModalProps {
  orderId: string;
  storeName: string;
  isOpen: boolean;
  onClose: () => void;
}

export default function ReviewModal({ orderId, storeName, isOpen, onClose }: ReviewModalProps) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [hoveredRating, setHoveredRating] = useState(0);

  const mutation = useMutation({
    mutationFn: (data: any) => apiRequest(`/orders/${orderId}/reviews`, {
      method: 'POST',
      body: JSON.stringify(data),
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['customer-orders'] });
      setTimeout(onClose, 2000);
    },
  });

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    mutation.mutate({
      overallRating: rating,
      comment: comment.trim() || undefined,
    });
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
      <div className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl animate-scale-in">
        {mutation.isSuccess ? (
          <div className="flex flex-col items-center justify-center p-12 text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-green-600">
              <IconCheckCircle className="h-10 w-10" />
            </div>
            <h3 className="mt-6 text-xl font-bold text-slate-900">Thank you!</h3>
            <p className="mt-2 text-slate-600">Your review has been submitted successfully.</p>
          </div>
        ) : (
          <>
            <div className="flex items-center justify-between border-b border-slate-100 px-6 py-4">
              <h3 className="text-lg font-bold text-slate-900">Rate your experience</h3>
              <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
                <IconX className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="p-6">
              <div className="text-center">
                <p className="text-sm font-medium text-slate-500">How was your order from</p>
                <p className="mt-0.5 text-base font-bold text-slate-900">{storeName}</p>
                
                <div className="mt-6 flex justify-center gap-1.5">
                  {[1, 2, 3, 4, 5].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onMouseEnter={() => setHoveredRating(num)}
                      onMouseLeave={() => setHoveredRating(0)}
                      onClick={() => setRating(num)}
                      className="group p-1 transition-transform active:scale-90"
                    >
                      <IconStar 
                        className={`h-9 w-9 transition-colors ${
                          num <= (hoveredRating || rating) 
                            ? 'fill-amber-400 text-amber-400' 
                            : 'fill-slate-100 text-slate-200'
                        }`} 
                      />
                    </button>
                  ))}
                </div>
                <p className="mt-3 text-sm font-bold text-amber-600">
                  {['Very Poor', 'Poor', 'Good', 'Very Good', 'Excellent'][rating - 1]}
                </p>
              </div>

              <div className="mt-8">
                <label htmlFor="comment" className="label text-xs uppercase tracking-wider text-slate-400">
                  Write a comment (optional)
                </label>
                <textarea
                  id="comment"
                  rows={4}
                  value={comment}
                  onChange={(e) => setComment(e.target.value)}
                  placeholder="What did you like or what could be improved?"
                  className="input mt-2 resize-none text-sm"
                />
              </div>

              {mutation.isError && (
                <div className="mt-4 flex items-center gap-2 rounded-lg bg-red-50 p-3 text-xs font-medium text-red-600">
                  <IconAlertCircle className="h-4 w-4" />
                  {(mutation.error as any).message || 'Failed to submit review'}
                </div>
              )}

              <button
                type="submit"
                disabled={mutation.isPending}
                className="btn-primary mt-8 w-full py-3.5 text-base"
              >
                {mutation.isPending ? 'Submitting…' : 'Submit Review'}
              </button>
            </form>
          </>
        )}
      </div>
    </div>
  );
}
