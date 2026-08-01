import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export type SellerStatus = 'pending' | 'approved' | 'suspended';

export interface SellerUser {
  id: string;
  storeName: string;
  ownerName: string;
  email: string;
  status: SellerStatus;
}

export interface SellerAuthState {
  seller: SellerUser | null;
  status: 'idle' | 'loading';
}

const initialState: SellerAuthState = {
  seller: null,
  status: 'idle',
};

const sellerAuthSlice = createSlice({
  name: 'sellerAuth',
  initialState,
  reducers: {
    sellerLoginStart(state) {
      state.status = 'loading';
    },
    sellerLoginSuccess(state, action: PayloadAction<SellerUser>) {
      state.seller = action.payload;
      state.status = 'idle';
    },
    sellerLoginFailure(state) {
      state.status = 'idle';
    },
    sellerLogout(state) {
      state.seller = null;
      state.status = 'idle';
    },
    /** Rehydrate the seller session from localStorage on first client render. */
    restoreSellerSession(state, action: PayloadAction<SellerUser | null>) {
      state.seller = action.payload;
      state.status = 'idle';
    },
  },
});

export const {
  sellerLoginStart,
  sellerLoginSuccess,
  sellerLoginFailure,
  sellerLogout,
  restoreSellerSession,
} = sellerAuthSlice.actions;

export default sellerAuthSlice.reducer;
