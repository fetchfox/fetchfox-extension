import { configureStore } from '@reduxjs/toolkit'
import statusReducer from './slices/status.mjs';

export default configureStore({
  reducer: {
    status: statusReducer,
  },
});
