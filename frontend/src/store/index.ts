import { configureStore } from '@reduxjs/toolkit';
import authReducer from './slices/authSlice';
import sellerAuthReducer from './slices/sellerAuthSlice';
import adminAuthReducer from './slices/adminAuthSlice';
import cartReducer from './slices/cartSlice';

export const makeStore = () =>
  configureStore({
    reducer: {
      auth: authReducer,
      sellerAuth: sellerAuthReducer,
      adminAuth: adminAuthReducer,
      cart: cartReducer,
    },
  });

export const store = makeStore();

export type AppStore = ReturnType<typeof makeStore>;
export type RootState = ReturnType<AppStore['getState']>;
export type AppDispatch = AppStore['dispatch'];
