import "./patchEnv";
import React from "react";
import { createRoot } from "react-dom/client";
import {
  Clock,
  CalendarDays,
  ClipboardList,
  LayoutGrid,
  Navigation
} from "lucide-react";
import { AppLayout, MenuBar, MainContent, Toolbar } from "./components/layout/AppLayout";
import { TimeManagementPanel } from "./features/time-management/TimeManagementPanel";
import { DailyReviewPanel } from "./features/daily-review/DailyReviewPanel";
import { SettingsModal } from "./features/settings/SettingsModal";
import { ListsPanel } from "./features/lists/ListsPanel";
import { MissionPanel } from "./features/mission/MissionPanel";

import "./index.css";
import "@arco-design/web-react/dist/css/arco.css";

declare global {
  interface Window {
    aistudyClipboard?: {
      writeText: (text: string) => Promise<boolean>;
    };
  }
}

type AppErrorBoundaryState = {
  error: Error | null;
};

class AppErrorBoundary extends React.Component<React.PropsWithChildren, AppErrorBoundaryState> {
  state: AppErrorBoundaryState = { error: null };

  static getDerivedStateFromError(error: Error): AppErrorBoundaryState {
    return { error };
  }

  render() {
    if (this.state.error) {
      return (
        <div className="app-error-fallback" role="alert">
          <strong>应用运行异常</strong>
          <span>页面暂时没有正常打开，可以先重新载入；详细信息会记录到报错日志。</span>
          <button type="button" onClick={() => window.location.reload()}>
            重新载入
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

type AppSection = "weekly-planning" | "four-quadrants" | "daily-review" | "lists" | "mission";

function App() {
  const [activeSection, setActiveSection] = React.useState<AppSection>("lists");
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);
  const [visitedSections, setVisitedSections] = React.useState<Set<AppSection>>(() => new Set(["lists"]));

  React.useEffect(() => {
    setVisitedSections((prev) => {
      if (prev.has(activeSection)) return prev;
      const next = new Set(prev);
      next.add(activeSection);
      return next;
    });
  }, [activeSection]);

  return (
    <>
      <AppLayout
        menuBar={<MenuBar />}
        toolbar={
          <Toolbar
            tools={[
              { id: "lists", name: "清单", icon: ClipboardList, component: () => <></> },
              { id: "weekly-planning", name: "周计划", icon: CalendarDays, component: () => <></> },
              { id: "four-quadrants", name: "四象限工作台", icon: LayoutGrid, component: () => <></> },
              { id: "daily-review", name: "每日复盘", icon: Clock, component: () => <></> },
              { id: "mission", name: "人生罗盘", icon: Navigation, component: () => <></> },
            ]}
            activeToolId={activeSection}
            onToolSelect={(id) => setActiveSection(id as AppSection)}
            onSettingsClick={() => setIsSettingsOpen(true)}
          />
        }
        mainContent={
          <MainContent>
            {visitedSections.has("lists") && (
              <div style={{ display: activeSection === "lists" ? "block" : "none", height: "100%" }}>
                <ListsPanel />
              </div>
            )}
            {visitedSections.has("weekly-planning") && (
              <div style={{ display: activeSection === "weekly-planning" ? "block" : "none", height: "100%" }}>
                <TimeManagementPanel mode="weekly" />
              </div>
            )}
            {visitedSections.has("four-quadrants") && (
              <div style={{ display: activeSection === "four-quadrants" ? "block" : "none", height: "100%" }}>
                <TimeManagementPanel mode="daily" />
              </div>
            )}
            {visitedSections.has("daily-review") && (
              <div style={{ display: activeSection === "daily-review" ? "block" : "none", height: "100%" }}>
                <DailyReviewPanel />
              </div>
            )}
            {visitedSections.has("mission") && (
              <div style={{ display: activeSection === "mission" ? "block" : "none", height: "100%" }}>
                <MissionPanel />
              </div>
            )}
          </MainContent>
        }
      />

      {isSettingsOpen ? <SettingsModal onClose={() => setIsSettingsOpen(false)} /> : null}
    </>
  );
}

const rootContent = <App />;

createRoot(document.getElementById("root")!).render(
  <AppErrorBoundary>
    {rootContent}
  </AppErrorBoundary>
);
