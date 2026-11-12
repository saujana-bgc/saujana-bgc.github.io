export const adminNavigation = [
  { id: 'dashboard', title: 'Dashboard', to: '/admin' },
  { id: 'birthday-calendar', title: 'Birthday Club calendar', to: '/admin/birthday-club' },
  { id: 'riichi-overview', title: 'Riichi Open I', to: '/admin/riichi-open' },
  { id: 'botc-archive', title: 'Only Blood in the Clocktower', to: '/admin/only-blood-in-the-clocktower' },
]

export const adminDashboardGroups = [
  {
    id: 'community',
    title: 'Community',
    links: [
      { title: 'Birthday Club calendar', description: 'Check birthdays and greeting preferences.', to: '/admin/birthday-club' },
      { title: 'Only Blood in the Clocktower', description: 'Log games and publish gathering recaps.', to: '/admin/only-blood-in-the-clocktower' },
    ],
  },
  {
    id: 'riichi-open',
    title: 'Riichi Open I',
    overview: { label: 'Open tournament overview', to: '/admin/riichi-open' },
    links: [
      { title: 'Registrations', description: 'Review receipts and verify payments.', to: '/admin/riichi-open#registrations' },
      { title: 'Participants and check-in', description: 'Manage the roster, attendance and substitutes.', to: '/admin/riichi-open#participants' },
      { title: 'Tables and seating', description: 'Check seat assignments and enter table scores.', to: '/admin/riichi-open#tables' },
      { title: 'Penalties', description: 'Record tournament penalties and their reasons.', to: '/admin/riichi-open#results' },
      { title: 'Round certification', description: 'Review saved scores and publish the round results.', to: '/admin/riichi-open#certification' },
      { title: 'History and exports', description: 'Review organiser actions and download records.', to: '/admin/riichi-open#history' },
    ],
  },
]

export const adminPageRoutes = ['/admin', '/admin/birthday-club', '/admin/riichi-open', '/admin/only-blood-in-the-clocktower']
