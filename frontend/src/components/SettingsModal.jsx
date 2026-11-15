import React, { useState } from 'react'
import { X, Cpu, Sparkles, CheckCircle2 } from 'lucide-react'

const PROVIDERS = [
  { id: 'ollama', label: 'Ollama (Local)', defaultModel: 'llama3.1', defaultUrl: 'http://127.0.0.1:11434' },
  { id: 'openai', label: 'OpenAI', defaultModel: 'gpt-4o-mini', defaultUrl: 'https://api.openai.com/v1' },
  { id: 'anthropic', label: 'Anthropic Claude', defaultModel: 'claude-3-5-sonnet-latest', defaultUrl: 'https://api.anthropic.com/v1/messages' },
  { id: 'gemini', label: 'Google Gemini', defaultModel: 'gemini-2.0-flash', defaultUrl: '' },
  { id: 'openrouter', label: 'OpenRouter', defaultModel: 'openai/gpt-4o-mini', defaultUrl: 'https://openrouter.ai/api/v1' },
]

export default function SettingsModal({ open, onClose, llmConfig, onSave }) {
  const [form, setForm] = useState(llmConfig)

  if (!open) return null

  const selectProvider = (providerId) => {
    const p = PROVIDERS.find((x) => x.id === providerId)
    setForm({
      ...form,
      provider: providerId,
      model: p?.defaultModel || '',
      baseUrl: p?.defaultUrl || '',
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="w-full max-w-xl rounded-2xl border border-slate-700/60 bg-[#0B101B] shadow-2xl overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-800 bg-[#0F1626] px-6 py-4">
          <div className="flex items-center gap-2.5">
            <Cpu className="h-5 w-5 text-indigo-400" />
            <h2 className="text-base font-bold text-white">Castiel AI Engine Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-6 space-y-5">
          {/* In-built Engine Banner */}
          <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4">
            <div className="flex items-start gap-3">
              <CheckCircle2 className="h-5 w-5 text-emerald-400 shrink-0 mt-0.5" />
              <div>
                <div className="text-sm font-semibold text-emerald-200">
                  Castiel In-Built Neural-NEXUS Coordinator is Active
                </div>
                <p className="mt-1 text-xs text-emerald-300/80 leading-relaxed">
                  Built natively on 128-dim Latent Semantic Indexing + TF-IDF specialist matching +
                  NEXUS phase & QA gate orchestration across all 283 agents. Zero external API keys required.
                </p>
              </div>
            </div>
          </div>

          {/* Optional LLM Booster */}
          <div className="rounded-xl border border-slate-800 bg-[#0F1524] p-4 space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-amber-400" />
                <div>
                  <div className="text-sm font-semibold text-slate-100">Optional External LLM Layer</div>
                  <div className="text-xs text-slate-400">
                    Layer generative completions on top of Castiel’s 283-agent router
                  </div>
                </div>
              </div>
              <label className="relative inline-flex cursor-pointer items-center">
                <input
                  type="checkbox"
                  checked={!!form.enabled}
                  onChange={(e) => setForm({ ...form, enabled: e.target.checked })}
                  className="peer sr-only"
                />
                <div className="h-5 w-9 rounded-full bg-slate-700 peer-checked:bg-indigo-600 transition after:content-[''] after:absolute after:top-0.5 after:left-0.5 after:h-4 after:w-4 after:rounded-full after:bg-white after:transition peer-checked:after:translate-x-4" />
              </label>
            </div>

            {form.enabled && (
              <div className="space-y-3 pt-2 border-t border-slate-800">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Provider</label>
                  <select
                    value={form.provider}
                    onChange={(e) => selectProvider(e.target.value)}
                    className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                  >
                    {PROVIDERS.map((p) => (
                      <option key={p.id} value={p.id}>{p.label}</option>
                    ))}
                  </select>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Model</label>
                    <input
                      type="text"
                      value={form.model}
                      onChange={(e) => setForm({ ...form, model: e.target.value })}
                      placeholder="gpt-4o-mini"
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                    />
                  </div>
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">Base URL (optional)</label>
                    <input
                      type="text"
                      value={form.baseUrl}
                      onChange={(e) => setForm({ ...form, baseUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                    />
                  </div>
                </div>
                {form.provider !== 'ollama' && (
                  <div>
                    <label className="block text-xs text-slate-400 mb-1">API Key (kept in browser only)</label>
                    <input
                      type="password"
                      value={form.apiKey}
                      onChange={(e) => setForm({ ...form, apiKey: e.target.value })}
                      placeholder="sk-..."
                      className="w-full rounded-lg border border-slate-700 bg-slate-900 px-3 py-2 text-xs text-slate-100"
                    />
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex items-center justify-end gap-2 border-t border-slate-800 bg-[#090D16] px-6 py-3.5">
          <button
            onClick={onClose}
            className="rounded-lg px-4 py-1.5 text-xs text-slate-400 hover:text-slate-200"
          >
            Cancel
          </button>
          <button
            onClick={() => {
              onSave(form)
              onClose()
            }}
            className="rounded-lg bg-indigo-600 px-4 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
          >
            Save Engine Config
          </button>
        </div>
      </div>
    </div>
  )
}
