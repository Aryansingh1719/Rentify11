import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '@/lib/api';

// ================= LOGIN =================
export const login = createAsyncThunk(
  'auth/login',
  async (data, { rejectWithValue }) => {
    try {
      const response = await api.post('/api/auth/login', data);

      // 🔥 Save token
      localStorage.setItem("token", response.data.token);

      return response.data.user;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.message || "Login failed"
      );
    }
  }
);

// ================= FETCH USER =================
export const fetchMe = createAsyncThunk(
  'auth/fetchMe',
  async (_, { rejectWithValue }) => {
    try {
      const response = await api.get('/api/auth/me');
      return response.data.user;
    } catch (err) {
      return rejectWithValue("Not authenticated");
    }
  }
);

// ================= LOGOUT =================
export const logout = createAsyncThunk(
  'auth/logout',
  async () => {
    // 🔥 Remove token
    localStorage.removeItem("token");
    return null;
  }
);

// ================= SLICE =================
const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: null,
    loading: false,
    error: null,
  },
  reducers: {
    setUser: (state, action) => {
      state.user = action.payload;
    },
  },
  extraReducers: (builder) => {
    builder

      // ===== LOGIN =====
      .addCase(login.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(login.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      })

      // ===== FETCH USER =====
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

      // ===== LOGOUT =====
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.error = null;
      });
  },
});

export const { setUser } = authSlice.actions;
export default authSlice.reducer;

// import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
// import api from '@/lib/api';

// export const fetchMe = createAsyncThunk('auth/fetchMe', async () => {
//   const response = await api.get('/api/auth/me');
//   return response.data.user;
// });

// export const logout = createAsyncThunk('auth/logout', async () => {
//   await api.post('/api/auth/logout');
//   return null;
// });

// const authSlice = createSlice({
//   name: 'auth',
//   initialState: {
//     user: null,
//     loading: false,
//     error: null,
//   },
//   reducers: {
//     setUser: (state, action) => {
//       state.user = action.payload;
//     },
//   },
//   extraReducers: (builder) => {
//     builder
//       .addCase(fetchMe.pending, (state) => {
//         state.loading = true;
//       })
//       .addCase(fetchMe.fulfilled, (state, action) => {
//         state.loading = false;
//         state.user = action.payload;
//       })
//       .addCase(fetchMe.rejected, (state) => {
//         state.loading = false;
//         state.user = null;
//       })
//       .addCase(logout.fulfilled, (state) => {
//         state.user = null;
//       });
//   },
// });

// export const { setUser } = authSlice.actions;
// export default authSlice.reducer;
