// laboratorSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const merrTestet     = createAsyncThunk('lab/testet',  async (p, { rejectWithValue }) => { try { const {data} = await api.get('/laborator/testet', {params:p}); return data.testet; } catch(e){return rejectWithValue(e.response?.data?.mesazh);}});
export const merrPorositë   = createAsyncThunk('lab/porosi',  async (p, { rejectWithValue }) => { try { const {data} = await api.get('/laborator/porosi', {params:p}); return data; } catch(e){return rejectWithValue(e.response?.data?.mesazh);}});
export const krijoPorosinë  = createAsyncThunk('lab/krijo',   async (d, { rejectWithValue }) => { try { const {data} = await api.post('/laborator/porosi', d); return data.porosi; } catch(e){return rejectWithValue(e.response?.data?.mesazh);}});
export const regjistroRez   = createAsyncThunk('lab/rezultate',async ({id,testet}, { rejectWithValue }) => { try { const {data} = await api.put(`/laborator/porosi/${id}/rezultate`, {testet}); return data.porosi; } catch(e){return rejectWithValue(e.response?.data?.mesazh);}});

const laboratorSlice = createSlice({
  name: 'laborator',
  initialState: { testet: [], porositë: [], total: 0, ngarkimi: false, gabim: null },
  reducers: {},
  extraReducers: (b) => {
    b
      .addCase(merrTestet.fulfilled,    (s,a) => { s.testet = a.payload; })
      .addCase(merrPorositë.pending,    (s)   => { s.ngarkimi = true; })
      .addCase(merrPorositë.fulfilled,  (s,a) => { s.ngarkimi = false; s.porositë = a.payload.porositë; s.total = a.payload.total; })
      .addCase(krijoPorosinë.fulfilled, (s,a) => { s.porositë.unshift(a.payload); })
      .addCase(regjistroRez.fulfilled,  (s,a) => { s.porositë = s.porositë.map(p => p._id === a.payload._id ? a.payload : p); });
  },
});
export default laboratorSlice.reducer;
