import React, { useState } from 'react';
import { AlertTriangle, CheckCircle, XCircle, Play } from 'lucide-react';
import Modal from './Modal';

const ExperimentalModal = ({ show, onClose, onContinue, experimentalResult, type = 'script' }) => {
  const [loading, setLoading] = useState(false);

  const handleContinue = async () => {
    setLoading(true);
    try {
      await onContinue();
    } finally {
      setLoading(false);
    }
  };

  if (!experimentalResult) return null;

  const isSuccess = experimentalResult.status === 'experimental_success';
  const experimentalLog = experimentalResult.experimental_result;

  return (
    <Modal isOpen={show} onClose={onClose} title="实验主机执行结果">
      <div className="space-y-6">
        {/* 状态指示器 */}
        <div className="flex items-center gap-3">
          {isSuccess ? (
            <CheckCircle className="w-8 h-8 text-green-500" />
          ) : (
            <XCircle className="w-8 h-8 text-red-500" />
          )}
          <div>
            <h3 className="text-lg font-semibold text-foreground">
              {isSuccess ? '实验主机执行成功' : '实验主机执行失败'}
            </h3>
            <p className="text-sm text-foreground-secondary">
              实验主机: {experimentalResult.experimental_host}
            </p>
          </div>
        </div>

        {/* 执行结果 */}
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">执行状态</label>
            <div className={`px-3 py-2 rounded-lg text-sm font-medium ${
              experimentalLog.status === 'success' 
                ? 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400'
                : 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
            }`}>
              {experimentalLog.status === 'success' ? '成功' : '失败'}
            </div>
          </div>

          {experimentalLog.output && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">执行输出</label>
              <div className="bg-background-secondary rounded-lg p-3 max-h-40 overflow-y-auto">
                <pre className="text-xs text-foreground-secondary font-mono whitespace-pre-wrap">
                  {experimentalLog.output}
                </pre>
              </div>
            </div>
          )}

          {experimentalLog.error && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">错误信息</label>
              <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3 max-h-40 overflow-y-auto">
                <pre className="text-xs text-red-700 dark:text-red-400 font-mono whitespace-pre-wrap">
                  {experimentalLog.error}
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* 操作按钮 */}
        <div className="flex justify-end gap-3 pt-4 border-t border-border">
          <button 
            type="button" 
            className="btn-secondary" 
            onClick={onClose}
          >
            关闭
          </button>
          
          {isSuccess && experimentalResult.remaining_hosts && experimentalResult.remaining_hosts.length > 0 && (
            <button 
              type="button" 
              className="btn-primary flex items-center gap-2" 
              onClick={handleContinue}
              disabled={loading}
            >
              {loading ? (
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
              ) : (
                <Play size={16} />
              )}
              继续执行剩余 {experimentalResult.remaining_hosts.length} 台主机
            </button>
          )}
        </div>

        {/* 警告提示 */}
        {isSuccess && (
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-4">
            <div className="flex items-start gap-3">
              <AlertTriangle className="w-5 h-5 text-yellow-600 dark:text-yellow-400 mt-0.5" />
              <div className="text-sm text-yellow-800 dark:text-yellow-200">
                <p className="font-medium mb-1">请确认实验主机执行结果</p>
                <p>如果实验主机的执行结果符合预期，请点击"继续执行"按钮在剩余主机上执行{type === 'script' ? '脚本' : 'Ansible Playbook'}。</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ExperimentalModal;