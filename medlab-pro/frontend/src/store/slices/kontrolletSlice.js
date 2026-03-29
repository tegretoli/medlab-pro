// kontrolletSlice.js
import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const merrKontrollet   = createAsyncThunk('kontrollet/lista',   async (p,{rejectWithValue})=>{try{const{data}=await api.get('/kontrollet',{params:p});return data;}catch(e){return rejectWithValue(e.response?.data?.mesazh);}});
export const merrKalendarin   = createAsyncThunk('kontrollet/kalendar',async (p,{rejectWithValue})=>{try{const{data}=await api.get('/kontrollet/kalendar',{params:p});return data.takimet;}catch(e){return rejectWithValue(e.response?.data?.mesazh);}});
export const krijoKontrollin  = createAsyncThunk('kontrollet/krijo',   async (d,{rejectWithValue})=>{try{const{data}=await api.post('/kontrollet',d);return data.kontrolli;}catch(e){return rejectWithValue(e.response?.data?.mesazh);}});
export const perditesKontrollin=createAsyncThunk('kontrollet/perditeso',async({id,d},{rejectWithValue})=>{try{const{data}=await api.put(`/kontrollet/${id}`,d);return data.kontrolli;}catch(e){return rejectWithValue(e.response?.data?.mesazh);}});

const kontrolletSlice = createSlice({
  name:'kontrollet',
  initialState:{lista:[],takimet:[],total:0,ngarkimi:false,gabim:null},
  reducers:{},
  extraReducers:(b)=>{
    b
      .addCase(merrKontrollet.fulfilled,   (s,a)=>{ s.lista=a.payload.kontrollet; s.total=a.payload.total; })
      .addCase(merrKalendarin.fulfilled,   (s,a)=>{ s.takimet=a.payload; })
      .addCase(krijoKontrollin.fulfilled,  (s,a)=>{ s.lista.unshift(a.payload); })
      .addCase(perditesKontrollin.fulfilled,(s,a)=>{ s.lista=s.lista.map(k=>k._id===a.payload._id?a.payload:k); });
  },
});
export default kontrolletSlice.reducer;
