import { createSlice, type PayloadAction } from '@reduxjs/toolkit';
import type { OrderSpecifications, UploadedFile, CostBreakdown } from '@/lib/types';

export interface CartItem {
  id: string;
  storeId: string;
  storeName: string;
  serviceId: string;
  serviceName: string;
  specifications: OrderSpecifications;
  file: UploadedFile | null;
  specialInstructions: string;
  costBreakdown: CostBreakdown;
}

export interface CartState {
  items: CartItem[];
  isOpen: boolean;
}

const initialState: CartState = {
  items: [],
  isOpen: false,
};

const cartSlice = createSlice({
  name: 'cart',
  initialState,
  reducers: {
    addToCart(state, action: PayloadAction<CartItem>) {
      state.items.push(action.payload);
      state.isOpen = true;
    },
    removeFromCart(state, action: PayloadAction<string>) {
      state.items = state.items.filter((item) => item.id !== action.payload);
    },
    clearCart(state) {
      state.items = [];
    },
    toggleCart(state) {
      state.isOpen = !state.isOpen;
    },
    setCartOpen(state, action: PayloadAction<boolean>) {
      state.isOpen = action.payload;
    },
  },
});

export const { addToCart, removeFromCart, clearCart, toggleCart, setCartOpen } = cartSlice.actions;
export default cartSlice.reducer;
