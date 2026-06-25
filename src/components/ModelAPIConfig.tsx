'use client';

import React, { useState, useEffect } from 'react';
import { Settings, Save, X, Eye, EyeOff, CheckCircle, AlertCircle, Loader } from 'lucide-react';

interface APIConfig {
  endpoint: string;
  apiKey: string;
  modelName: string;
  rateLimitPerMinute: number;
  logRequests: boolean;
  logResponses: boolean;
  enabled: boolean;
}

interface APIStats {
  totalRequests: number;
  totalResponses: number;
  averageLatency: number;
  modelsUsed: string[];
}

export const ModelAPIConfig: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [showApiKey, setShowApiKey] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [testingConnection, setTestingConnection] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState<'idle' | 'success' | 'error'>('idle');
  const [stats, setStats] = useState<APIStats | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const [config, setConfig] = useState<APIConfig>({
    endpoint: typeof window !== 'undefined' ? localStorage.getItem('modelApiEndpoint') || 'http://localhost:3000' : 'http://localhost:3000',
    apiKey: typeof window !== 'undefined' ? localStorage.getItem('modelApiKey') || '' : '',
    modelName: typeof window !== 'undefined' ? localStorage.getItem('modelName') || 'gemini-3.5-flash' : 'gemini-3.5-flash',
    rateLimitPerMinute: 60,
    logRequests: true,
    logResponses: true,
    enabled: true,
  });

  useEffect(() => {
    if (isOpen) {
      fetchStats();
    }
  }, [isOpen]);

  const fetchStats = async () => {
    try {
      const response = await fetch(`${config.endpoint}/api/interference/stats`);
      if (response.ok) {
        const data = await response.json();
        setStats(data);
        setConnectionStatus('success');
      } else {
        setConnectionStatus('error');
      }
    } catch (err) {
      setConnectionStatus('error');
      console.error('Failed to fetch stats:', err);
    }
  };

  const testConnection = async () => {
    setTestingConnection(true);
    setConnectionStatus('idle');
    try {
      const response = await fetch(`${config.endpoint}/api/interference/stats`);
      if (response.ok) {
        setConnectionStatus('success');
        setError(null);
        setSuccessMessage('Connection successful!');
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setConnectionStatus('error');
        setError('Failed to connect to endpoint');
      }
    } catch (err) {
      setConnectionStatus('error');
      setError(`Connection error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setTestingConnection(false);
    }
  };

  const handleSaveConfig = async () => {
    setIsSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      // Save to localStorage
      if (typeof window !== 'undefined') {
        localStorage.setItem('modelApiEndpoint', config.endpoint);
        localStorage.setItem('modelApiKey', config.apiKey);
        localStorage.setItem('modelName', config.modelName);
      }

      // Send to server
      const response = await fetch(`${config.endpoint}/api/interference/config`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
        },
        body: JSON.stringify({
          enabled: config.enabled,
          logRequests: config.logRequests,
          logResponses: config.logResponses,
          rateLimitPerMinute: config.rateLimitPerMinute,
        }),
      });

      if (response.ok) {
        setSuccessMessage('Configuration saved successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        await fetchStats();
      } else {
        throw new Error('Failed to save configuration');
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleClearLogs = async () => {
    try {
      const response = await fetch(`${config.endpoint}/api/interference/clear-logs`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-API-Key': config.apiKey,
        },
      });

      if (response.ok) {
        setSuccessMessage('Logs cleared successfully!');
        setTimeout(() => setSuccessMessage(null), 3000);
        await fetchStats();
      }
    } catch (err) {
      setError(`Error: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  return (
    <>
      {/* Floating Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-6 right-6 bg-gradient-to-r from-purple-600 to-blue-600 text-white rounded-full p-4 shadow-lg hover:shadow-xl transition-all hover:scale-110 z-40"
        title="Model API Configuration"
      >
        <Settings size={24} />
      </button>

      {/* Modal Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setIsOpen(false)}
        >
          {/* Modal Content */}
          <div
            className="bg-white rounded-lg shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <div className="sticky top-0 bg-gradient-to-r from-purple-600 to-blue-600 text-white px-6 py-4 flex items-center justify-between">
              <h2 className="text-2xl font-bold">Model API Configuration</h2>
              <button
                onClick={() => setIsOpen(false)}
                className="hover:bg-white/20 p-2 rounded-lg transition"
              >
                <X size={24} />
              </button>
            </div>

            <div className="p-6 space-y-6">
              {/* Status Messages */}
              {successMessage && (
                <div className="flex items-center gap-3 p-4 bg-green-50 border border-green-200 rounded-lg">
                  <CheckCircle className="text-green-600" size={20} />
                  <p className="text-green-800">{successMessage}</p>
                </div>
              )}

              {error && (
                <div className="flex items-center gap-3 p-4 bg-red-50 border border-red-200 rounded-lg">
                  <AlertCircle className="text-red-600" size={20} />
                  <p className="text-red-800">{error}</p>
                </div>
              )}

              {/* Connection Status */}
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-3">
                  <div
                    className={`w-3 h-3 rounded-full ${
                      connectionStatus === 'success'
                        ? 'bg-green-500'
                        : connectionStatus === 'error'
                        ? 'bg-red-500'
                        : 'bg-yellow-500'
                    }`}
                  />
                  <p className="text-sm font-medium text-blue-900">
                    Status:{' '}
                    <span
                      className={{
                        success: 'text-green-600',
                        error: 'text-red-600',
                        idle: 'text-yellow-600',
                      }[connectionStatus]}
                    >
                      {connectionStatus.charAt(0).toUpperCase() + connectionStatus.slice(1)}
                    </span>
                  </p>
                </div>
              </div>

              {/* API Endpoint */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  API Endpoint
                </label>
                <input
                  type="url"
                  value={config.endpoint}
                  onChange={(e) => setConfig({ ...config, endpoint: e.target.value })}
                  placeholder="http://localhost:3000"
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                />
              </div>

              {/* API Key */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  API Key
                </label>
                <div className="relative">
                  <input
                    type={showApiKey ? 'text' : 'password'}
                    value={config.apiKey}
                    onChange={(e) => setConfig({ ...config, apiKey: e.target.value })}
                    placeholder="Enter your API key"
                    className="w-full px-4 py-2 pr-12 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                  />
                  <button
                    type="button"
                    onClick={() => setShowApiKey(!showApiKey)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 transition"
                  >
                    {showApiKey ? <EyeOff size={20} /> : <Eye size={20} />}
                  </button>
                </div>
              </div>

              {/* Model Name */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Model Name
                </label>
                <select
                  value={config.modelName}
                  onChange={(e) => setConfig({ ...config, modelName: e.target.value })}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent transition"
                >
                  <option value="gemini-3.5-flash">Gemini 3.5 Flash</option>
                  <option value="gemini-3.1-flash-image-preview">Gemini 3.1 Flash Image</option>
                  <option value="veo-3.1-fast-generate-preview">Veo 3.1 Fast</option>
                </select>
              </div>

              {/* Rate Limit */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Rate Limit (requests per minute): {config.rateLimitPerMinute}
                </label>
                <input
                  type="range"
                  min="1"
                  max="1000"
                  value={config.rateLimitPerMinute}
                  onChange={(e) => setConfig({ ...config, rateLimitPerMinute: parseInt(e.target.value) })}
                  className="w-full"
                />
              </div>

              {/* Toggles */}
              <div className="space-y-3">
                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.enabled}
                    onChange={(e) => setConfig({ ...config, enabled: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Enable Model Interference</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.logRequests}
                    onChange={(e) => setConfig({ ...config, logRequests: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Log Requests</span>
                </label>

                <label className="flex items-center gap-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={config.logResponses}
                    onChange={(e) => setConfig({ ...config, logResponses: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded focus:ring-2 focus:ring-purple-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Log Responses</span>
                </label>
              </div>

              {/* Statistics */}
              {stats && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h3 className="font-semibold text-gray-900 mb-3">API Statistics</h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-sm text-gray-600">Total Requests</p>
                      <p className="text-2xl font-bold text-purple-600">{stats.totalRequests}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Responses</p>
                      <p className="text-2xl font-bold text-blue-600">{stats.totalResponses}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Avg Latency</p>
                      <p className="text-2xl font-bold text-green-600">{stats.averageLatency.toFixed(2)}ms</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Models Used</p>
                      <p className="text-sm font-mono text-gray-900">{stats.modelsUsed.join(', ') || 'None'}</p>
                    </div>
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex gap-3 pt-4 border-t">
                <button
                  onClick={testConnection}
                  disabled={testingConnection}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50"
                >
                  {testingConnection ? <Loader size={18} className="animate-spin" /> : null}
                  Test Connection
                </button>

                <button
                  onClick={handleClearLogs}
                  className="flex-1 px-4 py-2 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 transition font-medium"
                >
                  Clear Logs
                </button>

                <button
                  onClick={handleSaveConfig}
                  disabled={isSaving}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition disabled:opacity-50 font-medium"
                >
                  {isSaving ? <Loader size={18} className="animate-spin" /> : <Save size={18} />}
                  Save Config
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ModelAPIConfig;
