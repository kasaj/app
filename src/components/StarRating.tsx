import { Rating } from '../types';
import { loadMoodScale, MoodScaleItem } from '../utils/moodScale';

interface StarRatingProps {
  value: Rating | null;
  onChange: (rating: Rating) => void;
  size?: 'xs' | 'sm' | 'md' | 'lg';
  scale?: MoodScaleItem[];
}

export default function StarRating({ value, onChange, size = 'md', scale }: StarRatingProps) {
  const items = scale || loadMoodScale();

  const sizeClasses = {
    xs: 'text-xs gap-0.5',
    sm: 'text-lg gap-1',
    md: 'text-xl gap-1.5',
    lg: 'text-2xl gap-2',
  };

  return (
    <div className={`flex ${sizeClasses[size]}`}>
      {items.map(({ value: v, emoji }) => (
        <button
          key={v}
          type="button"
          onClick={() => onChange(v as Rating)}
          className={`transition-transform hover:scale-110 ${
            value === v ? 'opacity-100' : 'grayscale opacity-40'
          }`}
        >
          {emoji}
        </button>
      ))}
    </div>
  );
}
