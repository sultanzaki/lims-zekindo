"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import Link from "next/link";

// Renders the model's markdown reply with the chat bubble's own typography
// (13px, tight line-height) instead of pulling in a generic prose stylesheet
// — every element is remapped to a small, chat-appropriate size so bold
// text/lists/tables don't blow out the bubble's proportions.
export default function AssistantMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        p: ({ children }) => <p className="mb-1.5 last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-bold">{children}</strong>,
        em: ({ children }) => <em className="italic">{children}</em>,
        ul: ({ children }) => <ul className="list-disc pl-4 mb-1.5 last:mb-0 flex flex-col gap-0.5">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal pl-4 mb-1.5 last:mb-0 flex flex-col gap-0.5">{children}</ol>,
        li: ({ children }) => <li className="pl-0.5">{children}</li>,
        h1: ({ children }) => <div className="font-bold text-[13.5px] mb-1">{children}</div>,
        h2: ({ children }) => <div className="font-bold text-[13px] mb-1">{children}</div>,
        h3: ({ children }) => <div className="font-bold text-[12.5px] mb-1">{children}</div>,
        code: ({ children }) => <code className="font-mono-data text-[11.5px] bg-black/5 rounded px-1 py-0.5">{children}</code>,
        pre: ({ children }) => <pre className="font-mono-data text-[11px] bg-black/5 rounded-lg p-2 mb-1.5 overflow-x-auto">{children}</pre>,
        a: ({ href, children }) =>
          href ? (
            <Link href={href} className="underline underline-offset-2 font-semibold">
              {children}
            </Link>
          ) : (
            <>{children}</>
          ),
        table: ({ children }) => (
          <div className="overflow-x-auto mb-1.5">
            <table className="text-[11.5px] border-collapse w-full">{children}</table>
          </div>
        ),
        th: ({ children }) => <th className="text-left font-bold border-b border-current/15 px-1.5 py-1">{children}</th>,
        td: ({ children }) => <td className="border-b border-current/10 px-1.5 py-1 align-top">{children}</td>,
        hr: () => <hr className="border-current/15 my-1.5" />,
        blockquote: ({ children }) => <blockquote className="border-l-2 border-current/25 pl-2 italic opacity-90 mb-1.5">{children}</blockquote>,
      }}
    >
      {content}
    </ReactMarkdown>
  );
}
