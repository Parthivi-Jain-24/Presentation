const BASE_THEME = {
  ink: '142C38', muted: '5D7377', paper: 'FAF6EE', white: 'FFFFFF',
  green: '6E9F77', teal: '2D7A73', mint: 'E4F0E8', coral: 'E37562',
  gold: 'E6B965', rose: 'F5E2DC', blue: 'E7EFF1', line: 'D7E0DA',
  purple: '706893', lavender: 'EDEAF4', dark: '10283A', pale: 'F7F4EC',
};

const SUBJECT_THEMES = {
  biology: {
    ink: '283B31', muted: '687A6D', paper: 'F7F5EC', white: 'FFFDF8',
    green: '67865F', teal: '3F7058', mint: 'E5EFDF', coral: 'C7775E',
    gold: 'D8AD61', rose: 'F2E3DC', blue: 'E8EEE6', line: 'D8E2D4',
    purple: '77718A', lavender: 'ECE9EF', dark: '193A31', pale: 'F1F0E6',
  },
  physics: {
    ink: '18344A', muted: '627B8C', paper: 'F0F5F8', white: 'FFFFFF',
    green: '368C91', teal: '287B94', mint: 'DBEEF0', coral: 'DE795E',
    gold: 'E3B75C', rose: 'F2E2DC', blue: 'DCEAF2', line: 'CEDDE5',
    purple: '6878A2', lavender: 'E6EAF4', dark: '112E45', pale: 'EAF1F4',
  },
  chemistry: {
    ink: '352F48', muted: '776E83', paper: 'F5F1F8', white: 'FFFFFF',
    green: '648B79', teal: '6D5A8B', mint: 'E9E3F1', coral: 'CE725F',
    gold: 'D9B15B', rose: 'F1E1E7', blue: 'E3EAF0', line: 'DFD7E7',
    purple: '70588F', lavender: 'ECE6F4', dark: '2C2942', pale: 'F0EDF5',
  },
  mathematics: {
    ink: '382545', muted: '766178', paper: 'FFF6E8', white: 'FFFFFF',
    green: '258C6E', teal: '147D8C', mint: 'DDF4E7', coral: 'EA665F',
    gold: 'F0B43C', rose: 'FBE1E4', blue: 'DDF0F8', line: 'E5D7C8',
    purple: '7455C8', lavender: 'EEE5FF', dark: '2D1C46', pale: 'F8E8C9',
  },
  social: {
    ink: '40382D', muted: '807363', paper: 'F7F1E7', white: 'FFFCF6',
    green: '71805D', teal: '4F756B', mint: 'E7E8D8', coral: 'C67358',
    gold: 'D5A44E', rose: 'F2E2D6', blue: 'E7E9E2', line: 'E0D8C9',
    purple: '7B6A75', lavender: 'EFE8E9', dark: '342F2A', pale: 'F1EBDD',
  },
  english: {
    ink: '443541', muted: '806B76', paper: 'FBF3EE', white: 'FFFCF9',
    green: '737C68', teal: '8B596E', mint: 'EFE7DF', coral: 'CB6F5D',
    gold: 'D5A752', rose: 'F3E1DD', blue: 'EAE7E8', line: 'E8DCD7',
    purple: '795E84', lavender: 'EEE6F1', dark: '392E3D', pale: 'F6ECE7',
  },
  robotics: {
    ink: '20364A', muted: '647C8C', paper: 'EFF4F7', white: 'FFFFFF',
    green: '3B8B91', teal: '28758E', mint: 'DDEDEF', coral: 'E07B5E',
    gold: 'E4B35D', rose: 'F2E1DB', blue: 'DDEBF2', line: 'CFDDE5',
    purple: '6A79A0', lavender: 'E8EAF3', dark: '122A3D', pale: 'E9F0F4',
  },
};

export function normalizeSubject(subject = '') {
  const value = String(subject).trim().toLowerCase();
  if (value.includes('biolog') || value === 'evs') return 'biology';
  if (value.includes('physic')) return 'physics';
  if (value.includes('chem')) return 'chemistry';
  if (value.includes('math')) return 'mathematics';
  if (value.includes('history') || value.includes('geography') || value.includes('social')
      || value.includes('econom') || value.includes('political')) return 'social';
  if (value.includes('english') || value.includes('language')) return 'english';
  if (value.includes('robot')) return 'robotics';
  return 'default';
}

export function getSubjectTheme(subject = '') {
  return { ...BASE_THEME, ...(SUBJECT_THEMES[normalizeSubject(subject)] || {}) };
}

export function isBiologySubject(subject = '') {
  return normalizeSubject(subject) === 'biology';
}
