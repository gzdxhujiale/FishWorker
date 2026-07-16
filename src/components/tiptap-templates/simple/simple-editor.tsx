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

// --- UI Primitives ---
import { Button } from "quill/components/tiptap-ui-primitive/button"
import { Spacer } from "quill/components/tiptap-ui-primitive/spacer"
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
import { MoreHorizontal } from "lucide-react"

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
import { ThemeToggle } from "quill/components/tiptap-templates/simple/theme-toggle"

// --- Lib ---
import { handleImageUpload, MAX_FILE_SIZE } from "quill/lib/tiptap-utils"

// --- Styles ---
import "quill/components/tiptap-templates/simple/simple-editor.scss"

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

      <Spacer />

      {isMobile && <ToolbarSeparator />}

      <ToolbarGroup>
        <ThemeToggle />
      </ToolbarGroup>
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
}

export function SimpleEditor({
  content,
  onChange,
  placeholder = "",
  editable = true,
  className = "",
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

    if (placeholder) {
      exts.push(
        Placeholder.configure({
          placeholder,
          emptyEditorClass: "is-editor-empty",
        })
      )
    }

    return exts
  }, [placeholder])

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

        <EditorContent
          editor={editor}
          role="presentation"
          className="simple-editor-content"
        />
      </EditorContext.Provider>
    </div>
  )
}
