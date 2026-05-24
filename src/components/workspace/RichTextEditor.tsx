"use client";

import { forwardRef, useEffect, useRef, useState, type ReactNode } from "react";
import { Extension, Mark, Node } from "@tiptap/core";
import type { Node as ProseMirrorNode } from "@tiptap/pm/model";
import { Plugin, type Transaction } from "@tiptap/pm/state";
import type { EditorView } from "@tiptap/pm/view";
import { Editor, EditorContent, useEditor } from "@tiptap/react";
import { createPortal } from "react-dom";
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
  Image as ImageIcon,
  IndentDecrease,
  IndentIncrease,
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
  Underline,
} from "lucide-react";
import { colorPresets, defaultCanvasStyle, highlightPresets, textSizePresets } from "@/lib/canvasStyle";
import { ColorPicker } from "@/components/workspace/ColorPicker";
import { getImageFilesFromClipboard, processImageFile } from "@/lib/imageUtils";
import type { CanvasObject, CanvasTextAlign, CanvasTextVerticalAlign } from "@/types/workspace";

type DocumentTextAlign = "left" | "center" | "right";
type DocumentVerticalAlign = "top" | "middle" | "bottom";
export type FormattingTarget = "document" | "whiteboardText" | "none";

const DOCUMENT_VERTICAL_ALIGN_STORAGE_KEY = "thinkleaf.documentVerticalAlign.v1";
const indentStep = 24;
const maxIndentLevel = 6;
const activeControlClass = "border-leaf-200 bg-leaf-50 text-leaf-700";
const activeMenuItemClass = "bg-leaf-50 text-leaf-700";

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

const UnderlineMark = Mark.create({
  name: "thinkleafUnderline",

  parseHTML() {
    return [{ tag: "u" }, { style: "text-decoration-line=underline" }, { style: "text-decoration=underline" }];
  },

  renderHTML({ HTMLAttributes }) {
    return ["span", { ...HTMLAttributes, style: "text-decoration: underline" }, 0];
  },
});

const IndentExtension = Extension.create({
  name: "thinkleafIndent",

  addGlobalAttributes() {
    return [
      {
        types: ["paragraph", "heading"],
        attributes: {
          indentLevel: {
            default: 0,
            parseHTML: (element) => {
              const marginLeft = Number.parseInt(element.style.marginLeft || "0", 10);
              return Number.isFinite(marginLeft) ? Math.min(maxIndentLevel, Math.max(0, Math.round(marginLeft / indentStep))) : 0;
            },
            renderHTML: (attributes) => {
              const level = typeof attributes.indentLevel === "number" ? attributes.indentLevel : 0;
              return level > 0 ? { style: `margin-left: ${level * indentStep}px` } : {};
            },
          },
        },
      },
    ];
  },
});

const ListTextIndentCleanupExtension = Extension.create({
  name: "thinkleafListTextIndentCleanup",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some((transaction) => transaction.docChanged)) {
            return null;
          }

          const tr = newState.tr;
          const changed = clearListTextIndentMarks(tr, newState.doc);

          return changed ? tr : null;
        },
      }),
    ];
  },
});

const DocumentImageNode = Node.create({
  name: "thinkleafImage",
  group: "block",
  draggable: true,

  addAttributes() {
    return {
      alt: {
        default: "",
      },
      src: {
        default: null,
      },
      title: {
        default: null,
      },
    };
  },

  parseHTML() {
    return [{ tag: "img[src]" }];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      "img",
      {
        ...HTMLAttributes,
        "data-thinkleaf-image": "true",
        class: "my-4 max-w-full rounded-md border border-slate-200",
      },
    ];
  },
});

type RichTextEditorProps = {
  content: string;
  formattingTarget: FormattingTarget;
  pageId: string;
  toolbarExtraContent?: ReactNode;
  toolbarPortalElement?: HTMLElement | null;
  whiteboardTextObject?: CanvasObject | null;
  onChange: (content: string) => void;
  onFocus?: () => void;
  onWhiteboardTextUpdate?: (updates: Partial<CanvasObject>) => void;
};

