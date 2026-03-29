import { useRef, useEffect } from 'react';

export default function RichTextEditor({ value, onChange, placeholder, minHeight = '3rem' }) {
  const ref  = useRef(null);
  const skip = useRef(false);

  // Inject placeholder CSS once
  useEffect(() => {
    if (document.getElementById('rte-style')) return;
    const s = document.createElement('style');
    s.id = 'rte-style';
    s.textContent = '.rte-ph:empty::before{content:attr(data-ph);color:#9ca3af;pointer-events:none;display:block}';
    document.head.appendChild(s);
  }, []);

  // Sync external value → DOM (skip when user is typing)
  useEffect(() => {
    if (!ref.current || skip.current) return;
    if (ref.current.innerHTML !== (value ?? '')) ref.current.innerHTML = value ?? '';
  }, [value]);

  const fmt = (cmd, val = null) => {
    ref.current?.focus();
    document.execCommand(cmd, false, val);
    skip.current = true;
    onChange(ref.current?.innerHTML ?? '');
    requestAnimationFrame(() => { skip.current = false; });
  };

  // Font size with actual px values using the "font-7 trick"
  const setFontSize = (px) => {
    ref.current?.focus();
    document.execCommand('fontSize', false, '7');
    const fonts = ref.current?.querySelectorAll('font[size="7"]') || [];
    fonts.forEach(el => {
      const span = document.createElement('span');
      span.style.fontSize = `${px}px`;
      el.parentNode.insertBefore(span, el);
      while (el.firstChild) span.appendChild(el.firstChild);
      el.parentNode.removeChild(el);
    });
    skip.current = true;
    onChange(ref.current?.innerHTML ?? '');
    requestAnimationFrame(() => { skip.current = false; });
  };

  const NGJYRAT = [
    { c: '#111827', t: 'E zezë' }, { c: '#dc2626', t: 'E kuqe' },
    { c: '#ea580c', t: 'Portokall' }, { c: '#ca8a04', t: 'E verdhë' },
    { c: '#16a34a', t: 'E gjelbër' }, { c: '#2563eb', t: 'Blu' },
    { c: '#7c3aed', t: 'Vjollcë' }, { c: '#db2777', t: 'Rozë' },
  ];

  const SIZES = [10, 11, 12, 13, 14, 16, 18, 20, 24, 28, 32];
  const FONTS = ['Arial', 'Times New Roman', 'Courier New', 'Georgia', 'Verdana'];

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden focus-within:ring-1 focus-within:ring-primary/30 focus-within:border-primary/40">
      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-1 px-2 py-1.5 bg-gray-50 border-b border-gray-100">
        <button type="button" onMouseDown={e=>{e.preventDefault();fmt('bold')}}
          className="w-6 h-6 rounded hover:bg-gray-200 text-xs font-bold text-gray-700 flex items-center justify-center" title="Bold">B</button>
        <button type="button" onMouseDown={e=>{e.preventDefault();fmt('italic')}}
          className="w-6 h-6 rounded hover:bg-gray-200 text-xs italic text-gray-700 flex items-center justify-center" title="Italic">I</button>
        <button type="button" onMouseDown={e=>{e.preventDefault();fmt('underline')}}
          className="w-6 h-6 rounded hover:bg-gray-200 text-xs underline text-gray-700 flex items-center justify-center" title="Nënvizim">U</button>
        <div className="w-px h-4 bg-gray-300 mx-0.5"/>
        {NGJYRAT.map(({c,t}) => (
          <button key={c} type="button" title={t} onMouseDown={e=>{e.preventDefault();fmt('foreColor',c)}}
            className="w-4 h-4 rounded-full flex-shrink-0 hover:scale-110 transition-transform"
            style={{background:c}}/>
        ))}
        <div className="w-px h-4 bg-gray-300 mx-0.5"/>
        <select className="text-[11px] border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600"
          defaultValue="" onChange={e=>{if(e.target.value){setFontSize(Number(e.target.value));e.target.value=''}}}>
          <option value="" disabled>Madhësia</option>
          {SIZES.map(s => <option key={s} value={s}>{s}px</option>)}
        </select>
        <select className="text-[11px] border border-gray-200 rounded px-1 py-0.5 bg-white text-gray-600"
          defaultValue="" onChange={e=>{if(e.target.value){fmt('fontName',e.target.value);e.target.value=''}}}>
          <option value="" disabled>Fonti</option>
          {FONTS.map(f => <option key={f} value={f}>{f}</option>)}
        </select>
        <div className="w-px h-4 bg-gray-300 mx-0.5"/>
        <button type="button" title="Pastro formatimin" onMouseDown={e=>{e.preventDefault();fmt('removeFormat')}}
          className="px-1.5 h-6 rounded text-[10px] text-gray-400 hover:bg-gray-200 hover:text-gray-600 flex items-center">✕</button>
      </div>
      {/* Editable area */}
      <div ref={ref} contentEditable suppressContentEditableWarning
        onInput={() => {
          skip.current = true;
          onChange(ref.current?.innerHTML ?? '');
          requestAnimationFrame(() => { skip.current = false; });
        }}
        className="rte-ph p-2 text-sm outline-none"
        data-ph={placeholder || ''}
        style={{ wordBreak: 'break-word', lineHeight: 1.6, minHeight }}
      />
    </div>
  );
}
