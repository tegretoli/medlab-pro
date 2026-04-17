import { useState, useEffect } from 'react';
import { useParams } from 'react-router-dom';
import api from '../../services/api';

function BarcodeSVG({ text, width = 200, height = 36 }) {
  const chars = (text || '').replace(/\s/g, '').toUpperCase();
  if (!chars) return null;

  const bitsPerChar = 9;
  const totalBits = chars.length * bitsPerChar + 8;
  const bw = width / totalBits;
  const bars = [];
  let bx = 0;

  [1, 0, 1, 1].forEach((b, i) => {
    if (b) bars.push({ x: bx, w: bw * (i % 2 === 0 ? 1.5 : 0.7) });
    bx += bw;
  });

  chars.split('').forEach(c => {
    const v = c.charCodeAt(0);
    for (let bit = 0; bit < bitsPerChar; bit++) {
      const thick = (v >> (bit % 8)) & 1;
      if (bit % 2 === 0) bars.push({ x: bx, w: thick ? bw * 1.5 : bw * 0.7 });
      bx += bw;
    }
  });

  [1, 0, 1, 1, 1].forEach(b => {
    if (b) bars.push({ x: bx, w: bw });
    bx += bw;
  });

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      width={width}
      height={height}
      style={{ display: 'block', margin: '0 auto' }}
    >
      {bars.map((b, i) => (
        <rect
          key={i}
          x={b.x.toFixed(2)}
          y={0}
          width={Math.max(0.5, b.w).toFixed(2)}
          height={height}
          fill="#000"
        />
      ))}
    </svg>
  );
}

export default function FletaPunuese() {
  const { id } = useParams();
  const [porosi, setPorosi] = useState(null);
  const [grupet, setGrupet] = useState([]);
  const [gabim, setGabim] = useState(false);

  useEffect(() => {
    api.get(`/laborator/porosi/${id}`)
      .then(async r => {
        const p = r.data.porosi;
        setPorosi(p);

        if (p.seancaId) {
          try {
            const r2 = await api.get('/laborator/porosi', { params: { seancaId: p.seancaId } });
            const porosite = r2.data.porosite || [];
            porosite.sort((a, b) => {
              if (a.departamenti === p.departamenti) return -1;
              if (b.departamenti === p.departamenti) return 1;
              return a.departamenti.localeCompare(b.departamenti);
            });
            setGrupet(porosite.map(ord => [ord.departamenti, ord.analizat || []]));
          } catch {
            setGrupet([[p.departamenti || 'Tjeter', p.analizat || []]]);
          }
        } else {
          setGrupet([[p.departamenti || 'Tjeter', p.analizat || []]]);
        }

        setTimeout(() => window.print(), 900);
      })
      .catch(() => setGabim(true));
  }, [id]);

  if (gabim) {
    return (
      <div style={{ padding: 16, fontFamily: 'monospace', textAlign: 'center' }}>
        Gabim duke ngarkuar porosine.
      </div>
    );
  }

  if (!porosi) {
    return (
      <div style={{ padding: 16, fontFamily: 'monospace', textAlign: 'center' }}>
        Duke ngarkuar...
      </div>
    );
  }

  const pac = porosi.pacienti || {};
  const emriPlote = `${pac.emri || ''} ${pac.mbiemri || ''}`.trim();

  const data = new Date(porosi.dataPorosis).toLocaleDateString('sq-AL', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  const refExt = porosi.referuesId;
  const referuesi = refExt
    ? (refExt.institucioni || `${refExt.emri || ''} ${refExt.mbiemri || ''}`.trim())
    : 'Vete ardhur';

  return (
    <>
      <style>{`
        * { margin: 0; padding: 0; box-sizing: border-box; }
        @page { size: 80mm auto; margin: 3mm 2mm; }
        body { background: #fff; }
        @media print { .no-print { display: none !important; } }
      `}</style>

      <div
        style={{
          width: '76mm',
          margin: '0 auto',
          fontFamily: "'Courier New', Courier, monospace",
          fontSize: '9pt',
          color: '#000',
        }}
      >
        <div style={{ borderTop: '1.5px solid #000', margin: '4px 0' }} />

        <div
          style={{
            fontSize: '62pt',
            fontWeight: 'bold',
            textAlign: 'center',
            lineHeight: 1.05,
            margin: '4px 0 2px',
          }}
        >
          {porosi.numrRendor || '?'}
        </div>

        <div style={{ margin: '4px 0 2px' }}>
          <BarcodeSVG text={porosi.numrPorosi || ''} width={200} height={36} />
          <div style={{ fontSize: '9.4pt', fontWeight: 800, textAlign: 'center', letterSpacing: 1.8, marginTop: 2 }}>
            {porosi.numrPorosi}
          </div>
        </div>

        {porosi.urgente && (
          <div
            style={{
              border: '2.75px solid #d40000',
              borderRadius: 5,
              textAlign: 'center',
              fontWeight: 800,
              fontSize: '15pt',
              color: '#d40000',
              letterSpacing: '2.4px',
              lineHeight: 1.05,
              padding: '5px 0 4px',
              margin: '5px 0 6px',
              textTransform: 'uppercase',
            }}
          >
            {'\u26A1'} URGJENT
          </div>
        )}

        <div
          style={{
            fontSize: '14.2pt',
            fontWeight: 900,
            textAlign: 'center',
            letterSpacing: '0.3px',
            margin: '7px 0 5px',
          }}
        >
          {emriPlote}
        </div>

        {grupet.map(([dep, rows]) => (
          <div key={dep}>
            <div style={{ borderTop: '1px dashed #000', margin: '4px 0' }} />
            <div
              style={{
                fontSize: '12.8pt',
                fontWeight: 900,
                textAlign: 'center',
                margin: '6px 0 4px',
                letterSpacing: '1px',
              }}
            >
              {dep.toUpperCase()}
            </div>

            {rows.map((row, i) => (
              <div
                key={i}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'baseline',
                  padding: '3px 2px',
                  borderBottom: '1px solid #000',
                  fontSize: '10pt',
                  fontWeight: 800,
                }}
              >
                <span>{row.analiza?.emri || '—'}</span>
                {row.analiza?.materialBiologjik && (
                  <span style={{ fontSize: '8.8pt', fontWeight: 800, color: '#111', marginLeft: 6, flexShrink: 0 }}>
                    {row.analiza.materialBiologjik}
                  </span>
                )}
              </div>
            ))}
          </div>
        ))}

        <div style={{ borderTop: '1px dashed #000', margin: '5px 0 3px' }} />
        <div style={{ fontSize: '11pt', fontWeight: 900, margin: '5px 0 2px' }}>{data}</div>
        <div style={{ fontSize: '13pt', fontWeight: 900, margin: '5px 0' }}>{referuesi}</div>
        {porosi.shenime && (
          <div style={{ fontSize: '8.8pt', fontWeight: 700, margin: '4px 0 2px', fontStyle: 'italic' }}>
            * {porosi.shenime}
          </div>
        )}
        <div style={{ borderTop: '1.5px solid #000', marginTop: 8 }} />

        <div className="no-print" style={{ textAlign: 'center', marginTop: 10 }}>
          <button
            onClick={() => window.print()}
            style={{ padding: '5px 18px', fontSize: '9pt', cursor: 'pointer' }}
          >
            Shtyp Serisht
          </button>
        </div>
      </div>
    </>
  );
}
