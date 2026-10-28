import { configureStore } from '@reduxjs/toolkit';
import { storeApi } from './api';
import uiReducer from './uiSlice';

export const store = configureStore({
  reducer: {
    [storeApi.reducerPath]: storeApi.reducer,
    ui: uiReducer,
  },
  middleware: (getDefault) => getDefault().concat(storeApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
