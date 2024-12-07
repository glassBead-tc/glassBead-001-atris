import type { Message } from "ai";

export function ChatMessageBubble(props: { 
  message: Message, 
  aiEmoji?: string, 
  sources?: string[]
}) {
  const colorClassName =
    props.message.role === "user" 
      ? "bg-blue-600 text-white" 
      : "bg-gray-200 text-black";
  
  const alignmentClassName =
    props.message.role === "user" 
      ? "ml-auto self-end" 
      : "mr-auto self-start";
  
  const prefix = 
    props.message.role === "user" 
      ? "🧑" 
      : props.aiEmoji || "🤖";

  return (
    <div className={`flex ${alignmentClassName} w-full`}>
      <div
        className={`
          ${colorClassName} 
          ${alignmentClassName} 
          rounded-2xl 
          px-4 py-3 
          max-w-[80%] 
          mb-4 
          flex 
          items-start 
          space-x-2 
          shadow-sm
        `}
      >
        <div className="text-2xl mr-2">{prefix}</div>
        <div className="flex-grow whitespace-pre-wrap break-words">
          {props.message.content}
        </div>
      </div>
      {props.sources && props.sources.length > 0 && (
        <div className="ml-2 text-xs text-gray-500 self-end">
          Sources:
          <ul>
            {props.sources.map((source, index) => (
              <li key={index}>{source}</li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}