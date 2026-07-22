"use client"

import { useEffect, useRef, useState, useMemo } from "react"
import { EditorContent, EditorContext, useEditor } from "@tiptap/react"
import Placeholder from "@tiptap/extension-placeholder"

// --- Tiptap Core Extensions ---
import { StarterKit } from "@tiptap/starter-kit"
import { Image } from "@tiptap/extension-image"
import { TaskItem, TaskList } from "@tiptap/extension-list"
import { TextAlign } from "@tiptap/extension-text-align"
import { Typography } from "@tiptap/extension-typography"
import { Highlight } from "@tiptap/extension-highlight"
import { Subscript } from "@tiptap/extension-subscript"
import { Superscript } from "@tiptap/extension-superscript"
import { Selection } from "@tiptap/extensions"
import DragHandle from "@tiptap/extension-drag-handle"
import { Markdown } from "tiptap-markdown"

// --- Custom Components (ported from features/tiptap) ---
import { FloatingPortal } from "@floating-ui/react"
import { useFloating, autoUpdate, offset, flip, shift } from "@floating-ui/react"
import { DOMSerializer } from "@tiptap/pm/model"

// --- UI Primitives ---
import { Button } from "quill/components/tiptap-ui-primitive/button"
import {
  Toolbar,
  ToolbarGroup,
  ToolbarSeparator,
} from "quill/components/tiptap-ui-primitive/toolbar"

// --- Tiptap Node ---
import { ImageUploadNode } from "quill/components/tiptap-node/image-upload-node-extension"
import { HorizontalRule } from "quill/components/tiptap-node/horizontal-rule-node-extension"

import "quill/components/tiptap-node/blockquote-node.scss"
import "quill/components/tiptap-node/code-block-node.scss"
import "quill/components/tiptap-node/horizontal-rule-node.scss"
import "quill/components/tiptap-node/list-node.scss"
import "quill/components/tiptap-node/image-node.scss"
import "quill/components/tiptap-node/heading-node.scss"
import "quill/components/tiptap-node/paragraph-node.scss"

// --- Tiptap UI ---
import { HeadingDropdownMenu } from "quill/components/tiptap-ui/heading-dropdown-menu"
import { ImageUploadButton } from "quill/components/tiptap-ui/image-upload-button"
import { ListButton } from "quill/components/tiptap-ui/list-button"
import { ImagePlusIcon } from "quill/components/tiptap-icons/image-plus-icon"
import { BlockquoteButton } from "quill/components/tiptap-ui/blockquote-button"
import { CodeBlockButton } from "quill/components/tiptap-ui/code-block-button"

import {
  ColorHighlightPopover,
  ColorHighlightPopoverContent,
  ColorHighlightPopoverButton,
} from "quill/components/tiptap-ui/color-highlight-popover"
import {
  LinkPopover,
  LinkContent,
  LinkButton,
} from "quill/components/tiptap-ui/link-popover"
import { MarkButton } from "quill/components/tiptap-ui/mark-button"
import { TextAlignButton } from "quill/components/tiptap-ui/text-align-button"
import { UndoRedoButton } from "quill/components/tiptap-ui/undo-redo-button"

// --- Icons ---
import { ArrowLeftIcon } from "quill/components/tiptap-icons/arrow-left-icon"
import { HighlighterIcon } from "quill/components/tiptap-icons/highlighter-icon"
import { LinkIcon } from "quill/components/tiptap-icons/link-icon"
import { UnderlineIcon } from "quill/components/tiptap-icons/underline-icon"
import { StrikeIcon } from "quill/components/tiptap-icons/strike-icon"
import { Code2Icon } from "quill/components/tiptap-icons/code2-icon"
import { BlockquoteIcon } from "quill/components/tiptap-icons/blockquote-icon"
import { CodeBlockIcon } from "quill/components/tiptap-icons/code-block-icon"
import { SuperscriptIcon } from "quill/components/tiptap-icons/superscript-icon"
import { SubscriptIcon } from "quill/components/tiptap-icons/subscript-icon"
import { AlignLeftIcon } from "quill/components/tiptap-icons/align-left-icon"
import { AlignCenterIcon } from "quill/components/tiptap-icons/align-center-icon"
import { AlignRightIcon } from "quill/components/tiptap-icons/align-right-icon"
import { AlignJustifyIcon } from "quill/components/tiptap-icons/align-justify-icon"
import {
  MoreHorizontal,
  Type, Heading1, Heading2, Heading3, Heading4, Heading5, Heading6,
  List, ListOrdered, CheckSquare, Quote, SquareCode, Table,
  AlignLeft, AlignCenter, AlignRight, AlignJustify,
  Highlighter, ChevronRight, Ban, Copy, Scissors, Trash2,
} from "lucide-react"

