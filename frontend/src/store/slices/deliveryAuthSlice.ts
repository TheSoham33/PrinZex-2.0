import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

/**
 * Delivery partner (rider) session — mirrors sellerAuthSlice's shape.
 * Login is phone + OTP against /api/delivery/auth; the JWT carries the
 * rider identity, so the UI never trusts locally-typed ids.
 */

export interface DeliveryBoy {
  id: string;
  name: string;
  phone: string;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  isOnline: boolean;
}

export interface DeliveryAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface DeliveryAuthState {
  deliveryBoy: DeliveryBoy | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: 'idle' | 'loading';
}

const initialState: DeliveryAuthState = {
  deliveryBoy: null,
  accessToken: null,
  refreshToken: null,
  status: 'idle',
};

const deliveryAuthSlice = createSlice({
  name: 'deliveryAuth',
  initialState,
  reducers: {
    deliveryLoginStart(state) {
      state.status = 'loading';
    },
    deliveryLoginSuccess(
      state,
      action: PayloadAction<{ deliveryBoy: DeliveryBoy; tokens: DeliveryAuthTokens }>,
    ) {
      state.deliveryBoy = action.payload.deliveryBoy;
      if (action.payload.tokens) {
        state.accessToken = action.payload.tokens.accessToken;
        state.refreshToken = action.payload.tokens.refreshToken;
      }
      state.status = 'idle';
    },
    /** Local echo of server-side changes the rider just made (toggle, profile). */
    updateDeliveryBoy(state, action: PayloadAction<Partial<DeliveryBoy>>) {
      if (state.deliveryBoy) {
        Object.assign(state.deliveryBoy, action.payload);
      }
    },
    deliveryLogout(state) {
      state.deliveryBoy = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = 'idle';
    },
    restoreDeliverySession(state, action: PayloadAction<DeliveryAuthState | null>) {
      if (action.payload) {
        state.deliveryBoy = action.payload.deliveryBoy;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      }
      state.status = 'idle';
    },
  },
});

export const {
  deliveryLoginStart,
  deliveryLoginSuccess,
  updateDeliveryBoy,
  deliveryLogout,
  restoreDeliverySession,
} = deliveryAuthSlice.actions;

export default deliveryAuthSlice.reducer;
