import { createSlice } from '@reduxjs/toolkit';

export const statusSlice = createSlice({
  name: 'status',
  initialState: {
    message: 'abc',
  },
  reducers: {
    setMessage: (state, action) => {
      console.log('rstatus GOT set message', action);
      state.message = action.message;
    },
  },
});

// Action creators are generated for each case reducer function
export const { setMessage } = statusSlice.actions;

export default statusSlice.reducer;
