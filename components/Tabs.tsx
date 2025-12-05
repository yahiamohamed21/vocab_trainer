// components/Tabs.tsx
'use client';

import { useUiSettings } from '@/context/UiSettingsContext';

export type TabId = 'training' | 'words' | 'quiz' | 'stats';

interface TabsProps {
  currentTab: TabId;
  onChange: (tab: TabId) => void;
}

export default function Tabs({ currentTab, onChange }: TabsProps) {
  const { uiLang } = useUiSettings();
  const isAr = uiLang === 'ar';

  const tabs: { id: TabId; label: string }[] = [
    {
      id: 'training',
      label: isAr ? 'تدريب سريع' : 'Quick training',
    },
    {
      id: 'words',
      label: isAr ? 'قائمة الكلمات' : 'Words list',
    },
    {
      id: 'quiz',
      label: isAr ? 'تمارين' : 'Quizzes',
    },
    {
      id: 'stats',
      label: isAr ? 'إحصائيات' : 'Stats',
    },
  ];

  return (
    <div className="mt-3 mb-2 flex flex-wrap justify-center gap-2">
      {tabs.map(tab => {
        const active = tab.id === currentTab;
        return (
          <button
            key={tab.id}
            onClick={() => onChange(tab.id)}
            className={[
              'inline-flex items-center justify-center rounded-full border px-3 py-1.5 text-[11px] md:text-xs font-medium transition-all',
              active
                ? 'border-sky-400 bg-sky-500/80 text-slate-950 shadow-md'
                : 'border-slate-700 bg-slate-900/70 text-slate-200 hover:border-sky-400 hover:text-sky-100',
            ].join(' ')}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
}
