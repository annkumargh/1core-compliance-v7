import React, { useState } from 'react';

const today = new Date().toISOString().split('T')[0];

export default function RatiosTab({ center }) {
  const [date, setDate] = useState(today);
  const isToday = date === today;

  return (
    <div>
      {/* Header with date selector */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, padding:'16px 20px', marginBottom:14, display:'flex', alignItems:'center', justifyContent:'space-between', gap:16 }}>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <div>
            <div style={{ display:'flex', alignItems:'center', gap:8 }}>
              <span style={{ fontSize:15, fontWeight:700, color:'#0f172a' }}>Ratios & Supervision</span>
              <span style={{ fontSize:11, fontWeight:700, padding:'2px 8px', borderRadius:20,
                background:'#eef7f2', color:'#1e5c38', border:'1px solid #a7d4ba' }}>
                ● Live Score
              </span>
            </div>
            <div style={{ fontSize:12.5, color:'#64748b', marginTop:2 }}>
              Staff-to-child ratios vs {center.state} state maximums
            </div>
          </div>
        </div>
        <div style={{ display:'flex', alignItems:'center', gap:10 }}>
          <label style={{ fontSize:12.5, fontWeight:600, color:'#374151' }}>View date:</label>
          <input
            type="date"
            value={date}
            max={today}
            onChange={e => setDate(e.target.value)}
            style={{ padding:'7px 12px', border:'1px solid #e2e8f0', borderRadius:8,
              fontSize:13, color:'#1e293b', outline:'none', fontFamily:'inherit', background:'#fff' }}
          />
          {!isToday && (
            <button onClick={() => setDate(today)} style={{
              padding:'7px 12px', borderRadius:8, border:'1px solid #e2e8f0',
              background:'#f8fafc', color:'#64748b', fontSize:12.5, cursor:'pointer',
              fontFamily:'inherit', fontWeight:500,
            }}>Today</button>
          )}
        </div>
      </div>

      {!isToday && (
        <div style={{ background:'#fdf4e7', border:'1px solid #e6b87a', borderRadius:8, padding:'10px 14px', marginBottom:12, fontSize:13, color:'#7c4a00' }}>
          Showing historical snapshot for {new Date(date + 'T12:00:00').toLocaleDateString('en-US', { weekday:'long', month:'long', day:'numeric', year:'numeric' })}.
          Historical data will be available once 1Core attendance integration is live.
        </div>
      )}

      {/* Ratio table */}
      <div style={{ background:'#fff', border:'1px solid #e2e8f0', borderRadius:12, overflow:'hidden', marginBottom:14 }}>
        <div style={{ padding:'14px 20px', borderBottom:'1px solid #f1f5f9', display:'flex', alignItems:'center', gap:8 }}>
          <span style={{ fontSize:14, fontWeight:700, color:'#0f172a' }}>Current Staff-to-Child Ratios</span>
          {isToday && (
            <span style={{ fontSize:11, color:'#2d7a4f', fontWeight:600 }}>
              · as of {new Date().toLocaleTimeString('en-US', { hour:'numeric', minute:'2-digit' })}
            </span>
          )}
        </div>
        <div style={{ overflowX:'auto' }}>
          <table className="ratio-table" style={{ width:'100%', borderCollapse:'collapse', fontSize:13.5 }}>
            <thead>
              <tr style={{ background:'#f8fafc' }}>
                {['Age Group','Children','Staff','Ratio','State Max','Status'].map(h => (
                  <th key={h} style={{ textAlign:'left', padding:'10px 16px', fontSize:11.5, fontWeight:700, color:'#94a3b8', letterSpacing:'0.05em', borderBottom:'1px solid #e2e8f0' }}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {(center.ratios || []).map((r, i) => (
                <tr key={i} style={{ borderBottom:'1px solid #f8fafc', background: r.compliant ? 'transparent' : '#fff8f8' }}>
                  <td style={{ padding:'13px 16px', fontWeight:500 }}>{r.group}</td>
                  <td style={{ padding:'13px 16px', textAlign:'center', fontWeight:600 }}>{r.children}</td>
                  <td style={{ padding:'13px 16px', textAlign:'center', fontWeight:600 }}>{r.staff}</td>
                  <td style={{ padding:'13px 16px', textAlign:'center', fontWeight:800, fontSize:16, color: r.compliant ? '#1e293b' : '#b91c1c' }}>{r.ratio}</td>
                  <td style={{ padding:'13px 16px', textAlign:'center', color:'#64748b' }}>{r.max}</td>
                  <td style={{ padding:'13px 16px' }}>
                    <span style={{ fontSize:12.5, fontWeight:600, padding:'3px 10px', borderRadius:20,
                      background: r.compliant ? '#eef7f2' : '#fdf1f1',
                      color:      r.compliant ? '#1e5c38' : '#7f1d1d',
                      border:    `1px solid ${r.compliant ? '#a7d4ba' : '#e8a0a0'}` }}>
                      {r.compliant ? '✓ Compliant' : '✗ Over ratio'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div style={{ display:'grid', gridTemplateColumns:'repeat(3,1fr)', gap:12 }}>
        {[
          { label:'Groups compliant', val:`${(center.ratios||[]).filter(r=>r.compliant).length} of ${(center.ratios||[]).length}`, color:'#2d7a4f', bg:'#eef7f2', bd:'#a7d4ba' },
          { label:'Total children', val:(center.ratios||[]).reduce((s,r)=>s+(r.children||0),0), color:'#1e5c8a', bg:'#eef4fc', bd:'#a8c4e0' },
          { label:'Total staff on duty', val:(center.ratios||[]).reduce((s,r)=>s+(r.staff||0),0), color:'#4f5fa8', bg:'#f0f2ff', bd:'#c5cbee' },
        ].map((k,i) => (
          <div key={i} style={{ background:k.bg, border:`1px solid ${k.bd}`, borderRadius:10, padding:'14px 18px' }}>
            <div style={{ fontSize:26, fontWeight:800, color:k.color }}>{k.val}</div>
            <div style={{ fontSize:12.5, color:'#374151', marginTop:4 }}>{k.label}</div>
          </div>
        ))}
      </div>
    </div>
  );
}
