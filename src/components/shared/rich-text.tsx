import { cn } from "@/lib/utils"

const BULLET_RE = /^(\s*)[*\-•]\s+(.*)$/

type Block =
  | { type: "p"; lines: string[] }
  | { type: "ul"; items: { text: string; indent: number }[] }

function parseBlocks(text: string): Block[] {
  const lines = text.split(/\r?\n/)
  const blocks: Block[] = []
  let paragraphLines: string[] = []
  let listItems: { text: string; indent: number }[] = []

  const flushParagraph = () => {
    if (paragraphLines.length) {
      blocks.push({ type: "p", lines: paragraphLines })
      paragraphLines = []
    }
  }
  const flushList = () => {
    if (listItems.length) {
      blocks.push({ type: "ul", items: listItems })
      listItems = []
    }
  }

  for (const line of lines) {
    if (!line.trim()) {
      flushParagraph()
      flushList()
      continue
    }
    const match = BULLET_RE.exec(line)
    if (match) {
      flushParagraph()
      const [, indent, content] = match
      listItems.push({ text: content.trim(), indent: indent.length })
    } else {
      flushList()
      paragraphLines.push(line)
    }
  }
  flushParagraph()
  flushList()
  return blocks
}

/**
 * Renders admin-authored plain text as real paragraphs/lists instead of a
 * single `whitespace-pre-line` block — trip content is written with `*`
 * bullets (see trip-form placeholders) but there's no markdown renderer in
 * the repo, so those bullets used to show up as literal asterisks.
 */
export function RichText({ text, className }: { text: string; className?: string }) {
  if (!text) return null
  const blocks = parseBlocks(text)

  return (
    <div className={cn("space-y-3", className)}>
      {blocks.map((block, i) => {
        if (block.type === "ul") {
          const baseIndent = Math.min(...block.items.map((item) => item.indent))
          return (
            <ul key={i} className="list-disc ps-5 space-y-1">
              {block.items.map((item, j) => (
                <li
                  key={j}
                  className={item.indent > baseIndent ? "ms-4 list-[circle]" : undefined}
                >
                  {item.text}
                </li>
              ))}
            </ul>
          )
        }
        return (
          <p key={i} className="whitespace-pre-line">
            {block.lines.join("\n")}
          </p>
        )
      })}
    </div>
  )
}
