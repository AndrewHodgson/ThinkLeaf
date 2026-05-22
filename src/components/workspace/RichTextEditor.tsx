"use client";

import { useEffect, useState } from "react";
import { Extension, Mark } from "@tiptap/core";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import TaskItem from "@tiptap/extension-task-item";
import TaskList from "@tiptap/extension-task-list";
import { Table, TableCell, TableHeader, TableRow } from "@tiptap/extension-table";
import { normalizeEditorContent } from "@/lib/editorContent";
import {
  ChevronDown,
  Bold as BoldIcon,
  AlignCenter,
  AlignLeft,
  AlignRight,
  AlignVerticalJustifyCenter,
  AlignVerticalJustifyEnd,
  AlignVerticalJustifyStart,
  Columns3,
  Highlighter,
  Italic as ItalicIcon,
  Link2,
  List,
  ListChecks,
  ListOrdered,
  Quote,
  Rows3,
  Table2,
  Trash2,
  Type,
} from "lucide-react";
import { colorPresets, defaultCanvasStyle, highlightPresets, textSizePresets } from "@/lib/canvasStyle";
import { ColorPicker } from "@/components/workspace/ColorPicker";

type DocumentTextAlign = "left" | "center" | "right";
type DocumentVerticalAlign = "top" | "middle" | "bottom";

const DOCUMENT_VERTICAL_ALIGN_STORAGE_KEY = "thinkleaf.documentVerticalAlign.v1";

const TextAlignExtension = Extension.create({
  name: "thinkleafTextAlign",

  addGlobalAttributes() {
    return [
      {
        types: ["heading", "paragraph", "tableCell", "tableHeader"],
        attributes: {
          textAlign: {
            default: "left",
            parseHTML: (element) => element.style.textAlign || "left",
            renderHTML: (attributes) => {
              if (!attributes.textAlign) {
                return {};
              }

              return { style: `text-align: ${attributes.textAlign}` };
            },
          },
        },
      },
    ];
  },
});

