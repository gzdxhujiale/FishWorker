import { useState } from "react";
import { Database, LayoutTemplate, RefreshCw, Settings, X } from "lucide-react";
import { DatabaseSettingsPanel } from "./components/DatabaseSettingsPanel";
import { TemplateSettingsPanel } from "./components/TemplateSettingsPanel";
import { UpdateSettingsPanel } from "./components/UpdateSettingsPanel";
import { useUpdateStore } from "./updateStore";

type SettingsTab = "templates" | "database" | "update";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  const [activeTab, setActiveTab] = useState<SettingsTab>("templates");
  const { updateStatus } = useUpdateStore();

  const hasUpdateReady = updateStatus === "available" || updateStatus === "ready_to_restart";

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

          <button 
            className={`settings-nav-item ${activeTab === "update" ? "active" : ""}`} 
            type="button"
            onClick={() => setActiveTab("update")}
          >
            <RefreshCw size={16} />
            <span>软件更新</span>
            {hasUpdateReady && (
              <span className="ml-auto w-2 h-2 rounded-full bg-blue-500 animate-pulse" title="有新更新" />
            )}
          </button>
        </aside>

        <main className="settings-content">
          <header className="settings-header">
            <h2>
              {activeTab === "templates" && "模板管理"}
              {activeTab === "database" && "数据库连接配置"}
              {activeTab === "update" && "软件更新"}
            </h2>
            <button className="icon-button" title="关闭" aria-label="关闭设置" type="button" onClick={onClose}>
              <X size={17} />
            </button>
          </header>

          <div className="settings-panels-wrapper">
            {activeTab === "templates" && <TemplateSettingsPanel />}
            {activeTab === "database" && <DatabaseSettingsPanel />}
            {activeTab === "update" && <UpdateSettingsPanel />}
          </div>
        </main>
      </section>
    </div>
  );
}

