// pacientetSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const merrPacientet = createAsyncThunk('pacientet/lista', async (params, { rejectWithValue }) => {
  try { const { data } = await api.get('/pacientet', { params }); return data; }
  catch (e) { return rejectWithValue(e.response?.data?.mesazh); }
});
export const merrPacientin = createAsyncThunk('pacientet/nje', async (id, { rejectWithValue }) => {
  try { const { data } = await api.get(`/pacientet/${id}`); return data.pacienti; }
  catch (e) { return rejectWithValue(e.response?.data?.mesazh); }
});
export const regjistroPatient = createAsyncThunk('pacientet/regjistro', async (te_dhena, { rejectWithValue }) => {
  try { const { data } = await api.post('/pacientet', te_dhena); return data.pacienti; }
  catch (e) { return rejectWithValue(e.response?.data?.mesazh); }
});
export const perditesoPacientin = createAsyncThunk('pacientet/perditeso', async ({ id, te_dhena }, { rejectWithValue }) => {
  try { const { data } = await api.put(`/pacientet/${id}`, te_dhena); return data.pacienti; }
  catch (e) { return rejectWithValue(e.response?.data?.mesazh); }
});
export const fshiPacientin = createAsyncThunk('pacientet/fshi', async (id, { rejectWithValue }) => {
  try { await api.delete(`/pacientet/${id}`); return id; }
  catch (e) { return rejectWithValue(e.response?.data?.mesazh); }
});

const pacientetSlice = createSlice({
  name: 'pacientet',
  initialState: { lista: [], pacientiAktual: null, total: 0, ngarkimi: false, gabim: null },
  reducers: { pastroAktualin: (s) => { s.pacientiAktual = null; } },
  extraReducers: (b) => {
    b
      .addCase(merrPacientet.pending,        (s)    => { s.ngarkimi = true; })
      .addCase(merrPacientet.fulfilled,      (s, a) => { s.ngarkimi = false; s.lista = a.payload.pacientet; s.total = a.payload.total; })
      .addCase(merrPacientet.rejected,       (s, a) => { s.ngarkimi = false; s.gabim = a.payload; })
      .addCase(merrPacientin.pending,        (s)    => { s.ngarkimi = true; })
      .addCase(merrPacientin.fulfilled,      (s, a) => { s.ngarkimi = false; s.pacientiAktual = a.payload; })
      .addCase(regjistroPatient.fulfilled,   (s, a) => { s.lista.unshift(a.payload); s.total++; })
      .addCase(perditesoPacientin.fulfilled, (s, a) => { s.pacientiAktual = a.payload; s.lista = s.lista.map(p => p._id === a.payload._id ? a.payload : p); })
      .addCase(fshiPacientin.fulfilled,      (s, a) => { s.lista = s.lista.filter(p => p._id !== a.payload); s.total = Math.max(0, s.total - 1); });
  },
});
export const { pastroAktualin } = pacientetSlice.actions;
export default pacientetSlice.reducer;
