import React, { useState } from 'react';
import { Sparkles, Loader2, Copy, Check } from 'lucide-react';
import { aiAPI } from '../services/api';
import Modal from './Modal';

const AISuggestionModal = ({ show, onClose, onApply, type = 'shell' }) => {
  const [requirement, setRequirement] = useState('');
  const [loading, setLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [copied, setCopied] = useState(false);

  const handleGenerate = async () => {
    if (!requirement.trim()) {
      alert('请输入需求描述');
      return;
    }

    setLoading(true);
    try {
      const response = await aiAPI.generateScriptSuggestion(requirement, type);
      setSuggestion(response.data);
    } catch (error) {
      console.error('AI建议生成失败:', error);
      alert('AI建议生成失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  const handleApply = () => {
    if (suggestion) {
      onApply({
        name: suggestion.name,
        content: suggestion.content
      });
      handleClose();
    }
  };

  const handleCopy = async () => {
    if (suggestion?.content) {
      try {
        await navigator.clipboard.writeText(suggestion.content);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      } catch (error) {
        console.error('复制失败:', error);
      }
    }
  };

  const handleClose = () => {
    setRequirement('');
    setSuggestion(null);
    setCopied(false);
    onClose();
  };

  return (
    <Modal isOpen={show} onClose={handleClose} title="AI智能建议">
      <div className="space-y-4">
        {/* 需求输入 */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            描述您的需求
          </label>
          <textarea
            className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent resize-none"
            rows="4"
            value={requirement}
            onChange={(e) => setRequirement(e.target.value)}
            placeholder={`请详细描述您想要实现的功能，例如：\n- 安装并配置Nginx\n- 批量创建用户账户\n- 监控系统资源使用情况\n- 自动备份数据库`}
            disabled={loading}
          />
        </div>

        {/* 生成按钮 */}
        <div className="flex justify-center">
          <button
            onClick={handleGenerate}
            disabled={loading || !requirement.trim()}
            className="btn-primary flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? (
              <Loader2 size={16} className="animate-spin" />
            ) : (
              <Sparkles size={16} />
            )}
            {loading ? '正在生成...' : '生成建议'}
          </button>
        </div>

        {/* AI建议结果 */}
        {suggestion && (
          <div className="space-y-4 border-t border-border pt-4">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-semibold text-foreground">
                {suggestion.name}
              </h3>
              <button
                onClick={handleCopy}
                className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-900/20"
                title="复制内容"
              >
                {copied ? <Check size={16} className="text-green-500" /> : <Copy size={16} />}
              </button>
            </div>
            
            {suggestion.message && (
              <p className="text-sm text-foreground-secondary">
                {suggestion.message}
              </p>
            )}
            
            <div className="bg-background-secondary rounded-lg p-4">
              <pre className="text-sm text-foreground-secondary font-mono whitespace-pre-wrap break-words max-h-96 overflow-y-auto">
                {suggestion.content}
              </pre>
            </div>
            
            <div className="flex justify-end gap-3">
              <button
                onClick={handleClose}
                className="btn-secondary"
              >
                取消
              </button>
              <button
                onClick={handleApply}
                className="btn-primary"
              >
                应用到表单
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default AISuggestionModal;