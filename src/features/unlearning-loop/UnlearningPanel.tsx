import React, { useState, useEffect, useMemo } from 'react';
import { Lightbulb, Keyboard, RefreshCw, CheckCircle2, Plus, List } from 'lucide-react';
import { unlearningStore } from './unlearningStore';
import { UnlearningData, UnlearningLoop, UnlearningStatus } from './unlearningTypes';
import { UnlearningInputPanel } from './components/UnlearningInputPanel';
import { UnlearningOutputPanel } from './components/UnlearningOutputPanel';
import { UnlearningFeedbackPanel } from './components/UnlearningFeedbackPanel';
import { UnlearningReflectionPanel } from './components/UnlearningReflectionPanel';
import './unlearning.css';

const STATUS_ORDER: UnlearningStatus[] = ['INPUT', 'OUTPUT', 'FEEDBACK', 'REFLECTION', 'COMPLETED'];

export function UnlearningPanel() {
  const [data, setData] = useState<UnlearningData>({ loops: [] });
  const [showHistory, setShowHistory] = useState(false);

  useEffect(() => {
    setData(unlearningStore.load());
  }, []);

  const activeLoop = useMemo(() => {
    return data.loops.find(l => l.id === data.activeLoopId);
  }, [data]);

  const handleCreateNew = () => {
    unlearningStore.createLoop();
    setData(unlearningStore.load());
    setShowHistory(false);
  };

  const handleUpdateLoop = (updates: Partial<UnlearningLoop>) => {
    if (activeLoop) {
      unlearningStore.updateLoop(activeLoop.id, updates);
      setData(unlearningStore.load());
    }
  };

  const handleSelectLoop = (id: string) => {
    unlearningStore.setActiveLoop(id);
    setData(unlearningStore.load());
    setShowHistory(false);
  };

  const renderProgressIndicator = (currentStatus: UnlearningStatus) => {
    const currentIndex = STATUS_ORDER.indexOf(currentStatus);
    
    const steps = [
      { id: 'INPUT', icon: <Lightbulb size={18} />, label: '输入' },
      { id: 'OUTPUT', icon: <Keyboard size={18} />, label: '输出' },
      { id: 'FEEDBACK', icon: <RefreshCw size={18} />, label: '反馈' },
      { id: 'REFLECTION', icon: <CheckCircle2 size={18} />, label: '反思' },
    ];

    return (
      <div className="unlearning-progress">
        {steps.map((step, index) => {
          const isActive = index === currentIndex;
          const isCompleted = index < currentIndex || currentStatus === 'COMPLETED';
          return (
            <React.Fragment key={step.id}>
              <div className={`progress-step ${isActive ? 'active' : ''} ${isCompleted ? 'completed' : ''}`}>
                {step.icon}
                <span style={{ display: 'none' }}>{step.label}</span>
              </div>
              {index < steps.length - 1 && (
                <div className="progress-separator">-</div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    );
  };

  const renderActivePanel = () => {
    if (!activeLoop) {
      return (
        <div className="empty-state">
          <Lightbulb size={48} color="var(--theme-text-muted)" />
          <p>没有任何进行中的反学习回路。</p>
          <button className="primary-button" onClick={handleCreateNew}>
            <Plus size={16} />
            新建回路
          </button>
        </div>
      );
    }

    switch (activeLoop.status) {
      case 'INPUT':
        return <UnlearningInputPanel loop={activeLoop} onUpdate={handleUpdateLoop} onNext={() => {}} />;
      case 'OUTPUT':
        return <UnlearningOutputPanel loop={activeLoop} onUpdate={handleUpdateLoop} onNext={() => {}} />;
      case 'FEEDBACK':
        return <UnlearningFeedbackPanel loop={activeLoop} onUpdate={handleUpdateLoop} onNext={() => {}} />;
      case 'REFLECTION':
      case 'COMPLETED':
        return (
          <UnlearningReflectionPanel 
            loop={activeLoop} 
            onUpdate={handleUpdateLoop} 
            onComplete={() => {}}
            onRetryOutput={() => handleUpdateLoop({ status: 'OUTPUT' })}
          />
        );
      default:
        return null;
    }
  };

  const renderHistory = () => {
    if (data.loops.length === 0) {
      return (
        <div className="empty-state">
          <p>暂无历史记录。</p>
        </div>
      );
    }

    return (
      <div className="unlearning-content">
        <h3 style={{ marginBottom: '24px' }}>所有回路</h3>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {data.loops.map(loop => (
            <div 
              key={loop.id} 
              className={`loop-card ${loop.id === activeLoop?.id ? 'active' : ''}`}
              style={{ margin: 0, cursor: 'pointer', padding: '16px' }}
              onClick={() => handleSelectLoop(loop.id)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <h4 style={{ margin: 0, fontSize: '1rem' }}>{loop.inputData.oldBelief || '未命名回路'}</h4>
                <span style={{ fontSize: '0.8rem', color: loop.status === 'COMPLETED' ? 'var(--theme-success)' : 'var(--theme-text-muted)' }}>
                  {loop.status}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  };

  return (
    <section className="exam-page unlearning-page">
      <div className="unlearning-header">
        <h2>
          <Lightbulb size={20} />
          反学习回路
        </h2>
        {activeLoop && !showHistory && renderProgressIndicator(activeLoop.status)}
        <div style={{ display: 'flex', gap: '8px' }}>
          <button className="icon-button" onClick={() => setShowHistory(!showHistory)} title="历史记录">
            <List size={18} />
          </button>
          {!showHistory && (
            <button className="icon-button" onClick={handleCreateNew} title="新建回路">
              <Plus size={18} />
            </button>
          )}
        </div>
      </div>

      <div className="unlearning-content">
        {showHistory ? renderHistory() : renderActivePanel()}
      </div>
    </section>
  );
}
