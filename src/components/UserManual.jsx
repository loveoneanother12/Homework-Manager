import { useState, useEffect, useRef } from 'react';

const BASE = import.meta.env.BASE_URL;
const m = (name) => `${BASE}manual/mobile/${name}`;
const p = (name) => `${BASE}manual/pc/${name}`;

// ── 워크플로우 정의 ────────────────────────────────────────────────────────────

const WORKFLOWS = [
  {
    id: 'grading',
    title: '채점',
    icon: '📝',
    mobile: [
      {
        img: m('grading-1.png'),
        title: '채점 홈에서 반 선택',
        desc: '채점 탭(첫 화면)에 전체 반 목록이 표시됩니다. \'오늘 수업만 보기\' 토글이나 요일 필터로 원하는 반을 빠르게 찾고, 카드를 탭합니다.',
        tip: '\'오늘 수업만 보기\' 토글을 켜두면 해당 요일 반만 표시되어 매일 빠르게 접근할 수 있습니다.',
      },
      {
        img: m('grading-2.png'),
        title: '날짜·숙제 목록 확인',
        desc: '‹ › 버튼으로 날짜를 이동하면 해당 날짜의 숙제 목록이 나타납니다. 프리셋이 설정된 반은 숙제가 자동 생성되며, + 숙제 추가로 직접 추가할 수도 있습니다.',
        tip: '반별 상세 화면에서도 그 날짜의 숙제 채점 화면으로 바로 이동할 수 있습니다.',
      },
      {
        img: m('grading-3.png'),
        title: '학생별 채점 입력',
        desc: '숙제 카드를 탭하면 채점 화면으로 이동합니다. 각 학생의 이행률·정답률이 표시되며, 채점 입력 버튼을 눌러 문제 수·오답 수를 입력합니다.',
        tip: '이전에 같은 숙제명으로 채점한 적이 있으면 단원이 자동으로 선택됩니다.',
      },
      {
        img: m('grading-4.png'),
        title: '여러 숙제 채점',
        desc: '같은 날짜에 1교시·2교시 등 여러 숙제가 있을 때, 각각 별도로 채점합니다. 숙제 목록에서 카드를 탭해 교시별로 이동합니다.',
      },
      {
        img: m('grading-5.png'),
        title: '평가서 미리보기 · PDF 출력',
        desc: '채점 화면 상단의 \'평가서 미리보기 / PDF\' 버튼을 누르면 반 전체 평가서가 표시됩니다. 자동 생성된 코멘트를 직접 수정하고, PDF로 저장해 인쇄하거나 공유할 수 있습니다.',
        tip: '코멘트는 입력 후 자동 저장되므로, 실수로 화면을 닫아도 내용이 유지됩니다.',
      },
    ],
    pc: [
      {
        img: p('grading-1.png'),
        title: '채점 홈에서 반 선택',
        desc: '상단 내비게이션의 \'채점\'을 클릭하면 반 목록이 표시됩니다. 검색창이나 요일 필터로 원하는 반을 찾고 카드를 클릭합니다.',
        tip: '\'오늘 수업만 보기\' 토글을 켜두면 해당 요일 반만 표시되어 매일 빠르게 접근할 수 있습니다.',
      },
      {
        img: p('grading-2.png'),
        title: '날짜·숙제 목록 확인',
        desc: '‹ › 버튼으로 날짜를 이동하면 해당 날짜의 숙제 목록이 나타납니다. 프리셋이 설정된 반은 숙제가 자동 생성됩니다.',
        tip: '반별 상세 화면에서도 그 날짜의 숙제 채점 화면으로 바로 이동할 수 있습니다.',
      },
      {
        img: p('grading-3.png'),
        title: '학생별 채점 입력',
        desc: '숙제 카드를 클릭하면 채점 화면으로 이동합니다. 넓은 화면에서 여러 학생의 채점 결과를 한눈에 확인할 수 있습니다.',
        tip: '이전에 같은 숙제명으로 채점한 적이 있으면 단원이 자동으로 선택됩니다.',
      },
      {
        img: p('grading-4.png'),
        title: '여러 숙제 채점',
        desc: '같은 날짜에 1교시·2교시 등 여러 숙제가 있을 때, 각각 별도로 채점합니다. 숙제 목록에서 카드를 클릭해 교시별로 이동합니다.',
      },
      {
        img: p('grading-5.png'),
        title: '평가서 미리보기 · PDF 출력',
        desc: '채점 화면 상단의 \'평가서 미리보기 / PDF\' 버튼을 누르면 반 전체 평가서가 표시됩니다. 자동 생성된 코멘트를 직접 수정하고, PDF로 저장합니다.',
        tip: '코멘트는 입력 후 자동 저장되므로, 실수로 화면을 닫아도 내용이 유지됩니다.',
      },
    ],
  },
  {
    id: 'manage',
    title: '학생/반 관리',
    icon: '👥',
    mobile: [
      {
        img: m('manage-1.png'),
        title: '학생/반 관리 메뉴 진입',
        desc: '하단 탭바에서 \'학생/반 관리\'를 탭합니다. 반 목록과 전체 학생 목록이 한 화면에 표시됩니다.',
      },
      {
        img: m('manage-2.png'),
        title: '새 반 추가',
        desc: '반 관리 영역의 + 반 추가 버튼을 누릅니다. 반 이름, 담당 강사, 수업 요일을 입력하고 추가를 누르면 채점 홈에 새 반 카드가 생성됩니다.',
        tip: '요일을 여러 개 지정하면 채점 홈의 요일 필터에 모두 반응합니다.',
      },
      {
        img: m('manage-3.png'),
        title: '반 상세 · 학생 구성원 관리',
        desc: '반 행을 탭하면 반 상세 화면으로 이동합니다. 구성원 목록이 표시되며, 학생 이름을 검색해 반에 추가하거나 × 버튼으로 제거할 수 있습니다.',
        tip: '학생 이름을 탭하면 해당 학생의 전체 이력 페이지로 바로 이동합니다.',
      },
      {
        img: m('manage-4.png'),
        title: '숙제 프리셋 · 날짜별 평가서',
        desc: '반 상세 하단에서 숙제 프리셋을 관리합니다. 프리셋을 설정하면 해당 날짜에 처음 진입 시 숙제가 자동 생성됩니다.',
        tip: '날짜별 평가서 목록에서 과거 수업의 평가서를 바로 열어 확인하거나 PDF로 저장할 수 있습니다.',
      },
    ],
    pc: [
      {
        img: p('manage-1.png'),
        title: '학생/반 관리 메뉴 진입',
        desc: '상단 내비게이션의 \'학생/반 관리\'를 클릭합니다. 반 목록과 전체 학생 목록이 한 화면에 표시됩니다.',
      },
      {
        img: p('manage-2.png'),
        title: '새 반 추가',
        desc: '반 관리 영역의 + 반 추가 버튼을 누릅니다. 반 이름, 담당 강사, 수업 요일을 입력하고 추가를 누르면 채점 홈에 새 반 카드가 생성됩니다.',
      },
      {
        img: p('manage-3.png'),
        title: '반 상세 · 학생 구성원 관리',
        desc: '반 행을 클릭하면 반 상세 화면으로 이동합니다. 구성원 목록이 표시되며, 학생 이름을 검색해 반에 추가하거나 × 버튼으로 제거할 수 있습니다.',
        tip: '학생 이름을 클릭하면 해당 학생의 전체 이력 페이지로 바로 이동합니다.',
      },
      {
        img: p('manage-4.png'),
        title: '숙제 프리셋 · 날짜별 평가서',
        desc: '반 상세 하단에서 숙제 프리셋을 관리합니다. 프리셋을 설정하면 해당 날짜에 처음 진입 시 숙제가 자동 생성됩니다.',
      },
    ],
  },
  {
    id: 'history',
    title: '학생 이력',
    icon: '📊',
    mobile: [
      {
        img: m('history-1.png'),
        title: '학생 이력 접근',
        desc: '\'학생/반 관리\' 화면의 학생 이름을 탭하면 해당 학생의 이력 페이지로 이동합니다.',
        tip: '채점 화면의 학생 이름 옆 버튼을 탭해도 이력 페이지로 바로 이동할 수 있습니다.',
      },
      {
        img: m('history-2.png'),
        title: '반·숙제별 채점 기록',
        desc: '학생이 속한 반의 채점 기록이 숙제별로 정리되어 표시됩니다. 이행률·정답률 막대와 함께 오답 유형, 회차 정보를 한눈에 확인합니다.',
      },
      {
        img: m('history-3.png'),
        title: '8주 추이 그래프',
        desc: '채점 이력이 3회 이상 쌓이면 최근 8주간 점수 변화를 꺾은선 그래프로 볼 수 있습니다. 1교시(빨강)·2교시(파랑)가 구분되어 학습 추이를 파악하기 쉽습니다.',
        tip: '학생 상세 화면에서 각 과제별 추이를 그래프로 확인할 수 있습니다.',
      },
    ],
    pc: [
      {
        img: p('history-1.png'),
        title: '학생 이력 접근',
        desc: '\'학생/반 관리\' 화면의 학생 이름을 클릭하면 해당 학생의 이력 페이지로 이동합니다.',
        tip: '채점 화면의 학생 이름 옆 버튼을 클릭해도 이력 페이지로 바로 이동할 수 있습니다.',
      },
      {
        img: p('history-2.png'),
        title: '반·숙제별 채점 기록',
        desc: '학생이 속한 반의 채점 기록이 숙제별로 정리되어 표시됩니다. 넓은 화면에서 여러 숙제 기록을 나란히 확인할 수 있습니다.',
      },
      {
        img: p('history-3.png'),
        title: '8주 추이 그래프',
        desc: '채점 이력이 3회 이상 쌓이면 최근 8주간 점수 변화를 꺾은선 그래프로 볼 수 있습니다. 1교시(빨강)·2교시(파랑)가 구분되어 학습 추이를 파악하기 쉽습니다.',
      },
    ],
  },
  {
    id: 'units',
    title: '단원 관리',
    icon: '📚',
    mobile: [
      {
        img: m('units-1.png'),
        title: '단원 관리 메뉴 진입',
        desc: '하단 더보기(☰)를 탭한 뒤 \'단원 관리\'를 선택합니다. 과목별로 등록된 단원 목록이 표시됩니다.',
      },
      {
        img: m('units-2.png'),
        title: '단원 추가',
        desc: '+ 단원 추가 버튼을 눌러 과목·단원명·유형·세부 가중치를 설정합니다. 유형(계산정형/논증서술/그래프해석/활용응용/기본형)에 따라 점수 계산 방식이 달라집니다.',
        tip: '단원 유형을 올바르게 설정하면 평가서 코멘트가 해당 유형에 맞게 더 정확하게 생성됩니다.',
      },
      {
        img: m('units-3.png'),
        title: '채점 시 단원 연결',
        desc: '채점 화면에서 각 숙제에 단원을 연결할 수 있습니다. 단원이 지정되면 학생 이력 페이지에서 단원별 성취도를 분석하는 데 활용됩니다.',
        tip: '같은 숙제명으로 이전에 단원을 지정한 적이 있으면 다음번 채점 시 자동으로 선택됩니다.',
      },
    ],
    pc: [
      {
        img: p('units-1.png'),
        title: '단원 관리 메뉴 진입',
        desc: '상단 내비게이션의 \'단원 관리\'를 클릭합니다. 과목별로 등록된 단원 목록이 표시됩니다.',
      },
      {
        img: p('units-2.png'),
        title: '단원 추가',
        desc: '+ 단원 추가 버튼을 눌러 과목·단원명·유형·세부 가중치를 설정합니다. 유형(계산정형/논증서술/그래프해석/활용응용/기본형)에 따라 점수 계산 방식이 달라집니다.',
      },
      {
        img: p('units-3.png'),
        title: '채점 시 단원 연결',
        desc: '채점 화면에서 각 숙제에 단원을 연결할 수 있습니다. 단원이 지정되면 학생 이력 페이지에서 단원별 성취도를 분석하는 데 활용됩니다.',
      },
    ],
  },
  {
    id: 'sentences',
    title: '문장 풀 관리',
    icon: '💬',
    mobile: [
      {
        img: m('sentences-1.png'),
        title: '문장 풀 관리 메뉴 진입',
        desc: '하단 더보기(☰)를 탭한 뒤 \'문장 풀 관리\'를 선택합니다. 평가서 코멘트를 구성하는 6개 파트의 문장 목록이 표시됩니다.',
      },
      {
        img: m('sentences-2.png'),
        title: '문장 수정',
        desc: '수정할 문장 행의 편집(✏️) 버튼을 누르면 텍스트 입력 폼이 나타납니다. 내용을 바꾸고 저장하면 이후 생성되는 코멘트에 즉시 반영됩니다.',
        tip: '문장을 잘못 수정했다면 \'기본값으로 되돌리기\' 버튼으로 원래 문장을 복원할 수 있습니다.',
      },
      {
        img: m('sentences-3.png'),
        title: '평가서 코멘트에 반영',
        desc: '평가서 미리보기 화면에서 학생별 카드의 코멘트가 수정한 문장 풀 기반으로 자동 생성됩니다. 카드 안에서 직접 추가 수정도 가능합니다.',
        tip: '평가서에서 직접 수정한 코멘트는 문장 풀을 바꿔도 영향받지 않습니다.',
      },
    ],
    pc: [
      {
        img: p('sentences-1.png'),
        title: '문장 풀 관리 메뉴 진입',
        desc: '상단 내비게이션의 \'문장 풀 관리\'를 클릭합니다. 평가서 코멘트를 구성하는 6개 파트의 문장 목록이 표시됩니다.',
      },
      {
        img: p('sentences-2.png'),
        title: '문장 수정',
        desc: '수정할 문장 행의 편집(✏️) 버튼을 누르면 텍스트 입력 폼이 나타납니다. 내용을 바꾸고 저장하면 이후 생성되는 코멘트에 즉시 반영됩니다.',
      },
      {
        img: p('sentences-3.png'),
        title: '평가서 코멘트에 반영',
        desc: '평가서 미리보기 화면에서 학생별 카드의 코멘트가 수정한 문장 풀 기반으로 자동 생성됩니다. 카드 안에서 직접 추가 수정도 가능합니다.',
      },
    ],
  },
  {
    id: 'trash',
    title: '휴지통',
    icon: '🗑️',
    mobile: [
      {
        img: m('trash-1.png'),
        title: '휴지통 진입',
        desc: '하단 더보기(☰)를 탭한 뒤 \'휴지통\'을 선택합니다. 삭제된 반·학생·채점 기록이 카드 형태로 보관됩니다. 실수로 삭제한 항목을 복원할 수 있습니다.',
      },
      {
        img: m('trash-2.png'),
        title: '삭제 항목 상세 확인',
        desc: '카드를 탭하면 해당 숙제의 학생별 채점 기록이 펼쳐집니다. 개별 기록을 복원하거나 영구 삭제할 수 있습니다.',
        tip: '반이나 학생도 함께 삭제된 경우, 해당 반·학생을 먼저 복원해야 채점 기록을 복원할 수 있습니다.',
      },
      {
        img: m('trash-3.png'),
        title: '복원 · 영구 삭제',
        desc: '\'복원\' 버튼을 누르면 원래 자리로 되돌아갑니다. \'영구 삭제\'는 확인 후 완전히 제거되며 되돌릴 수 없습니다. 반이나 학생이 먼저 삭제된 경우 해당 항목을 먼저 복원해야 합니다.',
      },
    ],
    pc: [
      {
        img: p('trash-1.png'),
        title: '휴지통 진입',
        desc: '상단 내비게이션의 \'휴지통\'을 클릭합니다. 삭제된 반·학생·채점 기록이 카드 형태로 보관됩니다. 실수로 삭제한 항목을 복원할 수 있습니다.',
      },
      {
        img: p('trash-2.png'),
        title: '삭제 항목 상세 확인',
        desc: '카드를 클릭하면 해당 숙제의 학생별 채점 기록이 펼쳐집니다. 개별 기록을 복원하거나 영구 삭제할 수 있습니다.',
      },
      {
        img: p('trash-3.png'),
        title: '복원 · 영구 삭제',
        desc: '\'복원\' 버튼을 누르면 원래 자리로 되돌아갑니다. \'영구 삭제\'는 확인 후 완전히 제거되며 되돌릴 수 없습니다. 반이나 학생이 먼저 삭제된 경우 해당 항목을 먼저 복원해야 합니다.',
      },
    ],
  },
];

