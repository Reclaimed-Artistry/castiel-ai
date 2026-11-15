import React, { useEffect, useState } from 'react'
import {
  X,
  MessageSquare,
  Plus,
  Check,
  Copy,
  Download,
  ShieldAlert,
  Target,
  Workflow,
  Sparkles,
  FileCode2,
} from 'lucide-react'
import MarkdownView from './MarkdownView'

const EXPORT_FORMATS = [
  { id: 'claude-code', label: 'Claude Code (.md)' },
  { id: 'cursor', label: 'Cursor (.mdc)' },
  { id: 'codex', label: 'Codex (.toml)' },
  { id: 'gemini-cli', label: 'Gemini CLI (.md)' },
  { id: 'windsurf', label: 'Windsurf (.windsurfrules)' },
  { id: 'aider', label: 'Aider (CONVENTIONS.md)' },
  { id: 'raw', label: 'Raw System Prompt (.md)' },
]

export default function AgentModal({
  slug,
  onClose,
  onStartChat,
  onAddToSquad,
  inSquad,
}) {
  const [agent, setAgent] = useState(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState('overview')
  const [exportFormat, setExportFormat] = useState('claude-code')
  const [exportedFile, setExportedFile] = useState(null)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    if (!slug) return
    setLoading(true)
    setExportedFile(null)
    fetch(`/api/agents/${encodeURIComponent(slug)}`)
      .then((r) => r.json())
      .then((data) => {
        setAgent(data)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [slug])

  useEffect(() => {
    if (!agent) return
    fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ slugs: [agent.slug], format: exportFormat }),
    })
      .then((r) => r.json())
      .then((d) => setExportedFile(d.files?.[0] || null))
      .catch(() => {})
  }, [agent, exportFormat])

  if (!slug) return null

  const handleCopy = (text) => {
    navigator.clipboard.writeText(text)
    setCopied(true)
    setTimeout(() => setCopied(false), 1800)
  }

  const handleDownload = () => {
    if (!exportedFile) return
    const blob = new Blob([exportedFile.content], { type: 'text/plain;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = exportedFile.filename
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
      <div className="relative w-full max-w-4xl max-h-[88vh] flex flex-col rounded-2xl border border-slate-700/60 bg-[#0B101B] shadow-2xl overflow-hidden">
        {loading || !agent ? (
          <div className="p-12 text-center text-slate-400">Loading specialist profile...</div>
        ) : (
          <>
            {/* Header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-800 bg-[#0F1626] px-6 py-5">
              <div className="flex items-start gap-4">
                <div
                  className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl border text-3xl shadow-inner"
                  style={{
                    borderColor: `${agent.divisionColor}55`,
                    backgroundColor: `${agent.divisionColor}18`,
                  }}
                >
                  {agent.emoji}
                </div>
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <h2 className="text-xl font-bold text-white">{agent.name}</h2>
                    <span
                      className="rounded-full px-2.5 py-0.5 text-xs font-medium border"
                      style={{
                        color: agent.divisionColor,
                        borderColor: `${agent.divisionColor}44`,
                        backgroundColor: `${agent.divisionColor}15`,
                      }}
                    >
                      {agent.divisionLabel}
                    </span>
                    <span className="rounded-full bg-slate-800 px-2.5 py-0.5 text-xs text-slate-400">
                      {agent.wordCount} words
                    </span>
                  </div>
                  {agent.vibe && (
                    <p className="mt-1 text-sm italic text-indigo-300">“{agent.vibe}”</p>
                  )}
                  <p className="mt-1.5 text-sm text-slate-300 leading-relaxed">{agent.description}</p>
                </div>
              </div>
              <button
                onClick={onClose}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            {/* Action & Tabs Bar */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 bg-[#090D16] px-6 py-3">
              <div className="flex items-center gap-1.5">
                {[
                  { id: 'overview', label: 'Capabilities & Mission' },
                  { id: 'workflow', label: 'Workflow & Rules' },
                  { id: 'export', label: 'Export / Prompt' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTab(t.id)}
                    className={`rounded-lg px-3 py-1.5 text-xs font-medium transition ${
                      tab === t.id
                        ? 'bg-indigo-500/20 text-indigo-300 border border-indigo-500/40'
                        : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
              <div className="flex items-center gap-2">
                <button
                  onClick={() => onAddToSquad(agent)}
                  className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium border transition ${
                    inSquad
                      ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                      : 'border-slate-700 bg-slate-800/70 text-slate-200 hover:border-indigo-500/50'
                  }`}
                >
                  {inSquad ? <Check className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                  {inSquad ? 'In Active Squad' : 'Add to Squad'}
                </button>
                <button
                  onClick={() => onStartChat(agent)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition shadow-sm"
                >
                  <MessageSquare className="h-3.5 w-3.5" />
                  Chat 1-on-1
                </button>
              </div>
            </div>

            {/* Body */}
            <div className="flex-1 overflow-y-auto p-6 space-y-5">
              {tab === 'overview' && (
                <>
                  {agent.keywords?.length > 0 && (
                    <div className="flex flex-wrap gap-1.5">
                      {agent.keywords.map((kw) => (
                        <span
                          key={kw}
                          className="rounded-md bg-slate-800/80 border border-slate-700/60 px-2 py-0.5 text-[11px] text-slate-300"
                        >
                          #{kw}
                        </span>
                      ))}
                    </div>
                  )}

                  {agent.identity && (
                    <div className="rounded-xl border border-slate-800 bg-[#0F1524] p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-2">
                        <Sparkles className="h-4 w-4" /> Identity & Memory
                      </div>
                      <MarkdownView content={agent.identity} />
                    </div>
                  )}

                  {agent.mission && (
                    <div className="rounded-xl border border-slate-800 bg-[#0F1524] p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-amber-300 mb-2">
                        <Target className="h-4 w-4" /> Core Mission
                      </div>
                      <MarkdownView content={agent.mission} />
                    </div>
                  )}

                  {agent.capabilities && (
                    <div className="rounded-xl border border-slate-800 bg-[#0F1524] p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-2">
                        <FileCode2 className="h-4 w-4" /> Core Capabilities & Deliverables
                      </div>
                      <MarkdownView content={agent.capabilities} />
                    </div>
                  )}
                </>
              )}

              {tab === 'workflow' && (
                <>
                  {agent.rules && (
                    <div className="rounded-xl border border-rose-500/25 bg-rose-950/15 p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-rose-300 mb-2">
                        <ShieldAlert className="h-4 w-4" /> Critical Rules & Guardrails
                      </div>
                      <MarkdownView content={agent.rules} />
                    </div>
                  )}

                  {agent.workflow && (
                    <div className="rounded-xl border border-slate-800 bg-[#0F1524] p-4">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-sky-300 mb-2">
                        <Workflow className="h-4 w-4" /> Execution Workflow
                      </div>
                      <MarkdownView content={agent.workflow} />
                    </div>
                  )}

                  {agent.metrics && (
                    <div className="rounded-xl border border-slate-800 bg-[#0F1524] p-4">
                      <div className="text-xs font-semibold uppercase tracking-wider text-emerald-300 mb-2">
                        Success Metrics
                      </div>
                      <MarkdownView content={agent.metrics} />
                    </div>
                  )}
                </>
              )}

              {tab === 'export' && (
                <div className="space-y-4">
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <div className="flex items-center gap-2">
                      <label className="text-xs text-slate-400">Target Tool Format:</label>
                      <select
                        value={exportFormat}
                        onChange={(e) => setExportFormat(e.target.value)}
                        className="rounded-lg border border-slate-700 bg-slate-900 px-3 py-1.5 text-xs text-slate-100 focus:border-indigo-500 focus:outline-none"
                      >
                        {EXPORT_FORMATS.map((f) => (
                          <option key={f.id} value={f.id}>
                            {f.label}
                          </option>
                        ))}
                      </select>
                    </div>
                    {exportedFile && (
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleCopy(exportedFile.content)}
                          className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800 px-3 py-1.5 text-xs text-slate-200 hover:bg-slate-700"
                        >
                          {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
                          {copied ? 'Copied' : 'Copy'}
                        </button>
                        <button
                          onClick={handleDownload}
                          className="inline-flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-medium text-white hover:bg-indigo-500"
                        >
                          <Download className="h-3.5 w-3.5" />
                          Download {exportedFile.filename}
                        </button>
                      </div>
                    )}
                  </div>

                  {exportedFile && (
                    <div className="rounded-xl border border-slate-800 bg-[#060911] overflow-hidden">
                      <div className="border-b border-slate-800 px-4 py-2 text-[11px] font-mono text-slate-400">
                        Target path: {exportedFile.path}
                      </div>
                      <pre className="max-h-96 overflow-auto p-4 text-xs font-mono text-slate-300 whitespace-pre-wrap">
                        {exportedFile.content}
                      </pre>
                    </div>
                  )}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
