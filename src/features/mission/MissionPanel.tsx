import React, { useEffect } from "react";
import { useMissionStore } from "./MissionStore";
import { MissionStatementEditor } from "./MissionStatementEditor";
import { RoleSidebar } from "./RoleSidebar";
import { GoalDetailPanel } from "./GoalDetailPanel";
import "./MissionPanel.css";

export const MissionPanel: React.FC = () => {
  const init = useMissionStore(s => s.init);

  useEffect(() => {
    init();
  }, [init]);

  return (
    <div className="mission-panel">
      <MissionStatementEditor />
      <div className="mission-bottom">
        <RoleSidebar />
        <GoalDetailPanel />
      </div>
    </div>
  );
};