// --- Dropdown Menu Primitives ---
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuPortal,
} from "quill/components/tiptap-ui-primitive/dropdown-menu"
import { useTiptapEditor } from "quill/hooks/use-tiptap-editor"

// --- Hooks ---
import { useIsBreakpoint } from "quill/hooks/use-is-breakpoint"
import { useWindowSize } from "quill/hooks/use-window-size"
import { useCursorVisibility } from "quill/hooks/use-cursor-visibility"

// --- Components ---
// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "quill/lib/tiptap-utils"

// --- Styles ---
import "quill/components/tiptap-templates/simple/simple-editor.scss"

// --- Block Context Menu (uses official Tiptap DropdownMenu primitives + floating-ui) ---
// Triggered by clicking .drag-handle; reads editor._draggedNode set by DragHandle.onNodeChange
const BlockContextMenu = ({ editor }: { editor: ReturnType<typeof useEditor> | null }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [showColorMenu, setShowColorMenu] = useState(false)
  const [showAlignMenu, setShowAlignMenu] = useState(false)

  const { refs, floatingStyles } = useFloating({
    placement: "bottom-start",
    open: isOpen,
    onOpenChange: setIsOpen,
    strategy: "fixed",
    whileElementsMounted: autoUpdate,
    middleware: [offset(8), flip({ fallbackPlacements: ["top-start", "bottom-end"] }), shift({ padding: 8 })],
  })

  useEffect(() => {
    if (!editor) return
    const handleClick = (e: MouseEvent) => {
      const handle = (e.target as HTMLElement).closest(".drag-handle")
      if (handle) {
        e.preventDefault(); e.stopPropagation()
        refs.setReference(handle)
        setIsOpen(true); setShowColorMenu(false); setShowAlignMenu(false)
      }
    }
    const handleClickOutside = (e: MouseEvent) => {
      const floatingEl = refs.floating.current
      if (floatingEl && !floatingEl.contains(e.target as Node) && !(e.target as HTMLElement).closest(".drag-handle")) {
        setIsOpen(false)
      }
    }
    document.addEventListener("click", handleClick, true)
    document.addEventListener("click", handleClickOutside)
    return () => {
      document.removeEventListener("click", handleClick, true)
      document.removeEventListener("click", handleClickOutside)
    }
  }, [editor, refs])

  const getRange = () => {
    const pos = (editor as any)?._draggedNodePos
    const node = (editor as any)?._draggedNode
    if (typeof pos === "number" && node) return { pos, from: pos + 1, to: pos + node.nodeSize - 1, node }
    return null
  }

  const isActive = (type: string, attrs?: any) => {
    if (!editor) return false
    const range = getRange()
    if (!range) return false
    const { node } = range
    if (node.type.name === type) {
      if (attrs) return Object.entries(attrs).every(([k, v]) => node.attrs[k] === v)
      return true
    }
    if (node.type.name === "listItem" || node.type.name === "taskItem") {
      const $pos = editor.state.doc.resolve(range.pos)
      for (let d = $pos.depth; d > 0; d--) {
        const p = $pos.node(d)
        if (p?.type.name === type) return true
      }
    }
    return false
  }

  const runOnNode = (cmd: (chain: any) => any) => {
    if (!editor) return
    const range = getRange()
    if (range) cmd(editor.chain().focus().setNodeSelection(range.pos)).run()
    else cmd(editor.chain().focus()).run()
    setIsOpen(false)
  }

  const runOnText = (cmd: (chain: any) => any) => {
    if (!editor) return
    const range = getRange()
    if (range) cmd(editor.chain().focus().setTextSelection({ from: range.from, to: range.to })).run()
    else cmd(editor.chain().focus()).run()
  }

  const getAlign = () => getRange()?.node.attrs.textAlign || "left"

  const getHighlight = () => {
    let color: string | null = null
    getRange()?.node.descendants((child: any) => {
      const mark = child.marks.find((m: any) => m.type.name === "highlight")
      if (mark?.attrs.color) { color = mark.attrs.color; return false }
    })
    return color
  }

  const handleCopy = async () => {
    if (!editor) return
    const range = getRange(); if (!range) return
    const ser = DOMSerializer.fromSchema(editor.schema)
    const div = document.createElement("div")
    div.appendChild(ser.serializeNode(range.node))
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([div.innerHTML], { type: "text/html" }),
      "text/plain": new Blob([range.node.textContent || ""], { type: "text/plain" }),
    })]).catch(console.error)
    setIsOpen(false)
  }

  const handleCut = async () => {
    if (!editor) return
    const range = getRange(); if (!range) return
    const ser = DOMSerializer.fromSchema(editor.schema)
    const div = document.createElement("div")
    div.appendChild(ser.serializeNode(range.node))
    await navigator.clipboard.write([new ClipboardItem({
      "text/html": new Blob([div.innerHTML], { type: "text/html" }),
      "text/plain": new Blob([range.node.textContent || ""], { type: "text/plain" }),
    })]).catch(console.error)
    editor.chain().focus().setNodeSelection(range.pos).deleteSelection().run()
    setIsOpen(false)
  }

  if (!isOpen || !editor) return null

  const hlColors = [
    { color: "var(--tt-color-highlight-yellow)", label: "黄色" },
    { color: "var(--tt-color-highlight-green)", label: "绿色" },
    { color: "var(--tt-color-highlight-blue)", label: "蓝色" },
    { color: "var(--tt-color-highlight-purple)", label: "紫色" },
    { color: "var(--tt-color-highlight-red)", label: "红色" },
    { color: "var(--tt-color-highlight-orange)", label: "橙色" },
  ]

  return (
    <FloatingPortal>
      <div
        ref={refs.setFloating}
        className="tiptap-dropdown-menu-content"
        style={{ ...floatingStyles, zIndex: 5000, width: 240, padding: 6, display: "flex", flexDirection: "column", gap: 2 }}
      >
        {/* 块类型切换行 */}
        <div style={{ display: "flex", gap: 2, padding: "4px 6px", borderBottom: "1px solid var(--tt-border-color)" }}>
          {[
            { icon: <Type size={15} />, title: "正文", cmd: (c: any) => c.setParagraph(), type: "paragraph" },
            { icon: <Heading1 size={15} />, title: "H1", cmd: (c: any) => c.toggleHeading({ level: 1 }), type: "heading", attrs: { level: 1 } },
            { icon: <Heading2 size={15} />, title: "H2", cmd: (c: any) => c.toggleHeading({ level: 2 }), type: "heading", attrs: { level: 2 } },
            { icon: <Heading3 size={15} />, title: "H3", cmd: (c: any) => c.toggleHeading({ level: 3 }), type: "heading", attrs: { level: 3 } },
            { icon: <Heading4 size={15} />, title: "H4", cmd: (c: any) => c.toggleHeading({ level: 4 }), type: "heading", attrs: { level: 4 } },
            { icon: <Heading5 size={15} />, title: "H5", cmd: (c: any) => c.toggleHeading({ level: 5 }), type: "heading", attrs: { level: 5 } },
            { icon: <Heading6 size={15} />, title: "H6", cmd: (c: any) => c.toggleHeading({ level: 6 }), type: "heading", attrs: { level: 6 } },
          ].map(({ icon, title, cmd, type, attrs }) => (
            <Button key={title} type="button" variant="ghost" title={title}
              data-active-state={isActive(type, attrs) ? "on" : "off"}
              onClick={() => runOnNode(cmd)}
              style={{ padding: 6, width: 28, height: 28 }}
            >{icon}</Button>
          ))}
        </div>

        {/* 块结构行 */}
        <div style={{ display: "flex", gap: 2, padding: "4px 6px", borderBottom: "1px solid var(--tt-border-color)" }}>
          {[
            { icon: <ListOrdered size={15} />, title: "有序列表", cmd: (c: any) => c.toggleOrderedList(), type: "orderedList" },
            { icon: <List size={15} />, title: "无序列表", cmd: (c: any) => c.toggleBulletList(), type: "bulletList" },
            { icon: <CheckSquare size={15} />, title: "待办列表", cmd: (c: any) => c.toggleTaskList(), type: "taskList" },
            { icon: <Quote size={15} />, title: "引用", cmd: (c: any) => c.toggleBlockquote(), type: "blockquote" },
            { icon: <SquareCode size={15} />, title: "代码块", cmd: (c: any) => c.toggleCodeBlock(), type: "codeBlock" },
            { icon: <Table size={15} />, title: "插入表格", cmd: (c: any) => c.insertTable({ rows: 3, cols: 3, withHeaderRow: true }), type: "table" },
          ].map(({ icon, title, cmd, type }) => (
            <Button key={title} type="button" variant="ghost" title={title}
              data-active-state={isActive(type) ? "on" : "off"}
              onClick={() => runOnNode(cmd)}
              style={{ padding: 6, width: 28, height: 28 }}
            >{icon}</Button>
          ))}
        </div>

        {/* 背景高亮子菜单 */}
        <Button type="button" variant="ghost"
          onClick={() => { setShowColorMenu(!showColorMenu); setShowAlignMenu(false) }}
          style={{ justifyContent: "space-between", padding: "6px 12px", width: "100%", fontSize: 13 }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><Highlighter size={14} />背景高亮</span>
          <ChevronRight size={12} style={{ transform: showColorMenu ? "rotate(90deg)" : "none", transition: "transform .15s", opacity: .5 }} />
        </Button>
        {showColorMenu && (
          <div style={{ padding: "8px 12px", display: "flex", gap: 6, flexWrap: "wrap", borderTop: "1px solid var(--tt-border-color)" }}>
            {hlColors.map(({ color, label }) => (
              <div key={label} title={label} onClick={() => runOnText((c: any) => c.setTextSelection({ from: getRange()!.from, to: getRange()!.to }).toggleHighlight({ color }))}
                style={{ width: 22, height: 22, borderRadius: 4, background: color, cursor: "pointer", border: getHighlight() === color ? "2px solid var(--tt-brand-color-500)" : "1px solid var(--tt-border-color)", boxSizing: "border-box" }}
              />
            ))}
            <div title="清除高亮" onClick={() => runOnText((c: any) => c.unsetHighlight())}
              style={{ width: 22, height: 22, borderRadius: 4, border: "1px solid var(--tt-border-color)", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <Ban size={12} style={{ opacity: .5 }} />
            </div>
          </div>
        )}

        {/* 对齐子菜单 */}
        <Button type="button" variant="ghost"
          onClick={() => { setShowAlignMenu(!showAlignMenu); setShowColorMenu(false) }}
          style={{ justifyContent: "space-between", padding: "6px 12px", width: "100%", fontSize: 13 }}
        >
          <span style={{ display: "flex", alignItems: "center", gap: 8 }}><AlignLeft size={14} />文本对齐</span>
          <ChevronRight size={12} style={{ transform: showAlignMenu ? "rotate(90deg)" : "none", transition: "transform .15s", opacity: .5 }} />
        </Button>
        {showAlignMenu && (
          <div style={{ padding: "6px 12px", display: "flex", gap: 4, borderTop: "1px solid var(--tt-border-color)" }}>
            {[
              { icon: <AlignLeft size={14} />, align: "left", title: "左对齐" },
              { icon: <AlignCenter size={14} />, align: "center", title: "居中" },
              { icon: <AlignRight size={14} />, align: "right", title: "右对齐" },
              { icon: <AlignJustify size={14} />, align: "justify", title: "两端对齐" },
            ].map(({ icon, align, title }) => (
              <Button key={align} type="button" variant="ghost" title={title}
                data-active-state={getAlign() === align ? "on" : "off"}
                onClick={() => runOnText((c: any) => c.setTextAlign(align))}
                style={{ padding: 6, width: 28, height: 28 }}
              >{icon}</Button>
            ))}
          </div>
        )}

        {/* 复制 / 剪切 / 删除 */}
        <div style={{ height: 1, background: "var(--tt-border-color)", margin: "2px 0" }} />
        <Button type="button" variant="ghost" onClick={handleCopy}
          style={{ justifyContent: "flex-start", padding: "6px 12px", width: "100%", gap: 8, fontSize: 13 }}>
          <Copy size={14} />复制
        </Button>
        <Button type="button" variant="ghost" onClick={handleCut}
          style={{ justifyContent: "flex-start", padding: "6px 12px", width: "100%", gap: 8, fontSize: 13 }}>
          <Scissors size={14} />剪切
        </Button>
        <Button type="button" variant="ghost"
          onClick={() => {
            const range = getRange()
            if (range) editor.chain().focus().setNodeSelection(range.pos).deleteSelection().run()
            setIsOpen(false)
          }}
          style={{ justifyContent: "flex-start", padding: "6px 12px", width: "100%", gap: 8, fontSize: 13, color: "var(--tt-color-text-red)" }}>
          <Trash2 size={14} />删除
        </Button>
      </div>
    </FloatingPortal>
  )
}

const MoreDropdownMenu = () => {
  const { editor } = useTiptapEditor()
  if (!editor) return null

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button
          type="button"
          variant="ghost"
          aria-label="更多格式"
          tooltip="更多格式"
          style={{ padding: "8px" }}
        >
          <MoreHorizontal className="tiptap-button-icon" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuPortal>
        <DropdownMenuContent align="end" className="tiptap-dropdown-menu-content" style={{ minWidth: "220px", display: "flex", flexDirection: "column", gap: "2px" }}>
          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Button
                type="button"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                data-active-state={editor.isActive("underline") ? "on" : "off"}
                style={{ justifyContent: "flex-start", width: "100%", padding: "6px 8px" }}
              >
                <UnderlineIcon className="tiptap-button-icon" />
                <span style={{ marginLeft: "8px", flex: 1, textAlign: "left", fontSize: "14px" }}>下划线</span>
                <kbd style={{ fontSize: "10px", opacity: 0.5, padding: "2px 4px", border: "1px solid rgba(128, 128, 128, 0.2)", borderRadius: "4px" }}>Ctrl+U</kbd>
              </Button>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Button
                type="button"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleStrike().run()}
                data-active-state={editor.isActive("strike") ? "on" : "off"}
                style={{ justifyContent: "flex-start", width: "100%", padding: "6px 8px" }}
              >
                <StrikeIcon className="tiptap-button-icon" />
                <span style={{ marginLeft: "8px", flex: 1, textAlign: "left", fontSize: "14px" }}>删除线</span>
                <kbd style={{ fontSize: "10px", opacity: 0.5, padding: "2px 4px", border: "1px solid rgba(128, 128, 128, 0.2)", borderRadius: "4px" }}>Ctrl+Shift+X</kbd>
              </Button>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Button
                type="button"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleCode().run()}
                data-active-state={editor.isActive("code") ? "on" : "off"}
                style={{ justifyContent: "flex-start", width: "100%", padding: "6px 8px" }}
              >
                <Code2Icon className="tiptap-button-icon" />
                <span style={{ marginLeft: "8px", flex: 1, textAlign: "left", fontSize: "14px" }}>行内代码</span>
                <kbd style={{ fontSize: "10px", opacity: 0.5, padding: "2px 4px", border: "1px solid rgba(128, 128, 128, 0.2)", borderRadius: "4px" }}>Ctrl+E</kbd>
              </Button>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Button
                type="button"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleBlockquote().run()}
                data-active-state={editor.isActive("blockquote") ? "on" : "off"}
                style={{ justifyContent: "flex-start", width: "100%", padding: "6px 8px" }}
              >
                <BlockquoteIcon className="tiptap-button-icon" />
                <span style={{ marginLeft: "8px", flex: 1, textAlign: "left", fontSize: "14px" }}>引用</span>
                <kbd style={{ fontSize: "10px", opacity: 0.5, padding: "2px 4px", border: "1px solid rgba(128, 128, 128, 0.2)", borderRadius: "4px" }}>Ctrl+Shift+B</kbd>
              </Button>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Button
                type="button"
                variant="ghost"
                onClick={() => editor.chain().focus().toggleCodeBlock().run()}
                data-active-state={editor.isActive("codeBlock") ? "on" : "off"}
                style={{ justifyContent: "flex-start", width: "100%", padding: "6px 8px" }}
              >
                <CodeBlockIcon className="tiptap-button-icon" />
                <span style={{ marginLeft: "8px", flex: 1, textAlign: "left", fontSize: "14px" }}>代码块</span>
                <kbd style={{ fontSize: "10px", opacity: 0.5, padding: "2px 4px", border: "1px solid rgba(128, 128, 128, 0.2)", borderRadius: "4px" }}>Ctrl+Alt+C</kbd>
              </Button>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <ImageUploadButton
                showShortcut={false}
                style={{ justifyContent: "flex-start", width: "100%", padding: "6px 8px" }}
              >
                <ImagePlusIcon className="tiptap-button-icon" />
                <span style={{ marginLeft: "8px", flex: 1, textAlign: "left", fontSize: "14px" }}>图片</span>
              </ImageUploadButton>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator style={{ margin: "4px 0", height: "1px", backgroundColor: "rgba(128, 128, 128, 0.15)" }} />

          <DropdownMenuGroup>
            <DropdownMenuItem asChild>
              <Button
                type="button"
                variant="ghost"
                onClick={() => (editor.chain().focus() as any).toggleSuperscript().run()}
                data-active-state={editor.isActive("superscript") ? "on" : "off"}
                style={{ justifyContent: "flex-start", width: "100%", padding: "6px 8px" }}
              >
                <SuperscriptIcon className="tiptap-button-icon" />
                <span style={{ marginLeft: "8px", flex: 1, textAlign: "left", fontSize: "14px" }}>上标</span>
              </Button>
            </DropdownMenuItem>

            <DropdownMenuItem asChild>
              <Button
                type="button"
                variant="ghost"
                onClick={() => (editor.chain().focus() as any).toggleSubscript().run()}
                data-active-state={editor.isActive("subscript") ? "on" : "off"}
                style={{ justifyContent: "flex-start", width: "100%", padding: "6px 8px" }}
              >
                <SubscriptIcon className="tiptap-button-icon" />
                <span style={{ marginLeft: "8px", flex: 1, textAlign: "left", fontSize: "14px" }}>下标</span>
              </Button>
            </DropdownMenuItem>
          </DropdownMenuGroup>

          <DropdownMenuSeparator style={{ margin: "4px 0", height: "1px", backgroundColor: "rgba(128, 128, 128, 0.15)" }} />

          <DropdownMenuGroup style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: "2px", padding: "4px" }}>
            <Button
              type="button"
              variant="ghost"
              onClick={() => (editor.chain().focus() as any).setTextAlign("left").run()}
              data-active-state={editor.isActive({ textAlign: "left" }) ? "on" : "off"}
              tooltip="左对齐"
              style={{ padding: "8px" }}
            >
              <AlignLeftIcon className="tiptap-button-icon" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => (editor.chain().focus() as any).setTextAlign("center").run()}
              data-active-state={editor.isActive({ textAlign: "center" }) ? "on" : "off"}
              tooltip="居中对齐"
              style={{ padding: "8px" }}
            >
              <AlignCenterIcon className="tiptap-button-icon" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => (editor.chain().focus() as any).setTextAlign("right").run()}
              data-active-state={editor.isActive({ textAlign: "right" }) ? "on" : "off"}
              tooltip="右对齐"
              style={{ padding: "8px" }}
            >
              <AlignRightIcon className="tiptap-button-icon" />
            </Button>

            <Button
              type="button"
              variant="ghost"
              onClick={() => (editor.chain().focus() as any).setTextAlign("justify").run()}
              data-active-state={editor.isActive({ textAlign: "justify" }) ? "on" : "off"}
              tooltip="两端对齐"
              style={{ padding: "8px" }}
            >
              <AlignJustifyIcon className="tiptap-button-icon" />
            </Button>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenuPortal>
    </DropdownMenu>
  )
}

