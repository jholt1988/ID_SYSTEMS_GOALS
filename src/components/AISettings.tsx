import { useState, useEffect } from 'react';
import {
  fetchProviders,
  loadSettings,
  saveSettings,
  clearKey,
  validateKey,
  type ProviderInfo,
  type Capability,
} from '../lib/aiClient';

interface Props {
  open: boolean;
  onClose: () => void;
  onSaved?: () => void;
}

const CAPS: Capability[] = ['text', 'image', 'video'];
const CAP_LABEL: Record<Capability, string> = {
  text: 'Text / chat',
  image: 'Image generation',
  video: 'Video generation',
};

export default function AISettings({ open, onClose, onSaved }: Props) {
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [provider, setProvider] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [models, setModels] = useState<Partial<Record<Capability, string>>>({});
  const [showKey, setShowKey] = useState(false);
  const [testState, setTestState] = useState<'idle' | 'testing' | 'ok' | 'fail'>('idle');
  const [testMsg, setTestMsg] = useState('');

  useEffect(() => {
    if (!open) return;
    fetchProviders().then(setProviders).catch(() => setProviders([]));
    const s = loadSettings();
    setProvider(s.provider);
    setApiKey(s.apiKey);
    setModels(s.models);
  }, [open]);

  const current = providers.find((p) => p.id === provider);

  // When provider changes, default each capability's model to the first option.
  useEffect(() => {
    if (!current) return;
    setModels((prev) => {
      const next = { ...prev };
      for (const cap of CAPS) {
        const opts = current.models.filter((m) => m.capabilities.includes(cap));
        if (opts.length && !opts.find((o) => o.id === next[cap])) next[cap] = opts[0].id;
        if (!opts.length) delete next[cap];
      }
      return next;
    });
  }, [provider, providers]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!open) return null;

  const handleSave = () => {
    saveSettings({ provider, apiKey, models });
    onSaved?.();
    onClose();
  };

  const handleTest = async () => {
    saveSettings({ provider, apiKey, models }); // persist so validateKey reads current
    setTestState('testing');
    setTestMsg('');
    try {
      const r = await validateKey();
      if (r.valid) { setTestState('ok'); setTestMsg('Key works ✓'); }
      else { setTestState('fail'); setTestMsg(r.error || 'Invalid key'); }
    } catch (e: any) {
      setTestState('fail'); setTestMsg(e?.message || 'Validation failed');
    }
  };

  return (
    <div
      style={{
        position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)',
        display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 1000,
      }}
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: '#11131a', color: '#e8e8ef', width: 'min(560px, 92vw)',
          maxHeight: '90vh', overflowY: 'auto', borderRadius: 12, padding: 24,
          border: '1px solid #2a2d3a',
        }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
          <h2 style={{ margin: 0, fontSize: 18 }}>AI Provider Settings</h2>
          <button onClick={onClose} style={btnGhost}>✕</button>
        </div>

        <p style={{ fontSize: 13, opacity: 0.7, marginTop: 0 }}>
          Bring your own API key. Your key is stored only in this browser tab
          (cleared when you close it) and sent directly to the provider via our
          server proxy — never saved on our servers.
        </p>

        {/* Provider */}
        <label style={lbl}>Provider</label>
        <select value={provider} onChange={(e) => setProvider(e.target.value)} style={input}>
          <option value="">— Select a provider —</option>
          {providers.map((p) => (
            <option key={p.id} value={p.id}>{p.label}</option>
          ))}
        </select>

        {current && (
          <>
            {/* API key */}
            <label style={lbl}>
              API Key{' '}
              <a href={current.keyUrl} target="_blank" rel="noreferrer" style={{ color: '#7aa2f7', fontSize: 12 }}>
                (get one ↗)
              </a>
            </label>
            <div style={{ display: 'flex', gap: 8 }}>
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setTestState('idle'); }}
                placeholder="Paste your API key"
                style={{ ...input, flex: 1, marginBottom: 0 }}
                autoComplete="off"
              />
              <button onClick={() => setShowKey((v) => !v)} style={btnGhost}>{showKey ? 'Hide' : 'Show'}</button>
            </div>

            {/* Per-capability model pickers */}
            {CAPS.map((cap) => {
              const opts = current.models.filter((m) => m.capabilities.includes(cap));
              if (!opts.length) return (
                <div key={cap} style={{ ...lbl, opacity: 0.4 }}>
                  {CAP_LABEL[cap]}: not supported by {current.label}
                </div>
              );
              return (
                <div key={cap}>
                  <label style={lbl}>{CAP_LABEL[cap]} model</label>
                  <select
                    value={models[cap] || ''}
                    onChange={(e) => setModels((m) => ({ ...m, [cap]: e.target.value }))}
                    style={input}
                  >
                    {opts.map((m) => <option key={m.id} value={m.id}>{m.label}</option>)}
                  </select>
                </div>
              );
            })}

            {/* Test + actions */}
            <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginTop: 12 }}>
              <button onClick={handleTest} style={btnSecondary} disabled={!apiKey || testState === 'testing'}>
                {testState === 'testing' ? 'Testing…' : 'Test key'}
              </button>
              {testMsg && (
                <span style={{ fontSize: 13, color: testState === 'ok' ? '#9ece6a' : '#f7768e' }}>{testMsg}</span>
              )}
            </div>
          </>
        )}

        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 20 }}>
          <button onClick={() => { clearKey(); setApiKey(''); setTestState('idle'); }} style={btnGhost}>
            Clear key
          </button>
          <div style={{ display: 'flex', gap: 8 }}>
            <button onClick={onClose} style={btnGhost}>Cancel</button>
            <button onClick={handleSave} style={btnPrimary} disabled={!provider || !apiKey}>Save</button>
          </div>
        </div>
      </div>
    </div>
  );
}

const lbl: React.CSSProperties = { display: 'block', fontSize: 13, marginTop: 14, marginBottom: 6, opacity: 0.85 };
const input: React.CSSProperties = {
  width: '100%', padding: '9px 11px', background: '#1a1d27', color: '#e8e8ef',
  border: '1px solid #2a2d3a', borderRadius: 8, marginBottom: 4, fontSize: 14, boxSizing: 'border-box',
};
const btnBase: React.CSSProperties = { padding: '8px 14px', borderRadius: 8, cursor: 'pointer', fontSize: 14, border: '1px solid #2a2d3a' };
const btnPrimary: React.CSSProperties = { ...btnBase, background: '#7aa2f7', color: '#0b0d12', border: 'none', fontWeight: 600 };
const btnSecondary: React.CSSProperties = { ...btnBase, background: '#2a2d3a', color: '#e8e8ef' };
const btnGhost: React.CSSProperties = { ...btnBase, background: 'transparent', color: '#e8e8ef' };
