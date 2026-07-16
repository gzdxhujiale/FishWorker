import React from "react";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { Minus, X, Settings } from "lucide-react";
import type { ToolConfig } from "./types";
import "./AppLayout.css";

export const MenuBar: React.FC = () => {
  const minimizeWindow = () => {
    getCurrentWindow().minimize();
  };

  const closeWindow = () => {
    getCurrentWindow().close();
  };

  return (
    <div className="custom-menubar" data-tauri-drag-region>
      <div className="menubar-title" data-tauri-drag-region>
      </div>
      <div className="menubar-controls">
        <button className="menubar-btn" onClick={minimizeWindow} aria-label="Minimize">
          <Minus size={16} />
        </button>
        <button className="menubar-btn close-btn" onClick={closeWindow} aria-label="Close">
          <X size={16} />
        </button>
      </div>
    </div>
  );
};

export const MainContent: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  return <main className="custom-main-content">{children}</main>;
};

export const AppLayout: React.FC<{
  menuBar: React.ReactNode;
  toolbar: React.ReactNode;
  mainContent: React.ReactNode;
}> = ({ menuBar, toolbar, mainContent }) => {
  return (
    <div className="app-layout">
      <div className="app-layout-toolbar">{toolbar}</div>
      <div className="app-layout-body">
        <div className="app-layout-menubar">{menuBar}</div>
        <div className="app-layout-main">{mainContent}</div>
      </div>
    </div>
  );
};

interface ToolbarProps {
  tools: ToolConfig[];
  activeToolId: string;
  onToolSelect: (id: string) => void;
  onSettingsClick: () => void;
}

export const Toolbar: React.FC<ToolbarProps> = ({ tools, activeToolId, onToolSelect, onSettingsClick }) => {
  return (
    <aside className="custom-toolbar" >
      <nav className="toolbar-nav" aria-label="Main Navigation">
        {tools.map((tool) => {
          const Icon = tool.icon;
          return (
            <button
              key={tool.id}
              className={`toolbar-btn ${activeToolId === tool.id ? "active" : ""}`}
              title={tool.name}
              aria-label={tool.name}
              aria-current={activeToolId === tool.id ? "page" : undefined}
              type="button"
              onClick={() => onToolSelect(tool.id)}
            >
              <Icon size={19} strokeWidth={1.9} />
            </button>
          );
        })}
      </nav>
      <button
        className="toolbar-btn settings-btn"
        title="Settings"
        aria-label="Settings"
        type="button"
        onClick={onSettingsClick}
      >
        <Settings size={18} strokeWidth={1.9} />
      </button>
    </aside>
  );
};
