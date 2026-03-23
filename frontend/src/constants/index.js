export const DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

export const DEFAULT_DATA = {
  subjects: [],
  timetable: { Mon: [], Tue: [], Wed: [], Thu: [], Fri: [], Sat: [] },
  attendance: {},
  dailyLog: {},
  phase: 'setup',
  lectureSettings: { durationMinutes: 60 },
}

export const TABS = [
  { id: 'setup',     label: 'Setup',     icon: 'Settings'    },
  { id: 'tracker',   label: 'Tracker',   icon: 'CheckSquare' },
  { id: 'analytics', label: 'Analytics', icon: 'BarChart2'   },
]
