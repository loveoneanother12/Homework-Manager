import { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';

const NAV_PRIMARY = [
  { to: '/',       label: '채점',       icon: '📝' },
  { to: '/manage', label: '학생/반 관리', icon: '👥' },
  { to: '/trash',  label: '휴지통',      icon: '🗑', muted: true },
];

const NAV_SECONDARY = [
  { to: '/units',     label: '단원 관리',    icon: '📚' },
  { to: '/sentences', label: '문장 풀 관리', icon: '💬' },
];

const NAV_ALL = [
  { to: '/',          label: '채점' },
  { to: '/manage',    label: '학생/반 관리' },
  { to: '/units',     label: '단원 관리' },
  { to: '/sentences', label: '문장 풀 관리' },
  { to: '/trash',     label: '휴지통', muted: true },
];

export default function Layout({ children }) {
  const { pathname } = useLocation();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const drawerRef = useRef(null);

  // 외부 클릭 시 드로어 닫기
  useEffect(() => {
    if (!drawerOpen) return;
    function handleClick(e) {
      if (drawerRef.current && !drawerRef.current.contains(e.target)) {
        setDrawerOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [drawerOpen]);

  // 경로 변경 시 드로어 닫기
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  const isSecondaryActive = NAV_SECONDARY.some(n => n.to === pathname);

  return (
    <div className="min-h-screen flex flex-col">
      {/* ── 헤더 ── */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-5xl mx-auto px-4 h-14 flex items-center justify-between">
          <Link to="/" className="font-bold text-indigo-700 text-lg tracking-tight">
            과제 채점 시스템
          </Link>

          {/* PC 내비게이션 */}
          <nav className="hidden md:flex gap-1">
            {NAV_ALL.map(({ to, label, muted }) => (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  pathname === to
                    ? muted ? 'bg-gray-100 text-gray-600' : 'bg-indigo-50 text-indigo-700'
                    : muted ? 'text-gray-400 hover:bg-gray-50 hover:text-gray-500' : 'text-gray-600 hover:bg-gray-100'
                }`}
              >
                {label}
              </Link>
            ))}
          </nav>

          {/* 모바일 햄버거 버튼 */}
          <button
            className="md:hidden flex flex-col items-center justify-center w-10 h-10 rounded-xl bg-gray-100 gap-1.5"
            onClick={() => setDrawerOpen(v => !v)}
            aria-label="메뉴 열기"
          >
            <span className={`block w-4.5 h-0.5 bg-gray-600 rounded transition-all duration-200 ${drawerOpen ? 'rotate-45 translate-y-2' : ''}`} />
            <span className={`block w-4.5 h-0.5 bg-gray-600 rounded transition-all duration-200 ${drawerOpen ? 'opacity-0' : ''}`} />
            <span className={`block w-4.5 h-0.5 bg-gray-600 rounded transition-all duration-200 ${drawerOpen ? '-rotate-45 -translate-y-2' : ''}`} />
          </button>
        </div>
      </header>

      {/* 모바일 드로어 오버레이 */}
      {drawerOpen && (
        <div className="md:hidden fixed inset-0 z-30 bg-black/25" onClick={() => setDrawerOpen(false)} />
      )}

      {/* 모바일 드로어 */}
      <div
        ref={drawerRef}
        className={`md:hidden fixed top-14 right-0 z-40 w-52 bg-white shadow-xl rounded-bl-2xl border-l border-b border-gray-100 transition-transform duration-200 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}
      >
        <div className="p-3 flex flex-col gap-1">
          {NAV_SECONDARY.map(({ to, label, icon }) => (
            <Link
              key={to}
              to={to}
              className={`flex items-center gap-3 px-4 py-3 rounded-xl text-sm font-semibold transition-colors ${
                pathname === to
                  ? 'bg-indigo-50 text-indigo-700'
                  : 'text-gray-700 hover:bg-gray-50'
              }`}
            >
              <span className="text-base">{icon}</span>
              {label}
            </Link>
          ))}
        </div>
      </div>

      {/* 본문 — 모바일은 하단 탭바 높이만큼 여백 */}
      <main className="flex-1 max-w-5xl mx-auto w-full px-4 py-6 pb-24 md:pb-6">
        {children}
      </main>

      {/* 모바일 하단 탭바 */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-20 bg-white border-t border-gray-200 flex">
        {NAV_PRIMARY.map(({ to, label, icon, muted }) => {
          const active = pathname === to;
          return (
            <Link
              key={to}
              to={to}
              className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-colors ${
                active
                  ? muted ? 'text-gray-600' : 'text-indigo-600'
                  : muted ? 'text-gray-300' : 'text-gray-400'
              }`}
            >
              <span className="text-xl leading-none">{icon}</span>
              {label}
              {active && (
                <span className={`w-1 h-1 rounded-full ${muted ? 'bg-gray-500' : 'bg-indigo-600'}`} />
              )}
            </Link>
          );
        })}

        {/* 더보기(햄버거) 탭 */}
        <button
          onClick={() => setDrawerOpen(v => !v)}
          className={`flex-1 flex flex-col items-center justify-center gap-1 py-2 text-[10px] font-semibold transition-colors ${
            isSecondaryActive ? 'text-indigo-600' : 'text-gray-400'
          }`}
        >
          <span className="text-xl leading-none">☰</span>
          더보기
          {isSecondaryActive && <span className="w-1 h-1 rounded-full bg-indigo-600" />}
        </button>
      </nav>
    </div>
  );
}
