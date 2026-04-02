import { NavLink } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Calendar,
  Clock,
  FileText,
  Receipt,
  DollarSign,
  Users,
  HardHat,
  FolderOpen,
  BarChart3,
  Settings,
  ClipboardList,
  FileCheck,
  ShieldCheck,
} from 'lucide-react';

const navSections = [
  {
    label: 'MAIN',
    links: [
      { to: '/', icon: LayoutDashboard, text: 'Dashboard' },
    ],
  },
  {
    label: 'WORK',
    links: [
      { to: '/projects', icon: FolderKanban, text: 'Projects' },
      { to: '/scheduling', icon: Calendar, text: 'Scheduling' },
      { to: '/time-tracking', icon: Clock, text: 'Time Tracking' },
      { to: '/change-orders', icon: ClipboardList, text: 'Change Orders' },
    ],
  },
  {
    label: 'FINANCE',
    links: [
      { to: '/estimates', icon: FileText, text: 'Estimates' },
      { to: '/invoices', icon: Receipt, text: 'Invoices' },
      { to: '/pay-applications', icon: FileCheck, text: 'Pay Applications' },
      { to: '/lien-waivers', icon: ShieldCheck, text: 'Lien Waivers' },
      { to: '/job-costing', icon: DollarSign, text: 'Job Costing' },
    ],
  },
  {
    label: 'PEOPLE',
    links: [
      { to: '/clients', icon: Users, text: 'Clients' },
      { to: '/subcontractors', icon: HardHat, text: 'Subcontractors' },
    ],
  },
  {
    label: 'OTHER',
    links: [
      { to: '/documents', icon: FolderOpen, text: 'Documents' },
      { to: '/reports', icon: BarChart3, text: 'Reports' },
      { to: '/settings', icon: Settings, text: 'Settings' },
    ],
  },
];

function Sidebar() {
  return (
    <aside
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        width: 260,
        height: '100vh',
        background: '#0f172a',
        display: 'flex',
        flexDirection: 'column',
        padding: '1.5rem 0.75rem',
        overflowY: 'auto',
        zIndex: 50,
      }}
    >
      {/* Logo */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0 0.75rem', marginBottom: '2rem' }}>
        <HardHat size={28} color="#f59e0b" />
        <div>
          <div style={{ color: '#fff', fontWeight: 700, fontSize: '1.1rem', lineHeight: 1.2 }}>
            Boulder
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: 500 }}>
            Construction
          </div>
        </div>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {navSections.map((section) => (
          <div key={section.label}>
            <div
              style={{
                fontSize: '0.65rem',
                fontWeight: 600,
                color: '#64748b',
                textTransform: 'uppercase',
                letterSpacing: '0.05em',
                padding: '0 0.75rem',
                marginBottom: '0.375rem',
              }}
            >
              {section.label}
            </div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.125rem' }}>
              {section.links.map(({ to, icon: Icon, text }) => (
                <NavLink
                  key={to}
                  to={to}
                  end={to === '/'}
                  className={({ isActive }) =>
                    `sidebar-link${isActive ? ' active' : ''}`
                  }
                >
                  <Icon size={18} />
                  {text}
                </NavLink>
              ))}
            </div>
          </div>
        ))}
      </nav>

      {/* User section */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          padding: '0.75rem',
          borderTop: '1px solid rgba(255,255,255,0.08)',
          marginTop: '0.75rem',
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: '50%',
            background: '#f59e0b',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: '#fff',
            fontWeight: 700,
            fontSize: '0.8rem',
            flexShrink: 0,
          }}
        >
          MT
        </div>
        <div>
          <div style={{ color: '#fff', fontSize: '0.875rem', fontWeight: 600, lineHeight: 1.2 }}>
            Mike Thornton
          </div>
          <div style={{ color: '#94a3b8', fontSize: '0.75rem' }}>
            Admin
          </div>
        </div>
      </div>
    </aside>
  );
}

export default Sidebar;
