import { useState } from "react";
import type { Message } from "ai";

interface IntermediateStepContent {
  thought?: string;
  action?: {
    name: string;
    args: Record<string, null>;
  };
  observation?: string;
}

export function IntermediateStep(props: { message: Message }) {
  const parsedInput = JSON.parse(props.message.content) as IntermediateStepContent;
  const [expanded, setExpanded] = useState(false);

  if (!parsedInput.thought && !parsedInput.action) {
    return null;
  }

  return (
    <div
      className={`ml-auto bg-green-600 rounded px-4 py-2 max-w-[80%] mb-8 whitespace-pre-wrap flex flex-col cursor-pointer`}
    >
      <div className={`text-right ${expanded ? "w-full" : ""}`} onClick={() => setExpanded(!expanded)}>
        {parsedInput.action ? (
          <code className="mr-2 bg-slate-600 px-2 py-1 rounded hover:text-blue-600">
            🛠️ <b>{parsedInput.action.name}</b>
          </code>
        ) : (
          <code className="mr-2 bg-slate-600 px-2 py-1 rounded hover:text-blue-600">
            💭 <b>Thought</b>
          </code>
        )}
        <span className={expanded ? "hidden" : ""}>🔽</span>
        <span className={expanded ? "" : "hidden"}>🔼</span>
      </div>
      <div className={`overflow-hidden max-h-[0px] transition-[max-height] ease-in-out ${expanded ? "max-h-[360px]" : ""}`}>
        {parsedInput.thought && (
          <div className={`bg-slate-600 rounded p-4 mt-1 max-w-0 ${expanded ? "max-w-full" : "transition-[max-width] delay-100"}`}>
            <code className={`opacity-0 max-h-[100px] overflow-auto transition ease-in-out delay-150 ${expanded ? "opacity-100" : ""}`}>
              Thought:
              <br />
              <br />
              {parsedInput.thought}
            </code>
          </div>
        )}
        {parsedInput.action && (
          <>
            <div className={`bg-slate-600 rounded p-4 mt-1 max-w-0 ${expanded ? "max-w-full" : "transition-[max-width] delay-100"}`}>
              <code className={`opacity-0 max-h-[100px] overflow-auto transition ease-in-out delay-150 ${expanded ? "opacity-100" : ""}`}>
                Tool Input:
                <br />
                <br />
                {JSON.stringify(parsedInput.action.args, null, 2)}
              </code>
            </div>
            {parsedInput.observation && (
              <div className={`bg-slate-600 rounded p-4 mt-1 max-w-0 ${expanded ? "max-w-full" : "transition-[max-width] delay-100"}`}>
                <code className={`opacity-0 max-h-[260px] overflow-auto transition ease-in-out delay-150 ${expanded ? "opacity-100" : ""}`}>
                  Observation:
                  <br />
                  <br />
                  {parsedInput.observation}
                </code>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}