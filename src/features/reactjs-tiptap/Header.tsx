import { useEffect } from 'react';

import { localeActions } from 'reactjs-tiptap-editor/locale-bundle';

import { Button } from './ui/button';
import { Label } from './ui/label';
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from './ui/popover';
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select';
import useLocalStorageState from './hooks/ahooks/useLocalStorageState';
import 'katex/contrib/mhchem';
import { Check, Moon, Sun, SwatchBook } from 'lucide-react';
import { themeActions } from 'reactjs-tiptap-editor/theme';

const ColorIcon = ({ color, active }: { color: string; active: boolean }) => {
  if (active) {
    return (
      <span
        className={`inline-flex items-center justify-center size-[20px] rounded-full  bg-black`}
      >
        <Check size={16} className="text-white" />
      </span>
    );
  }

  return (
    <span
      className={`inline-block size-[20px] rounded-full`}
      style={{
        backgroundColor: color,
      }}
    ></span>
  );
};

export const Header = () => {
  const [theme, setTheme] = useLocalStorageState('next-tiptap-theme', {
    defaultValue: 'light',
    listenStorageChange: true,
  });

  const [color, setColor] = useLocalStorageState('next-tiptap-color', {
    defaultValue: 'default',
    listenStorageChange: true,
  });

  const [radius, setRadius] = useLocalStorageState('next-tiptap-radius', {
    defaultValue: 0.5,
    listenStorageChange: true,
  });

  useEffect(() => {
    themeActions.setTheme((theme as any) || 'light');
    themeActions.setColor((color as any) || 'default');
    themeActions.setBorderRadius(`${radius}rem` || '0.5rem');
  }, []);

  return (
    <div className="flex items-center justify-between sticky top-0 z-10 ">
      <h1 className="text-[24px] font-bold leading-tight tracking-tighter">
        Reactjs Tiptap Editor
      </h1>
      <div className="flex items-center gap-2">
        <a
          href="https://github.com/hunghg255/reactjs-tiptap-editor"
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-2 text-sm font-medium underline-offset-4 hover:underline"
        >
          <svg className="size-[20px] text-primary" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
          </svg>
        </a>

        <Popover>
          <PopoverTrigger>
            <SwatchBook size={20} className="text-primary" />
          </PopoverTrigger>
          <PopoverContent align="end" className="w-[384px]">
            <div className="mb-[24px] ">
              <Label className="font-semibold text-[18px]">
                Theme Customizer
              </Label>
            </div>

            <div className="mb-1">
              <Label>Color</Label>
            </div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              <Button
                variant={'outline'}
                onClick={() => {
                  setColor('default');
                  themeActions.setColor('default');
                }}
                className={
                  color === 'default' ? 'bg-accent text-accent-foreground' : ''
                }
              >
                <ColorIcon color="#000000" active={color === 'default'} />
                Default
              </Button>
              <Button
                variant={'outline'}
                onClick={() => {
                  setColor('red');
                  themeActions.setColor('red');
                }}
                className={
                  color === 'red' ? 'bg-accent text-accent-foreground' : ''
                }
              >
                <ColorIcon color="#dc2626" active={color === 'red'} />
                Red
              </Button>
              <Button
                variant={'outline'}
                onClick={() => {
                  setColor('blue');
                  themeActions.setColor('blue');
                }}
                className={
                  color === 'blue' ? 'bg-accent text-accent-foreground' : ''
                }
              >
                <ColorIcon color="#2563eb" active={color === 'blue'} />
                Blue
              </Button>
              <Button
                variant={'outline'}
                onClick={() => {
                  setColor('green');
                  themeActions.setColor('green');
                }}
                className={
                  color === 'green' ? 'bg-accent text-accent-foreground' : ''
                }
              >
                <ColorIcon color="#16a34a" active={color === 'green'} />
                Green
              </Button>
              <Button
                variant={'outline'}
                onClick={() => {
                  setColor('orange');
                  themeActions.setColor('orange');
                }}
                className={
                  color === 'orange' ? 'bg-accent text-accent-foreground' : ''
                }
              >
                <ColorIcon color="#f97316" active={color === 'orange'} />
                Orange
              </Button>
              <Button
                variant={'outline'}
                onClick={() => {
                  setColor('rose');
                  themeActions.setColor('rose');
                }}
                className={
                  color === 'rose' ? 'bg-accent text-accent-foreground' : ''
                }
              >
                <ColorIcon color="#e11d48" active={color === 'rose'} />
                Rose
              </Button>
              <Button
                variant={'outline'}
                onClick={() => {
                  setColor('violet');
                  themeActions.setColor('violet');
                }}
                className={
                  color === 'violet' ? 'bg-accent text-accent-foreground' : ''
                }
              >
                <ColorIcon color="#7c3aed" active={color === 'violet'} />
                Violet
              </Button>
              <Button
                variant={'outline'}
                onClick={() => {
                  setColor('yellow');
                  themeActions.setColor('yellow');
                }}
                className={
                  color === 'yellow' ? 'bg-accent text-accent-foreground' : ''
                }
              >
                <ColorIcon color="#facc15" active={color === 'yellow'} />
                Yellow
              </Button>
            </div>

            <div className="mb-1">
              <Label>Radius</Label>
            </div>
            <div className="flex gap-2 mb-3">
              <Button
                variant={'outline'}
                onClick={() => {
                  setRadius(0);
                  themeActions.setBorderRadius('0rem');
                }}
                className={
                  radius === 0
                    ? 'bg-accent text-accent-foreground flex-1'
                    : 'flex-1'
                }
              >
                0
              </Button>
              <Button
                variant={'outline'}
                onClick={() => {
                  setRadius(0.25);
                  themeActions.setBorderRadius('0.25rem');
                }}
                className={
                  radius === 0.25
                    ? 'bg-accent text-accent-foreground flex-1'
                    : 'flex-1'
                }
              >
                0.25
              </Button>
              <Button
                variant={'outline'}
                onClick={() => {
                  setRadius(0.5);
                  themeActions.setBorderRadius('0.5rem');
                }}
                className={
                  radius === 0.5
                    ? 'bg-accent text-accent-foreground flex-1'
                    : 'flex-1'
                }
              >
                0.5
              </Button>
              <Button
                variant={'outline'}
                onClick={() => {
                  setRadius(0.75);
                  themeActions.setBorderRadius('0.75rem');
                }}
                className={
                  radius === 0.75
                    ? 'bg-accent text-accent-foreground flex-1'
                    : 'flex-1'
                }
              >
                0.75
              </Button>
              <Button
                variant={'outline'}
                onClick={() => {
                  setRadius(1);
                  themeActions.setBorderRadius('1rem');
                }}
                className={
                  radius === 1
                    ? 'bg-accent text-accent-foreground flex-1'
                    : 'flex-1'
                }
              >
                1
              </Button>
            </div>

            <div className="mb-1">
              <Label>Theme</Label>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button
                variant={'outline'}
                onClick={() => {
                  setTheme('light');
                  themeActions.setTheme('light');
                }}
                className={
                  theme === 'light' ? 'bg-accent text-accent-foreground' : ''
                }
              >
                <Sun size={16} />
                Light
              </Button>
              <Button
                variant={'outline'}
                onClick={() => {
                  setTheme('dark');
                  themeActions.setTheme('dark');
                }}
                className={
                  theme === 'dark' ? 'bg-accent text-accent-foreground' : ''
                }
              >
                <Moon size={16} />
                Dark
              </Button>
            </div>
          </PopoverContent>
        </Popover>
      </div>
    </div>
  );
};

