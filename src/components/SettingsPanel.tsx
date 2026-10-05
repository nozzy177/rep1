import { useState } from 'react';
import { Settings } from '../types';

interface Props {
  settings: Settings;
  onSave: (settings: Settings) => void;
}

export default function SettingsPanel({ settings, onSave }: Props) {
  const [localSettings, setLocalSettings] = useState<Settings>(settings);
  const [saved, setSaved] = useState(false);

  const handleSave = () => {
    onSave(localSettings);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="p-5">
      <h2 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
        <svg className="w-5 h-5 text-purple-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
        Settings
      </h2>

      {/* API URL */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-1.5">API Endpoint URL</label>
        <input
          type="url"
          value={localSettings.apiUrl}
          onChange={(e) => setLocalSettings({ ...localSettings, apiUrl: e.target.value })}
          placeholder="https://your-api.com/api/clip"
          className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
        />
        <p className="text-xs text-slate-500 mt-1">The URL where clipped content will be sent via POST</p>
      </div>

      {/* API Key */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-1.5">API Key (optional)</label>
        <input
          type="password"
          value={localSettings.apiKey}
          onChange={(e) => setLocalSettings({ ...localSettings, apiKey: e.target.value })}
          placeholder="Bearer token or API key"
          className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-white placeholder-slate-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
        />
        <p className="text-xs text-slate-500 mt-1">Sent as Authorization: Bearer header</p>
      </div>

      {/* Format */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-1.5">Output Format</label>
        <select
          value={localSettings.format}
          onChange={(e) => setLocalSettings({ ...localSettings, format: e.target.value as Settings['format'] })}
          className="w-full px-3 py-2.5 bg-slate-700/50 border border-slate-600/50 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500/50 transition-all"
        >
          <option value="markdown">Markdown</option>
          <option value="html">HTML</option>
          <option value="text">Plain Text</option>
        </select>
      </div>

      {/* Include Options */}
      <div className="mb-4">
        <label className="block text-sm font-medium text-slate-300 mb-2">Include in Output</label>
        <div className="space-y-2">
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={localSettings.includeTitle}
              onChange={(e) => setLocalSettings({ ...localSettings, includeTitle: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500/50"
            />
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Page Title</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={localSettings.includeUrl}
              onChange={(e) => setLocalSettings({ ...localSettings, includeUrl: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500/50"
            />
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Page URL</span>
          </label>
          <label className="flex items-center gap-3 cursor-pointer group">
            <input
              type="checkbox"
              checked={localSettings.includeDate}
              onChange={(e) => setLocalSettings({ ...localSettings, includeDate: e.target.checked })}
              className="w-4 h-4 rounded bg-slate-700 border-slate-600 text-purple-500 focus:ring-purple-500/50"
            />
            <span className="text-sm text-slate-300 group-hover:text-white transition-colors">Clip Date</span>
          </label>
        </div>
      </div>

      {/* Request Preview */}
      <div className="mb-4 bg-slate-900/50 rounded-lg p-3 border border-slate-600/30">
        <p className="text-xs font-medium text-slate-400 mb-2">Request Preview:</p>
        <pre className="text-[11px] text-slate-400 font-mono overflow-x-auto">
{`POST ${localSettings.apiUrl || 'https://your-api.com/api/clip'}
Content-Type: application/json
${localSettings.apiKey ? `Authorization: Bearer ${localSettings.apiKey.substring(0, 8)}...` : ''}

{
  "url": "https://...",
  "title": "Page Title",
  "content": "# Markdown...",
  "format": "${localSettings.format}",
  "clippedAt": "2024-..."
}`}
        </pre>
      </div>

      {/* Save Button */}
      <button
        onClick={handleSave}
        className={`w-full py-2.5 px-4 rounded-xl font-semibold text-white transition-all duration-200 flex items-center justify-center gap-2 ${
          saved
            ? 'bg-green-500 shadow-lg shadow-green-500/25'
            : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 shadow-lg shadow-purple-500/25'
        }`}
      >
        {saved ? (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Saved!
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            Save Settings
          </>
        )}
      </button>
    </div>
  );
}
