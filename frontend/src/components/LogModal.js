import React from 'react';
import Modal from './Modal';
import LogManager from './LogManager';

const LogModal = ({ show, onClose, script, type = 'script' }) => {
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

  return (
    <Modal 
      isOpen={show} 
      onClose={onClose}
      title={`执行日志 - ${script?.name}`}
    >
      <div className="max-h-96 overflow-y-auto">
        {!selectedSession ? (
          <div>
            <h3 className="text-lg font-medium text-foreground mb-4">执行记录</h3>
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : sessions.length === 0 ? (
              <div className="text-center py-8 text-foreground-secondary">暂无执行记录</div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {sessions.map((session) => (
                  <div 
                    key={session.id} 
                    className="p-4 bg-background-secondary rounded-lg border border-border hover:bg-background-tertiary cursor-pointer transition-colors"
                    onClick={() => fetchLogs(session.session_name)}
                  >
                    <div className="font-medium text-foreground mb-2">{session.session_name}</div>
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
            <div className="flex items-center gap-4 mb-6">
              <button 
                className="btn-secondary"
                onClick={() => {
                  setSelectedSession(null);
                  setLogs([]);
                }}
              >
                返回
              </button>
              <h3 className="text-lg font-medium text-foreground">执行详情 - {selectedSession}</h3>
            </div>
            
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : (
              <div className="space-y-4">
                {logs.map((log) => (
                  <div key={log.id} className="p-4 bg-background-secondary rounded-lg border border-border">
                    <div className="flex items-center gap-3 mb-3">
                      <span className="font-medium text-foreground">{log.host}</span>
                      {getStatusIcon(log.status)}
                      <span className={`text-sm font-medium ${
                        log.status === 'success' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {log.status === 'success' ? '成功' : '失败'}
                      </span>
                    </div>
                    
                    {log.output && (
                      <div className="mb-3">
                        <h4 className="text-sm font-medium text-foreground mb-2">输出:</h4>
                        <pre className="text-xs bg-background p-3 rounded border border-border text-foreground font-mono whitespace-pre-wrap">
                          {log.output}
                        </pre>
                      </div>
                    )}
                    
                    {log.error && (
                      <div>
                        <h4 className="text-sm font-medium text-red-600 dark:text-red-400 mb-2">错误:</h4>
                        <pre className="text-xs bg-red-50 dark:bg-red-900/20 p-3 rounded border border-red-200 dark:border-red-800 text-red-800 dark:text-red-200 font-mono whitespace-pre-wrap">
                          {log.error}
                        </pre>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Modal>
  );
};

export default LogModal;