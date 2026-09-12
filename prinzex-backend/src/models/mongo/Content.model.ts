import { Schema, model } from 'mongoose';

/**
 * Content (MongoDB)
 *
 * CMS content — banners, FAQs, blog posts, print templates.
 * Schema-flexible per `type` via the `metadata` map.
 */

export type ContentType = 'banner' | 'faq' | 'blog' | 'template' | 'settings';

export const CONTENT_TYPES: ContentType[] = ['banner', 'faq', 'blog', 'template', 'settings'];

export interface IContent {
  type: ContentType;
  title?: string;
  slug?: string;
  body?: string;
  imageUrl?: string;
  linkUrl?: string;
  category?: string;
  tags?: string[];
  isActive: boolean;
  order: number; // for banners — display order
  metadata?: Record<string, unknown>;
  publishedAt?: Date;
  expiresAt?: Date;
  createdBy?: string; // adminId
  updatedBy?: string;
  createdAt?: Date;
  updatedAt?: Date;
}

const contentSchema = new Schema<IContent>(
  {
    type: { type: String, enum: CONTENT_TYPES, required: true },
    title: String,
    slug: String,
    body: String,
    imageUrl: String,
    linkUrl: String,
    category: String,
    tags: [String],
    isActive: { type: Boolean, default: true },
    order: { type: Number, default: 0 }, // for banners — display order
    metadata: Schema.Types.Mixed,
    publishedAt: Date,
    expiresAt: Date,
    createdBy: String, // adminId
    updatedBy: String,
  },
  { timestamps: true },
);

contentSchema.index({ type: 1, isActive: 1 });
contentSchema.index({ slug: 1 }, { unique: true, sparse: true });

export const ContentModel = model<IContent>('Content', contentSchema);
