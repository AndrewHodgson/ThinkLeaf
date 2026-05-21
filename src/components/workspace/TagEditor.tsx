"use client";

import { FormEvent, useState } from "react";
import { Tag, X } from "lucide-react";

type TagEditorProps = {
  tags: string[];
  onChange: (tags: string[]) => void;
  onSearchByTag: (tag: string) => void;
};

export function TagEditor({ tags, onChange, onSearchByTag }: TagEditorProps) {
  const [draft, setDraft] = useState("");

  function addTag(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const nextTag = draft.trim();

    if (!nextTag || tags.some((tag) => tag.toLowerCase() === nextTag.toLowerCase())) {
      setDraft("");
      return;
    }

    onChange([...tags, nextTag]);
    setDraft("");
  }

  function removeTag(tagToRemove: string) {
    onChange(tags.filter((tag) => tag !== tagToRemove));
  }

  return (
    <div className="flex flex-wrap items-center gap-2">
      <Tag aria-hidden="true" className="h-4 w-4 shrink-0 text-slate-400" />
      {tags.map((tag) => (
        <span
          key={tag}
          className="inline-flex items-center gap-2 rounded-md border border-leaf-100 bg-leaf-50 px-2 py-1 text-sm font-medium text-leaf-700"
        >
          <button
            className="hover:underline"
            type="button"
            onClick={() => onSearchByTag(tag)}
          >
            {tag}
          </button>
          <button
            className="inline-flex h-4 w-4 items-center justify-center text-leaf-600 hover:text-slate-950"
            aria-label={`Remove ${tag}`}
            type="button"
            onClick={() => removeTag(tag)}
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </span>
      ))}
      <form className="min-w-[180px] flex-1" onSubmit={addTag}>
        <input
          className="h-8 w-full rounded-md border border-slate-200 px-2 text-sm outline-none focus:border-leaf-500 focus:ring-2 focus:ring-leaf-100"
          placeholder="Add tag and press Enter"
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
        />
      </form>
    </div>
  );
}
