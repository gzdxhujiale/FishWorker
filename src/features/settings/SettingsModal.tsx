import { useState } from "react";
import { Database, LayoutTemplate, Settings, X } from "lucide-react";
import { DatabaseSettingsPanel } from "./components/DatabaseSettingsPanel";
import { TemplateSettingsPanel } from "./components/TemplateSettingsPanel";

type SettingsTab = "templates" | "database";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("templates");

  return (
    <div 
      className="settings-backdrop" 
      role="presentation"
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
    >
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-label="设置">
        <aside className="settings-nav">
          <div className="settings-title">
            <Settings size={18} />
            <span>设置</span>
          </div>

          <button 
            className={`settings-nav-item ${activeTab === "templates" ? "active" : ""}`} 
            type="button"
            onClick={() => setActiveTab("templates")}
          >
            <LayoutTemplate size={16} />
            <span>模板管理</span>
          </button>

          <button 
            className={`settings-nav-item ${activeTab === "database" ? "active" : ""}`} 
            type="button"
            onClick={() => setActiveTab("database")}
          >
            <Database size={16} />
            <span>数据库配置</span>
          </button>
        </aside>

        <main className="settings-content">
          <header className="settings-header">
            <h2>{activeTab === "templates" ? "模板管理" : "数据库连接配置"}</h2>
            <button className="icon-button" title="关闭" aria-label="关闭设置" type="button" onClick={onClose}>
              <X size={17} />
            </button>
          </header>

          <div className="settings-panels-wrapper">
            {activeTab === "templates" && <TemplateSettingsPanel />}
            {activeTab === "database" && <DatabaseSettingsPanel />}
          </div>
        </main>
      </section>
    </div>
  );
}

