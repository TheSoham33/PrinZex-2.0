import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface SellerUser {
  id: string;
  storeName: string;
  ownerName: string;
  email: string;
  status: 'PENDING' | 'APPROVED' | 'SUSPENDED' | 'REJECTED';
}

export interface SellerAuthTokens {
  accessToken: string;
  refreshToken: string;
}

export interface SellerAuthState {
  seller: SellerUser | null;
  accessToken: string | null;
  refreshToken: string | null;
  status: 'idle' | 'loading';
}

const initialState: SellerAuthState = {
  seller: null,
  accessToken: null,
  refreshToken: null,
  status: 'idle',
};

const sellerAuthSlice = createSlice({
  name: 'sellerAuth',
  initialState,
  reducers: {
    sellerLoginStart(state) {
      state.status = 'loading';
    },
    sellerLoginSuccess(state, action: PayloadAction<{ seller: SellerUser; tokens: SellerAuthTokens }>) {
      state.seller = action.payload.seller;
      if (action.payload.tokens) {
        state.accessToken = action.payload.tokens.accessToken;
        state.refreshToken = action.payload.tokens.refreshToken;
      }
      state.status = 'idle';
    },
    sellerLogout(state) {
      state.seller = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.status = 'idle';
    },
    restoreSellerSession(state, action: PayloadAction<SellerAuthState | null>) {
      if (action.payload) {
        state.seller = action.payload.seller;
        state.accessToken = action.payload.accessToken;
        state.refreshToken = action.payload.refreshToken;
      }
      state.status = 'idle';
    },
  },
});

export const { sellerLoginStart, sellerLoginSuccess, sellerLogout, restoreSellerSession } = sellerAuthSlice.actions;
export default sellerAuthSlice.reducer;
