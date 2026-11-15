import React, { useEffect, useMemo, useRef, useState } from 'react'
import {
  Send,
  Sparkles,
  Users,
  Compass,
  Layers,
  Plus,
  Trash2,
  Cpu,
  Search,
  MessageSquare,
  Check,
  X,
  Zap,
  Rocket,
  Shield,
  TrendingUp,
  AlertTriangle,
  Menu,
  Download,
} from 'lucide-react'
import OrchestrationResult from './components/OrchestrationResult'
import AgentModal from './components/AgentModal'
import SettingsModal from './components/SettingsModal'

const STARTER_MISSIONS = [
  {
    title: 'Launch a Full-Stack SaaS MVP',
    prompt:
      'Build a full-stack SaaS MVP with React, Postgres, Stripe billing, CI/CD, and a strict security & QA gate.',
    tag: 'Startup MVP',
  },
  {
    title: 'Debug Production P0 Outage',
    prompt:
      'Our production API is returning 500 errors with high database latency. Triage, mitigate, and prepare a post-mortem.',
    tag: 'Incident Response',
  },
  {
    title: 'Multi-Channel AI Growth Campaign',
    prompt:
      'Design a 4-week growth marketing campaign across TikTok, Twitter/X, Reddit, and SEO for our AI developer tool.',
    tag: 'Marketing',
  },
  {
    title: 'Smart Contract & AppSec Audit',
    prompt:
      'Audit our Solidity smart contract and backend API with penetration testing and compliance checks.',
    tag: 'Security',
  },
  {
    title: 'RAG & Multi-Agent AI System',
    prompt:
      'Architect a production RAG pipeline with hybrid vector search, LLM evaluation, and multi-agent orchestration.',
    tag: 'AI Engineering',
  },
  {
    title: 'Enterprise Design System & A11y',
    prompt:
      'Design an accessible WCAG AA UI system with UX research validation, React components, and automated testing.',
    tag: 'Design + QA',
  },
]

const RUNBOOK_ICONS = {
  'startup-mvp': Rocket,
  'enterprise-feature': Shield,
  'marketing-campaign': TrendingUp,
  'incident-response': AlertTriangle,
}

