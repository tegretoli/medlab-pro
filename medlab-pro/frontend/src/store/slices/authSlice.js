import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

const perdorues = JSON.parse(sessionStorage.getItem('perdoruesi') || 'null');

export const hyrje = createAsyncThunk('auth/hyrje', async (kredencialet, { rejectWithValue }) => {
  try {
    const { data } = await api.post('/auth/hyrje', kredencialet);

    if (data.requires2FA) {
      sessionStorage.setItem('tempToken', data.tempToken);
      return data;
    }

    sessionStorage.removeItem('tempToken');
    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('perdoruesi', JSON.stringify(data.perdoruesi));
    return data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.mesazh || 'Gabim hyrjeje');
  }
});

export const verifikto2FA = createAsyncThunk('auth/verifikto2FA', async ({ kodi }, { rejectWithValue }) => {
  try {
    const tempToken = sessionStorage.getItem('tempToken');
    const { data } = await api.post('/auth/verifikto-2fa', { tempToken, kodi });
    sessionStorage.removeItem('tempToken');
    sessionStorage.setItem('token', data.token);
    sessionStorage.setItem('perdoruesi', JSON.stringify(data.perdoruesi));
    return data;
  } catch (e) {
    return rejectWithValue(e.response?.data?.mesazh || 'Kod i gabuar');
  }
});

export const merreProfilin = createAsyncThunk('auth/profili', async (_, { rejectWithValue }) => {
  try {
    const { data } = await api.get('/auth/profili');
    return data.perdoruesi;
  } catch (e) {
    return rejectWithValue(e.response?.data?.mesazh);
  }
});

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    perdoruesi: perdorues,
    token: sessionStorage.getItem('token'),
    ngarkimi: false,
    gabim: null,
    requires2FA: false,
    needsSetup: false,
    qrCode: null,
  },
  reducers: {
    dalje: (state, action) => {
      const token = sessionStorage.getItem('token');
      const arsyeja = action?.payload?.arsyeja || 'manual';
      if (token) {
        api.post('/auth/logout', { arsyeja }, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => {});
      }
      state.perdoruesi = null;
      state.token = null;
      state.requires2FA = false;
      state.needsSetup = false;
      state.qrCode = null;
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('perdoruesi');
      sessionStorage.removeItem('tempToken');
    },
    pastroGabim: (state) => { state.gabim = null; },
    pastro2FA: (state) => {
      state.requires2FA = false;
      state.needsSetup = false;
      state.qrCode = null;
    },
  },
  extraReducers: (b) => {
    b
      .addCase(hyrje.pending, (s) => {
        s.ngarkimi = true;
        s.gabim = null;
      })
      .addCase(hyrje.fulfilled, (s, a) => {
        s.ngarkimi = false;
        if (a.payload.requires2FA) {
          s.requires2FA = true;
          s.needsSetup = a.payload.needsSetup || false;
          s.qrCode = a.payload.qrCode || null;
          return;
        }

        s.perdoruesi = a.payload.perdoruesi;
        s.token = a.payload.token;
        s.requires2FA = false;
        s.needsSetup = false;
        s.qrCode = null;
      })
      .addCase(hyrje.rejected, (s, a) => {
        s.ngarkimi = false;
        s.gabim = a.payload;
      })
      .addCase(verifikto2FA.pending, (s) => {
        s.ngarkimi = true;
        s.gabim = null;
      })
      .addCase(verifikto2FA.fulfilled, (s, a) => {
        s.ngarkimi = false;
        s.perdoruesi = a.payload.perdoruesi;
        s.token = a.payload.token;
        s.requires2FA = false;
        s.needsSetup = false;
        s.qrCode = null;
      })
      .addCase(verifikto2FA.rejected, (s, a) => {
        s.ngarkimi = false;
        s.gabim = a.payload;
      })
      .addCase(merreProfilin.fulfilled, (s, a) => {
        s.perdoruesi = a.payload;
      });
  },
});

export const { dalje, pastroGabim, pastro2FA } = authSlice.actions;
export default authSlice.reducer;