const MainToolbarContent = ({
  onHighlighterClick,
  onLinkClick,
  isMobile,
  isCompact,
}: {
  onHighlighterClick: () => void
  onLinkClick: () => void
  isMobile: boolean
  isCompact: boolean
}) => {
  return (
    <>
      <ToolbarGroup>
        <UndoRedoButton action="undo" tooltip="撤销" />
        <UndoRedoButton action="redo" tooltip="重做" />
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <HeadingDropdownMenu modal={false} levels={[1, 2, 3, 4, 5, 6]} tooltip="标题选择" />
        <ListButton type="bulletList" tooltip="无序列表" />
        <ListButton type="orderedList" tooltip="有序列表" />
        <ListButton type="taskList" tooltip="待办清单" />
        {!isCompact && (
          <>
            <BlockquoteButton tooltip="块引用" />
            <CodeBlockButton tooltip="代码块" />
          </>
        )}
      </ToolbarGroup>

      <ToolbarSeparator />

      <ToolbarGroup>
        <MarkButton type="bold" tooltip="加粗" />
        <MarkButton type="italic" tooltip="斜体" />
        {!isCompact && (
          <>
            <MarkButton type="strike" tooltip="删除线" />
            <MarkButton type="code" tooltip="行内代码" />
            <MarkButton type="underline" tooltip="下划线" />
          </>
        )}
        {!isMobile ? (
          <ColorHighlightPopover tooltip="文本高亮与颜色" />
        ) : (
          <ColorHighlightPopoverButton onClick={onHighlighterClick} tooltip="文本高亮与颜色" />
        )}
        {!isMobile ? <LinkPopover tooltip="超链接" /> : <LinkButton onClick={onLinkClick} tooltip="超链接" />}
      </ToolbarGroup>

      {!isCompact && (
        <>
          <ToolbarSeparator />
          <ToolbarGroup>
            <MarkButton type="superscript" tooltip="上标" />
            <MarkButton type="subscript" tooltip="下标" />
          </ToolbarGroup>
        </>
      )}

      {!isCompact && (
        <>
          <ToolbarSeparator />
          <ToolbarGroup>
            <TextAlignButton align="left" tooltip="左对齐" />
            <TextAlignButton align="center" tooltip="居中对齐" />
            <TextAlignButton align="right" tooltip="右对齐" />
            <TextAlignButton align="justify" tooltip="两端对齐" />
          </ToolbarGroup>
        </>
      )}

      {!isCompact && (
        <>
          <ToolbarSeparator />
          <ToolbarGroup>
            <ImageUploadButton text="添加图片" tooltip="添加图片" />
          </ToolbarGroup>
        </>
      )}

      {isCompact && (
        <>
          <ToolbarSeparator />
          <ToolbarGroup>
            <MoreDropdownMenu />
          </ToolbarGroup>
        </>
      )}

    </>
  )
}