export const NavBar = ({ editor }: { editor: any }) => {
  const [lang, setlang] = useLocalStorageState('next-tiptap-lang', {
    defaultValue: 'en',
    listenStorageChange: true,
  });

  const [editorEditable, setEditorEditable] = useLocalStorageState(
    'next-tiptap-editorEditable',
    {
      defaultValue: true,
      listenStorageChange: true,
    },
  );

  useEffect(() => {
    localeActions.setLang((lang as any) || 'en');
  }, []);

  useEffect(() => {
    if (editor) {
      editor.on('update', () => {
        setEditorEditable(editor.isEditable);
      });
    }

    return () => {
      if (editor) {
        editor.off('update', () => {
          setEditorEditable(editor.isEditable);
        });
      }
    };
  }, [editor]);

  return (
    <div className="flex items-center gap-2 my-5">
      <Select
        onValueChange={(value) => {
          setlang(value);
          localeActions.setLang(value as any);
        }}
        defaultValue={lang}
      >
        <SelectTrigger className="max-w-[180px]">
          <SelectValue placeholder="Select language" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            <SelectItem value="vi">Vietnamese</SelectItem>
            <SelectItem value="en">English</SelectItem>
            <SelectItem value="zh_CN">Chinese</SelectItem>
            <SelectItem value="pt_BR">Português</SelectItem>
            <SelectItem value="hu_HU">Hungarian</SelectItem>
            <SelectItem value="fi">Finnish</SelectItem>
          </SelectGroup>
        </SelectContent>
      </Select>

      <Button
        variant={'ghost'}
        onClick={() => {
          editor?.setEditable(!editorEditable);
        }}
      >
        {editorEditable ? 'Readonly' : 'Editable'}
      </Button>

      <a
        href="https://github.com/hunghg255/reactjs-tiptap-editor-demo"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant={'ghost'}>Source Demo</Button>
      </a>

      <a
        href="https://reactjs-tiptap-editor.vercel.app/"
        target="_blank"
        rel="noopener noreferrer"
      >
        <Button variant={'ghost'}>Documentation</Button>
      </a>
    </div>
  );
};
