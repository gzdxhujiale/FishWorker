import { useState, useEffect, forwardRef, useImperativeHandle } from 'react';
import * as Icons from 'lucide-react';
import { SlashCommandItem } from './SlashCommands';

interface SlashCommandsListProps {
  items: SlashCommandItem[];
  command: (item: SlashCommandItem) => void;
}

export const SlashCommandsList = forwardRef((props: SlashCommandsListProps, ref) => {
  const [selectedIndex, setSelectedIndex] = useState(0);

  const selectItem = (index: number) => {
    const item = props.items[index];
    if (item) {
      props.command(item);
    }
  };

  useEffect(() => {
    setSelectedIndex(0);
  }, [props.items]);

  useImperativeHandle(ref, () => ({
    onKeyDown: ({ event }: { event: KeyboardEvent }) => {
      if (event.key === 'ArrowUp') {
        setSelectedIndex((selectedIndex + props.items.length - 1) % props.items.length);
        return true;
      }

      if (event.key === 'ArrowDown') {
        setSelectedIndex((selectedIndex + 1) % props.items.length);
        return true;
      }

      if (event.key === 'Enter') {
        selectItem(selectedIndex);
        return true;
      }

      return false;
    },
  }));

  if (props.items.length === 0) {
    return (
      <div className="slash-commands-menu empty" style={{ padding: '8px 12px', color: 'var(--text-muted)', fontSize: '13px' }}>
        无匹配的命令
      </div>
    );
  }

  return (
    <div className="slash-commands-menu">
      {props.items.map((item, index) => {
        const IconComponent = (Icons as any)[item.icon] || Icons.Type;

        return (
          <button
            key={index}
            type="button"
            className={`slash-commands-item ${index === selectedIndex ? 'active' : ''}`}
            onClick={() => selectItem(index)}
          >
            <div className="slash-commands-icon">
              <IconComponent size={15} />
            </div>
            <div className="slash-commands-info">
              <div className="slash-commands-title">{item.title}</div>
              <div className="slash-commands-description">{item.description}</div>
            </div>
          </button>
        );
      })}
    </div>
  );
});

SlashCommandsList.displayName = 'SlashCommandsList';
