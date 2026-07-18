import React from "react";
import { createRoot } from "react-dom/client";
import {
  Clock,
  CalendarDays,
  ClipboardList,
  LayoutGrid,
  Target,
  Navigation
} from "lucide-react";
import { AppLayout, MenuBar, MainContent, Toolbar } from "./components/layout/AppLayout";
import { TimeManagementPanel } from "./features/time-management/TimeManagementPanel";
import { DailyReviewPanel } from "./features/daily-review/DailyReviewPanel";
import { SettingsModal } from "./features/settings/SettingsModal";
import { ListsPanel } from "./features/lists/ListsPanel";
import { HabitPanel } from "./features/habits/HabitPanel";
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

type AppSection = "weekly-planning" | "four-quadrants" | "daily-review" | "lists" | "habits" | "mission";

function App() {
  const [activeSection, setActiveSection] = React.useState<AppSection>("lists");
  const [isSettingsOpen, setIsSettingsOpen] = React.useState(false);

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
              { id: "habits", name: "习惯", icon: Target, component: () => <></> },
              { id: "mission", name: "人生罗盘", icon: Navigation, component: () => <></> },
            ]}
            activeToolId={activeSection}
            onToolSelect={(id) => setActiveSection(id as AppSection)}
            onSettingsClick={() => setIsSettingsOpen(true)}
          />
        }
        mainContent={
          <MainContent>
            {activeSection === "weekly-planning" ? (
              <TimeManagementPanel mode="weekly" />
            ) : activeSection === "four-quadrants" ? (
              <TimeManagementPanel mode="daily" />
            ) : activeSection === "daily-review" ? (
              <DailyReviewPanel />
            ) : activeSection === "lists" ? (
              <ListsPanel />
            ) : activeSection === "habits" ? (
              <HabitPanel />
            ) : activeSection === "mission" ? (
              <MissionPanel />
            ) : null}
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
