import { configureStore } from '@reduxjs/toolkit';
import { adminApi } from './api';

export const store = configureStore({
  reducer: {
    [adminApi.reducerPath]: adminApi.reducer,
  },
  middleware: (gDM) => gDM().concat(adminApi.middleware),
});

export type RootState = ReturnType<typeof store.getState>;
