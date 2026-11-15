import React, { useState } from 'react'
import {
  ChevronDown,
  ChevronRight,
  ShieldCheck,
  ArrowRight,
  Copy,
  Check,
  MessageSquare,
  Sparkles,
  Download,
  AlertCircle,
} from 'lucide-react'
import MarkdownView from './MarkdownView'

export default function OrchestrationResult({
  result,
  onInspectAgent,
  onChatWithAgent,
  onLaunchRunbook,
}) {
  const [expandedSlug, setExpandedSlug] = useState(
    result?.contributions?.[0]?.slug || null
  )
  const [copiedKey, setCopiedKey] = useState(null)

  if (!result) return null

  const copyText = (key, text) => {
    navigator.clipboard.writeText(text)
    setCopiedKey(key)
    setTimeout(() => setCopiedKey(null), 1600)
  }

  const downloadBlueprint = () => {
    const sections = [
      `# Castiel AI Mission Blueprint\n`,
      `Mode: ${result.orchestrationMode} | Engine: ${result.engine}\n`,
      result.synthesisMarkdown,
      '\n---\n# Specialist Contributions\n',
      ...result.contributions.map(
        (c) => `## ${c.emoji} ${c.name} (${c.divisionLabel}) — ${c.phase}\n\n${c.markdown}\n`
      ),
    ]
    const blob = new Blob([sections.join('\n')], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `castiel-blueprint-${Date.now()}.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-3.5">
      {/* Orchestration Header & Squad Pipeline */}
      <div className="rounded-xl border border-indigo-500/25 bg-[#0D1322] p-4">
        <div className="flex flex-wrap items-center justify-between gap-2 mb-3">
          <div className="flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-indigo-500/20 border border-indigo-500/40 px-2.5 py-0.5 text-[11px] font-semibold text-indigo-300">
              <Sparkles className="h-3 w-3" />
              {result.orchestrationMode}
            </span>
            <span className="text-[11px] text-slate-400">
              {result.elapsedMs}ms · {result.engine}
            </span>
            {result.recommendedRunbook && onLaunchRunbook && (
              <button
                onClick={() => onLaunchRunbook(result.recommendedRunbook)}
                className="rounded-full bg-amber-500/15 border border-amber-500/35 px-2.5 py-0.5 text-[11px] font-medium text-amber-300 hover:bg-amber-500/25 transition"
              >
                Runbook match: {result.recommendedRunbook} →
              </button>
            )}
          </div>
          <button
            onClick={downloadBlueprint}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-slate-800/70 px-2.5 py-1 text-[11px] text-slate-300 hover:text-white hover:border-slate-600"
          >
            <Download className="h-3 w-3" />
            Export Blueprint
          </button>
        </div>

        {result.llmError && (
          <div className="mb-3 flex items-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs text-amber-200">
            <AlertCircle className="h-4 w-4 shrink-0 text-amber-400" />
            {result.llmError}
          </div>
        )}

        {/* Active Squad Badges */}
        <div className="flex flex-wrap items-center gap-2">
          {result.squad.map((member, idx) => (
            <React.Fragment key={member.slug}>
              <button
                onClick={() => {
                  setExpandedSlug(member.slug)
                  onInspectAgent?.(member.slug)
                }}
                title="Inspect specialist profile"
                className="group inline-flex items-center gap-2 rounded-lg border border-slate-700/80 bg-[#090D18] px-2.5 py-1.5 text-left hover:border-indigo-500/50 transition"
              >
                <span className="text-base">{member.emoji}</span>
                <div>
                  <div className="text-xs font-medium text-slate-100 group-hover:text-indigo-300 transition">
                    {member.name}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    {member.divisionLabel} · {member.confidence}%
                  </div>
                </div>
              </button>
              {idx < result.squad.length - 1 && (
                <ArrowRight className="h-3.5 w-3.5 text-slate-600 shrink-0" />
              )}
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Master Synthesis */}
      <div className="rounded-xl border border-slate-800 bg-[#0B101D] p-5">
        <div className="flex justify-end mb-1">
          <button
            onClick={() => copyText('synth', result.synthesisMarkdown)}
            className="inline-flex items-center gap-1 text-[11px] text-slate-400 hover:text-slate-200"
          >
            {copiedKey === 'synth' ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
            {copiedKey === 'synth' ? 'Copied' : 'Copy synthesis'}
          </button>
        </div>
        <MarkdownView content={result.synthesisMarkdown} />
      </div>

      {/* Specialist Pipeline Contributions */}
      <div className="space-y-2">
        <div className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 px-1">
          Specialist Execution Pipeline ({result.contributions.length} agents)
        </div>
        {result.contributions.map((c) => {
          const isOpen = expandedSlug === c.slug
          return (
            <div
              key={c.slug}
              className="rounded-xl border border-slate-800 bg-[#0A0F1B] overflow-hidden"
            >
              <div
                onClick={() => setExpandedSlug(isOpen ? null : c.slug)}
                className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer hover:bg-slate-900/60 transition"
              >
                <div className="flex items-center gap-3 min-w-0">
                  {isOpen ? (
                    <ChevronDown className="h-4 w-4 text-slate-400 shrink-0" />
                  ) : (
                    <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
                  )}
                  <span className="text-xl shrink-0">{c.emoji}</span>
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="text-sm font-semibold text-slate-100">{c.name}</span>
                      <span
                        className="rounded-full px-2 py-0.5 text-[10px] font-medium border"
                        style={{
                          color: c.divisionColor,
                          borderColor: `${c.divisionColor}44`,
                          backgroundColor: `${c.divisionColor}14`,
                        }}
                      >
                        {c.divisionLabel}
                      </span>
                      <span className="text-[11px] text-slate-400 truncate">{c.phase}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2 shrink-0" onClick={(e) => e.stopPropagation()}>
                  <span className="rounded-md bg-indigo-500/15 px-2 py-0.5 text-[11px] font-medium text-indigo-300">
                    {c.confidence}% match
                  </span>
                  <button
                    onClick={() => onChatWithAgent?.(c)}
                    title="Switch to 1-on-1 chat with this specialist"
                    className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-slate-800/80 px-2.5 py-1 text-[11px] text-slate-200 hover:border-indigo-500/50 hover:text-indigo-200"
                  >
                    <MessageSquare className="h-3 w-3" />
                    1-on-1
                  </button>
                </div>
              </div>

              {isOpen && (
                <div className="border-t border-slate-800/80 bg-[#080C16] px-5 py-4 space-y-4">
                  <MarkdownView content={c.markdown} />

                  {c.codeSnippet && (
                    <div className="rounded-lg border border-slate-800 bg-[#05080F] overflow-hidden">
                      <div className="flex items-center justify-between border-b border-slate-800 px-3 py-1.5 text-[11px] text-slate-400">
                        <span className="font-mono">Deliverable Template ({c.codeSnippet.lang})</span>
                        <button
                          onClick={() => copyText(c.slug, c.codeSnippet.code)}
                          className="inline-flex items-center gap-1 text-slate-400 hover:text-white"
                        >
                          {copiedKey === c.slug ? <Check className="h-3 w-3 text-emerald-400" /> : <Copy className="h-3 w-3" />}
                          {copiedKey === c.slug ? 'Copied' : 'Copy'}
                        </button>
                      </div>
                      <pre className="max-h-72 overflow-auto p-3 text-xs font-mono text-slate-300">
                        {c.codeSnippet.code}
                      </pre>
                    </div>
                  )}

                  {c.handoff && (
                    <div className="rounded-lg border border-indigo-500/25 bg-indigo-950/15 p-3.5 text-xs">
                      <div className="flex items-center justify-between text-indigo-300 font-semibold mb-1.5">
                        <span>
                          NEXUS Handoff: {c.handoff.from} → {c.handoff.to}
                        </span>
                        <span className="rounded bg-indigo-500/20 px-2 py-0.5 text-[10px]">
                          {c.handoff.priority}
                        </span>
                      </div>
                      <p className="text-slate-300 mb-1.5">{c.handoff.deliverable}</p>
                      <div className="flex flex-wrap gap-1.5">
                        {c.handoff.acceptanceCriteria.map((ac, i) => (
                          <span
                            key={i}
                            className="rounded bg-slate-900/80 border border-slate-800 px-2 py-0.5 text-[11px] text-slate-400"
                          >
                            ✓ {ac}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )
        })}
      </div>

      {/* QA Gate Verdict */}
      {result.qaGate && (
        <div className="rounded-xl border border-emerald-500/25 bg-emerald-950/10 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-300">
              <ShieldCheck className="h-4 w-4" />
              {result.qaGate.reviewer}
            </div>
            <span className="rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-[11px] font-bold text-emerald-300">
              {result.qaGate.verdict}
            </span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {result.qaGate.checks.map((chk, idx) => (
              <div
                key={idx}
                className="rounded-lg border border-slate-800/90 bg-[#080D17] px-3 py-2 text-xs"
              >
                <div className="flex items-center justify-between font-medium text-slate-200">
                  <span>{chk.label}</span>
                  <span className="text-[10px] text-emerald-400 font-semibold">{chk.status}</span>
                </div>
                <p className="mt-0.5 text-[11px] text-slate-400">{chk.detail}</p>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
