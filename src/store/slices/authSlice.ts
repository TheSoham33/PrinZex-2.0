import { createSlice, type PayloadAction } from '@reduxjs/toolkit';

export interface AuthUser {
  id: string;
  name: string;
  email: string;
}

export interface AuthState {
  user: AuthUser | null;
  status: 'idle' | 'loading';
}

const initialState: AuthState = {
  user: null,
  status: 'idle',
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginStart(state) {
      state.status = 'loading';
    },
    loginSuccess(state, action: PayloadAction<AuthUser>) {
      state.user = action.payload;
      state.status = 'idle';
    },
    loginFailure(state) {
      state.status = 'idle';
    },
    logout(state) {
      state.user = null;
      state.status = 'idle';
    },
    /** Rehydrate from localStorage on first client render. */
    restoreSession(state, action: PayloadAction<AuthUser | null>) {
      state.user = action.payload;
      state.status = 'idle';
    },
  },
});

export const { loginStart, loginSuccess, loginFailure, logout, restoreSession } = authSlice.actions;
export default authSlice.reducer;