const PLATFORMS = [
  { id: 'mobile', label: '모바일', icon: '📱' },
  { id: 'pc',     label: 'PC·태블릿', icon: '🖥️' },
];

// ── 컴포넌트 ───────────────────────────────────────────────────────────────────

export default function UserManual({ onClose }) {
  const [platform, setPlatform] = useState(0);   // 0=모바일, 1=PC
  const [activeTab, setActiveTab] = useState(0);  // 0~3 워크플로우
  const [imgErrors, setImgErrors] = useState({});
  const modalRef = useRef(null);
  const scrollRef = useRef(null);

  // 플랫폼 변경 시 워크플로우 탭 초기화 + 스크롤 상단
  useEffect(() => {
    setActiveTab(0);
  }, [platform]);

  // 탭 변경 시 스크롤 상단 이동
  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = 0;
  }, [activeTab, platform]);

  // ESC 닫기
  useEffect(() => {
    function handleKey(e) { if (e.key === 'Escape') onClose(); }
    document.addEventListener('keydown', handleKey);
    return () => document.removeEventListener('keydown', handleKey);
  }, [onClose]);

  // 외부 클릭 닫기
  useEffect(() => {
    function handleClick(e) {
      if (modalRef.current && !modalRef.current.contains(e.target)) onClose();
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, [onClose]);

  // 배경 스크롤 잠금
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  const platformKey = PLATFORMS[platform].id;
  const workflow = WORKFLOWS[activeTab];
  const steps = workflow[platformKey];

  function handleImgError(key) {
    setImgErrors(prev => ({ ...prev, [key]: true }));
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/40 flex items-end sm:items-center justify-center p-0 sm:p-4">
      <div
        ref={modalRef}
        className="bg-white w-full sm:max-w-2xl sm:rounded-2xl rounded-t-2xl flex flex-col"
        style={{ maxHeight: '92dvh' }}
      >
        {/* ── 헤더 ── */}
        <div className="flex items-center justify-between px-5 pt-5 pb-4 flex-shrink-0">
          <div>
            <h2 className="text-lg font-bold text-gray-900">사용설명서</h2>
            <p className="text-xs text-gray-400 mt-0.5">주요 기능 작동 플로우 안내</p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-100 hover:bg-gray-200 text-gray-500 text-sm transition-colors"
            aria-label="닫기"
          >
            ✕
          </button>
        </div>

        {/* ── 상위 탭: 모바일 / PC·태블릿 ── */}
        <div className="px-5 pb-3 flex-shrink-0">
          <div className="flex gap-1.5 bg-gray-100 rounded-xl p-1">
            {PLATFORMS.map((pl, i) => (
              <button
                key={pl.id}
                onClick={() => setPlatform(i)}
                className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-sm font-semibold transition-all ${
                  platform === i
                    ? 'bg-white text-indigo-700 shadow-sm'
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span className="text-base leading-none">{pl.icon}</span>
                {pl.label}
              </button>
            ))}
          </div>
        </div>

        {/* ── 하위 탭: 워크플로우 4개 ── */}
        <div className="flex border-b border-gray-100 flex-shrink-0 overflow-x-auto scrollbar-none">
          {WORKFLOWS.map((wf, i) => (
            <button
              key={wf.id}
              onClick={() => setActiveTab(i)}
              className={`flex items-center gap-1.5 px-4 py-2.5 text-sm font-medium whitespace-nowrap border-b-2 transition-colors flex-shrink-0 ${
                activeTab === i
                  ? 'border-indigo-600 text-indigo-700'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              <span className="text-sm">{wf.icon}</span>
              {wf.title}
            </button>
          ))}
        </div>

        {/* ── 콘텐츠 ── */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          {steps.map((step, idx) => {
            const imgKey = `${platformKey}-${workflow.id}-${idx}`;
            const hasError = imgErrors[imgKey];
            return (
              <div key={imgKey} className="flex gap-4">
                {/* 스텝 번호 + 연결선 */}
                <div className="flex-shrink-0 flex flex-col items-center gap-1 pt-1">
                  <div className="w-7 h-7 rounded-full bg-indigo-600 text-white text-xs font-bold flex items-center justify-center">
                    {idx + 1}
                  </div>
                  {idx < steps.length - 1 && (
                    <div className="w-0.5 flex-1 bg-gray-200 min-h-[2rem]" />
                  )}
                </div>
                {/* 내용 */}
                <div className="flex-1 min-w-0 pb-2">
                  <h3 className="font-semibold text-gray-900 mb-2 text-sm">{step.title}</h3>
                  {/* 스크린샷 */}
                  <div className="rounded-xl overflow-hidden border border-gray-200 shadow-sm mb-2 bg-gray-50">
                    {!hasError ? (
                      <img
                        src={step.img}
                        alt={step.title}
                        className="w-full object-cover"
                        onError={() => handleImgError(imgKey)}
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex flex-col items-center justify-center h-36 text-gray-300 gap-2">
                        <span className="text-3xl">📸</span>
                        <span className="text-xs">스크린샷 준비 중</span>
                      </div>
                    )}
                  </div>
                  <p className="text-xs text-gray-500 leading-relaxed">{step.desc}</p>
                  {step.tip && (
                    <div className="mt-2 flex items-start gap-1.5 bg-amber-50 border border-amber-100 rounded-lg px-3 py-2">
                      <span className="text-amber-500 text-xs font-bold flex-shrink-0 mt-px">Tip!</span>
                      <p className="text-xs text-amber-700 leading-relaxed">{step.tip}</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
          <div className="h-4" />
        </div>
      </div>
    </div>
  );
}
