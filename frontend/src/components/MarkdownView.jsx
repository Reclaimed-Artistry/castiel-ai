import React, { useMemo } from 'react'
import { marked } from 'marked'

marked.setOptions({
  breaks: true,
  gfm: true,
})

function escapeRawHtml(md) {
  return String(md || '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
}

export default function MarkdownView({ content, className = '' }) {
  const html = useMemo(() => {
    if (!content) return ''
    return marked.parse(escapeRawHtml(content))
  }, [content])

  return (
    <div
      className={`castiel-prose ${className}`}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  )
}
