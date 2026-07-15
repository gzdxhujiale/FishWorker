import { Database, Settings, X } from "lucide-react";
import { DatabaseSettingsPanel } from "./components/DatabaseSettingsPanel";

export function SettingsModal({ onClose }: { onClose: () => void }) {
  return (
    <div className="settings-backdrop" role="presentation">
      <section className="settings-dialog" role="dialog" aria-modal="true" aria-label="设置">
        <aside className="settings-nav">
          <div className="settings-title">
            <Settings size={18} />
            <span>设置</span>
          </div>

          <button className="settings-nav-item active" type="button">
            <Database size={16} />
            <span>数据库配置</span>
          </button>
        </aside>

        <main className="settings-content">
          <header className="settings-header">
            <h2>数据库连接配置</h2>
            <button className="icon-button" title="关闭" aria-label="关闭设置" type="button" onClick={onClose}>
              <X size={17} />
            </button>
          </header>

          <div className="settings-panels-wrapper">
            <DatabaseSettingsPanel />
          </div>
        </main>
      </section>
    </div>
  );
}
