import { ClipHistoryItem } from '../types';

interface Props {
  history: ClipHistoryItem[];
  onClear: () => void;
}

export default function HistoryPanel({ history, onClear }: Props) {
  const copyMarkdown = (md: string) => {
    navigator.clipboard.writeText(md);
  };

  const formatDate = (ts: number) => {
    const d = new Date(ts);
    return d.toLocaleDateString() + ' ' + d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="p-5">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-semibold text-white flex items-center gap-2">
          <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Clip History
        </h2>
        {history.length > 0 && (
          <button
            onClick={onClear}
            className="text-xs text-red-400 hover:text-red-300 transition-colors flex items-center gap-1"
          >
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Clear
          </button>
        )}
      </div>

      {history.length === 0 ? (
        <div className="text-center py-8">
          <svg className="w-12 h-12 text-slate-600 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
          <p className="text-sm text-slate-400">No clips yet</p>
          <p className="text-xs text-slate-500 mt-1">Clip a page to see it here</p>
        </div>
      ) : (
        <div className="space-y-2 max-h-80 overflow-y-auto pr-1">
          {history.map((item) => (
            <div
              key={item.id}
              className={`p-3 rounded-lg border transition-all ${
                item.status === 'success'
                  ? 'bg-slate-700/30 border-slate-600/30 hover:border-slate-500/50'
                  : 'bg-red-500/5 border-red-500/20'
              }`}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-white truncate">{item.title}</p>
                  <p className="text-xs text-slate-400 truncate mt-0.5">{item.url}</p>
                  <p className="text-[10px] text-slate-500 mt-1">{formatDate(item.timestamp)}</p>
                </div>
                <div className="flex items-center gap-1">
                  {item.status === 'success' ? (
                    <span className="w-2 h-2 rounded-full bg-green-400" />
                  ) : (
                    <span className="w-2 h-2 rounded-full bg-red-400" />
                  )}
                  {item.markdown && (
                    <button
                      onClick={() => copyMarkdown(item.markdown)}
                      className="p-1 text-slate-400 hover:text-white transition-colors"
                      title="Copy markdown"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                      </svg>
                    </button>
                  )}
                </div>
              </div>
              {item.errorMessage && (
                <p className="text-xs text-red-400 mt-1">{item.errorMessage}</p>
              )}
            </div>
          ))}
        </div>
      )}

      {history.length > 0 && (
        <p className="text-xs text-slate-500 text-center mt-3">
          {history.length} clip{history.length !== 1 ? 's' : ''} in history
        </p>
      )}
    </div>
  );
}
