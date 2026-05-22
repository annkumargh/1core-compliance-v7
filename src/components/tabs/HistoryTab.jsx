import React from 'react';

export default function HistoryTab({ center, scoreColor }) {
  return (
    <div className="card">
      <h3>Compliance History</h3>
      <p className="card-sub">Compliance Snapshots — {center.name} · Saved each time a full compliance check is submitted</p>
      <div style={{ overflowX:'auto' }}>
        <table className="history-table">
          <thead>
            <tr>
              <th>Snapshot Date</th>
              <th>Overall</th>
              <th>Ratios</th>
              <th>Credentials</th>
              <th>Facility</th>
              <th>Family</th>
              <th>Open Alerts</th>
            </tr>
          </thead>
          <tbody>
            {center.history.map((h, i) => (
              <tr key={i} style={{ background: i === 0 ? '#f8fafc' : 'transparent' }}>
                <td>
                  <span style={{ fontWeight: i === 0 ? 700 : 400 }}>{h.date}</span>
                  {h.label && <span style={{ marginLeft:8, fontSize:11, background:'#eff6ff', color:'#1d4ed8', padding:'2px 7px', borderRadius:20, border:'1px solid #bfdbfe' }}>{h.label}</span>}
                </td>
                <td><span style={{ fontWeight:700, fontSize:15, color:scoreColor(h.overall) }}>{h.overall}%</span></td>
                <td style={{ color:scoreColor(h.ratios) }}>{h.ratios}%</td>
                <td style={{ color:scoreColor(h.credentials) }}>{h.credentials}%</td>
                <td style={{ color:scoreColor(h.center) }}>{h.center}%</td>
                <td style={{ color:scoreColor(h.family) }}>{h.family}%</td>
                <td>
                  <span style={{ fontWeight:600, color: h.alerts > 8 ? '#dc2626' : h.alerts > 4 ? '#d97706' : '#16a34a' }}>
                    {h.alerts}
                  </span>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
