import { configureStore } from '@reduxjs/toolkit';
import authReducer      from './slices/authSlice';
import pacientetReducer from './slices/pacientetSlice';
import laboratorReducer from './slices/laboratorSlice';
import kontrolletReducer from './slices/kontrolletSlice';
import pagesatReducer   from './slices/pagesatSlice';

export const store = configureStore({
  reducer: {
    auth:       authReducer,
    pacientet:  pacientetReducer,
    laborator:  laboratorReducer,
    kontrollet: kontrolletReducer,
    pagesat:    pagesatReducer,
  },
});
