"use client";

import { FormEvent, useMemo, useState } from "react";
import { Tag, X } from "lucide-react";

type TagEditorProps = {
  suggestions?: string[];
  tags: string[];
  onChange: (tags: string[]) => void;
  onSearchByTag: (tag: string) => void;
};

export function TagEditor({ suggestions = [], tags, onChange, onSearchByTag }: TagEditorProps) {
  const [draft, setDraft] = useState("");
  const [isFocused, setIsFocused] = useState(false);
  const matchingSuggestions = useMemo(() => {
    const normalizedDraft = draft.trim().toLowerCase();
    const currentTags = new Set(tags.map((tag) => tag.toLowerCase()));

    if (!normalizedDraft) {
      return [];
    }

    return suggestions
      .filter((tag) => !currentTags.has(tag.toLowerCase()))
      .filter((tag) => tag.toLowerCase().startsWith(normalizedDraft))
      .slice(0, 6);
  }, [draft, suggestions, tags]);

  function addTagValue(value: string) {
    const nextTag = value.trim();

    if (!nextTag || tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) {
      setDraft("");
      return;
    }

    onChange([...tags, nextTag]);
    setDraft("");
  }

  function addTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    addTagValue(draft);
  }

  function removeTag(tagToRemove: string) {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <Tag aria-hidden="true" className="h-3.5 w-3.5 shrink-0 text-slate-400" />
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-1.5 rounded-md border border-leaf-100 bg-leaf-50 px-1.5 py-0.5 text-xs font-medium text-leaf-700"
        >
          <button
            className="hover:underline"
            type="button"
            onClick={() => onSearchByTag(tag)}
          >
            {tag}
          </button>
          <button
            className="inline-flex h-3.5 w-3.5 items-center justify-center text-leaf-600 hover:text-slate-950"
            aria-label={`Remove ${tag}`}
            type="button"
            onClick={() => removeTag(tag)}
          >
            <X aria-hidden="true" className="h-3 w-3" />
          </button>
        </span>
      ))}
      <form className="relative min-w-[150px] flex-1" onSubmit={addTag}>
        <input
          className="h-7 w-full rounded-md border border-slate-200 px-2 text-xs outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100"
          placeholder="Add tag and press Enter"
          value={draft}
          onBlur={() => setIsFocused(false)}
          onChange={(event) => setDraft(event.target.value)}
          onFocus={() => setIsFocused(true)}
        />
        {isFocused && matchingSuggestions.length ? (
          <div className="absolute left-0 top-8 z-30 grid min-w-44 gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-soft">
            {matchingSuggestions.map((tag) => (
              <button
                key={tag}
                className="rounded px-2 py-1 text-left text-xs font-medium text-slate-600 transition hover:bg-leaf-50 hover:text-leaf-700"
                type="button"
                onMouseDown={(event) => {
                  event.preventDefault();
                  addTagValue(tag);
                }}
              >
                {tag}
              </button>
            ))}
          </div>
        ) : null}
      </form>
    </div>
  );
}
