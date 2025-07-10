import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import LogManager from './LogManager';

const LogModal = ({ show, onClose, script, type = 'script' }) => {
  const [selectedHost, setSelectedHost] = useState(null);
  const {
    sessions,
    selectedSession,
    logs,
    loading,
    fetchLogs,
    getStatusIcon,
    setSelectedSession,
    setLogs,
    itemName
  } = LogManager({ show, onClose, item: script, type });

  // Reset selected host when session changes or modal closes
  useEffect(() => {
    if (!selectedSession || !show) {
      setSelectedHost(null);
    }
  }, [selectedSession, show]);

  // 格式化session名称显示，统一为YYYY-MM-DD_HH:mm:ss格式
  const formatSessionName = (sessionName) => {
    const parts = sessionName.split('_');
    
    if (type === 'ansible') {
      // Ansible使用Unix时间戳，转换为YYYY-MM-DD_HH:mm:ss格式
      if (parts.length >= 2) {
        const timestamp = parts[parts.length - 1];
        if (/^\d+$/.test(timestamp)) {
          const date = new Date(parseInt(timestamp) * 1000);
          const year = date.getFullYear();
          const month = String(date.getMonth() + 1).padStart(2, '0');
          const day = String(date.getDate()).padStart(2, '0');
          const hours = String(date.getHours()).padStart(2, '0');
          const minutes = String(date.getMinutes()).padStart(2, '0');
          const seconds = String(date.getSeconds()).padStart(2, '0');
          const formattedTime = `${year}-${month}-${day}_${hours}:${minutes}:${seconds}`;
          return sessionName.replace(timestamp, formattedTime);
        }
      }
    }
    // Shell脚本已经是正确格式，直接返回
    return sessionName;
  };

  return (
    <Modal 
      isOpen={show} 
      onClose={onClose}
      title={!selectedSession ? `${script?.name} - 日志` : (
        <div className="flex items-center gap-3">
          <button 
            className="px-4 py-2 text-sm bg-black hover:bg-gray-800 text-white rounded-lg transition-colors"
            onClick={() => {
              setSelectedSession(null);
              setLogs([]);
            }}
          >
            返回
          </button>
          <span>执行详情 - {formatSessionName(selectedSession)}</span>
        </div>
      )}
    >
      <div className="max-h-96 overflow-y-auto -mt-6">
        {!selectedSession ? (
          <div>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-foreground-secondary">暂无执行记录</div>
            ) : (
              <div className="space-y-3">
                {sessions.map((session, index) => (
                  <div 
                    key={session.id} 
                    className="p-4 bg-card rounded-xl border border-gray-200/30 cursor-pointer dark:border-gray-700/30"
                    onClick={() => fetchLogs(session.session_name)}
                  >
                    <div className="font-medium text-foreground mb-2">{formatSessionName(session.session_name)}</div>
                    <div className="text-sm text-foreground-secondary">
                      {new Date(session.created_at).toLocaleString()}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div>
                {/* Host tabs */}
                <div className="flex flex-wrap gap-2 mb-6 border-b border-border">
                  {[...new Set(logs.map(log => log.host))].map((host) => (
                    <button
                      key={host}
                      onClick={() => setSelectedHost(host)}
                      className={`flex items-center gap-2 px-4 py-2 rounded-t-lg transition-all duration-200 border-b-2 ${
                        selectedHost === host || (selectedHost === null && host === logs[0]?.host)
                          ? 'bg-card text-foreground border-foreground'
                          : 'bg-background-secondary text-foreground-secondary hover:bg-background-tertiary hover:text-foreground border-transparent'
                      }`}
                    >
                      <span>{host}</span>
                      {getStatusIcon(logs.find(log => log.host === host)?.status)}
                    </button>
                  ))}
                </div>

                {/* Log content for selected host */}
                {(() => {
                  const currentHost = selectedHost || logs[0]?.host;
                  const hostLogs = logs.filter(log => log.host === currentHost);
                  const currentLog = hostLogs[0];

                  if (!currentLog) return null;

                  return (
                    <div>
                      {currentLog.output && (
                        <pre className="text-xs bg-background p-3 rounded border border-border text-foreground font-mono whitespace-pre-wrap">
                          {currentLog.output}
                        </pre>
                      )}
                      
                      {currentLog.error && (
                        <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 font-mono whitespace-pre-wrap mt-3">
                          {currentLog.error}
                        </pre>
                      )}
                    </div>
                  );
                })()}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default LogModal;