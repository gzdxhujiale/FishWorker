import React, { useState } from 'react';
import { ChevronRight } from 'lucide-react';
import { UnlearningLoop } from '../unlearningTypes';

interface Props {
  loop: UnlearningLoop;
  onUpdate: (updates: Partial<UnlearningLoop>) => void;
  onNext: () => void;
}

export function UnlearningInputPanel({ loop, onUpdate, onNext }: Props) {
  const [oldBelief, setOldBelief] = useState(loop.inputData.oldBelief);
  const [newPerspective, setNewPerspective] = useState(loop.inputData.newPerspective);

  const isValid = oldBelief.trim().length > 0 && newPerspective.trim().length > 0;

  const handleNext = () => {
    if (!isValid) return;
    onUpdate({
      inputData: { oldBelief, newPerspective },
      status: 'OUTPUT'
    });
    onNext();
  };

  return (
    <div className="unlearning-panel">
      <div className="panel-header">
        <h3>第一步：打破旧知</h3>
        <p>诚实地记录你过去的固有认知，并引入试图挑战它的新视角。</p>
      </div>

      <div className="form-group">
        <label>当前旧认知</label>
        <textarea
          value={oldBelief}
          onChange={(e) => setOldBelief(e.target.value)}
          placeholder="例如：我过去总是认为..."
        />
      </div>

      <div className="form-group">
        <label>引入的新视角</label>
        <textarea
          value={newPerspective}
          onChange={(e) => setNewPerspective(e.target.value)}
          placeholder="例如：最近接触到的新观点指出..."
        />
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
