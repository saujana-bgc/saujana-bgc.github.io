export const adminNavigation = [
  { id: 'birthday-calendar', title: 'Birthday calendar', description: 'Check birthdays and greeting preferences.', to: '/admin/birthday-club', group: 'Community' },
  { id: 'riichi-overview', title: 'Riichi Open overview', description: 'Review event status and organiser tasks.', to: '/admin/riichi-open', group: 'Riichi Open' },
  { id: 'riichi-registrations', title: 'Registrations and payment verification', description: 'Review receipt uploads and confirm payments.', to: '/admin/riichi-open#registrations', group: 'Riichi Open' },
  { id: 'riichi-participants', title: 'Participants and check-in', description: 'Manage the roster, attendance and substitutes.', to: '/admin/riichi-open#participants', group: 'Riichi Open' },
  { id: 'riichi-tables', title: 'Tables and seating', description: 'Draw tables and publish seat assignments.', to: '/admin/riichi-open#tables', group: 'Riichi Open' },
  { id: 'riichi-results', title: 'Enter results', description: 'Save table scores and penalty records.', to: '/admin/riichi-open#results', group: 'Riichi Open' },
  { id: 'riichi-certification', title: 'Certify rounds', description: 'Finish a round and publish its complete standings.', to: '/admin/riichi-open#certification', group: 'Riichi Open' },
  { id: 'riichi-history', title: 'History and exports', description: 'Review organiser actions and download records.', to: '/admin/riichi-open#history', group: 'Riichi Open' },
]

export const adminPageRoutes = ['/admin', '/admin/birthday-club', '/admin/riichi-open']
