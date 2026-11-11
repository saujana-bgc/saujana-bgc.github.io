export const adminNavigation = [
  { id: 'birthday-calendar', title: 'Birthday Club calendar', to: '/admin/birthday-club' },
  { id: 'riichi-overview', title: 'Riichi Open I', to: '/admin/riichi-open' },
  { id: 'botc-archive', title: 'Only Blood in the Clocktower', to: '/admin/only-blood-in-the-clocktower' },
]

export const adminDashboardLinks = [
  { id: 'birthday-calendar', title: 'Birthday Club calendar', description: 'Check birthdays and greeting preferences.', to: '/admin/birthday-club', group: 'Community' },
  { id: 'riichi-overview', title: 'Riichi Open I overview', description: 'Review event status and organiser tasks.', to: '/admin/riichi-open', group: 'Riichi Open I' },
  { id: 'botc-archive', title: 'Only Blood in the Clocktower', description: 'Log games and publish gathering recaps.', to: '/admin/only-blood-in-the-clocktower', group: 'Community' },
  { id: 'riichi-registrations', title: 'Registrations', description: 'Review receipts and verify payments.', to: '/admin/riichi-open#registrations', group: 'Riichi Open I' },
  { id: 'riichi-participants', title: 'Participants and check-in', description: 'Manage the roster, attendance and substitutes.', to: '/admin/riichi-open#participants', group: 'Riichi Open I' },
  { id: 'riichi-tables', title: 'Tables and seating', description: 'Draw tables and publish seat assignments.', to: '/admin/riichi-open#tables', group: 'Riichi Open I' },
  { id: 'riichi-results', title: 'Enter results', description: 'Save table scores and penalty records.', to: '/admin/riichi-open#tables', group: 'Riichi Open I' },
  { id: 'riichi-certification', title: 'Certify rounds', description: 'Finish a round and publish its complete standings.', to: '/admin/riichi-open#certification', group: 'Riichi Open I' },
  { id: 'riichi-history', title: 'History and exports', description: 'Review organiser actions and download records.', to: '/admin/riichi-open#history', group: 'Riichi Open I' },
]

export const adminPageRoutes = ['/admin', '/admin/birthday-club', '/admin/riichi-open', '/admin/only-blood-in-the-clocktower']
