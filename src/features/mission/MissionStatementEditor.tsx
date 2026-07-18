import React from "react";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { ChevronDown, ChevronRight } from "lucide-react";
import { useMissionStore } from "./MissionStore";

export const MissionStatementEditor: React.FC = () => {
  const statement = useMissionStore(s => s.statement);
  const isCollapsed = useMissionStore(s => s.isStatementCollapsed);
  const toggle = useMissionStore(s => s.toggleStatementCollapsed);
  const saveStatement = useMissionStore(s => s.saveStatement);

  const editor = useEditor({
    extensions: [StarterKit],
    content: statement?.content || "",
    onUpdate: ({ editor }) => {
      saveStatement(editor.getHTML());
    },
  });

  return (
    <div className="mission-statement-section">
      <div className="mission-statement-header" onClick={toggle}>
        <span className="mission-statement-title">📜 个人使命宣言</span>
        {isCollapsed ? <ChevronRight size={16} /> : <ChevronDown size={16} />}
      </div>
      {!isCollapsed && (
        <div className="mission-statement-editor">
          <EditorContent editor={editor} />
        </div>
      )}
    </div>
  );
};
