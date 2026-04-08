import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api, { clearAuthSession, AUTH_TOKEN_KEY } from '@/lib/api';

export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
  if (typeof window === 'undefined') return null;
  const t = localStorage.getItem(AUTH_TOKEN_KEY);
  if (!t) return null;
  const response = await api.get('/api/auth/me');
  return response.data.user;
});

export const logout = createAsyncThunk('auth/logout', async () => {
  try {
    await api.post('/api/auth/logout');
  } catch {
    // still clear client session
  } finally {
    clearAuthSession();
  }
  return null;
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    /** True until the first fetchMe attempt finishes — avoids treating user as logged out during bootstrap. */
    loading: true,
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchMe.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchMe.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(fetchMe.rejected, (state) => {
        state.loading = false;
        state.user = null;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
      });
  },
});

export const { setUser } = authSlice.actions;
export default authSlice.reducer;
