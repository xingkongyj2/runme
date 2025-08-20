import React, { useState, useEffect } from 'react';
import { Plus, Search, Package, Eye, Edit, Trash2, Play, Copy } from 'lucide-react';
import { dockerTemplateAPI, hostGroupAPI, hostAPI } from '../services/api';
import Modal from '../components/Modal';
import ToastContainer from '../components/ToastContainer';
import CustomSelect from '../components/CustomSelect';
import useToast from '../hooks/useToast';

const DockerTemplates = () => {
  const [templates, setTemplates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [deletingTemplate, setDeletingTemplate] = useState(null);
  const [showExecuteModal, setShowExecuteModal] = useState(false);
  const [executingTemplate, setExecutingTemplate] = useState(null);
  const [hostGroups, setHostGroups] = useState([]);
  const [hosts, setHosts] = useState([]);
  const [selectedHostGroup, setSelectedHostGroup] = useState('');
  const [selectedHost, setSelectedHost] = useState('');
  const [executionResult, setExecutionResult] = useState('');
  const [executing, setExecuting] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    docker_command: ''
  });

  const { toasts, showSuccess, showError, hideToast } = useToast();

  useEffect(() => {
    fetchTemplates();
  }, []);

  const fetchTemplates = async () => {
    try {
      const response = await dockerTemplateAPI.getAll();
      const templatesData = response.data?.data || response.data || [];
      const validTemplates = Array.isArray(templatesData) ? templatesData : [];
      setTemplates(validTemplates);
    } catch (error) {
      console.error('Failed to fetch docker templates:', error);
      setTemplates([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const submitData = {
        name: formData.name,
        docker_command: formData.docker_command
      };
      
      if (editingTemplate) {
        await dockerTemplateAPI.update(editingTemplate.id, submitData);
      } else {
        await dockerTemplateAPI.create(submitData);
      }
      setShowModal(false);
      setEditingTemplate(null);
      setFormData({
        name: '',
        docker_command: ''
      });
      fetchTemplates();
    } catch (error) {
      console.error('Failed to save docker template:', error);
      showError('保存失败，请检查输入信息');
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name || '',
      docker_command: template.docker_command || ''
    });
    setShowModal(true);
  };

  const handleDeleteTemplate = async () => {
    if (deletingTemplate) {
      try {
        await dockerTemplateAPI.delete(deletingTemplate.id);
        fetchTemplates();
        setShowDeleteModal(false);
        setDeletingTemplate(null);
      } catch (error) {
        console.error('Failed to delete docker template:', error);
        showError('删除失败');
      }
    }
  };

  const handleDelete = (template) => {
    setDeletingTemplate(template);
    setShowDeleteModal(true);
  };

  const handleViewDetails = (template) => {
    setSelectedTemplate(template);
    setShowDetailModal(true);
  };

  const handleExecute = async (template) => {
    setExecutingTemplate(template);
    setShowExecuteModal(true);
    setSelectedHostGroup('');
    setSelectedHost('');
    setExecutionResult('');
    
    try {
      const response = await hostGroupAPI.getAll();
      setHostGroups(response.data?.data || []);
    } catch (error) {
      console.error('Failed to fetch host groups:', error);
      setHostGroups([]);
    }
  };

  const handleHostGroupChange = async (groupId) => {
    setSelectedHostGroup(groupId);
    setSelectedHost('');
    
    if (groupId) {
      try {
        const response = await hostAPI.getByGroupId(groupId);
        setHosts(response.data?.data || []);
      } catch (error) {
        console.error('Failed to fetch hosts:', error);
        setHosts([]);
      }
    } else {
      setHosts([]);
    }
  };

  const handleExecuteTemplate = async () => {
    if (!selectedHostGroup && !selectedHost) {
      showError('请选择主机组或主机');
      return;
    }

    setExecuting(true);
    setExecutionResult('执行中，请稍后...');

    try {
      let targetHost = selectedHost;
      
      // 如果没有选择具体主机，但选择了主机组，则使用主机组的第一台主机
      if (!targetHost && selectedHostGroup && hosts.length > 0) {
        targetHost = hosts[0].id;
      }
      
      if (!targetHost) {
        showError('未找到可执行的主机');
        setExecuting(false);
        return;
      }

      const response = await dockerTemplateAPI.execute(executingTemplate.id, {
        host_id: parseInt(targetHost),
        docker_command: executingTemplate.docker_command
      });

      setExecutionResult(response.data?.result || '执行完成');
    } catch (error) {
      console.error('Failed to execute template:', error);
      setExecutionResult(`执行失败: ${error.response?.data?.error || error.message}`);
    } finally {
      setExecuting(false);
    }
  };


  const filteredTemplates = Array.isArray(templates) ? templates.filter(template => 
    (template.name && template.name.toLowerCase().includes(searchTerm.toLowerCase())) ||
    (template.docker_command && template.docker_command.toLowerCase().includes(searchTerm.toLowerCase()))
  ) : [];

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 页面标题和主要操作 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Package size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Docker模板</h1>
        </div>
        <button 
          className="btn-primary flex items-center gap-2"
          onClick={() => setShowModal(true)}
        >
          <Plus size={16} />
          新建模板
        </button>
      </div>

      {/* 搜索区域 */}
      <div className="relative max-w-xs">
        <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-secondary" />
        <input
          type="text"
          placeholder="搜索模板名称或Docker命令"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 border border-gray-600 rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
        />
      </div>

      {/* 模板列表 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-foreground mb-3">{template.name}</h3>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleExecute(template)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                <Play className="w-4 h-4" />
                执行
              </button>
              <button
                onClick={() => handleViewDetails(template)}
                className="px-3 py-2 bg-background-secondary text-foreground border border-border rounded-lg hover:bg-background-secondary/80 transition-colors"
                title="查看详情"
              >
                <Eye className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleEdit(template)}
                className="px-3 py-2 bg-background-secondary text-foreground border border-border rounded-lg hover:bg-background-secondary/80 transition-colors"
                title="编辑模板"
              >
                <Edit className="w-4 h-4" />
              </button>
              <button
                onClick={() => handleDelete(template)}
                className="px-3 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
                title="删除模板"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-foreground-secondary">没有找到匹配的模板</p>
        </div>
      )}

      {/* 创建/编辑模板弹窗 */}
      <Modal
        isOpen={showModal}
        onClose={() => {
          setShowModal(false);
          setEditingTemplate(null);
          setFormData({
            name: '',
            docker_command: ''
          });
        }}
        title={editingTemplate ? '编辑模板' : '新建模板'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">模板名称</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              placeholder=""
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">Docker命令</label>
            <textarea
              value={formData.docker_command}
              onChange={(e) => setFormData({...formData, docker_command: e.target.value})}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
              placeholder=""
              rows={10}
              required
            />
            <p className="text-xs text-foreground-secondary mt-1">
              请输入完整的Docker命令，如：docker run、docker pull等
            </p>
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingTemplate(null);
                setFormData({
                  name: '',
                  docker_command: ''
                });
              }}
              className="px-4 py-2 bg-background-secondary text-foreground border border-border rounded-lg hover:bg-background-secondary/80 transition-colors"
            >
              取消
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
            >
              {editingTemplate ? '更新' : '创建'}
            </button>
          </div>
        </form>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal
        isOpen={showDeleteModal}
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingTemplate(null);
        }}
        title="删除模板"
      >
        <div className="space-y-4">
          <p className="text-foreground-secondary">
            确定要删除模板 <span className="font-medium text-foreground">{deletingTemplate?.name}</span> 吗？
          </p>
          <p className="text-sm text-destructive">此操作不可撤销。</p>
          <div className="flex justify-end gap-3">
            <button
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingTemplate(null);
              }}
              className="px-4 py-2 bg-background-secondary text-foreground border border-border rounded-lg hover:bg-background-secondary/80 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleDeleteTemplate}
              className="px-4 py-2 bg-destructive text-destructive-foreground rounded-lg hover:bg-destructive/90 transition-colors"
            >
              删除
            </button>
          </div>
        </div>
      </Modal>

      {/* 模板详情弹窗 */}
      <Modal
        isOpen={showDetailModal}
        onClose={() => {
          setShowDetailModal(false);
          setSelectedTemplate(null);
        }}
        title={selectedTemplate?.name || ''}
      >
        {selectedTemplate && (
          <div className="-mt-6">
            <pre className="bg-black text-white p-4 rounded-lg text-sm overflow-x-auto font-mono border border-gray-600">
              <code>{selectedTemplate.docker_command}</code>
            </pre>
            
            <div className="flex justify-end mt-3">
              <button
                onClick={() => {
                  navigator.clipboard.writeText(selectedTemplate.docker_command);
                  showSuccess('Docker命令已复制到剪贴板');
                }}
                className="flex items-center gap-2 px-4 py-2 bg-background-secondary text-foreground border border-border rounded-lg hover:bg-background-secondary/80 transition-colors"
              >
                <Copy className="w-4 h-4" />
                复制命令
              </button>
            </div>
          </div>
        )}
      </Modal>

      {/* 执行模板弹窗 */}
      <Modal
        isOpen={showExecuteModal}
        onClose={() => {
          setShowExecuteModal(false);
          setExecutingTemplate(null);
          setSelectedHostGroup('');
          setSelectedHost('');
          setExecutionResult('');
        }}
        title={`执行模板: ${executingTemplate?.name || ''}`}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">选择主机组</label>
            <CustomSelect
              value={selectedHostGroup}
              onChange={(value) => handleHostGroupChange(value)}
              options={hostGroups.map(group => ({ value: group.id, label: group.name }))}
              placeholder="请选择主机组"
            />
          </div>

          {hosts.length > 0 && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">选择主机</label>
              <CustomSelect
                value={selectedHost}
                onChange={(value) => setSelectedHost(value)}
                options={[
                  { value: '', label: '所有主机' },
                  ...hosts.map(host => ({ value: host.id, label: `${host.ip}:${host.port}` }))
                ]}
                placeholder="选择主机"
              />
            </div>
          )}

          {executionResult && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">执行结果</label>
              <pre className="bg-background-secondary p-4 rounded-lg text-sm overflow-x-auto font-mono max-h-64 overflow-y-auto">
                <code>{executionResult}</code>
              </pre>
            </div>
          )}

          <div className="flex justify-end gap-3 pt-4">
            <button
              onClick={() => {
                setShowExecuteModal(false);
                setExecutingTemplate(null);
                setSelectedHostGroup('');
                setSelectedHost('');
                setExecutionResult('');
              }}
              className="px-4 py-2 bg-background-secondary text-foreground border border-border rounded-lg hover:bg-background-secondary/80 transition-colors"
            >
              取消
            </button>
            <button
              onClick={handleExecuteTemplate}
              disabled={executing || (!selectedHostGroup && !selectedHost)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
            >
              {executing ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  执行中...
                </>
              ) : (
                <>
                  <Play className="w-4 h-4" />
                  执行
                </>
              )}
            </button>
          </div>
        </div>
      </Modal>

      {/* Toast容器 */}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </div>
  );
};

export default DockerTemplates;