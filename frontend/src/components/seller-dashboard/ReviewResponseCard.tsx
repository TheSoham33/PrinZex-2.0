'use client';

import { useState } from 'react';
import type { SellerReview } from '@/lib/domain/seller-inventory';
import { formatDate } from '@/lib/utils';
import { IconMessageSquare, IconSend, IconStar } from '@/components/icons';

interface ReviewResponseCardProps {
  review: SellerReview;
  onReply: (reviewId: string, reply: string) => void;
}

export default function ReviewResponseCard({ review, onReply }: ReviewResponseCardProps) {
  const [open, setOpen] = useState(false);
  const [draft, setDraft] = useState('');

  const submit = () => {
    const text = draft.trim();
    if (!text) return;
    onReply(review.id, text);
    setDraft('');
    setOpen(false);
  };

  return (
    <article className="card p-5">
      <div className="flex items-start gap-3">
        <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-slate-100 text-sm font-bold text-slate-600">
          {review.avatarInitials}
        </span>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <h3 className="font-semibold text-slate-900">{review.customerName}</h3>
            <time className="text-xs text-slate-500">{formatDate(review.date)}</time>
          </div>

          <div
            className="mt-1 flex items-center gap-0.5"
            aria-label={`${review.rating} out of 5 stars`}
          >
            {Array.from({ length: 5 }).map((_, index) => (
              <IconStar
                key={index}
                className={`h-3.5 w-3.5 ${
                  index < review.rating ? 'fill-amber-400 text-amber-400' : 'text-slate-300'
                }`}
                aria-hidden
              />
            ))}
          </div>

          <p className="mt-2 text-sm leading-relaxed text-slate-600">{review.comment}</p>
        </div>
      </div>

      <div className="mt-4 border-t border-slate-100 pt-4">
        {review.reply ? (
          <div className="rounded-xl bg-blue-50/60 p-3.5">
            <p className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-blue-700">
              <IconMessageSquare className="h-3.5 w-3.5" /> Your reply
            </p>
            <p className="mt-1.5 text-sm leading-relaxed text-slate-700">{review.reply}</p>
          </div>
        ) : open ? (
          <div>
            <label htmlFor={`reply-${review.id}`} className="label">
              Your reply
            </label>
            <textarea
              id={`reply-${review.id}`}
              rows={3}
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              placeholder="Thanks for the feedback…"
              className="input resize-none"
            />
            <div className="mt-3 flex gap-2">
              <button
                type="button"
                onClick={submit}
                disabled={!draft.trim()}
                className="btn-primary text-sm"
              >
                <IconSend className="h-3.5 w-3.5" /> Post reply
              </button>
              <button
                type="button"
                onClick={() => {
                  setOpen(false);
                  setDraft('');
                }}
                className="btn-secondary text-sm"
              >
                Cancel
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => setOpen(true)}
            className="btn-secondary text-sm"
            aria-label={`Reply to review from ${review.customerName}`}
          >
            <IconMessageSquare className="h-4 w-4" /> Reply to review
          </button>
        )}
      </div>
    </article>
  );
}
