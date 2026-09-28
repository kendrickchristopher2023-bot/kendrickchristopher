"use client";

import { Fragment } from "react";

import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { SKILL_INFO } from "./data";

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const acronymPattern = new RegExp(
  `\\b(${Object.keys(SKILL_INFO).sort((a, b) => b.length - a.length).map(escapeRegex).join("|")})\\b`,
);

export function AbbrText({ text }: { text: string }) {
  return (
    <>
      {text.split(acronymPattern).map((part, index) => {
        const definition = SKILL_INFO[part];

        if (!definition) {
          return <Fragment key={`${part}-${index}`}>{part}</Fragment>;
        }

        return (
          <Popover key={`${part}-${index}`}>
            <PopoverTrigger asChild>
              <button
                type="button"
                aria-label={`What is ${part}?`}
                className="inline cursor-help border-0 border-b border-dotted border-muted-foreground/50 bg-transparent p-0 font-inherit text-inherit focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
              >
                {part}
              </button>
            </PopoverTrigger>
            <PopoverContent className="w-72">
              <p className="text-sm font-semibold">{part}</p>
              <p className="mt-1 text-xs leading-relaxed text-muted-foreground">{definition}</p>
            </PopoverContent>
          </Popover>
        );
      })}
    </>
  );
}