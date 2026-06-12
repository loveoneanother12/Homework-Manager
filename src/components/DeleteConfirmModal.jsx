import { useState } from 'react';

// 위험 삭제 확인 모달.
// requireType이 true면 대상 이름을 정확히 입력해야 삭제 버튼이 활성화된다 —
// Enter 한 번에 통과되는 confirm()과 달리 의도적 행동을 강제한다.
export default function DeleteConfirmModal({
  title, targetName, lines = [], requireType = false,
  confirmLabel = '삭제', onConfirm, onCancel,
}) {
  const [typed, setTyped] = useState('');
  const [deleting, setDeleting] = useState(false);
  const canDelete = !requireType || typed === targetName;

  async function handleConfirm() {
    if (!canDelete || deleting) return;
    setDeleting(true);
    try { await onConfirm(); } finally { setDeleting(false); }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4" onClick={onCancel}>
      <div
        className="bg-white rounded-xl shadow-xl w-full max-w-md p-6 space-y-4"
        onClick={e => e.stopPropagation()}>
        <h3 className="font-bold text-gray-900 text-lg">{title}</h3>

        <div className="space-y-1.5 text-sm text-gray-600">
          {lines.map((l, i) => <p key={i}>{l}</p>)}
        </div>

        {requireType && (
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              삭제하려면 <b className="text-red-600">{targetName}</b> 을(를) 입력하세요
            </label>
            <input
              autoFocus
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-red-500"
              value={typed}
              onChange={e => setTyped(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') handleConfirm(); }}
              placeholder={targetName}
            />
          </div>
        )}

        <div className="flex gap-2 justify-end pt-1">
          <button onClick={onCancel}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 transition-colors">
            취소
          </button>
          <button onClick={handleConfirm} disabled={!canDelete || deleting}
            className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
              canDelete && !deleting
                ? 'bg-red-600 text-white hover:bg-red-700'
                : 'bg-red-100 text-red-300 cursor-not-allowed'
            }`}>
            {deleting ? '삭제 중…' : confirmLabel}
          </button>
        </div>
      </div>
    </div>
  );
}
