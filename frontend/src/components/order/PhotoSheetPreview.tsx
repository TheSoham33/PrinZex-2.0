'use client';

import {
  hintDimensions,
  layoutPhotoSheet,
  PHOTO_SHEET_FALLBACK,
} from '@/lib/domain/photos';
import { IconImageIcon } from '@/components/icons';

interface PhotoSheetPreviewProps {
  /** Photos per sheet (2/4/6/8 from the photo type's layout options). */
  count: number;
  /** e.g. 'Passport Photo' — caption only. */
  photoLabel?: string;
  /** e.g. '35 × 45 mm' — caption only. */
  photoHint?: string;
  /** e.g. 'A4' — caption only. */
  sheetLabel?: string;
  /** e.g. '210 × 297 mm' — parsed for the sheet's aspect ratio. */
  sheetHint?: string;
  /** First image the customer attached — repeated across every tile. */
  imageUrl?: string | null;
  /** Sheets ordered — feeds the "sheets × photos = prints" caption. */
  quantity?: number;
}

/**
 * Live mock of one printed sheet for Photo Print: a paper-proportioned frame
 * (aspect from the chosen paper size) tiled with `count` cut-line cells, each
 * showing the customer's first uploaded photo (or a placeholder until they
 * upload). The visual is aria-hidden — the caption restates everything in
 * text, and the count is already announced by the layout buttons' pressed
 * state.
 */
export default function PhotoSheetPreview({
  count,
  photoLabel,
  photoHint,
  sheetLabel,
  sheetHint,
  imageUrl,
  quantity = 1,
}: PhotoSheetPreviewProps) {
  const sheet = hintDimensions(sheetHint) ?? PHOTO_SHEET_FALLBACK;
  const grid = layoutPhotoSheet(count);
  const sheets = Math.max(1, quantity);
  return (
    <div>
      <p className="label">Sheet preview</p>
      <div className="flex flex-wrap items-center gap-5">
        <div
          aria-hidden="true"
          className="w-32 shrink-0 overflow-hidden rounded-lg border border-slate-300 bg-white shadow-sm"
          style={{ aspectRatio: `${sheet.w} / ${sheet.h}` }}
        >
          <div
            className="grid h-full w-full gap-1 p-1.5"
            style={{
              gridTemplateColumns: `repeat(${grid.cols}, minmax(0, 1fr))`,
              gridTemplateRows: `repeat(${grid.rows}, minmax(0, 1fr))`,
            }}
          >
            {Array.from({ length: grid.photos }, (_, index) => (
              <div
                key={index}
                className="relative overflow-hidden rounded-[3px] border border-dashed border-slate-400 bg-slate-50"
              >
                {imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- object-URL previews can't go through next/image
                  <img
                    src={imageUrl}
                    alt=""
                    className="absolute inset-0 h-full w-full object-cover"
                  />
                ) : (
                  <span className="absolute inset-0 flex items-center justify-center">
                    <IconImageIcon className="h-1/3 w-1/3 text-slate-300" />
                  </span>
                )}
              </div>
            ))}
          </div>
        </div>
        <div className="min-w-52 flex-1 text-sm text-slate-600">
          <p>
            <span className="font-semibold text-slate-800">
              {grid.photos} × {photoLabel ?? 'photo'}
            </span>
            {photoHint ? ` (${photoHint})` : ''} on one{' '}
            {sheetLabel ?? 'sheet'}
            {sheetHint ? ` (${sheetHint})` : ''} sheet — dashed lines are the
            cut marks.
          </p>
          <p className="mt-1.5 text-xs text-slate-500">
            {sheets} {sheets === 1 ? 'sheet' : 'sheets'} × {grid.photos} photos
            = <span className="font-semibold">{sheets * grid.photos}</span>{' '}
            prints in this order.
          </p>
        </div>
      </div>
    </div>
  );
}
