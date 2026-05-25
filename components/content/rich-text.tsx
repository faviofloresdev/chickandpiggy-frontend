import type { ReactNode } from 'react'

import type { RichTextNode, RichTextTextNode } from '@/lib/api/contracts'

interface RichTextProps {
  content: RichTextNode[]
}

function renderTextNode(node: RichTextTextNode, key: string) {
  let content: ReactNode = node.text

  if (node.bold) {
    content = <strong>{content}</strong>
  }

  if (node.italic) {
    content = <em>{content}</em>
  }

  if (node.underline) {
    content = <u>{content}</u>
  }

  if (node.strikethrough) {
    content = <s>{content}</s>
  }

  return <span key={key}>{content}</span>
}

function renderInline(nodes: RichTextNode[] | undefined, path: string) {
  if (!nodes?.length) {
    return null
  }

  return nodes.map((node, index) => {
    const key = `${path}-${index}`

    if (node.type === 'text') {
      return renderTextNode(node, key)
    }

    if (node.type === 'list-item') {
      return <span key={key}>{renderInline(node.children, `${key}-children`)}</span>
    }

    return null
  })
}

function renderBlock(node: RichTextNode, path: string): ReactNode {
  if (node.type === 'text') {
    return (
      <p key={path} className="text-base leading-7 text-gray-600">
        {renderTextNode(node, `${path}-text`)}
      </p>
    )
  }

  if (node.type === 'heading') {
    const level = node.level ?? 2
    const classNameByLevel: Record<number, string> = {
      1: 'text-4xl md:text-5xl font-semibold tracking-tight text-brand-500',
      2: 'text-2xl font-semibold tracking-tight text-brand-700',
      3: 'text-xl font-semibold tracking-tight text-brand-700',
      4: 'text-lg font-semibold tracking-tight text-brand-700',
      5: 'text-base font-semibold tracking-tight text-brand-700',
      6: 'text-base font-semibold tracking-tight text-brand-700',
    }
    const className = classNameByLevel[level] ?? classNameByLevel[2]
    const content = renderInline(node.children, `${path}-children`)

    switch (level) {
      case 1:
        return <h1 key={path} className={className}>{content}</h1>
      case 2:
        return <h2 key={path} className={className}>{content}</h2>
      case 3:
        return <h3 key={path} className={className}>{content}</h3>
      case 4:
        return <h4 key={path} className={className}>{content}</h4>
      case 5:
        return <h5 key={path} className={className}>{content}</h5>
      default:
        return <h6 key={path} className={className}>{content}</h6>
    }
  }

  if (node.type === 'paragraph') {
    return (
      <p key={path} className="text-base leading-7 text-gray-600">
        {renderInline(node.children, `${path}-children`)}
      </p>
    )
  }

  if (node.type === 'list') {
    const ListTag = node.format === 'ordered' ? 'ol' : 'ul'
    const listClassName =
      node.format === 'ordered'
        ? 'list-decimal space-y-2 pl-6 text-base leading-7 text-gray-600'
        : 'list-disc space-y-2 pl-6 text-base leading-7 text-gray-600'

    return (
      <ListTag key={path} className={listClassName}>
        {node.children?.map((child, index) => renderBlock(child, `${path}-${index}`))}
      </ListTag>
    )
  }

  if (node.type === 'list-item') {
    return <li key={path}>{renderInline(node.children, `${path}-children`)}</li>
  }

  return null
}

export function RichText({ content }: RichTextProps) {
  return <div className="space-y-5">{content.map((node, index) => renderBlock(node, `rich-text-${index}`))}</div>
}
