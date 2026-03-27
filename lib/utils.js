// Shared utilities

export const MOODS = [
  { id: 'happy',  emoji: '😊', label: 'Happy' },
  { id: 'good',   emoji: '🙂', label: 'Good' },
  { id: 'tired',  emoji: '😴', label: 'Tired' },
  { id: 'sad',    emoji: '😢', label: 'Sad' },
  { id: 'unwell', emoji: '🤒', label: 'Not Well' },
];

export const NEEDS = [
  { id: 'shopping',  emoji: '🛒', label: 'Shopping' },
  { id: 'newspaper', emoji: '📰', label: 'Newspaper' },
  { id: 'bills',     emoji: '💳', label: 'Bill Help' },
  { id: 'internet',  emoji: '💻', label: 'Internet Task' },
];

export function getMood(id)  { return MOODS.find(m => m.id === id); }
export function getNeed(id)  { return NEEDS.find(n => n.id === id); }

export function timeAgo(isoString) {
  if (!isoString) return 'Never';
  const diff  = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  < 1)  return 'Just now';
  if (mins  < 60) return `${mins} minute${mins !== 1 ? 's' : ''} ago`;
  if (hours < 24) return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
  return `${days} day${days !== 1 ? 's' : ''} ago`;
}

export function formatTime(isoString) {
  if (!isoString) return '';
  const d = new Date(isoString);
  return (
    d.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) +
    ' on ' +
    d.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'long' })
  );
}

export function generateCode() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join('');
}

export function getCardClass(type) {
  return { okay: 'card-okay', help: 'card-help', sos: 'card-sos', mood: 'card-mood', needs: 'card-needs' }[type] || 'card-default';
}

export function getStatusIcon(type) {
  return { okay: '✅', help: '🙋', sos: '🆘', mood: '😊', needs: '🛒' }[type] || '—';
}

export function getStatusText(type) {
  return {
    okay:  "I'm Okay",
    help:  'Needs Help',
    sos:   'SOS — Emergency!',
    mood:  'Shared Mood',
    needs: 'Has Requests',
  }[type] || 'No check-in yet';
}

export function getHistoryText(checkin) {
  const needLabels = (checkin.needs || []).map(id => getNeed(id)?.label || id).join(', ');
  return {
    okay:  "Said they're okay",
    help:  'Asked for help',
    sos:   'Sent an SOS alert',
    mood:  `Feeling ${getMood(checkin.mood)?.label || checkin.mood}`,
    needs: `Needs: ${needLabels}`,
  }[checkin.type] || 'Activity';
}