export default function App() {
  const [catalog, setCatalog] = useState(null)
  const [loadingCatalog, setLoadingCatalog] = useState(true)
  const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'roster' | 'nexus'
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Chat & orchestration state
  const [sessions, setSessions] = useState([])
  const [currentSessionId, setCurrentSessionId] = useState(null)
  const [messages, setMessages] = useState([])
  const [prompt, setPrompt] = useState('')
  const [sending, setSending] = useState(false)
  const [mode, setMode] = useState('auto') // 'auto' | 'micro' | 'full' | 'single' | 'squad' | 'runbook'
  const [selectedAgentSlug, setSelectedAgentSlug] = useState(null)
  const [selectedRunbookSlug, setSelectedRunbookSlug] = useState(null)
  const [activeSquad, setActiveSquad] = useState([]) // array of compact agent objects
  const [radarPreview, setRadarPreview] = useState(null)

  // Directory filters
  const [dirSearch, setDirSearch] = useState('')
  const [dirDivision, setDirDivision] = useState('all')
  const [semanticMatches, setSemanticMatches] = useState(null)

  // Modals & Settings
  const [inspectSlug, setInspectSlug] = useState(null)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [llmConfig, setLlmConfig] = useState(() => {
    try {
      const saved = localStorage.getItem('castiel_llm_config')
      return saved
        ? JSON.parse(saved)
        : { enabled: false, provider: 'ollama', model: 'llama3.1', baseUrl: 'http://127.0.0.1:11434', apiKey: '' }
    } catch {
      return { enabled: false, provider: 'ollama', model: 'llama3.1', baseUrl: 'http://127.0.0.1:11434', apiKey: '' }
    }
  })

  const chatEndRef = useRef(null)

  useEffect(() => {
    fetch('/api/catalog')
      .then((r) => r.json())
      .then((data) => {
        setCatalog(data)
        setLoadingCatalog(false)
      })
      .catch(() => setLoadingCatalog(false))

    refreshSessions()
  }, [])

  const refreshSessions = () => {
    fetch('/api/sessions')
      .then((r) => r.json())
      .then((d) => setSessions(d.sessions || []))
      .catch(() => {})
  }

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, sending])

  // Debounced live semantic radar preview while typing
  useEffect(() => {
    if (activeTab !== 'chat' || mode === 'single' || mode === 'squad' || mode === 'runbook') {
      setRadarPreview(null)
      return
    }
    const q = prompt.trim()
    if (q.length < 6) {
      setRadarPreview(null)
      return
    }
    const timer = setTimeout(() => {
      fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: q, topK: 6 }),
      })
        .then((r) => r.json())
        .then((d) => setRadarPreview(d.plan || null))
        .catch(() => {})
    }, 280)
    return () => clearTimeout(timer)
  }, [prompt, activeTab, mode])

  // Debounced semantic search inside 283-Agent Roster
  useEffect(() => {
    const q = dirSearch.trim()
    if (q.length < 3) {
      setSemanticMatches(null)
      return
    }
    const timer = setTimeout(() => {
      fetch('/api/route', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: q,
          division: dirDivision === 'all' ? null : dirDivision,
          topK: 36,
        }),
      })
        .then((r) => r.json())
        .then((d) => {
          const map = {}
          for (const item of d.results || []) {
            map[item.slug] = item.confidence
          }
          setSemanticMatches(map)
        })
        .catch(() => {})
    }, 240)
    return () => clearTimeout(timer)
  }, [dirSearch, dirDivision])

  const agentsBySlug = useMemo(() => {
    const m = {}
    for (const a of catalog?.agents || []) {
      m[a.slug] = a
    }
    return m
  }, [catalog])

  const filteredAgents = useMemo(() => {
    if (!catalog?.agents) return []
    const q = dirSearch.trim().toLowerCase()
    let list = catalog.agents.filter((a) => {
      if (dirDivision !== 'all' && a.division !== dirDivision) return false
      if (!q) return true
      if (semanticMatches && semanticMatches[a.slug] !== undefined) return true
      return (
        a.name.toLowerCase().includes(q) ||
        a.description.toLowerCase().includes(q) ||
        a.divisionLabel.toLowerCase().includes(q) ||
        a.keywords.some((k) => k.includes(q))
      )
    })
    if (semanticMatches && q.length >= 3) {
      list = [...list].sort(
        (a, b) => (semanticMatches[b.slug] || 0) - (semanticMatches[a.slug] || 0)
      )
    }
    return list
  }, [catalog, dirSearch, dirDivision, semanticMatches])

  const saveLlmConfig = (cfg) => {
    setLlmConfig(cfg)
    localStorage.setItem('castiel_llm_config', JSON.stringify(cfg))
  }

  const startNewMission = () => {
    setCurrentSessionId(null)
    setMessages([])
    setActiveTab('chat')
    setSidebarOpen(false)
  }

  const loadSession = async (sid) => {
    const res = await fetch(`/api/sessions/${sid}`)
    if (!res.ok) return
    const data = await res.json()
    setCurrentSessionId(sid)
    setMessages(data.messages || [])
    setActiveTab('chat')
    setSidebarOpen(false)
  }

  const deleteSession = async (e, sid) => {
    e.stopPropagation()
    await fetch(`/api/sessions/${sid}`, { method: 'DELETE' })
    if (currentSessionId === sid) {
      startNewMission()
    }
    refreshSessions()
  }

  const toggleSquadMember = (agent) => {
    setActiveSquad((prev) => {
      const exists = prev.some((x) => x.slug === agent.slug)
      if (exists) return prev.filter((x) => x.slug !== agent.slug)
      return [...prev.slice(0, 9), agent]
    })
  }

  const handleChatWithAgent = (agent) => {
    setInspectSlug(null)
    setSelectedAgentSlug(agent.slug)
    setSelectedRunbookSlug(null)
    setMode('single')
    setActiveTab('chat')
    setSidebarOpen(false)
  }

  const handleLaunchRunbook = (rbSlug) => {
    setSelectedRunbookSlug(rbSlug)
    setSelectedAgentSlug(null)
    setMode('runbook')
    setActiveTab('chat')
    setSidebarOpen(false)
    const rb = catalog?.runbooks?.find((r) => r.slug === rbSlug)
    if (rb && !prompt.trim()) {
      setPrompt(`Execute ${rb.title} (${rb.mode}) for our project: ${rb.summary}`)
    }
  }

  const handleSend = async (overridePrompt = null) => {
    const text = (overridePrompt ?? prompt).trim()
    if (!text || sending) return

    setSending(true)
    if (!overridePrompt) setPrompt('')

    const optimisticUser = {
      id: `u-${Date.now()}`,
      role: 'user',
      content: text,
    }
    setMessages((prev) => [...prev, optimisticUser])

    try {
      const payload = {
        prompt: text,
        sessionId: currentSessionId,
        mode: mode === 'squad' ? 'auto' : mode,
        agentSlug: mode === 'single' ? selectedAgentSlug : null,
        squadSlugs: mode === 'squad' ? activeSquad.map((a) => a.slug) : null,
        runbookSlug: mode === 'runbook' ? selectedRunbookSlug : null,
        llmConfig: llmConfig.enabled ? llmConfig : null,
      }
      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      })
      const data = await res.json()
      setCurrentSessionId(data.sessionId)
      setMessages((prev) => [
        ...prev,
        {
          id: data.messageId || `a-${Date.now()}`,
          role: 'assistant',
          content: data.result?.synthesisMarkdown || '',
          orchestration: data.result,
        },
      ])
      refreshSessions()
    } catch (err) {
      setMessages((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: 'assistant',
          content: `Failed to reach Castiel AI engine: ${err.message}`,
        },
      ])
    } finally {
      setSending(false)
    }
  }

  const exportSquadBundle = async () => {
    if (activeSquad.length === 0) return
    const res = await fetch('/api/export', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        slugs: activeSquad.map((a) => a.slug),
        format: 'claude-code',
      }),
    })
    const data = await res.json()
    const combined = (data.files || [])
      .map((f) => `# FILE: ${f.path}\n\n${f.content}`)
      .join('\n\n---\n\n')
    const blob = new Blob([combined], { type: 'text/markdown;charset=utf-8' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `castiel-squad-${activeSquad.length}-agents.md`
    a.click()
    URL.revokeObjectURL(url)
  }

  const activeSingleAgent = selectedAgentSlug ? agentsBySlug[selectedAgentSlug] : null
  const activeRunbook = selectedRunbookSlug
    ? catalog?.runbooks?.find((r) => r.slug === selectedRunbookSlug)
    : null

  return (
    <div className="flex h-screen w-full overflow-hidden bg-[#07090F] text-slate-100">
      {/* Mobile Sidebar Backdrop */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 z-30 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Left Sidebar */}
      <aside
        className={`fixed inset-y-0 left-0 z-40 flex w-72 flex-col border-r border-slate-800/80 bg-[#0A0E18] transition-transform lg:static lg:translate-x-0 ${
          sidebarOpen ? 'translate-x-0' : '-translate-x-full'
        }`}
      >
        {/* Brand */}
        <div className="flex items-center justify-between border-b border-slate-800/80 px-4 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 via-violet-500 to-amber-400 text-lg font-black text-white shadow-lg shadow-indigo-500/25">
              🪽
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="text-base font-bold tracking-tight text-white">Castiel AI</h1>
                <span className="rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                  NEXUS
                </span>
              </div>
              <p className="text-[11px] text-slate-400">
                {catalog ? `${catalog.totalAgents} AIs · ${catalog.totalDivisions} Divisions` : 'Loading roster...'}
              </p>
            </div>
          </div>
          <button
            onClick={startNewMission}
            title="New Mission"
            className="rounded-lg border border-slate-700/80 bg-slate-800/60 p-1.5 text-slate-300 hover:border-indigo-500/50 hover:text-white transition"
          >
            <Plus className="h-4 w-4" />
          </button>
        </div>

        {/* Navigation */}
        <div className="p-3 space-y-1 border-b border-slate-800/70">
          {[
            { id: 'chat', label: 'Command Center', icon: Sparkles, badge: 'AI Core' },
            {
              id: 'roster',
              label: 'All AI Agents',
              icon: Users,
              badge: catalog ? String(catalog.totalAgents) : '283',
            },
            {
              id: 'nexus',
              label: 'NEXUS Playbooks',
              icon: Compass,
              badge: catalog ? String(catalog.runbooks?.length || 4) : '4',
            },
          ].map((nav) => {
            const Icon = nav.icon
            const active = activeTab === nav.id
            return (
              <button
                key={nav.id}
                onClick={() => {
                  setActiveTab(nav.id)
                  setSidebarOpen(false)
                }}
                className={`flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-xs font-medium transition ${
                  active
                    ? 'bg-indigo-600/20 text-indigo-200 border border-indigo-500/35'
                    : 'text-slate-400 hover:bg-slate-800/50 hover:text-slate-200 border border-transparent'
                }`}
              >
                <span className="flex items-center gap-2.5">
                  <Icon className={`h-4 w-4 ${active ? 'text-indigo-400' : 'text-slate-400'}`} />
                  {nav.label}
                </span>
                <span className="rounded-md bg-slate-800/80 px-1.5 py-0.5 text-[10px] text-slate-300">
                  {nav.badge}
                </span>
              </button>
            )
          })}
        </div>

        {/* Active Custom Squad Dock */}
        {activeSquad.length > 0 && (
          <div className="border-b border-slate-800/70 p-3 bg-indigo-950/15">
            <div className="flex items-center justify-between mb-2">
              <span className="text-[11px] font-semibold uppercase tracking-wider text-indigo-300">
                Active Squad ({activeSquad.length})
              </span>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={exportSquadBundle}
                  title="Export squad bundle"
                  className="text-slate-400 hover:text-indigo-300"
                >
                  <Download className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setActiveSquad([])}
                  className="text-[10px] text-slate-400 hover:text-rose-300"
                >
                  Clear
                </button>
              </div>
            </div>
            <div className="flex flex-wrap gap-1.5 mb-2.5">
              {activeSquad.map((a) => (
                <span
                  key={a.slug}
                  className="inline-flex items-center gap-1 rounded-md border border-indigo-500/30 bg-[#0D1322] px-1.5 py-0.5 text-[11px] text-slate-200"
                >
                  <span>{a.emoji}</span>
                  <span className="max-w-[115px] truncate">{a.name}</span>
                  <button
                    onClick={() => toggleSquadMember(a)}
                    className="text-slate-500 hover:text-rose-300"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </span>
              ))}
            </div>
            <button
              onClick={() => {
                setMode('squad')
                setSelectedAgentSlug(null)
                setSelectedRunbookSlug(null)
                setActiveTab('chat')
                setSidebarOpen(false)
              }}
              className="w-full rounded-lg bg-indigo-600 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500 transition"
            >
              Chat with Custom Squad →
            </button>
          </div>
        )}

        {/* Recent Missions */}
        <div className="flex-1 overflow-y-auto p-3">
          <div className="mb-2 px-1 text-[10px] font-semibold uppercase tracking-wider text-slate-500">
            Recent Missions
          </div>
          {sessions.length === 0 ? (
            <p className="px-2 py-3 text-xs text-slate-500">
              No missions yet. Ask Castiel AI anything to coordinate your first squad.
            </p>
          ) : (
            <div className="space-y-1">
              {sessions.map((s) => (
                <div
                  key={s.id}
                  onClick={() => loadSession(s.id)}
                  className={`group flex items-center justify-between gap-2 rounded-lg px-2.5 py-2 text-xs cursor-pointer transition ${
                    currentSessionId === s.id
                      ? 'bg-slate-800/80 text-white'
                      : 'text-slate-400 hover:bg-slate-800/40 hover:text-slate-200'
                  }`}
                >
                  <span className="truncate">{s.title}</span>
                  <button
                    onClick={(e) => deleteSession(e, s.id)}
                    className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-rose-400 transition"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Engine Footer */}
        <div className="border-t border-slate-800/80 p-3">
          <button
            onClick={() => setSettingsOpen(true)}
            className="flex w-full items-center justify-between rounded-xl border border-slate-800 bg-[#0D1322] px-3 py-2.5 text-left hover:border-indigo-500/40 transition"
          >
            <div className="flex items-center gap-2.5">
              <div className="h-2 w-2 rounded-full bg-emerald-400 shadow-[0_0_8px_#34d399]" />
              <div>
                <div className="text-xs font-medium text-slate-200">
                  {llmConfig.enabled ? `Boost: ${llmConfig.provider}` : 'In-Built AI Active'}
                </div>
                <div className="text-[10px] text-slate-400">Neural-NEXUS Coordinator</div>
              </div>
            </div>
            <Cpu className="h-4 w-4 text-slate-400" />
          </button>
        </div>
      </aside>

      {/* Main Content */}
      <main className="flex flex-1 flex-col min-w-0 overflow-hidden">
        {/* Top Header */}
        <header className="flex items-center justify-between border-b border-slate-800/80 bg-[#090D16]/90 backdrop-blur px-4 sm:px-6 py-3">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 lg:hidden"
            >
              <Menu className="h-5 w-5" />
            </button>
            <div>
              <h2 className="text-sm font-semibold text-white">
                {activeTab === 'chat' && 'Castiel AI Command Center'}
                {activeTab === 'roster' && `All ${catalog?.totalAgents || 283} Specialist AIs`}
                {activeTab === 'nexus' && 'NEXUS Scenario Playbooks & Squads'}
              </h2>
              <p className="text-[11px] text-slate-400 hidden sm:block">
                {activeTab === 'chat' &&
                  'In-built semantic coordinator automatically summons, sequences, and QA-gates your ideal AI team.'}
                {activeTab === 'roster' &&
                  'Search by skill or intent across 18 divisions — launch 1-on-1 chats, build squads, or export prompts.'}
                {activeTab === 'nexus' &&
                  'Battle-tested multi-agent runbooks from agency-agents ready for one-click deployment.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {activeTab !== 'roster' && (
              <button
                onClick={() => setActiveTab('roster')}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700/80 bg-slate-800/60 px-3 py-1.5 text-xs text-slate-200 hover:border-indigo-500/50 transition"
              >
                <Users className="h-3.5 w-3.5 text-indigo-400" />
                <span className="hidden sm:inline">Browse 283 AIs</span>
              </button>
            )}
          </div>
        </header>

        {/* TAB 1: COMMAND CENTER */}
        {activeTab === 'chat' && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Orchestration Mode Strip */}
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-800/60 bg-[#080C15] px-4 sm:px-6 py-2.5">
              <div className="flex flex-wrap items-center gap-1.5">
                {[
                  { id: 'auto', label: 'Castiel Auto-Pilot' },
                  { id: 'micro', label: 'NEXUS-Micro (3)' },
                  { id: 'full', label: 'NEXUS-Full (6)' },
                ].map((m) => (
                  <button
                    key={m.id}
                    onClick={() => {
                      setMode(m.id)
                      setSelectedAgentSlug(null)
                      setSelectedRunbookSlug(null)
                    }}
                    className={`rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                      mode === m.id
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-slate-900 text-slate-400 border border-slate-800 hover:text-slate-200'
                    }`}
                  >
                    {m.label}
                  </button>
                ))}

                {activeSingleAgent && mode === 'single' && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500/15 border border-amber-500/40 px-2.5 py-1 text-[11px] font-medium text-amber-200">
                    <span>{activeSingleAgent.emoji}</span>
                    1-on-1: {activeSingleAgent.name}
                    <button
                      onClick={() => {
                        setMode('auto')
                        setSelectedAgentSlug(null)
                      }}
                      className="ml-1 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {activeRunbook && mode === 'runbook' && (
                  <span className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-500/15 border border-emerald-500/40 px-2.5 py-1 text-[11px] font-medium text-emerald-200">
                    Runbook: {activeRunbook.title}
                    <button
                      onClick={() => {
                        setMode('auto')
                        setSelectedRunbookSlug(null)
                      }}
                      className="ml-1 hover:text-white"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </span>
                )}

                {activeSquad.length > 0 && (
                  <button
                    onClick={() => setMode(mode === 'squad' ? 'auto' : 'squad')}
                    className={`inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-[11px] font-medium transition ${
                      mode === 'squad'
                        ? 'bg-violet-600 text-white'
                        : 'border border-violet-500/35 bg-violet-500/10 text-violet-300'
                    }`}
                  >
                    <Layers className="h-3 w-3" />
                    Custom Squad ({activeSquad.length})
                  </button>
                )}
              </div>

              <span className="text-[11px] text-slate-500">
                {catalog ? `${catalog.totalAgents} specialists ready` : 'Initializing...'}
              </span>
            </div>

            {/* Messages Timeline */}
            <div className="flex-1 overflow-y-auto px-4 sm:px-6 py-6">
              <div className="mx-auto max-w-4xl space-y-6">
                {messages.length === 0 ? (
                  <div className="py-6 space-y-8">
                    <div className="text-center space-y-3">
                      <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-500/25 via-violet-500/20 to-amber-500/20 border border-indigo-500/30 text-3xl shadow-xl">
                        🪽
                      </div>
                      <h2 className="text-2xl font-bold tracking-tight text-white">
                        Welcome to Castiel AI
                      </h2>
                      <p className="mx-auto max-w-xl text-sm text-slate-400 leading-relaxed">
                        Describe any goal, technical problem, campaign, or audit. Castiel’s
                        in-built neural coordinator evaluates all{' '}
                        <span className="text-indigo-300 font-semibold">283 specialist AIs</span>{' '}
                        across 18 divisions, assembles the right squad, sequences NEXUS handoffs,
                        and enforces QA gates.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      {STARTER_MISSIONS.map((m, idx) => (
                        <button
                          key={idx}
                          onClick={() => handleSend(m.prompt)}
                          className="group rounded-xl border border-slate-800/90 bg-[#0B101D] p-4 text-left hover:border-indigo-500/50 hover:bg-[#0F1629] transition"
                        >
                          <div className="flex items-center justify-between mb-1.5">
                            <span className="text-xs font-semibold text-slate-100 group-hover:text-indigo-300 transition">
                              {m.title}
                            </span>
                            <span className="rounded bg-slate-800 px-2 py-0.5 text-[10px] text-slate-400">
                              {m.tag}
                            </span>
                          </div>
                          <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {m.prompt}
                          </p>
                        </button>
                      ))}
                    </div>
                  </div>
                ) : (
                  messages.map((msg) => (
                    <div key={msg.id} className="space-y-3">
                      {msg.role === 'user' ? (
                        <div className="flex justify-end">
                          <div className="max-w-2xl rounded-2xl rounded-br-sm bg-indigo-600/25 border border-indigo-500/35 px-4 py-3 text-sm text-slate-100">
                            {msg.content}
                          </div>
                        </div>
                      ) : msg.orchestration ? (
                        <OrchestrationResult
                          result={msg.orchestration}
                          onInspectAgent={(slug) => setInspectSlug(slug)}
                          onChatWithAgent={(c) => handleChatWithAgent(c)}
                          onLaunchRunbook={(rb) => handleLaunchRunbook(rb)}
                        />
                      ) : (
                        <div className="rounded-xl border border-slate-800 bg-[#0B101D] p-4 text-sm text-slate-300">
                          {msg.content}
                        </div>
                      )}
                    </div>
                  ))
                )}

                {sending && (
                  <div className="flex items-center gap-3 rounded-xl border border-indigo-500/30 bg-indigo-950/20 px-4 py-3.5 text-xs text-indigo-200">
                    <Zap className="h-4 w-4 animate-pulse text-amber-400" />
                    Castiel AI is evaluating 283 specialists, sequencing NEXUS handoffs, and running QA gates...
                  </div>
                )}

                <div ref={chatEndRef} />
              </div>
            </div>

            {/* Live Radar Preview + Input Composer */}
            <div className="border-t border-slate-800/80 bg-[#090D16] px-4 sm:px-6 py-3.5">
              <div className="mx-auto max-w-4xl space-y-2.5">
                {radarPreview && radarPreview.squad?.length > 0 && (
                  <div className="flex flex-wrap items-center gap-1.5 rounded-lg border border-indigo-500/20 bg-indigo-950/15 px-3 py-2">
                    <span className="text-[10px] font-semibold uppercase tracking-wider text-indigo-300 mr-1">
                      Castiel Radar ({radarPreview.mode}):
                    </span>
                    {radarPreview.squad.map((s) => (
                      <button
                        key={s.slug}
                        onClick={() => setInspectSlug(s.slug)}
                        className="inline-flex items-center gap-1 rounded bg-slate-900/90 border border-slate-700/70 px-2 py-0.5 text-[11px] text-slate-200 hover:border-indigo-400"
                      >
                        <span>{s.emoji}</span>
                        <span>{s.name}</span>
                        <span className="text-indigo-400 font-medium">{s.confidence}%</span>
                      </button>
                    ))}
                  </div>
                )}

                <div className="flex items-end gap-2.5 rounded-2xl border border-slate-700/80 bg-[#0D1322] p-2 focus-within:border-indigo-500/70 transition shadow-lg">
                  <textarea
                    rows={2}
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter' && !e.shiftKey) {
                        e.preventDefault()
                        handleSend()
                      }
                    }}
                    placeholder={
                      mode === 'single' && activeSingleAgent
                        ? `Ask ${activeSingleAgent.emoji} ${activeSingleAgent.name} directly...`
                        : mode === 'squad'
                        ? `Give your ${activeSquad.length}-agent custom squad a mission...`
                        : 'Ask Castiel AI anything — it will coordinate the best specialists from all 283 AIs...'
                    }
                    className="flex-1 resize-none bg-transparent px-2.5 py-1.5 text-sm text-slate-100 placeholder-slate-500 focus:outline-none"
                  />
                  <button
                    onClick={() => handleSend()}
                    disabled={!prompt.trim() || sending}
                    className="inline-flex h-10 items-center gap-1.5 rounded-xl bg-indigo-600 px-4 text-xs font-semibold text-white hover:bg-indigo-500 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  >
                    <Send className="h-3.5 w-3.5" />
                    <span className="hidden sm:inline">Coordinate</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: 283-AGENT ROSTER */}
        {activeTab === 'roster' && (
          <div className="flex flex-1 flex-col overflow-hidden">
            {/* Search & Division Filter Bar */}
            <div className="border-b border-slate-800/80 bg-[#090D16] px-4 sm:px-6 py-4 space-y-3">
              <div className="flex flex-wrap items-center gap-3">
                <div className="relative flex-1 min-w-[240px]">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    value={dirSearch}
                    onChange={(e) => setDirSearch(e.target.value)}
                    placeholder="Semantic search across 283 AIs (e.g. 'Stripe billing', 'Kubernetes', 'TikTok growth', 'pentest')..."
                    className="w-full rounded-xl border border-slate-700/80 bg-[#0D1322] pl-9 pr-9 py-2 text-xs text-slate-100 placeholder-slate-500 focus:border-indigo-500 focus:outline-none"
                  />
                  {dirSearch && (
                    <button
                      onClick={() => setDirSearch('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <span className="text-xs text-slate-400">
                  Showing <strong className="text-slate-200">{filteredAgents.length}</strong> specialist(s)
                </span>
              </div>

              {/* Division Pills */}
              <div className="flex items-center gap-1.5 overflow-x-auto pb-1">
                <button
                  onClick={() => setDirDivision('all')}
                  className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium border transition ${
                    dirDivision === 'all'
                      ? 'bg-indigo-600/25 border-indigo-500/50 text-indigo-200'
                      : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  All ({catalog?.totalAgents || 283})
                </button>
                {(catalog?.divisions || []).map((div) => (
                  <button
                    key={div.slug}
                    onClick={() => setDirDivision(div.slug)}
                    className={`shrink-0 rounded-lg px-2.5 py-1 text-[11px] font-medium border transition ${
                      dirDivision === div.slug
                        ? 'text-white'
                        : 'bg-slate-900 border-slate-800 text-slate-400 hover:text-slate-200'
                    }`}
                    style={
                      dirDivision === div.slug
                        ? {
                            borderColor: div.color,
                            backgroundColor: `${div.color}25`,
                          }
                        : {}
                    }
                  >
                    {div.label} ({div.count})
                  </button>
                ))}
              </div>
            </div>

            {/* Agent Grid */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              {loadingCatalog ? (
                <div className="text-center py-12 text-slate-400">Loading 283 specialist AIs...</div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3.5">
                  {filteredAgents.map((agent) => {
                    const inSquad = activeSquad.some((x) => x.slug === agent.slug)
                    const matchPct = semanticMatches?.[agent.slug]
                    return (
                      <div
                        key={agent.slug}
                        onClick={() => setInspectSlug(agent.slug)}
                        className="group flex flex-col justify-between rounded-xl border border-slate-800/90 bg-[#0B101D] p-4 cursor-pointer hover:border-indigo-500/50 hover:bg-[#0F1627] transition"
                      >
                        <div>
                          <div className="flex items-start justify-between gap-2">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span
                                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg border text-xl"
                                style={{
                                  borderColor: `${agent.divisionColor}44`,
                                  backgroundColor: `${agent.divisionColor}16`,
                                }}
                              >
                                {agent.emoji}
                              </span>
                              <div className="min-w-0">
                                <h3 className="text-sm font-semibold text-slate-100 truncate group-hover:text-indigo-300 transition">
                                  {agent.name}
                                </h3>
                                <span
                                  className="text-[11px] font-medium"
                                  style={{ color: agent.divisionColor }}
                                >
                                  {agent.divisionLabel}
                                </span>
                              </div>
                            </div>
                            {matchPct && (
                              <span className="shrink-0 rounded bg-indigo-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-300">
                                {matchPct}%
                              </span>
                            )}
                          </div>

                          {agent.vibe && (
                            <p className="mt-2.5 text-xs italic text-indigo-300/90 line-clamp-1">
                              “{agent.vibe}”
                            </p>
                          )}
                          <p className="mt-1.5 text-xs text-slate-400 line-clamp-2 leading-relaxed">
                            {agent.description}
                          </p>
                        </div>

                        <div
                          className="mt-4 flex items-center justify-between gap-2 pt-3 border-t border-slate-800/70"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <button
                            onClick={() => toggleSquadMember(agent)}
                            className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1 text-[11px] font-medium border transition ${
                              inSquad
                                ? 'border-emerald-500/40 bg-emerald-500/15 text-emerald-300'
                                : 'border-slate-700 bg-slate-800/70 text-slate-300 hover:border-indigo-500/50'
                            }`}
                          >
                            {inSquad ? <Check className="h-3 w-3" /> : <Plus className="h-3 w-3" />}
                            {inSquad ? 'In Squad' : 'Squad'}
                          </button>
                          <button
                            onClick={() => handleChatWithAgent(agent)}
                            className="inline-flex items-center gap-1 rounded-lg bg-indigo-600/90 px-2.5 py-1 text-[11px] font-semibold text-white hover:bg-indigo-500 transition"
                          >
                            <MessageSquare className="h-3 w-3" />
                            Use AI
                          </button>
                        </div>
                      </div>
                    )
                  })}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: NEXUS PLAYBOOKS */}
        {activeTab === 'nexus' && (
          <div className="flex-1 overflow-y-auto p-4 sm:p-6">
            <div className="mx-auto max-w-5xl space-y-6">
              <div className="rounded-2xl border border-indigo-500/25 bg-gradient-to-r from-indigo-950/40 via-[#0D1322] to-violet-950/30 p-5">
                <h3 className="text-base font-bold text-white">
                  NEXUS Multi-Agent Scenario Runbooks
                </h3>
                <p className="mt-1 text-xs text-slate-300 leading-relaxed">
                  Pre-built agency battle plans combining specialists from Engineering, Design,
                  Product, Marketing, Security, and QA into phase-gated pipelines. Launch any
                  runbook directly inside Castiel AI.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(catalog?.runbooks || []).map((rb) => {
                  const Icon = RUNBOOK_ICONS[rb.slug] || Compass
                  return (
                    <div
                      key={rb.slug}
                      className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-[#0B101D] p-5"
                    >
                      <div className="space-y-3">
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-500/15 border border-indigo-500/30 text-indigo-300">
                              <Icon className="h-5 w-5" />
                            </div>
                            <div>
                              <h4 className="text-sm font-bold text-white">{rb.title}</h4>
                              <div className="text-[11px] text-slate-400">
                                {rb.mode} · {rb.duration}
                              </div>
                            </div>
                          </div>
                        </div>
                        <p className="text-xs text-slate-300 leading-relaxed">{rb.summary}</p>

                        <div className="space-y-2 pt-1">
                          {rb.roster.map((grp) => (
                            <div key={grp.group}>
                              <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
                                {grp.group} ({grp.activation})
                              </div>
                              <div className="flex flex-wrap gap-1">
                                {grp.agents.map((slug) => {
                                  const a = agentsBySlug[slug]
                                  return (
                                    <button
                                      key={slug}
                                      onClick={() => setInspectSlug(slug)}
                                      className="inline-flex items-center gap-1 rounded-md border border-slate-800 bg-[#070B14] px-2 py-0.5 text-[11px] text-slate-300 hover:border-indigo-500/50 hover:text-white"
                                    >
                                      <span>{a?.emoji || '🤖'}</span>
                                      <span>{a?.name || slug}</span>
                                    </button>
                                  )
                                })}
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      <div className="mt-5 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                        <button
                          onClick={() => {
                            const members = rb.roster
                              .flatMap((g) => g.agents)
                              .map((s) => agentsBySlug[s])
                              .filter(Boolean)
                              .slice(0, 8)
                            setActiveSquad(members)
                          }}
                          className="rounded-lg border border-slate-700 bg-slate-800/70 px-3 py-1.5 text-xs text-slate-200 hover:border-indigo-500/50"
                        >
                          Load into Squad Dock
                        </button>
                        <button
                          onClick={() => handleLaunchRunbook(rb.slug)}
                          className="rounded-lg bg-indigo-600 px-3.5 py-1.5 text-xs font-semibold text-white hover:bg-indigo-500"
                        >
                          Activate Runbook →
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Modals */}
      <AgentModal
        slug={inspectSlug}
        onClose={() => setInspectSlug(null)}
        onStartChat={handleChatWithAgent}
        onAddToSquad={toggleSquadMember}
        inSquad={!!activeSquad.find((x) => x.slug === inspectSlug)}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        llmConfig={llmConfig}
        onSave={saveLlmConfig}
      />
    </div>
  )
}
