import React, { useState } from 'react';

const API_BASE = 'http://localhost:8000';

export default function Submit() {
  const [form, setForm] = useState({ location: '', disaster_type: '', urgency: 'Low', summary: '' });
  const [status, setStatus] = useState('');

  const onChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const submit = async () => {
    setStatus('');
    if (!form.location || !form.summary) {
      setStatus('Location and summary are required');
      return;
    }
    try {
      const res = await fetch(`${API_BASE}/incidents`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      if (!res.ok) throw new Error('Failed');
      setStatus('Submitted successfully');
      setForm({ location: '', disaster_type: '', urgency: 'Low', summary: '' });
    } catch (e) {
      setStatus('Submission failed');
    }
  };

  return (
    <div className="min-h-screen bg-[#1a1a2e] text-[#ecf0f1] py-12">
      <div className="max-w-3xl mx-auto px-6 bg-[#16213e] border border-white/10 rounded-2xl p-8">
        <h2 className="text-3xl font-bold mb-6">Submit a New Incident</h2>
        <div className="grid gap-4">
          <input name="location" value={form.location} onChange={onChange} placeholder="Location" className="bg-[#1a1a2e] border border-white/10 rounded px-4 py-3" />
          <input name="disaster_type" value={form.disaster_type} onChange={onChange} placeholder="Disaster Type (e.g., Fire, Flood)" className="bg-[#1a1a2e] border border-white/10 rounded px-4 py-3" />
          <select name="urgency" value={form.urgency} onChange={onChange} className="bg-[#1a1a2e] border border-white/10 rounded px-4 py-3">
            <option>High</option>
            <option>Medium</option>
            <option>Low</option>
          </select>
          <textarea name="summary" value={form.summary} onChange={onChange} placeholder="Short summary" rows={3} className="bg-[#1a1a2e] border border-white/10 rounded px-4 py-3" />
        </div>
        <button onClick={submit} className="mt-6 px-6 py-3 bg-[#e94560] rounded-full font-semibold">Submit</button>
        {status && <p className="mt-3 text-sm text-[#e94560]">{status}</p>}
      </div>
    </div>
  );
}
