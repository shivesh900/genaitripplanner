import { useState } from "react";
import { loadAISettings, saveAISettings, clearAISettings, DEFAULT_SETTINGS } from "../lib/ai";

function Settings() {
  const [s, setS] = useState(loadAISettings());
  const [saved, setSaved] = useState(false);
  const set = (k) => (e) => { setS({ ...s, [k]: e.target.value }); setSaved(false); };

  return (
    <div className="page-container">
      <div className="form-page">
        <div className="page-header">
          <h1>⚙︎ AI settings</h1>
          <p>The itinerary itself never needs a key. These settings only choose who writes the optional AI trip write-up.</p>
        </div>
        <form className="form-card" onSubmit={(e) => { e.preventDefault(); saveAISettings(s); setSaved(true); }}>
          <div className="form-grid">
            <div className="form-group full-width">
              <label htmlFor="provider">Provider</label>
              <select id="provider" value={s.provider} onChange={set("provider")}>
                <option value="free">Free AI — no key (community endpoint, can be slow)</option>
                <option value="gemini">Google Gemini — your own API key</option>
                <option value="openai">OpenAI-compatible — your own API key</option>
              </select>
            </div>
            {s.provider !== "free" && (
              <>
                <div className="form-group full-width">
                  <label htmlFor="apiKey">API key</label>
                  <input id="apiKey" type="password" autoComplete="off" value={s.apiKey} onChange={set("apiKey")}
                    placeholder={s.provider === "gemini" ? "AIza…" : "sk-…"} />
                  <span className="field-hint">Stored only in this browser and sent only to the provider you picked. Never to us.</span>
                </div>
                <div className="form-group">
                  <label htmlFor="model">Model (optional)</label>
                  <input id="model" value={s.model} onChange={set("model")} placeholder={s.provider === "gemini" ? "gemini-2.0-flash" : "gpt-4o-mini"} />
                </div>
                {s.provider === "openai" && (
                  <div className="form-group">
                    <label htmlFor="baseUrl">Base URL</label>
                    <input id="baseUrl" value={s.baseUrl} onChange={set("baseUrl")} placeholder={DEFAULT_SETTINGS.baseUrl} />
                  </div>
                )}
              </>
            )}
          </div>
          <div className="form-actions">
            <button type="submit" className="btn btn-primary">Save</button>
            <button type="button" className="btn btn-secondary" onClick={() => { clearAISettings(); setS({ ...DEFAULT_SETTINGS }); setSaved(true); }}>
              Forget my key
            </button>
          </div>
          {saved && <p className="field-hint" role="status">✓ Saved on this device.</p>}
        </form>
      </div>
    </div>
  );
}

export default Settings;
