import { useState, useEffect, useCallback } from 'react';
import { useLanguage } from '../i18n';
import { loadSettings, saveSettings } from '../utils/settings';
import { loadAllData } from '../utils/storage';
import { getActivityByType, loadActivities } from '../utils/activities';
import { DayEntry } from '../types';

function formatDate(dateStr: string, lang: string): string {
  const date = new Date(dateStr);
  return date.toLocaleDateString(lang === 'cs' ? 'cs-CZ' : 'en-US', {
    day: 'numeric',
    month: 'short',
    year: 'numeric'
  });
}

function formatTime(isoStr: string, lang: string): string {
  const date = new Date(isoStr);
  return date.toLocaleTimeString(lang === 'cs' ? 'cs-CZ' : 'en-US', { hour: '2-digit', minute: '2-digit' });
}

function formatDuration(seconds: number): string {
  const mins = Math.floor(seconds / 60);
  const secs = seconds % 60;
  if (mins === 0) return `${secs}s`;
  return secs > 0 ? `${mins}m ${secs}s` : `${mins}m`;
}

function generateHistoryMarkdown(data: DayEntry[], lang: string): string {
  const t = lang === 'cs'
    ? {
        date: 'Datum', activity: 'Aktivita', duration: 'Čas', rating: 'Hodnocení', note: 'Poznámka',
        summary: 'Shrnutí', totalActivities: 'Celkem aktivit', totalTime: 'Celkový čas',
        avgRating: 'Průměrné hodnocení', weeklyTitle: 'Týdenní přehled', records: 'Záznamy'
      }
    : {
        date: 'Date', activity: 'Activity', duration: 'Duration', rating: 'Rating', note: 'Note',
        summary: 'Summary', totalActivities: 'Total activities', totalTime: 'Total time',
        avgRating: 'Average rating', weeklyTitle: 'Weekly overview', records: 'Records'
      };

  // Calculate statistics
  let totalActivities = 0;
  let totalSeconds = 0;
  const ratings: number[] = [];

  data.forEach((day) => {
    day.activities.forEach((activity) => {
      totalActivities++;
      if (activity.actualDurationSeconds) {
        totalSeconds += activity.actualDurationSeconds;
      } else if (activity.durationMinutes) {
        totalSeconds += activity.durationMinutes * 60;
      }
      if (activity.ratingAfter) ratings.push(activity.ratingAfter);
      else if (activity.rating) ratings.push(activity.rating);
    });
  });

  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const avgRating = ratings.length > 0
    ? (ratings.reduce((sum, r) => sum + r, 0) / ratings.length).toFixed(1)
    : '-';

  // Calculate weekly stats (last 7 days)
  const today = new Date();
  const weekData: Array<{ day: string; count: number; avgRating: string }> = [];

  for (let i = 6; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    const dayEntry = data.find((d) => d.date === dateStr);

    const dayName = date.toLocaleDateString(lang === 'cs' ? 'cs-CZ' : 'en-US', { weekday: 'short', day: 'numeric', month: 'numeric' });
    const count = dayEntry ? dayEntry.activities.length : 0;

    let dayAvg = '-';
    if (dayEntry) {
      const dayRatings: number[] = [];
      dayEntry.activities.forEach((a) => {
        if (a.ratingAfter) dayRatings.push(a.ratingAfter);
        else if (a.rating) dayRatings.push(a.rating);
      });
      if (dayRatings.length > 0) {
        dayAvg = (dayRatings.reduce((sum, r) => sum + r, 0) / dayRatings.length).toFixed(1);
      }
    }

    weekData.push({ day: dayName, count, avgRating: dayAvg });
  }

  let md = `# PRA - ${lang === 'cs' ? 'Historie' : 'History'}\n\n`;
  md += `${lang === 'cs' ? 'Exportováno' : 'Exported'}: ${new Date().toLocaleString(lang === 'cs' ? 'cs-CZ' : 'en-US')}\n\n`;

  // Summary section
  md += `## ${t.summary}\n\n`;
  md += `| | |\n|---|---|\n`;
  md += `| **${t.totalActivities}** | ${totalActivities} |\n`;
  md += `| **${t.totalTime}** | ${hours > 0 ? `${hours}h ` : ''}${minutes}min |\n`;
  md += `| **${t.avgRating}** | ${avgRating} |\n\n`;

  // Weekly overview
  md += `## ${t.weeklyTitle}\n\n`;
  md += `| ${lang === 'cs' ? 'Den' : 'Day'} | ${lang === 'cs' ? 'Počet' : 'Count'} | ${t.avgRating} |\n`;
  md += `|-----|-------|----------|\n`;
  weekData.forEach((w) => {
    md += `| ${w.day} | ${w.count} | ${w.avgRating} |\n`;
  });
  md += '\n';

  // Records table
  md += `## ${t.records}\n\n`;
  md += `| ${t.date} | ${t.activity} | ${t.duration} | ${t.rating} | ${t.note} |\n`;
  md += `|----------|----------|----------|----------|----------|\n`;

  // Table rows
  data.forEach((day) => {
    day.activities.forEach((activity) => {
      const def = getActivityByType(activity.type);
      const isTimed = activity.durationMinutes !== null;

      const dateStr = `${formatDate(day.date, lang)} ${formatTime(activity.startedAt, lang)}`;
      const activityName = `${def?.emoji || ''} ${def?.name || activity.type}`;

      const duration = activity.actualDurationSeconds
        ? formatDuration(activity.actualDurationSeconds)
        : activity.durationMinutes
          ? `${activity.durationMinutes}m`
          : '-';

      let rating = '-';
      if (isTimed) {
        if (activity.ratingBefore || activity.ratingAfter) {
          rating = `${activity.ratingBefore || '-'}→${activity.ratingAfter || '-'}`;
        }
      } else if (activity.rating) {
        rating = '★'.repeat(activity.rating);
      }

      const note = isTimed
        ? (activity.noteAfter || activity.noteBefore || '-')
        : (activity.note || '-');

      md += `| ${dateStr} | ${activityName} | ${duration} | ${rating} | ${note.replace(/\|/g, '\\|').replace(/\n/g, ' ')} |\n`;
    });
  });

  return md;
}

