import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

// Icons (SVG)
const DashboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V6zM4 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2H6a2 2 0 01-2-2v-2zM14 16a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
  </svg>
)

const LostIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
  </svg>
)

const FoundIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
  </svg>
)

const ClaimsIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
)

const LeaderboardIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
  </svg>
)

const LogoutIcon = () => (
  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
  </svg>
)

export default function SidebarLayout() {
  const { profile, signOut } = useAuth()
  const navigate = useNavigate()

  const navItems = [
    { label: 'Dashboard', path: '/dashboard', icon: <DashboardIcon /> },
    { label: 'Lost Items', path: '/items/lost', icon: <LostIcon /> },
    { label: 'Found Items', path: '/items/found', icon: <FoundIcon /> },
    { label: 'My Claims', path: '/my-claims', icon: <ClaimsIcon /> },
    { label: 'Leaderboard', path: '/leaderboard', icon: <LeaderboardIcon /> },
  ]

  async function handleLogout() {
    await signOut()
    navigate('/login')
  }

  const initial = profile?.full_name?.[0]?.toUpperCase() || 'U'

  return (
    <div className="flex min-h-screen bg-[#f4f6f9]">
      {/* Sidebar Container */}
      <aside className="w-64 bg-[#0b2240] text-white flex flex-col justify-between p-5 shrink-0 min-h-screen sticky top-0 shadow-lg">
        <div>
          {/* Brand Header */}
          <div className="flex items-center gap-3 px-2 mb-8">
            <div className="h-9 w-9 rounded-xl bg-[#008080] flex items-center justify-center font-bold text-lg text-white">
              M
            </div>
            <span className="font-bold text-lg tracking-wide text-white">MITSUKETA</span>
          </div>

          {/* User Profile Card (Matching Reference Design) */}
          <div className="flex flex-col items-center bg-white/5 rounded-2xl p-4 mb-6 border border-white/10 text-center">
            <div className="h-16 w-16 rounded-full bg-[#008080] border-2 border-white/20 flex items-center justify-center text-xl font-bold text-white mb-2 overflow-hidden shadow-inner">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                initial
              )}
            </div>
            <h3 className="font-semibold text-sm text-white truncate max-w-full">
              {profile?.full_name || 'User Profile'}
            </h3>
            <p className="text-xs text-gray-300 truncate max-w-full mt-0.5">
              {profile?.email || 'student@union.phinma.edu.ph'}
            </p>
          </div>

          {/* Navigation Menu */}
          <nav className="space-y-1.5">
            {navItems.map((item) => (
              <NavLink
                key={item.path}
                to={item.path}
                className={({ isActive }) =>
                  `flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium transition-all ${
                    isActive
                      ? 'bg-[#e6f2f2] text-[#0b2240] shadow-sm font-semibold'
                      : 'text-gray-300 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                {item.icon}
                <span>{item.label}</span>
              </NavLink>
            ))}
          </nav>
        </div>

        {/* Logout Button Pinned at Bottom */}
        <div className="pt-4 border-t border-white/10">
          <button
            onClick={handleLogout}
            className="w-full flex items-center gap-3.5 px-4 py-3 rounded-2xl text-sm font-medium text-gray-300 hover:text-red-400 hover:bg-red-500/10 transition"
          >
            <LogoutIcon />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      {/* Main Page Area */}
      <main className="flex-1 min-w-0 overflow-y-auto">
        <Outlet />
      </main>
    </div>
  )
}