import { Link, useLocation } from 'react-router-dom';

const NAV = [
  { to: '/',          label: '반 목록' },
  { to: '/units',     label: '단원 관리' },
  { to: '/sentences', label: '문장 풀 관리' },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();

  return (
    <div className="min-h-screen flex flex-col">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-indigo-700 text-lg tracking-tight">
            과제 채점 시스템
          </Link>
          <nav className="flex gap-1">
            {NAV.map(({ to, label }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  pathname === to
                    ? 'bg-indigo-50 text-indigo-700'
                    : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6">{children}</main>
    </div>
  );
}