export function RichTextEditor({
  content,
  formattingTarget,
  pageId,
  toolbarExtraContent,
  toolbarPortalElement,
  whiteboardTextObject,
  onChange,
  onFocus,
  onWhiteboardTextUpdate,
}: RichTextEditorProps) {
  const imageInputRef = useRef<HTMLInputElement>(null);
  const toolbarRef = useRef<HTMLDivElement>(null);
  const [hasMounted, setHasMounted] = useState(false);
  const [verticalAlign, setVerticalAlign] = useState<DocumentVerticalAlign>("top");
  const [hasLoadedVerticalAlign, setHasLoadedVerticalAlign] = useState(false);

  useEffect(() => {
    setHasMounted(true);
  }, []);

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
      UnderlineMark,
      IndentExtension,
      ListTextIndentCleanupExtension,
      DocumentImageNode,
    ],
    content: normalizeEditorContent(content),
    editorProps: {
      attributes: {
        class: "thinkleaf-editor min-h-[560px] outline-none",
      },
      handlePaste: (view, event) => {
        const files = getImageFilesFromClipboard(event);
        if (!files.length) {
          return false;
        }

        event.preventDefault();
        void insertImagesIntoDocumentView(view, files);
        return true;
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
    if (!editor) {
      return;
    }

    const showToolbar = () => onFocus?.();

    editor.on("focus", showToolbar);

    return () => {
      editor.off("focus", showToolbar);
    };
  }, [editor, onFocus]);

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

  const documentToolbar = hasMounted && editor && toolbarPortalElement
    ? createPortal(
      <EditorToolbar
        ref={toolbarRef}
        editor={editor}
        extraContent={toolbarExtraContent}
        formattingTarget={formattingTarget}
        verticalAlign={verticalAlign}
        whiteboardTextObject={whiteboardTextObject}
        onImageUploadClick={() => imageInputRef.current?.click()}
        onVerticalAlignChange={setVerticalAlign}
        onWhiteboardTextUpdate={onWhiteboardTextUpdate}
      />,
      toolbarPortalElement,
    )
    : null;

  return (
    <div>
      {documentToolbar}
      <input
        ref={imageInputRef}
        accept="image/*"
        className="hidden"
        multiple
        type="file"
        onChange={(event) => {
          const files = Array.from(event.target.files ?? []);
          event.target.value = "";
          void insertImagesIntoDocumentEditor(editor, files);
        }}
      />
      <div className={["flex min-h-[560px]", getDocumentVerticalAlignClass(verticalAlign)].join(" ")}>
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

const EditorToolbar = forwardRef<HTMLDivElement, {
  editor: Editor | null;
  extraContent?: ReactNode;
  formattingTarget: FormattingTarget;
  onImageUploadClick: () => void;
  onVerticalAlignChange: (align: DocumentVerticalAlign) => void;
  onWhiteboardTextUpdate?: (updates: Partial<CanvasObject>) => void;
  verticalAlign: DocumentVerticalAlign;
  whiteboardTextObject?: CanvasObject | null;
}>(function EditorToolbar({
  editor,
  extraContent,
  formattingTarget,
  onImageUploadClick,
  onVerticalAlignChange,
  onWhiteboardTextUpdate,
  verticalAlign,
  whiteboardTextObject,
}, ref) {
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

  function updateIndent(delta: number) {
    if (!editor) {
      return;
    }

    editor.commands.focus();

    const commandName = delta > 0 ? "sinkListItem" : "liftListItem";
    const activeListItemName = getActiveListItemName(editor);
    const listItemNames: Array<"listItem" | "taskItem"> = activeListItemName
      ? [activeListItemName, activeListItemName === "taskItem" ? "listItem" : "taskItem"]
      : ["listItem", "taskItem"];
    const didUpdateListItem = listItemNames.some((listItemName) => runListItemCommand(editor, commandName, listItemName));

    if (didUpdateListItem || activeListItemName) {
      clearListTextIndents(editor);
      return;
    }

    editor.commands.command(({ state, tr, dispatch }) => {
      const { from, to } = state.selection;
      let changed = false;

      state.doc.nodesBetween(from, to, (node, pos) => {
        if (node.type.name !== "paragraph" && node.type.name !== "heading") {
          return;
        }

        changed = updateNodeIndent(tr, node, pos, delta) || changed;
      });

      if (!changed) {
        for (let depth = state.selection.$from.depth; depth > 0; depth -= 1) {
          const node = state.selection.$from.node(depth);
          if (node.type.name === "paragraph" || node.type.name === "heading") {
            changed = updateNodeIndent(tr, node, state.selection.$from.before(depth), delta);
            break;
          }
        }
      }

      if (changed && dispatch) {
        dispatch(tr.scrollIntoView());
      }

      return changed;
    });
  }

  const currentTextColor =
    (editor?.getAttributes("thinkleafTextColor").color as string | undefined) ?? defaultCanvasStyle.textColor;
  const currentHighlight =
    (editor?.getAttributes("thinkleafTextHighlight").backgroundColor as string | undefined) ?? "transparent";
  const currentFontSize = getCurrentDocumentFontSize(editor);

  function buttonClass(isActive = false, isUnavailable = false) {
    return [
      "inline-flex h-8 w-8 items-center justify-center rounded-md border text-sm font-semibold transition",
      isUnavailable
        ? "cursor-not-allowed border-slate-100 bg-slate-50 text-slate-300"
        : isActive
        ? activeControlClass
        : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
    ].join(" ");
  }

  const isEditorUnavailable = !editor;
  const isInTable = Boolean(editor?.isActive("table"));
  const canAddColumn = Boolean(editor?.can().addColumnAfter());
  const canAddRow = Boolean(editor?.can().addRowAfter());
  const canDeleteTable = isInTable;

  return (
    <div
      ref={ref}
      className="pointer-events-auto border-b border-slate-200 bg-white/95 px-4 py-3 shadow-soft backdrop-blur"
      data-pan-block="true"
      data-wheel-block="true"
      onClick={(event) => event.stopPropagation()}
      onMouseDown={(event) => event.stopPropagation()}
      onPointerDown={(event) => event.stopPropagation()}
    >
      <div className="flex min-h-8 flex-wrap items-center gap-2">
        {formattingTarget === "whiteboardText" && whiteboardTextObject ? (
          <WhiteboardTextFormattingControls
            buttonClass={buttonClass}
            object={whiteboardTextObject}
            onUpdate={onWhiteboardTextUpdate}
          />
        ) : formattingTarget === "document" ? (
          <>
            <HeadingDropdown editor={editor} />
            <span className="h-6 w-px bg-slate-200" />
            <button
              aria-label="Bold"
              className={buttonClass(editor?.isActive("bold"), isEditorUnavailable)}
              title="Bold"
              type="button"
              onClick={() => editor?.chain().focus().toggleBold().run()}
            >
              <BoldIcon aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label="Italic"
              className={buttonClass(editor?.isActive("italic"), isEditorUnavailable)}
              title="Italic"
              type="button"
              onClick={() => editor?.chain().focus().toggleItalic().run()}
            >
              <ItalicIcon aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label="Underline"
              className={buttonClass(editor?.isActive("thinkleafUnderline"), isEditorUnavailable)}
              title="Underline"
              type="button"
              onClick={() => editor?.chain().focus().toggleMark("thinkleafUnderline").run()}
            >
              <Underline aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label="Link"
              className={buttonClass(editor?.isActive("link"), isEditorUnavailable)}
              title="Link"
              type="button"
              onClick={setLink}
            >
              <Link2 aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label="Insert image"
              className={buttonClass(false, isEditorUnavailable)}
              title="Insert image"
              type="button"
              onClick={() => {
                if (editor) {
                  onImageUploadClick();
                }
              }}
            >
              <ImageIcon aria-hidden="true" className="h-4 w-4" />
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
              className={buttonClass(editor?.isActive({ textAlign: "left" }), isEditorUnavailable)}
              title="Align left"
              type="button"
              onClick={() => setTextAlign("left")}
            >
              <AlignLeft aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label="Align center"
              className={buttonClass(editor?.isActive({ textAlign: "center" }), isEditorUnavailable)}
              title="Align center"
              type="button"
              onClick={() => setTextAlign("center")}
            >
              <AlignCenter aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label="Align right"
              className={buttonClass(editor?.isActive({ textAlign: "right" }), isEditorUnavailable)}
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
            <button
              aria-label="Outdent"
              className={buttonClass(false, isEditorUnavailable)}
              title="Outdent"
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => updateIndent(-1)}
            >
              <IndentDecrease aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label="Indent"
              className={buttonClass(false, isEditorUnavailable)}
              title="Indent"
              type="button"
              onMouseDown={(event) => event.preventDefault()}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => updateIndent(1)}
            >
              <IndentIncrease aria-hidden="true" className="h-4 w-4" />
            </button>
            <span className="h-6 w-px bg-slate-200" />
            <button
              aria-label="Bullet list"
              className={buttonClass(editor?.isActive("bulletList"), isEditorUnavailable)}
              title="Bullet list"
              type="button"
              onClick={() => editor?.chain().focus().toggleBulletList().run()}
            >
              <List aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label="Numbered list"
              className={buttonClass(editor?.isActive("orderedList"), isEditorUnavailable)}
              title="Numbered list"
              type="button"
              onClick={() => editor?.chain().focus().toggleOrderedList().run()}
            >
              <ListOrdered aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label="Checklist"
              className={buttonClass(editor?.isActive("taskList"), isEditorUnavailable)}
              title="Checklist"
              type="button"
              onClick={() => editor?.chain().focus().toggleTaskList().run()}
            >
              <ListChecks aria-hidden="true" className="h-4 w-4" />
            </button>
            <button
              aria-label="Callout"
              className={buttonClass(editor?.isActive("blockquote"), isEditorUnavailable)}
              title="Callout"
              type="button"
              onClick={() => editor?.chain().focus().toggleBlockquote().run()}
            >
              <Quote aria-hidden="true" className="h-4 w-4" />
            </button>
            <span className="h-6 w-px bg-slate-200" />
            <button
              aria-label="Insert table"
              className={buttonClass(editor?.isActive("table"), isEditorUnavailable)}
              title="Insert table"
              type="button"
              onClick={() => editor?.chain().focus().insertTable({ rows: 3, cols: 3, withHeaderRow: true }).run()}
            >
              <Table2 aria-hidden="true" className="h-4 w-4" />
            </button>
          </>
        ) : (
          <span className="text-xs font-medium text-slate-400">Select the document or a text object to format.</span>
        )}
      </div>
      {extraContent ? (
        <div className="mt-2 flex min-h-8 flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
          {extraContent}
        </div>
      ) : formattingTarget === "document" && isInTable ? (
        <div className="mt-2 flex min-h-8 flex-wrap items-center gap-2 border-t border-slate-100 pt-2">
          <span className="text-[10px] font-bold uppercase tracking-wide text-slate-400">Table</span>
          <button
            aria-label="Add column"
            className={buttonClass(false, !canAddColumn)}
            title="Add column"
            type="button"
            onClick={() => {
              if (canAddColumn) {
                editor?.chain().focus().addColumnAfter().run();
              }
            }}
          >
            <Columns3 aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Add row"
            className={buttonClass(false, !canAddRow)}
            title="Add row"
            type="button"
            onClick={() => {
              if (canAddRow) {
                editor?.chain().focus().addRowAfter().run();
              }
            }}
          >
            <Rows3 aria-hidden="true" className="h-4 w-4" />
          </button>
          <button
            aria-label="Delete table"
            className={buttonClass(false, !canDeleteTable)}
            title="Delete table"
            type="button"
            onClick={() => {
              if (canDeleteTable) {
                editor?.chain().focus().deleteTable().run();
              }
            }}
          >
            <Trash2 aria-hidden="true" className="h-4 w-4" />
          </button>
        </div>
      ) : null}
    </div>
  );
});

