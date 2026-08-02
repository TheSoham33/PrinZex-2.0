import { Schema, model, type HydratedDocument } from 'mongoose';

/**
 * Tracking (MongoDB)
 *
 * Real-time location events written by the delivery boy mobile app.
 * High write volume — ideal for MongoDB.
 *
 * Geospatial note: a 2dsphere index only accepts GeoJSON objects or legacy
 * [lng, lat] coordinate pairs, so each location point carries a `coordinates`
 * array next to the human-readable lat/lng fields. The 2dsphere index lives
 * on that sub-field; a pre-validate hook keeps it in sync automatically.
 */

export interface ILocationPoint {
  lat: number;
  lng: number;
  timestamp: Date;
  accuracy?: number; // GPS accuracy in meters
  speed?: number; // km/h
  batteryLevel?: number;
  coordinates?: number[]; // [lng, lat] — legacy pair backing the 2dsphere index
}

export interface ITracking {
  deliveryId: string; // FK to PostgreSQL Delivery.id
  deliveryBoyId?: string;
  orderId?: string;
  locationHistory: ILocationPoint[];
  currentLocation?: ILocationPoint;
  etaMinutes?: number;
  createdAt?: Date;
  updatedAt?: Date;
}

const locationPointSchema = new Schema<ILocationPoint>(
  {
    lat: { type: Number, required: true },
    lng: { type: Number, required: true },
    timestamp: { type: Date, default: Date.now },
    accuracy: Number, // GPS accuracy in meters
    speed: Number, // km/h
    batteryLevel: Number,
    coordinates: {
      type: [Number],
      validate: {
        validator: (value: number[]) => value.length === 2,
        message: 'coordinates must be a [lng, lat] pair',
      },
    },
  },
  { _id: false },
);

const trackingSchema = new Schema<ITracking>(
  {
    deliveryId: { type: String, required: true, unique: true }, // FK to PostgreSQL Delivery.id
    deliveryBoyId: String,
    orderId: String,
    locationHistory: [locationPointSchema],
    currentLocation: locationPointSchema,
    etaMinutes: Number,
  },
  { timestamps: true },
);

// Keep `coordinates` ([lng, lat]) derived from lat/lng before every save.
trackingSchema.pre('validate', function (this: HydratedDocument<ITracking>) {
  const fillCoordinates = (point?: ILocationPoint): void => {
    if (point && (!point.coordinates || point.coordinates.length === 0)) {
      point.coordinates = [point.lng, point.lat];
    }
  };
  fillCoordinates(this.currentLocation);
  for (const point of this.locationHistory ?? []) {
    fillCoordinates(point);
  }
});

// `deliveryId` already has a unique index from the field definition above.
trackingSchema.index({ deliveryBoyId: 1 });
trackingSchema.index({ 'currentLocation.coordinates': '2dsphere' }, { sparse: true }); // geospatial

export const TrackingModel = model<ITracking>('Tracking', trackingSchema);
