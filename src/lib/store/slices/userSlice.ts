import { createSlice, PayloadAction } from '@reduxjs/toolkit';

interface UserProfile {
  email: string;
  name: string;
  picture?: string;
}

interface UserState {
  isAuthenticated: boolean;
  profile: UserProfile | null;
  loading: boolean;
  error: string | null;
}

const initialState: UserState = {
  isAuthenticated: false,
  profile: null,
  loading: false,
  error: null,
};

export const userSlice = createSlice({
  name: 'user',
  initialState,
  reducers: {
    setAuthenticated: (state, action: PayloadAction<boolean>) => {
      state.isAuthenticated = action.payload;
    },
    setProfile: (state, action: PayloadAction<UserProfile | null>) => {
      state.profile = action.payload;
    },
    setLoading: (state, action: PayloadAction<boolean>) => {
      state.loading = action.payload;
    },
    setError: (state, action: PayloadAction<string | null>) => {
      state.error = action.payload;
    },
    logout: (state) => {
      state.isAuthenticated = false;
      state.profile = null;
      state.error = null;
    },
  },
});

export const {
  setAuthenticated,
  setProfile,
  setLoading,
  setError,
  logout,
} = userSlice.actions;

export default userSlice.reducer;
