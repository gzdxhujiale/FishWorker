import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { UnlearningLoop } from '../unlearningTypes';

interface Props {
  loop: UnlearningLoop;
  onUpdate: (updates: Partial<UnlearningLoop>) => void;
  onNext: () => void;
}

const QUICK_TAGS = ['与预期一致', '部分偏离', '完全颠覆', '意料之外', '遇到阻力'];

export function UnlearningFeedbackPanel({ loop, onUpdate, onNext }: Props) {
  const [expected, setExpected] = useState(loop.feedbackData.expected);
  const [actual, setActual] = useState(loop.feedbackData.actual);

  const isValid = expected.trim().length > 0 && actual.trim().length > 0;

  const handleNext = () => {
    if (!isValid) return;
    onUpdate({
      feedbackData: { expected, actual },
      status: 'REFLECTION'
    });
    onNext();
  };

  const insertTag = (tag: string) => {
    setActual(prev => prev ? `${prev} [${tag}] ` : `[${tag}] `);
  };

  return (
    <div className="unlearning-panel">
      <div className="panel-header">
        <h3>第三步：验证效果</h3>
        <p>诚实地记录你的预期，以及现实给你带来的反馈。</p>
      </div>

      <details className="collapsible-reference">
        <summary style={{ cursor: 'pointer', fontWeight: 500, color: 'var(--theme-primary, #3b82f6)' }}>查看第一步设定的新旧认知</summary>
        <div style={{ marginTop: '12px' }}>
          <h4>旧认知:</h4>
          <p>{loop.inputData.oldBelief}</p>
          <h4>新视角:</h4>
          <p>{loop.inputData.newPerspective}</p>
        </div>
      </details>

      <div className="form-group">
        <label>预期结果 (Expected)</label>
        <textarea
          value={expected}
          onChange={(e) => setExpected(e.target.value)}
          placeholder="你本来以为会发生..."
        />
      </div>

      <div className="form-group">
        <label>实际结果/外界评价 (Actual)</label>
        <div className="quick-tags">
          {QUICK_TAGS.map(tag => (
            <span key={tag} className="quick-tag" onClick={() => insertTag(tag)}>
              {tag}
            </span>
          ))}
        </div>
        <textarea
          value={actual}
          onChange={(e) => setActual(e.target.value)}
          placeholder="事实上的结果是..."
        />
      </div>

      <div className="panel-actions">
        <button 
          className="primary-button" 
          disabled={!isValid}
          onClick={handleNext}
        >
          <span>进入最终反思</span>
          <ChevronRight size={16} />
        </button>
      </div>
    </div>
  );
}
