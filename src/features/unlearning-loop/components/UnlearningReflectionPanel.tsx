import React, { useState } from 'react';
import { Check, Sparkles, Download, RotateCcw } from 'lucide-react';
import { UnlearningLoop } from '../unlearningTypes';

interface Props {
  loop: UnlearningLoop;
  onUpdate: (updates: Partial<UnlearningLoop>) => void;
  onComplete: () => void;
  onRetryOutput: () => void;
}

export function UnlearningReflectionPanel({ loop, onUpdate, onComplete, onRetryOutput }: Props) {
  const [keyTakeaway, setKeyTakeaway] = useState(loop.reflectionData.keyTakeaway);
  const [showSuccess, setShowSuccess] = useState(false);

  const isCompleted = loop.status === 'COMPLETED';
  const isValid = keyTakeaway.trim().length > 0;

  const handleComplete = () => {
    if (!isValid) return;
    onUpdate({
      reflectionData: { keyTakeaway },
      status: 'COMPLETED',
      completedAt: Date.now()
    });
    setShowSuccess(true);
    setTimeout(() => {
      setShowSuccess(false);
      onComplete();
    }, 1500);
  };

  const handleExport = () => {
    const md = `
# 反学习总结卡片
- **旧认知**: ${loop.inputData.oldBelief}
- **新视角**: ${loop.inputData.newPerspective}
- **我的实践**: ${loop.outputData.actionTaken}
- **预期结果**: ${loop.feedbackData.expected}
- **实际反馈**: ${loop.feedbackData.actual}
- **核心收获**: ${loop.reflectionData.keyTakeaway}
    `.trim();
    // In a real app, this might use the clipboard API or trigger a file download.
    if (window.aistudyClipboard) {
      window.aistudyClipboard.writeText(md).then(() => alert('已复制到剪贴板！'));
    } else {
      navigator.clipboard.writeText(md).then(() => alert('已复制到剪贴板！'));
    }
  };

  if (isCompleted && !showSuccess) {
    return (
      <div className="unlearning-panel" style={{ backgroundColor: 'transparent', border: 'none', boxShadow: 'none' }}>
        <div className="loop-card">
          <h4>反学习闭环总结</h4>
          <div className="loop-card-section">
            <label>打破的旧知</label>
            <p>{loop.inputData.oldBelief}</p>
          </div>
          <div className="loop-card-section">
            <label>新视角 & 实践</label>
            <p>{loop.inputData.newPerspective} ➔ {loop.outputData.actionTaken}</p>
          </div>
          <div className="loop-card-section">
            <label>现实反馈</label>
            <p>{loop.feedbackData.actual}</p>
          </div>
          <div className="loop-card-section" style={{ borderTop: '1px dashed var(--theme-border)', paddingTop: '16px', marginTop: '16px' }}>
            <label style={{ color: 'var(--theme-primary)' }}>核心收获 (Key Takeaway)</label>
            <p style={{ fontWeight: 500, color: 'var(--theme-text)' }}>{loop.reflectionData.keyTakeaway}</p>
          </div>
          <div className="panel-actions" style={{ borderTop: 'none', paddingTop: 0, marginTop: '24px' }}>
            <button className="secondary-button" onClick={handleExport}>
              <Download size={16} style={{ marginRight: '6px' }} />
              导出为 Markdown
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="unlearning-panel">
      {showSuccess && (
        <div className="success-animation">
          <Sparkles size={48} />
          <h3 style={{ marginTop: '12px' }}>完成了一次思维进化！</h3>
        </div>
      )}

      <div className="panel-header" style={{ opacity: showSuccess ? 0 : 1, transition: 'opacity 0.3s' }}>
        <h3>第四步：复盘与沉淀</h3>
        <p>对比新旧认知，提取可以指导未来行动的原则。</p>
      </div>

      <div className="form-group" style={{ opacity: showSuccess ? 0 : 1, transition: 'opacity 0.3s' }}>
        <label>核心收获 (Key Takeaway)</label>
        <textarea
          value={keyTakeaway}
          onChange={(e) => setKeyTakeaway(e.target.value)}
          placeholder="经过这次实践，我学到了..."
        />
      </div>

      <div className="panel-actions" style={{ display: showSuccess ? 'none' : 'flex' }}>
        <button 
          className="secondary-button" 
          onClick={onRetryOutput}
        >
          <RotateCcw size={16} style={{ marginRight: '6px' }} />
          <span>重试输出</span>
        </button>
        <button 
          className="primary-button" 
          style={{ backgroundColor: 'var(--theme-success, #10b981)', borderColor: 'var(--theme-success, #10b981)' }}
          disabled={!isValid}
          onClick={handleComplete}
        >
          <Check size={16} style={{ marginRight: '6px' }} />
          <span>完成回路</span>
        </button>
      </div>
    </div>
  );
}
