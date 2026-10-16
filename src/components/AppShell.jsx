import { useState } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../context/AuthContext'

/* ------------------------------------------------------------------ */
/* Icons — minimal inline SVGs approximating the lucide icons used in */
/* the Figma file (home, plus-circle, help-circle, grid, clipboard,   */
/* award, settings, search, bell, user-round-cog). For pixel-exact    */
/* icons, `npm install lucide-react` and swap these for the real set. */
/* ------------------------------------------------------------------ */

const icon = (path) => ({ className = '' }) => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
       strokeLinecap="round" strokeLinejoin="round" className={className}>
    {path}
  </svg>
)

const Icons = {
  Home: icon(<><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z" /><path d="M9 22V12h6v10" /></>),
  PlusCircle: icon(<><circle cx="12" cy="12" r="10" /><path d="M12 8v8M8 12h8" /></>),
  HelpCircle: icon(<><circle cx="12" cy="12" r="10" /><path d="M9.5 9a2.5 2.5 0 0 1 5 0c0 1.5-2 1.8-2 3.5" /><path d="M12 17h.01" /></>),
  Grid: icon(<><rect x="3" y="3" width="7" height="7" rx="1" /><rect x="14" y="3" width="7" height="7" rx="1" /><rect x="3" y="14" width="7" height="7" rx="1" /><rect x="14" y="14" width="7" height="7" rx="1" /></>),
  Clipboard: icon(<><rect x="5" y="4" width="14" height="17" rx="2" /><path d="M9 4V3a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v1" /></>),
  Award: icon(<><circle cx="12" cy="8" r="6" /><path d="M9 13.5 7 22l5-3 5 3-2-8.5" /></>),
  Settings: icon(<><circle cx="12" cy="12" r="3" /><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.6 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06A2 2 0 1 1 7.04 4.3l.06.06A1.65 1.65 0 0 0 9 4.6a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9c.14.32.4.57.72.7.3.12.63.16.95.1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" /></>),
  Search: icon(<><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></>),
  Bell: icon(<><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9" /><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0" /></>),
  Shield: icon(<><path d="M12 2 4 6v6c0 5 3.5 7.5 8 10 4.5-2.5 8-5 8-10V6z" /></>),
}

const LINKS = [
  { to: '/dashboard', label: 'Dashboard', Icon: Icons.Home },
  { to: '/report-found', label: 'Report Found', Icon: Icons.PlusCircle },
  { to: '/report-lost', label: 'Report Lost', Icon: Icons.HelpCircle },
  { to: '/items/lost', label: 'Item Gallery', Icon: Icons.Grid, matchPrefix: '/items' },
  { to: '/my-claims', label: 'My Claims', Icon: Icons.Clipboard },
  { to: '/leaderboard', label: 'Leaderboard', Icon: Icons.Award },
  { to: '/settings', label: 'Settings', Icon: Icons.Settings },
]

export default function AppShell() {
  const { profile, isAdmin, signOut } = useAuth()
  const navigate = useNavigate()
  const [mobileOpen, setMobileOpen] = useState(false)

  async function handleSignOut() {
    await signOut()
    navigate('/login')
  }

  const links = isAdmin ? [{ to: '/admin', label: 'Admin Desk', Icon: Icons.Shield }, ...LINKS] : LINKS

  return (
    <div className="min-h-screen bg-[#f4f6f9]">
      {/* Top bar — dark navy, matches Figma top-nav exactly */}
      <header className="sticky top-0 z-40 bg-[#0b2240] flex items-center justify-between px-4 md:px-8 py-3.5">
        <div className="flex items-center gap-3 shrink-0">
          <button
            onClick={() => setMobileOpen((v) => !v)}
            className="md:hidden h-8 w-8 flex items-center justify-center text-white"
            aria-label="Menu"
          >
            <span className="text-xl">{mobileOpen ? '✕' : '☰'}</span>
          </button>
          <NavLink to="/dashboard" className="flex items-center gap-3">
            <span className="bg-[#008080] p-1.5 rounded-lg shrink-0">
              <Icons.Shield className="h-5 w-5 text-white" />
            </span>
            <span className="hidden sm:flex flex-col leading-tight">
              <span className="font-extrabold text-white text-[16px]">MITSUKETA</span>
              <span className="font-semibold text-[#e6f2f2] text-[10px] uppercase opacity-80">
                PHINMA Union College
              </span>
            </span>
          </NavLink>
        </div>

        <div className="hidden md:flex items-center gap-2.5 bg-white/[0.13] rounded-lg px-4 py-2 w-full max-w-[400px] mx-6">
          <Icons.Search className="h-4 w-4 text-white/70 shrink-0" />
          <span className="text-[13px] text-white/70 truncate">Browsing item archive</span>
        </div>

        <div className="flex items-center gap-6 shrink-0">
          <div className="relative h-7 w-7 flex items-center justify-center text-white">
            <Icons.Bell className="h-5 w-5" />
            <span className="absolute -top-0.5 -right-0.5 bg-[#ef4444] text-white text-[10px] font-bold h-4 min-w-[15px] px-1 rounded-full flex items-center justify-center">
              3
            </span>
          </div>
          <button onClick={handleSignOut} className="flex items-center gap-2 group" title="Sign out">
            <span className="h-8 w-8 rounded-full bg-gray-200 overflow-hidden shrink-0">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="" className="w-full h-full object-cover" />
              ) : (
                <span className="w-full h-full flex items-center justify-center text-xs font-semibold text-gray-500">
                  {profile?.full_name?.[0] ?? '?'}
                </span>
              )}
            </span>
            <span className="hidden sm:block text-[13px] font-semibold text-white group-hover:underline">
              {profile?.full_name ?? '...'}
            </span>
          </button>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar — desktop */}
        <aside className="hidden md:flex flex-col gap-2 w-60 shrink-0 bg-white border-r border-[#e2e8f0] px-4 py-6 min-h-[calc(100vh-61px)]">
          {links.map((link) => (
            <SidebarTab key={link.to} {...link} />
          ))}
        </aside>

        {/* Sidebar — mobile drawer */}
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-30 flex">
            <div className="w-64 bg-white border-r border-[#e2e8f0] px-4 py-6 flex flex-col gap-2 overflow-y-auto">
              {links.map((link) => (
                <SidebarTab key={link.to} {...link} onClick={() => setMobileOpen(false)} />
              ))}
            </div>
            <div className="flex-1 bg-black/30" onClick={() => setMobileOpen(false)} />
          </div>
        )}

        <main className="flex-1 min-w-0">
          <Outlet />
        </main>
      </div>
    </div>
  )
}

function SidebarTab({ to, label, Icon, matchPrefix, onClick }) {
  const { pathname } = useLocation()
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) => {
        const active = matchPrefix ? pathname.startsWith(matchPrefix) : isActive
        return `flex items-center gap-3 px-4 py-3 rounded-lg text-[14px] transition ${
          active ? 'bg-[#e6f2f2] text-[#008080] font-bold' : 'text-[#1e293b] font-medium hover:bg-gray-50'
        }`
      }}
    >
      <Icon className="h-[18px] w-[18px] shrink-0" />
      <span className="flex-1">{label}</span>
    </NavLink>
  )
}