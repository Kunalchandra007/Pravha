import React, { useMemo, useRef, useState } from 'react';

type ChecklistItem = {
  id: string;
  label: string;
  checked: boolean;
};

const SectionCard: React.FC<{ title: string; children: React.ReactNode; tone?: 'info' | 'warn' | 'danger' | 'ok' }>
  = ({ title, children, tone = 'info' }) => {
  const toneMap: Record<string, { bg: string; border: string; title: string }>
    = {
      info: { bg: '#f8fafc', border: '#e5e7eb', title: '#1f2937' },
      warn: { bg: '#fffbeb', border: '#fde68a', title: '#92400e' },
      danger: { bg: '#fef2f2', border: '#fecaca', title: '#991b1b' },
      ok: { bg: '#f0fdf4', border: '#bbf7d0', title: '#065f46' }
    };
  const c = toneMap[tone];
  return (
    <div style={{ background: c.bg, border: `1px solid ${c.border}`, borderRadius: 12, padding: 20 }}>
      <h3 style={{ margin: '0 0 8px 0', color: c.title, fontSize: 18 }}>{title}</h3>
      <div>{children}</div>
    </div>
  );
};

const Precautions: React.FC<{ onBack?: () => void }>= ({ onBack }) => {
  const printRef = useRef<HTMLDivElement>(null);
  const [familyPlan, setFamilyPlan] = useState({
    householdName: '',
    meetingPoint: '',
    emergencyContacts: '',
    medicalNeeds: '',
  });

  const checklist = useMemo<ChecklistItem[]>(() => ([
    { id: 'water', label: 'Drinking water (3-day supply)', checked: false },
    { id: 'food', label: 'Non-perishable food (3-day supply)', checked: false },
    { id: 'meds', label: 'Prescription medicines', checked: false },
    { id: 'firstaid', label: 'First-aid kit', checked: false },
    { id: 'torch', label: 'Flashlight + batteries', checked: false },
    { id: 'radio', label: 'Battery/hand-crank radio', checked: false },
    { id: 'docs', label: 'Important documents (waterproof pouch)', checked: false },
    { id: 'cash', label: 'Cash and essentials', checked: false },
    { id: 'clothes', label: 'Warm clothes & blankets', checked: false },
    { id: 'hygiene', label: 'Hygiene items & sanitizer', checked: false },
  ]), []);

  const [items, setItems] = useState<ChecklistItem[]>(checklist);

  const toggleItem = (id: string) => {
    setItems(prev => prev.map(i => i.id === id ? { ...i, checked: !i.checked } : i));
  };

  const downloadChecklist = () => {
    const blob = new Blob([JSON.stringify(items, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pravaha_emergency_kit_checklist.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadPlan = () => {
    const content = `Pravaha Family Emergency Plan\n\nHousehold: ${familyPlan.householdName}\nMeeting Point: ${familyPlan.meetingPoint}\nEmergency Contacts: ${familyPlan.emergencyContacts}\nMedical Needs: ${familyPlan.medicalNeeds}\n`;
    const blob = new Blob([content], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'pravaha_family_emergency_plan.txt';
    a.click();
    URL.revokeObjectURL(url);
  };

  const printAsPDF = () => {
    // Browser print dialog allows saving as PDF
    if (printRef.current) {
      const original = document.body.innerHTML;
      const printable = printRef.current.innerHTML;
      document.body.innerHTML = printable;
      window.print();
      document.body.innerHTML = original;
      window.location.reload();
    } else {
      window.print();
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', padding: 20 }}>
      <div style={{ background: 'white', borderRadius: 16, padding: 24, marginBottom: 24, boxShadow: '0 10px 25px rgba(0,0,0,0.1)' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <div style={{ width: 44, height: 44, background: 'linear-gradient(135deg,#3b82f6,#06b6d4)', borderRadius: 10, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontSize: 22 }}>🛡️</div>
            <div>
              <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, color: '#1f2937' }}>Flood Precautions</h1>
              <p style={{ margin: 0, color: '#6b7280' }}>Guidelines, checklists, and templates to keep your family safe</p>
            </div>
          </div>
          {onBack && (
            <button onClick={onBack} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>← Back</button>
          )}
        </div>
      </div>

      <div ref={printRef} style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: 24, maxWidth: 1400, margin: '0 auto' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <SectionCard title="General Safety Guidelines" tone="ok">
            <ul style={{ margin: 0, paddingLeft: 20, color: '#065f46' }}>
              <li>Stay informed using official channels and Pravaha alerts.</li>
              <li>Avoid walking or driving through flood waters.</li>
              <li>Turn off electricity at the main breaker if instructed.</li>
              <li>Move valuables and hazardous materials to higher ground.</li>
            </ul>
          </SectionCard>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>
            <SectionCard title="Before Flood" tone="warn">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>Prepare emergency kit and evacuation plan.</li>
                <li>Store drinking water and secure outdoor items.</li>
                <li>Identify nearest shelters via GIS Mapping.</li>
              </ul>
            </SectionCard>
            <SectionCard title="During Flood" tone="danger">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>Evacuate immediately if instructed by authorities.</li>
                <li>Avoid contact with flood water; beware of currents.</li>
                <li>Use battery radio and follow official guidance.</li>
              </ul>
            </SectionCard>
            <SectionCard title="After Flood" tone="info">
              <ul style={{ margin: 0, paddingLeft: 20 }}>
                <li>Return home only when declared safe.</li>
                <li>Document damage for insurance and assistance.</li>
                <li>Disinfect water sources and clean safely.</li>
              </ul>
            </SectionCard>
          </div>

          <SectionCard title="Family Emergency Plan Template" tone="info">
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280' }}>Household Name</label>
                <input value={familyPlan.householdName} onChange={(e) => setFamilyPlan({ ...familyPlan, householdName: e.target.value })} placeholder="e.g., Sharma Family" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
              </div>
              <div>
                <label style={{ fontSize: 12, color: '#6b7280' }}>Meeting Point</label>
                <input value={familyPlan.meetingPoint} onChange={(e) => setFamilyPlan({ ...familyPlan, meetingPoint: e.target.value })} placeholder="e.g., Community Hall" style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #e5e7eb' }} />
              </div>
              <div style={{ gridColumn: '1 / span 2' }}>
                <label style={{ fontSize: 12, color: '#6b7280' }}>Emergency Contacts</label>
                <textarea value={familyPlan.emergencyContacts} onChange={(e) => setFamilyPlan({ ...familyPlan, emergencyContacts: e.target.value })} placeholder="Names, phone numbers" rows={3} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              </div>
              <div style={{ gridColumn: '1 / span 2' }}>
                <label style={{ fontSize: 12, color: '#6b7280' }}>Medical Needs</label>
                <textarea value={familyPlan.medicalNeeds} onChange={(e) => setFamilyPlan({ ...familyPlan, medicalNeeds: e.target.value })} placeholder="Allergies, medications, special assistance" rows={3} style={{ width: '100%', padding: 12, borderRadius: 8, border: '1px solid #e5e7eb' }} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={downloadPlan} style={{ background: '#3b82f6', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Download Plan (.txt)</button>
              <button onClick={printAsPDF} style={{ background: '#111827', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Download as PDF</button>
            </div>
          </SectionCard>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Emergency Kit Checklist</h3>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 8 }}>
              {items.map(item => (
                <label key={item.id} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '8px 10px', borderRadius: 8, border: '1px solid #e5e7eb', background: item.checked ? '#f0fdf4' : 'white' }}>
                  <input type="checkbox" checked={item.checked} onChange={() => toggleItem(item.id)} style={{ transform: 'scale(1.2)' }} />
                  <span style={{ color: '#374151' }}>{item.label}</span>
                </label>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, marginTop: 12 }}>
              <button onClick={downloadChecklist} style={{ background: '#059669', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Download Checklist (.json)</button>
              <button onClick={printAsPDF} style={{ background: '#111827', color: 'white', border: 'none', padding: '10px 16px', borderRadius: 8, cursor: 'pointer', fontWeight: 600 }}>Print / Save as PDF</button>
            </div>
          </div>

          <div style={{ background: 'white', borderRadius: 12, padding: 20, boxShadow: '0 2px 8px rgba(0,0,0,0.05)' }}>
            <h3 style={{ margin: '0 0 8px 0', color: '#1f2937' }}>Helpful Resources</h3>
            <ul style={{ margin: 0, paddingLeft: 20, color: '#374151' }}>
              <li>Emergency services: 112</li>
              <li>Nearest shelters: See GIS Mapping → Evacuation Centers</li>
              <li>Weather updates: IMD / official channels</li>
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Precautions;