const MobileToolbarContent = ({
  type,
  onBack,
}: {
  type: "highlighter" | "link"
  onBack: () => void
}) => (
  <>
    <ToolbarGroup>
      <Button variant="ghost" onClick={onBack}>
        <ArrowLeftIcon className="tiptap-button-icon" />
        {type === "highlighter" ? (
          <HighlighterIcon className="tiptap-button-icon" />
        ) : (
          <LinkIcon className="tiptap-button-icon" />
        )}
      </Button>
    </ToolbarGroup>

    <ToolbarSeparator />

    {type === "highlighter" ? (
      <ColorHighlightPopoverContent />
    ) : (
      <LinkContent />
    )}
  </>
)

interface SimpleEditorProps {
  content: string
  onChange: (html: string) => void
  placeholder?: string
  editable?: boolean
  className?: string
  // --- Ported custom features ---
  enableMarkdown?: boolean       // 开启 Markdown 语法输入解析，默认关闭
  enableDragHandle?: boolean     // 显示拖拽把手和块上下文菜单，默认开启
  placeholderOverlay?: React.ReactNode // 叠加在编辑区域上方的任意 JSX
}

export function SimpleEditor({
  content,
  onChange,
  placeholder = "",
  editable = true,
  className = "",
  enableMarkdown = false,
  enableDragHandle = true,
  placeholderOverlay,
}: SimpleEditorProps) {
  const isMobile = useIsBreakpoint()
  const { height } = useWindowSize()
  const [mobileView, setMobileView] = useState<"main" | "highlighter" | "link">(
    "main"
  )
  const toolbarRef = useRef<HTMLDivElement>(null)
  const lastEmittedHtml = useRef(content)

  const [containerWidth, setContainerWidth] = useState(0)
  const containerRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!containerRef.current) return
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        setContainerWidth(entry.contentRect.width)
      }
    })
    observer.observe(containerRef.current)
    return () => observer.disconnect()
  }, [])

  const isCompact = containerWidth > 0 && containerWidth < 720

  const extensions = useMemo(() => {
    const exts: any[] = [
      StarterKit.configure({
        horizontalRule: false,
        link: {
          openOnClick: false,
          enableClickSelection: true,
        },
      }),
      HorizontalRule,
      TextAlign.configure({ types: ["heading", "paragraph"] }),
      TaskList,
      TaskItem.configure({ nested: true }),
      Highlight.configure({ multicolor: true }),
      Image,
      Typography,
      Superscript,
      Subscript,
      Selection,
      ImageUploadNode.configure({
        accept: "image/*",
        maxSize: MAX_FILE_SIZE,
        limit: 3,
        upload: handleImageUpload,
        onError: (error: any) => console.error("Upload failed:", error),
      }),
    ]

    // Markdown 语法输入解析（如 **加粗** 自动转换）
    if (enableMarkdown) {
      exts.push(Markdown)
    }

    // 拖拽把手：官方 onNodeChange 回调写入 editor._draggedNode 供 BlockDragHandleMenu 读取
    if (enableDragHandle) {
      exts.push(
        DragHandle.configure({
          render: () => {
            const handle = document.createElement("div")
            handle.className = "drag-handle"
            handle.innerHTML = `<svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="9" cy="12" r="1"/><circle cx="9" cy="5" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="19" r="1"/></svg>`
            return handle
          },
          onNodeChange: ({ node, editor: ed, pos }: any) => {
            if (node) {
              // 使用官方 onNodeChange 回调存储当前悬浮块信息，供 BlockDragHandleMenu 读取
              ;(ed as any)._draggedNodePos = pos
              ;(ed as any)._draggedNode = node
            }
          },
          nested: true,
        })
      )
    }

    if (placeholder) {
      exts.push(
        Placeholder.configure({
          placeholder,
          emptyEditorClass: "is-editor-empty",
        })
      )
    }

    return exts
  }, [enableMarkdown, enableDragHandle, placeholder])

  const editor = useEditor({
    immediatelyRender: false,
    editorProps: {
      attributes: {
        autocomplete: "off",
        autocorrect: "off",
        autocapitalize: "off",
        "aria-label": "Main content area, start typing to enter text.",
        class: `simple-editor ${className}`,
      },
    },
    extensions,
    content,
    onUpdate: ({ editor }) => {
      const html = editor.getHTML()
      lastEmittedHtml.current = html
      onChange(html)
    },
  })

  const rect = useCursorVisibility({
    editor,
    overlayHeight: toolbarRef.current?.getBoundingClientRect().height ?? 0,
  })

  // Sync content from prop when it changes (e.g. switching date or note)
  useEffect(() => {
    if (editor && content !== lastEmittedHtml.current && content !== editor.getHTML()) {
      lastEmittedHtml.current = content
      editor.commands.setContent(content)
    }
  }, [content, editor])

  // Sync editable state
  useEffect(() => {
    if (editor) {
      editor.setEditable(editable)
    }
  }, [editable, editor])

  // Cleanup editor instance on unmount
  useEffect(() => {
    return () => {
      if (editor) {
        editor.destroy()
      }
    }
  }, [editor])

  useEffect(() => {
    if (!isMobile && mobileView !== "main") {
      setMobileView("main")
    }
  }, [isMobile, mobileView])

  return (
    <div ref={containerRef} className="simple-editor-wrapper">
      <EditorContext.Provider value={{ editor }}>
        <Toolbar
          ref={toolbarRef}
          style={{
            ...(isMobile
              ? {
                  bottom: `calc(100% - ${height - rect.y}px)`,
                }
              : {}),
          }}
        >
          {mobileView === "main" ? (
            <MainToolbarContent
              onHighlighterClick={() => setMobileView("highlighter")}
              onLinkClick={() => setMobileView("link")}
              isMobile={isMobile}
              isCompact={isCompact}
            />
          ) : (
            <MobileToolbarContent
              type={mobileView === "highlighter" ? "highlighter" : "link"}
              onBack={() => setMobileView("main")}
            />
          )}
        </Toolbar>

        {/* 拖拽块上下文菜单：使用官方 DropdownMenu 原语实现 */}
        {enableDragHandle && <BlockContextMenu editor={editor} />}

        {/* 编辑内容区 + placeholderOverlay 叠加层 */}
        <div style={{ position: "relative", flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
          <EditorContent
            editor={editor}
            role="presentation"
            className="simple-editor-content"
          />
          {placeholderOverlay}
        </div>
      </EditorContext.Provider>
    </div>
  )
}