function generateActivitiesMarkdown(lang: string): string {
  const activities = loadActivities();

  const t = lang === 'cs'
    ? { name: 'Název', emoji: 'Ikona', desc: 'Popis', duration: 'Délka', timed: 'Časová', moment: 'Okamžik' }
    : { name: 'Name', emoji: 'Icon', desc: 'Description', duration: 'Duration', timed: 'Timed', moment: 'Moment' };

  let md = `# PRA - ${lang === 'cs' ? 'Aktivity' : 'Activities'}\n\n`;
  md += `${lang === 'cs' ? 'Exportováno' : 'Exported'}: ${new Date().toLocaleString(lang === 'cs' ? 'cs-CZ' : 'en-US')}\n\n`;

  // Table header
  md += `| ${t.emoji} | ${t.name} | ${t.desc} | ${t.duration} |\n`;
  md += `|------|----------|----------|----------|\n`;

  // Table rows
  activities.forEach((activity) => {
    const duration = activity.durationMinutes
      ? `${activity.durationMinutes} min`
      : (lang === 'cs' ? t.moment : t.moment);

    md += `| ${activity.emoji} | ${activity.name} | ${activity.description.replace(/\|/g, '\\|')} | ${duration} |\n`;
  });

  return md;
}

function downloadFile(content: string, filename: string) {
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

export default function PageSettings() {
  const { language, setLanguage, t } = useLanguage();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const settings = loadSettings();
    setName(settings.name || '');
    setEmail(settings.email || '');
  }, []);

  const handleSave = () => {
    saveSettings({ language, name, email });
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  const handleExportHistory = useCallback(() => {
    const data = loadAllData();
    const markdown = generateHistoryMarkdown(data, language);
    downloadFile(markdown, `pra-history-${new Date().toISOString().split('T')[0]}.md`);
  }, [language]);

  const handleExportActivities = useCallback(() => {
    const markdown = generateActivitiesMarkdown(language);
    downloadFile(markdown, `pra-activities-${new Date().toISOString().split('T')[0]}.md`);
  }, [language]);

  return (
    <div className="page-container">
      <header className="mb-6">
        <h1 className="font-serif text-3xl text-clay-800">{t.settings.title}</h1>
      </header>

      <div className="space-y-6">
        {/* Jazyk */}
        <section className="card">
          <h2 className="font-serif text-lg text-clay-800 mb-4">
            {t.settings.language}
          </h2>
          <div className="flex gap-3">
            <button
              onClick={() => setLanguage('cs')}
              className={`flex-1 py-3 px-4 rounded-xl border transition-colors ${
                language === 'cs'
                  ? 'bg-forest-100 border-forest-400 text-forest-700'
                  : 'bg-cream-100 border-clay-200 text-clay-600 hover:border-clay-300'
              }`}
            >
              Čeština
            </button>
            <button
              onClick={() => setLanguage('en')}
              className={`flex-1 py-3 px-4 rounded-xl border transition-colors ${
                language === 'en'
                  ? 'bg-forest-100 border-forest-400 text-forest-700'
                  : 'bg-cream-100 border-clay-200 text-clay-600 hover:border-clay-300'
              }`}
            >
              English
            </button>
          </div>
        </section>

        {/* Profil */}
        <section className="card">
          <h2 className="font-serif text-lg text-clay-800 mb-4">
            {t.settings.profile}
          </h2>
          <div className="space-y-4">
            <div>
              <label className="block text-sm text-clay-600 mb-2">
                {t.settings.name}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder={t.settings.namePlaceholder}
                className="w-full p-3 rounded-xl bg-cream-100 border border-clay-200
                         focus:outline-none focus:border-forest-400
                         text-clay-800 placeholder:text-clay-400"
              />
            </div>
            <div>
              <label className="block text-sm text-clay-600 mb-2">
                {t.settings.email}
              </label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder={t.settings.emailPlaceholder}
                className="w-full p-3 rounded-xl bg-cream-100 border border-clay-200
                         focus:outline-none focus:border-forest-400
                         text-clay-800 placeholder:text-clay-400"
              />
            </div>
          </div>
        </section>

        <button
          onClick={handleSave}
          className="btn-primary w-full"
        >
          {saved ? `${t.settings.saved} ✓` : t.settings.save}
        </button>

        {/* Export */}
        <section className="card">
          <h2 className="font-serif text-lg text-clay-800 mb-4">
            {t.settings.export}
          </h2>
          <div className="space-y-3">
            <button
              onClick={handleExportHistory}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-cream-100 border border-clay-200
                       hover:border-clay-300 transition-colors text-left"
            >
              <svg className="w-5 h-5 text-clay-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <div>
                <div className="text-clay-800 font-medium">{t.settings.exportHistory}</div>
                <div className="text-sm text-clay-500">{t.settings.exportHistoryDesc}</div>
              </div>
            </button>
            <button
              onClick={handleExportActivities}
              className="w-full flex items-center gap-3 p-3 rounded-xl bg-cream-100 border border-clay-200
                       hover:border-clay-300 transition-colors text-left"
            >
              <svg className="w-5 h-5 text-clay-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
                  d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              <div>
                <div className="text-clay-800 font-medium">{t.settings.exportActivities}</div>
                <div className="text-sm text-clay-500">{t.settings.exportActivitiesDesc}</div>
              </div>
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}
