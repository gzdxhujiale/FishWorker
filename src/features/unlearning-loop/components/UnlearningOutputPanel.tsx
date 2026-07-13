import React, { useState } from 'react';
import { ChevronRight, FileText, Link } from 'lucide-react';
import { UnlearningLoop } from '../unlearningTypes';

interface Props {
  loop: UnlearningLoop;
  onUpdate: (updates: Partial<UnlearningLoop>) => void;
  onNext: () => void;
}

export function UnlearningOutputPanel({ loop, onUpdate, onNext }: Props) {
  const [actionTaken, setActionTaken] = useState(loop.outputData.actionTaken);
  const [linkedDocId, setLinkedDocId] = useState(loop.outputData.linkedDocId || '');

  const isValid = actionTaken.trim().length > 0;

  const handleNext = () => {
    if (!isValid) return;
    onUpdate({
      outputData: { actionTaken, linkedDocId: linkedDocId || undefined },
      status: 'FEEDBACK'
    });
    onNext();
  };

  const handleBindCurrent = () => {
    // In a real implementation, this would grab the active document ID from a global store.
    // For MVP, we just mock a bind.
    setLinkedDocId('doc_' + Math.random().toString(36).substr(2, 5));
  };

  return (
    <div className="unlearning-panel">
      <div className="panel-header">
        <h3>第二步：践行新知</h3>
        <p>基于你的新视角，进行一次小规模的输出实践或行动。</p>
      </div>

      <div className="form-group">
        <label>新建快速草稿 / 记录行动</label>
        <textarea
          value={actionTaken}
          onChange={(e) => setActionTaken(e.target.value)}
          placeholder="我尝试了..."
        />
      </div>

      <div className="form-group" style={{ marginTop: '20px' }}>
        <label>关联当前工作区文档</label>
        {linkedDocId ? (
          <div className="collapsible-reference" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <FileText size={16} />
            <span>已绑定节点: {linkedDocId}</span>
            <button className="icon-button" style={{ marginLeft: 'auto' }} onClick={() => setLinkedDocId('')}>取消</button>
          </div>
        ) : (
          <button type="button" className="secondary-button" onClick={handleBindCurrent}>
            <Link size={14} style={{ marginRight: '6px' }} />
            一键绑定当前活跃节点
          </button>
        )}
      </div>

      <div className="panel-actions">
        <button 
          className="primary-button" 
          disabled={!isValid}
          onClick={handleNext}
        >
          <span>进入下一步</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
