"use client";

import { useEffect } from "react";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { normalizeEditorContent } from "@/lib/editorContent";
import {
  Bold as BoldIcon,
  Columns3,
  Italic as ItalicIcon,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Rows3,
  Table2,
  Trash2,
} from "lucide-react";

type RichTextEditorProps = {
  content: string;
  pageId: string;
  onChange: (content: string) => void;
};

export function RichTextEditor({ content, pageId, onChange }: RichTextEditorProps) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3],
        },
      }),
      Link.configure({
        autolink: true,
        defaultProtocol: "https",
        openOnClick: false,
      }),
      Placeholder.configure({
        placeholder: "Start meeting notes here...",
      }),
      TaskList,
      TaskItem.configure({
        nested: true,
      }),
      Table.configure({
        resizable: false,
      }),
      TableRow,
      TableHeader,
      TableCell,
    ],
    content: normalizeEditorContent(content),
    editorProps: {
      attributes: {
        class: "thinkleaf-editor min-h-[560px] outline-none",
      },
    },
    onUpdate: ({ editor: currentEditor }) => {
      onChange(currentEditor.getHTML());
    },
  });

  useEffect(() => {
    if (!editor) {
      return;
    }

    const nextContent = normalizeEditorContent(content);
    if (editor.getHTML() !== nextContent) {
      editor.commands.setContent(nextContent, { emitUpdate: false });
    }
  }, [content, editor, pageId]);

  return (
    <div>
      <EditorToolbar editor={editor} />
      <div className="pt-5">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function EditorToolbar({ editor }: { editor: Editor | null }) {
  function setLink() {
    if (!editor) {
      return;
    }

    const previousUrl = editor.getAttributes("link").href as string | undefined;
    const url = window.prompt("Link URL", previousUrl ?? "https://");

    if (url === null) {
      return;
    }

    if (!url.trim()) {
      editor.chain().focus().extendMarkRange("link").unsetLink().run();
      return;
    }

    editor.chain().focus().extendMarkRange("link").setLink({ href: url.trim() }).run();
  }

  function buttonClass(isActive = false) {
    return [
      "inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-40",
      isActive
        ? "border-slate-900 bg-slate-900 text-white"
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
    ].join(" ");
  }

  return (
    <div className="sticky top-0 z-10 flex flex-wrap items-center gap-2 border-b border-slate-100 bg-white pb-4">
      <button
        aria-label="Heading 1"
        className={buttonClass(editor?.isActive("heading", { level: 1 }))}
        disabled={!editor}
        title="Heading 1"
        type="button"
        onClick={() => editor?.chain().focus().toggleHeading({ level: 1 }).run()}
      >
        H1
      </button>
      <button
        aria-label="Heading 2"
        className={buttonClass(editor?.isActive("heading", { level: 2 }))}
        disabled={!editor}
        title="Heading 2"
        type="button"
        onClick={() => editor?.chain().focus().toggleHeading({ level: 2 }).run()}
      >
        H2
      </button>
      <button
        aria-label="Heading 3"
        className={buttonClass(editor?.isActive("heading", { level: 3 }))}
        disabled={!editor}
        title="Heading 3"
        type="button"
        onClick={() => editor?.chain().focus().toggleHeading({ level: 3 }).run()}
      >
        H3
      </button>
      <span className="h-6 w-px bg-slate-200" />
      <button
        aria-label="Bold"
        className={buttonClass(editor?.isActive("bold"))}
        disabled={!editor}
        title="Bold"
        type="button"
        onClick={() => editor?.chain().focus().toggleBold().run()}
      >
        <BoldIcon aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Italic"
        className={buttonClass(editor?.isActive("italic"))}
        disabled={!editor}
        title="Italic"
        type="button"
        onClick={() => editor?.chain().focus().toggleItalic().run()}
      >
        <ItalicIcon aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Link"
        className={buttonClass(editor?.isActive("link"))}
        disabled={!editor}
        title="Link"
        type="button"
        onClick={setLink}
      >
        <Link2 aria-hidden="true" className="h-4 w-4" />
      </button>
      <span className="h-6 w-px bg-slate-200" />
      <button
        aria-label="Bullet list"
        className={buttonClass(editor?.isActive("bulletList"))}
        disabled={!editor}
        title="Bullet list"
        type="button"
        onClick={() => editor?.chain().focus().toggleBulletList().run()}
      >
        <List aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Numbered list"
        className={buttonClass(editor?.isActive("orderedList"))}
        disabled={!editor}
        title="Numbered list"
        type="button"
        onClick={() => editor?.chain().focus().toggleOrderedList().run()}
      >
        <ListOrdered aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Checklist"
        className={buttonClass(editor?.isActive("taskList"))}
        disabled={!editor}
        title="Checklist"
        type="button"
        onClick={() => editor?.chain().focus().toggleTaskList().run()}
      >
        <ListChecks aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Callout"
        className={buttonClass(editor?.isActive("blockquote"))}
        disabled={!editor}
        title="Callout"
        type="button"
        onClick={() => editor?.chain().focus().toggleBlockquote().run()}
      >
        <Quote aria-hidden="true" className="h-4 w-4" />
      </button>
      <span className="h-6 w-px bg-slate-200" />
      <button
        aria-label="Insert table"
        className={buttonClass(editor?.isActive("table"))}
        disabled={!editor}
        title="Insert table"
        type="button"
        onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
      >
        <Table2 aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Add column"
        className={buttonClass()}
        disabled={!editor || !editor.can().addColumnAfter()}
        title="Add column"
        type="button"
        onClick={() => editor?.chain().focus().addColumnAfter().run()}
      >
        <Columns3 aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Add row"
        className={buttonClass()}
        disabled={!editor || !editor.can().addRowAfter()}
        title="Add row"
        type="button"
        onClick={() => editor?.chain().focus().addRowAfter().run()}
      >
        <Rows3 aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Delete table"
        className={buttonClass()}
        disabled={!editor || !editor.isActive("table")}
        title="Delete table"
        type="button"
        onClick={() => editor?.chain().focus().deleteTable().run()}
      >
        <Trash2 aria-hidden="true" className="h-4 w-4" />
      </button>
    </div>
  );
}
