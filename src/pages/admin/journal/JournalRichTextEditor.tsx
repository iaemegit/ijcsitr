"use client";
import { useEffect } from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import TextAlign from "@tiptap/extension-text-align";
import {
  Undo2,
  Redo2,
  Bold,
  Italic,
  AlignLeft,
  AlignCenter,
  AlignRight,
  List,
  ListOrdered,
  IndentIncrease,
  IndentDecrease,
  RemoveFormatting,
} from "lucide-react";

export default function JournalRichTextEditor({
  id,
  label,
  value,
  onChange,
  disabled,
}) {
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        id,
        role: "textbox",
        "aria-label": label,
        "aria-multiline": "true",
        "aria-required": "true",
      },
    },
    onUpdate: ({ editor }) => onChange(editor.getHTML()),
  });
  useEffect(() => {
    editor?.setEditable(!disabled);
  }, [editor, disabled]);
  const actions: [string, React.ElementType, () => boolean, string?][] = [
    ["Undo", Undo2, () => editor!.chain().focus().undo().run()],
    ["Redo", Redo2, () => editor!.chain().focus().redo().run()],
    ["Bold", Bold, () => editor!.chain().focus().toggleBold().run(), "bold"],
    [
      "Italic",
      Italic,
      () => editor!.chain().focus().toggleItalic().run(),
      "italic",
    ],
    [
      "Align left",
      AlignLeft,
      () => editor!.chain().focus().setTextAlign("left").run(),
    ],
    [
      "Align center",
      AlignCenter,
      () => editor!.chain().focus().setTextAlign("center").run(),
    ],
    [
      "Align right",
      AlignRight,
      () => editor!.chain().focus().setTextAlign("right").run(),
    ],
    [
      "Bullet list",
      List,
      () => editor!.chain().focus().toggleBulletList().run(),
      "bulletList",
    ],
    [
      "Numbered list",
      ListOrdered,
      () => editor!.chain().focus().toggleOrderedList().run(),
      "orderedList",
    ],
    [
      "Decrease indent",
      IndentDecrease,
      () => editor!.chain().focus().liftListItem("listItem").run(),
    ],
    [
      "Increase indent",
      IndentIncrease,
      () => editor!.chain().focus().sinkListItem("listItem").run(),
    ],
    [
      "Clear formatting",
      RemoveFormatting,
      () => editor!.chain().focus().unsetAllMarks().clearNodes().run(),
    ],
  ];
  return (
    <div className="journal-editor">
      <div
        className="journal-editor-toolbar"
        role="toolbar"
        aria-label={`${label} formatting`}
      >
        {actions.map(([name, Icon, action, active]) => (
          <button
            key={name}
            type="button"
            title={name}
            aria-label={name}
            aria-pressed={active ? !!editor?.isActive(active) : undefined}
            disabled={!editor || disabled}
            onClick={action}
          >
            <Icon size={15} />
          </button>
        ))}
      </div>
      <EditorContent editor={editor} />
      <div className="journal-editor-footer">
        {editor?.getText().trim().split(/\s+/).filter(Boolean).length || 0}{" "}
        words
      </div>
    </div>
  );
}
