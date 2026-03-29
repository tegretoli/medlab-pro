import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

export const merrFaturat    = createAsyncThunk('pagesat/faturat', async (p,{rejectWithValue})=>{try{const{data}=await api.get('/pagesat/faturat',{params:p});return data;}catch(e){return rejectWithValue(e.response?.data?.mesazh);}});
export const krijoFaturën   = createAsyncThunk('pagesat/krijo',   async (d,{rejectWithValue})=>{try{const{data}=await api.post('/pagesat/faturat',d);return data.fatura;}catch(e){return rejectWithValue(e.response?.data?.mesazh);}});
export const regjistroPagesen=createAsyncThunk('pagesat/paguaj',  async({id,d},{rejectWithValue})=>{try{const{data}=await api.put(`/pagesat/faturat/${id}/paguaj`,d);return data.fatura;}catch(e){return rejectWithValue(e.response?.data?.mesazh);}});
export const merrStatistikat= createAsyncThunk('pagesat/statistika',async(_,{rejectWithValue})=>{try{const{data}=await api.get('/pagesat/statistika');return data;}catch(e){return rejectWithValue(e.response?.data?.mesazh);}});

const pagesatSlice = createSlice({
  name:'pagesat',
  initialState:{lista:[],total:0,statistikat:null,ngarkimi:false,gabim:null},
  reducers:{},
  extraReducers:(b)=>{
    b
      .addCase(merrFaturat.fulfilled,     (s,a)=>{ s.lista=a.payload.faturat; s.total=a.payload.total; })
      .addCase(krijoFaturën.fulfilled,    (s,a)=>{ s.lista.unshift(a.payload); })
      .addCase(regjistroPagesen.fulfilled,(s,a)=>{ s.lista=s.lista.map(f=>f._id===a.payload._id?a.payload:f); })
      .addCase(merrStatistikat.fulfilled, (s,a)=>{ s.statistikat=a.payload; });
  },
});
export default pagesatSlice.reducer;