function WhiteboardTextFormattingControls({
  buttonClass,
  object,
  onUpdate,
}: {
  buttonClass: (isActive?: boolean, isUnavailable?: boolean) => string;
  object: CanvasObject;
  onUpdate?: (updates: Partial<CanvasObject>) => void;
}) {
  const updateWhiteboardText = (updates: Partial<CanvasObject>) => onUpdate?.(updates);
  const textAlign = object.textAlign ?? defaultCanvasStyle.textAlign;
  const textVerticalAlign = object.textVerticalAlign ?? defaultCanvasStyle.textVerticalAlign;

  function setTextAlign(nextTextAlign: CanvasTextAlign) {
    updateWhiteboardText({ textAlign: nextTextAlign });
  }

  function setTextVerticalAlign(nextTextVerticalAlign: CanvasTextVerticalAlign) {
    updateWhiteboardText({ textVerticalAlign: nextTextVerticalAlign });
  }

  return (
    <>
      <span className="mr-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">Whiteboard text</span>
      <button
        aria-label="Bold whiteboard text"
        className={buttonClass(Boolean(object.textBold))}
        title="Bold"
        type="button"
        onClick={() => updateWhiteboardText({ textBold: !object.textBold })}
      >
        <BoldIcon aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Italic whiteboard text"
        className={buttonClass(Boolean(object.textItalic))}
        title="Italic"
        type="button"
        onClick={() => updateWhiteboardText({ textItalic: !object.textItalic })}
      >
        <ItalicIcon aria-hidden="true" className="h-4 w-4" />
      </button>
      <span className="h-6 w-px bg-slate-200" />
      <ColorPicker
        currentValue={object.textColor}
        icon={<Type aria-hidden="true" className="h-4 w-4" />}
        label="Text color"
        onSelect={(textColor) => updateWhiteboardText({ textColor })}
        presets={colorPresets}
      />
      <ColorPicker
        currentValue={object.textHighlightColor ?? "transparent"}
        icon={<Highlighter aria-hidden="true" className="h-4 w-4" />}
        label="Highlight"
        onSelect={(textHighlightColor) => updateWhiteboardText({ textHighlightColor })}
        presets={highlightPresets}
      />
      <SizeDropdown
        currentSize={object.fontSize ?? defaultCanvasStyle.fontSize}
        disabled={false}
        onSelect={(fontSize) => updateWhiteboardText({ fontSize })}
      />
      <span className="h-6 w-px bg-slate-200" />
      <button
        aria-label="Align whiteboard text left"
        className={buttonClass(textAlign === "left")}
        title="Align left"
        type="button"
        onClick={() => setTextAlign("left")}
      >
        <AlignLeft aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align whiteboard text center"
        className={buttonClass(textAlign === "center")}
        title="Align center"
        type="button"
        onClick={() => setTextAlign("center")}
      >
        <AlignCenter aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align whiteboard text right"
        className={buttonClass(textAlign === "right")}
        title="Align right"
        type="button"
        onClick={() => setTextAlign("right")}
      >
        <AlignRight aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align whiteboard text top"
        className={buttonClass(textVerticalAlign === "top")}
        title="Align top"
        type="button"
        onClick={() => setTextVerticalAlign("top")}
      >
        <AlignVerticalJustifyStart aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align whiteboard text middle"
        className={buttonClass(textVerticalAlign === "middle")}
        title="Align middle"
        type="button"
        onClick={() => setTextVerticalAlign("middle")}
      >
        <AlignVerticalJustifyCenter aria-hidden="true" className="h-4 w-4" />
      </button>
      <button
        aria-label="Align whiteboard text bottom"
        className={buttonClass(textVerticalAlign === "bottom")}
        title="Align bottom"
        type="button"
        onClick={() => setTextVerticalAlign("bottom")}
      >
        <AlignVerticalJustifyEnd aria-hidden="true" className="h-4 w-4" />
      </button>
    </>
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

function updateNodeIndent(tr: Transaction, node: ProseMirrorNode, pos: number, delta: number) {
  const currentLevel = typeof node.attrs.indentLevel === "number" ? node.attrs.indentLevel : 0;
  const nextLevel = Math.min(maxIndentLevel, Math.max(0, currentLevel + delta));
  if (nextLevel === currentLevel) {
    return false;
  }

  tr.setNodeMarkup(pos, undefined, { ...node.attrs, indentLevel: nextLevel }, node.marks);
  return true;
}

function clearListTextIndents(editor: Editor) {
  editor.commands.command(({ state, tr, dispatch }) => {
    const changed = clearListTextIndentMarks(tr, state.doc);

    if (changed && dispatch) {
      dispatch(tr);
    }

    return changed;
  });
}

function clearListTextIndentMarks(tr: Transaction, doc: ProseMirrorNode) {
  let changed = false;

  doc.descendants((node, pos, parent) => {
    if (node.type.name !== "paragraph" && node.type.name !== "heading") {
      return;
    }

    if (parent?.type.name !== "listItem" && parent?.type.name !== "taskItem") {
      return;
    }

    const currentLevel = typeof node.attrs.indentLevel === "number" ? node.attrs.indentLevel : 0;
    if (currentLevel === 0) {
      return;
    }

    tr.setNodeMarkup(pos, undefined, { ...node.attrs, indentLevel: 0 }, node.marks);
    changed = true;
  });

  return changed;
}

function runListItemCommand(
  editor: Editor,
  commandName: "sinkListItem" | "liftListItem",
  listItemName: "listItem" | "taskItem",
) {
  if (!editor.state.schema.nodes[listItemName]) {
    return false;
  }

  return commandName === "sinkListItem"
    ? editor.commands.sinkListItem(listItemName)
    : editor.commands.liftListItem(listItemName);
}

function getActiveListItemName(editor: Editor) {
  const { $from, $to } = editor.state.selection;

  for (const position of [$from, $to]) {
    for (let depth = position.depth; depth > 0; depth -= 1) {
      const nodeName = position.node(depth).type.name;
      if (nodeName === "listItem" || nodeName === "taskItem") {
        return nodeName as "listItem" | "taskItem";
      }
    }
  }

  return null;
}

function HeadingDropdown({ editor }: { editor: Editor | null }) {
  const currentHeading = getCurrentHeadingLevel(editor);
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
            !currentHeading ? activeMenuItemClass : "text-slate-600 hover:bg-slate-50",
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
              currentHeading === level ? activeMenuItemClass : "text-slate-600 hover:bg-slate-50",
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
  const dropdownRef = useRef<HTMLDivElement>(null);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (event.target instanceof globalThis.Node && !dropdownRef.current?.contains(event.target)) {
        setIsOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);

    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, []);

  function selectSize(fontSize: number) {
    onSelect(fontSize);
    setIsOpen(false);
  }

  return (
    <div ref={dropdownRef} className="relative">
      <button
        aria-expanded={isOpen}
        aria-label="Text size"
        className={[
          "inline-flex h-8 min-w-14 cursor-pointer list-none items-center justify-center gap-1 rounded-md border px-2 text-xs font-semibold transition",
          disabled
            ? "pointer-events-none cursor-not-allowed opacity-40"
            : "border-slate-200 bg-white text-slate-600 hover:border-slate-300 hover:bg-slate-50",
        ].join(" ")}
        title="Text size"
        type="button"
        onClick={() => {
          if (!disabled) {
            setIsOpen((current) => !current);
          }
        }}
      >
        {currentSize}
        <ChevronDown aria-hidden="true" className="h-3.5 w-3.5" />
      </button>
      {isOpen ? (
        <div className="absolute left-0 top-9 z-30 grid min-w-20 gap-1 rounded-md border border-slate-200 bg-white p-1 shadow-soft">
          {textSizePresets.map((fontSize) => (
            <button
              key={`document-size-${fontSize}`}
              aria-label={`Text size ${fontSize}`}
              className={[
                "h-8 rounded px-2 text-left text-xs font-semibold transition",
                currentSize === fontSize ? activeMenuItemClass : "text-slate-600 hover:bg-slate-50",
              ].join(" ")}
              type="button"
              onClick={() => selectSize(fontSize)}
            >
              {fontSize}
            </button>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function parseFontSize(fontSize?: string) {
  if (!fontSize) {
    return defaultCanvasStyle.fontSize;
  }

  const parsed = Number.parseInt(fontSize, 10);
  return Number.isFinite(parsed) ? parsed : defaultCanvasStyle.fontSize;
}

function getCurrentHeadingLevel(editor: Editor | null) {
  const level = editor?.getAttributes("heading").level;

  return level === 1 || level === 2 || level === 3 ? level : null;
}

function getCurrentDocumentFontSize(editor: Editor | null) {
  const explicitFontSize = parseFontSize(editor?.getAttributes("thinkleafFontSize").fontSize as string | undefined);

  if (editor?.getAttributes("thinkleafFontSize").fontSize) {
    return explicitFontSize;
  }

  const currentHeading = getCurrentHeadingLevel(editor);
  if (currentHeading === 1) {
    return 32;
  }

  if (currentHeading === 2) {
    return 24;
  }

  if (currentHeading === 3) {
    return 20;
  }

  return explicitFontSize;
}

async function insertImagesIntoDocumentEditor(editor: Editor | null, files: File[]) {
  if (!editor || !files.length) {
    return;
  }

  try {
    for (const file of files) {
      const image = await processImageFile(file);
      editor
        .chain()
        .focus()
        .insertContent({
          type: "thinkleafImage",
          attrs: {
            alt: file.name,
            src: image.dataUrl,
            title: file.name,
          },
        })
        .run();
    }
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "Could not import that image.");
  }
}

async function insertImagesIntoDocumentView(view: EditorView, files: File[]) {
  try {
    for (const file of files) {
      const image = await processImageFile(file);
      const imageNode = view.state.schema.nodes.thinkleafImage?.create({
        alt: file.name,
        src: image.dataUrl,
        title: file.name,
      });

      if (!imageNode) {
        throw new Error("Could not insert that image.");
      }

      view.dispatch(view.state.tr.replaceSelectionWith(imageNode).scrollIntoView());
    }
  } catch (error) {
    window.alert(error instanceof Error ? error.message : "Could not import that image.");
  }
}
