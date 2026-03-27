import { ActivityDefinition } from '../types';
import { useLanguage } from '../i18n';

interface ActivityCardProps {
  activity: ActivityDefinition;
  onClick: () => void;
  completedToday?: boolean;
}

export default function ActivityCard({ activity, onClick, completedToday }: ActivityCardProps) {
  const { t } = useLanguage();

  return (
    <button
      onClick={onClick}
      className="card w-full text-left transition-colors"
      style={{ backgroundColor: 'var(--bg-card)' }}
      onMouseEnter={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-input)'}
      onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'var(--bg-card)'}
    >
      <div className="flex items-center gap-3">
        <span className="text-2xl">{activity.emoji}</span>
        <span className="font-serif text-themed-primary flex-1">{activity.name}</span>
        {completedToday && (
          <span className="w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'var(--accent-solid)' }}>
            <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
            </svg>
          </span>
        )}
        {activity.durationMinutes && (
          <span className="text-sm text-themed-accent-solid bg-themed-accent px-2 py-0.5 rounded-full">
            {activity.durationMinutes} {t.today.min}
          </span>
        )}
      </div>
    </button>
  );
}