const TextColorMark = Mark.create({
  name: "thinkleafTextColor",

  addAttributes() {
    return {
      color: {
        default: null,
        parseHTML: (element) => element.style.color || null,
        renderHTML: (attributes) => (attributes.color ? { style: `color: ${attributes.color}` } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[style*=color]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
});

const TextHighlightMark = Mark.create({
  name: "thinkleafTextHighlight",

  addAttributes() {
    return {
      backgroundColor: {
        default: null,
        parseHTML: (element) => element.style.backgroundColor || null,
        renderHTML: (attributes) =>
          attributes.backgroundColor ? { style: `background-color: ${attributes.backgroundColor}` } : {},
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[style*=background-color]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
});

const FontSizeMark = Mark.create({
  name: "thinkleafFontSize",

  addAttributes() {
    return {
      fontSize: {
        default: null,
        parseHTML: (element) => element.style.fontSize || null,
        renderHTML: (attributes) => (attributes.fontSize ? { style: `font-size: ${attributes.fontSize}` } : {}),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[style*=font-size]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", HTMLAttributes, 0];
  },
});

type RichTextEditorProps = {
  content: string;
  pageId: string;
  onChange: (content: string) => void;
};

export function RichTextEditor({ content, pageId, onChange }: RichTextEditorProps) {
  const [verticalAlign, setVerticalAlign] = useState<DocumentVerticalAlign>("top");
  const [hasLoadedVerticalAlign, setHasLoadedVerticalAlign] = useState(false);
  useEffect(() => {
    try {
      const stored = window.localStorage.getItem(DOCUMENT_VERTICAL_ALIGN_STORAGE_KEY);
      setVerticalAlign(stored === "middle" || stored === "bottom" ? stored : "top");
    } catch {
      // Ignore storage errors in private/incognito modes.
    } finally {
      setHasLoadedVerticalAlign(true);
    }
  }, []);
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        link: false,
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
      TextAlignExtension,
      TextColorMark,
      TextHighlightMark,
      FontSizeMark,
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

  useEffect(() => {
    if (!hasLoadedVerticalAlign) {
      return;
    }

    try {
      window.localStorage.setItem(DOCUMENT_VERTICAL_ALIGN_STORAGE_KEY, verticalAlign);
    } catch {
      // Ignore storage errors in private/incognito modes.
    }
  }, [hasLoadedVerticalAlign, verticalAlign]);

  return (
    <div>
      <EditorToolbar editor={editor} verticalAlign={verticalAlign} onVerticalAlignChange={setVerticalAlign} />
      <div className={["flex min-h-[560px] pt-5", getDocumentVerticalAlignClass(verticalAlign)].join(" ")}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

function EditorToolbar({
  editor,
  onVerticalAlignChange,
  verticalAlign,
}: {
  editor: Editor | null;
  onVerticalAlignChange: (align: DocumentVerticalAlign) => void;
  verticalAlign: DocumentVerticalAlign;
}) {
  const [, setToolbarVersion] = useState(0);

  useEffect(() => {
    if (!editor) {
      return;
    }

    const refreshToolbar = () => setToolbarVersion((version) => version + 1);
    editor.on("selectionUpdate", refreshToolbar);
    editor.on("transaction", refreshToolbar);

    return () => {
      editor.off("selectionUpdate", refreshToolbar);
      editor.off("transaction", refreshToolbar);
    };
  }, [editor]);

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

  function setTextAlign(textAlign: DocumentTextAlign) {
    editor
      ?.chain()
      .focus()
      .updateAttributes("paragraph", { textAlign })
      .updateAttributes("heading", { textAlign })
      .updateAttributes("tableCell", { textAlign })
      .updateAttributes("tableHeader", { textAlign })
      .run();
  }

  function setTextColor(color: string) {
    editor?.chain().focus().setMark("thinkleafTextColor", { color }).run();
  }

  function setHighlight(backgroundColor: string) {
    if (backgroundColor === "transparent") {
      editor?.chain().focus().unsetMark("thinkleafTextHighlight").run();
      return;
    }

    editor?.chain().focus().setMark("thinkleafTextHighlight", { backgroundColor }).run();
  }

  function setFontSize(fontSize: number) {
    editor?.chain().focus().setMark("thinkleafFontSize", { fontSize: `${fontSize}px` }).run();
  }

  const currentTextColor = (editor?.getAttributes("thinkleafTextColor").color as string | undefined) ?? defaultCanvasStyle.textColor;
  const currentHighlight =
    (editor?.getAttributes("thinkleafTextHighlight").backgroundColor as string | undefined) ?? "transparent";
  const currentFontSize = parseFontSize(editor?.getAttributes("thinkleafFontSize").fontSize as string | undefined);

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
      <HeadingDropdown editor={editor} />
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
      <ColorPicker
        currentValue={currentTextColor}
        disabled={!editor}
        icon={<Type aria-hidden="true" className="h-4 w-4" />}
        label="Text color"
        onSelect={setTextColor}
        presets={colorPresets}
      />
      <ColorPicker
        currentValue={currentHighlight}
        disabled={!editor}
        icon={<Highlighter aria-hidden="true" className="h-4 w-4" />}
        label="Highlight"
        onSelect={setHighlight}
        presets={highlightPresets}
      />
      <SizeDropdown currentSize={currentFontSize} disabled={!editor} onSelect={setFontSize} />
      <span className="h-6 w-px bg-slate-200" />
      <button
        aria-label="Align left"
        className={buttonClass(editor?.isActive({ textAlign: "left" }))}
        disabled={!editor}
        title="Align left"
        type="button"
        onClick={() => setTextAlign("left")}
      >
        <AlignLeft aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align center"
        className={buttonClass(editor?.isActive({ textAlign: "center" }))}
        disabled={!editor}
        title="Align center"
        type="button"
        onClick={() => setTextAlign("center")}
      >
        <AlignCenter aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align right"
        className={buttonClass(editor?.isActive({ textAlign: "right" }))}
        disabled={!editor}
        title="Align right"
        type="button"
        onClick={() => setTextAlign("right")}
      >
        <AlignRight aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align content top"
        className={buttonClass(verticalAlign === "top")}
        title="Align content top"
        type="button"
        onClick={() => onVerticalAlignChange("top")}
      >
        <AlignVerticalJustifyStart aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align content middle"
        className={buttonClass(verticalAlign === "middle")}
        title="Align content middle"
        type="button"
        onClick={() => onVerticalAlignChange("middle")}
      >
        <AlignVerticalJustifyCenter aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align content bottom"
        className={buttonClass(verticalAlign === "bottom")}
        title="Align content bottom"
        type="button"
        onClick={() => onVerticalAlignChange("bottom")}
      >
        <AlignVerticalJustifyEnd aria-hidden="true" className="h-4 w-4" />
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

function getDocumentVerticalAlignClass(verticalAlign: DocumentVerticalAlign) {
  if (verticalAlign === "middle") {
    return "items-center [&>*]:w-full";
  }

  if (verticalAlign === "bottom") {
    return "items-end [&>*]:w-full";
  }

  return "items-start [&>*]:w-full";
}

function HeadingDropdown({ editor }: { editor: Editor | null }) {
  const currentHeading = ([1, 2, 3] as const).find((level) => editor?.isActive("heading", { level }));
  const label = currentHeading ? `H${currentHeading}` : "Text";

  return (
    <details className="relative">
      <summary
        aria-label="Text style"
        className={[
          "inline-flex h-8 min-w-20 cursor-pointer list-none items-center justify-between gap-2 rounded-md border px-2 text-xs font-semibold transition",
          !editor
            ? "pointer-events-none cursor-not-allowed opacity-40"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
        ].join(" ")}
        title="Text style"
      >
        {label}
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
      </summary>
      <div className="absolute left-0 top-9 z-30 grid min-w-24 gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-soft">
        <button
          className={[
            "h-8 rounded px-2 text-left text-xs font-semibold transition",
            !currentHeading ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
          ].join(" ")}
          type="button"
          onClick={() => editor?.chain().focus().setParagraph().run()}
        >
          Text
        </button>
        {([1, 2, 3] as const).map((level) => (
          <button
            key={level}
            className={[
              "h-8 rounded px-2 text-left text-xs font-semibold transition",
              currentHeading === level ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
            ].join(" ")}
            type="button"
            onClick={() => editor?.chain().focus().setHeading({ level }).run()}
          >
            H{level}
          </button>
        ))}
      </div>
    </details>
  );
}

function SizeDropdown({
  currentSize,
  disabled,
  onSelect,
}: {
  currentSize: number;
  disabled: boolean;
  onSelect: (fontSize: number) => void;
}) {
  return (
    <details className="relative">
      <summary
        aria-label="Text size"
        className={[
          "inline-flex h-8 min-w-14 cursor-pointer list-none items-center justify-center gap-1 rounded-md border px-2 text-xs font-semibold transition",
          disabled
            ? "pointer-events-none cursor-not-allowed opacity-40"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
        ].join(" ")}
        title="Text size"
      >
        {currentSize}
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
      </summary>
      <div className="absolute left-0 top-9 z-30 grid min-w-20 gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-soft">
        {textSizePresets.map((fontSize) => (
          <button
            key={`document-size-${fontSize}`}
            aria-label={`Text size ${fontSize}`}
            className={[
              "h-8 rounded px-2 text-left text-xs font-semibold transition",
              currentSize === fontSize ? "bg-slate-900 text-white" : "text-slate-600 hover:bg-slate-50",
            ].join(" ")}
            type="button"
            onClick={() => onSelect(fontSize)}
          >
            {fontSize}
          </button>
        ))}
      </div>
    </details>
  );
}

function parseFontSize(fontSize?: string) {
  if (!fontSize) {
    return defaultCanvasStyle.fontSize;
  }

  const parsed = Number.parseInt(fontSize, 10);
  return Number.isFinite(parsed) ? parsed : defaultCanvasStyle.fontSize;
}
