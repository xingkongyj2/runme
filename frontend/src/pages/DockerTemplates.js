import React, { useState, useEffect } from 'react';
import { Plus, Search, Package, Eye, Edit, Trash2, Play, Copy, Download } from 'lucide-react';
import { dockerTemplateAPI } from '../services/api';
import Modal from '../components/Modal';

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
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    image: '',
    ports: '',
    volumes: '',
    environment: '',
    docker_compose: ''
  });

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
        description: formData.description,
        image: formData.image,
        ports: formData.ports,
        volumes: formData.volumes,
        environment: formData.environment,
        docker_compose: formData.docker_compose
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
        description: '',
        image: '',
        ports: '',
        volumes: '',
        environment: '',
        docker_compose: ''
      });
      fetchTemplates();
    } catch (error) {
      console.error('Failed to save docker template:', error);
      alert('保存失败，请检查输入信息');
    }
  };

  const handleEdit = (template) => {
    setEditingTemplate(template);
    setFormData({
      name: template.name || '',
      description: template.description || '',
      image: template.image || '',
      ports: template.ports || '',
      volumes: template.volumes || '',
      environment: template.environment || '',
      docker_compose: template.docker_compose || ''
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
        alert('删除失败');
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

  const handleCopyCompose = (compose) => {
    navigator.clipboard.writeText(compose);
    alert('Docker Compose内容已复制到剪贴板');
  };

  const handleDownloadCompose = (template) => {
    const element = document.createElement('a');
    const file = new Blob([template.docker_compose], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `docker-compose-${template.name.toLowerCase()}.yml`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const filteredTemplates = Array.isArray(templates) ? templates.filter(template => 
    template.name && template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.description && template.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
    template.image && template.image.toLowerCase().includes(searchTerm.toLowerCase())
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
          placeholder="搜索模板名称、描述或镜像"
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
                <h3 className="text-lg font-semibold text-foreground mb-2">{template.name}</h3>
                <p className="text-sm text-foreground-secondary mb-2">{template.description}</p>
                <div className="text-xs text-foreground-secondary">
                  <span className="font-medium">镜像:</span> {template.image}
                </div>
              </div>
            </div>
            
            {/* 操作按钮 */}
            <div className="flex gap-2 mt-4">
              <button
                onClick={() => handleViewDetails(template)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                <Eye className="w-4 h-4" />
                查看详情
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
            description: '',
            image: '',
            ports: '',
            volumes: '',
            environment: '',
            docker_compose: ''
          });
        }}
        title={editingTemplate ? '编辑模板' : '新建模板'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">模板名称</label>
              <input
                type="text"
                value={formData.name}
                onChange={(e) => setFormData({...formData, name: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">Docker镜像</label>
              <input
                type="text"
                value={formData.image}
                onChange={(e) => setFormData({...formData, image: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder="如: nginx:latest"
                required
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">描述</label>
            <textarea
              value={formData.description}
              onChange={(e) => setFormData({...formData, description: e.target.value})}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
              rows={2}
            />
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">端口映射</label>
              <textarea
                value={formData.ports}
                onChange={(e) => setFormData({...formData, ports: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder='["80:80", "443:443"]'
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">数据卷</label>
              <textarea
                value={formData.volumes}
                onChange={(e) => setFormData({...formData, volumes: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder='["./data:/data"]'
                rows={3}
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-foreground mb-1">环境变量</label>
              <textarea
                value={formData.environment}
                onChange={(e) => setFormData({...formData, environment: e.target.value})}
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
                placeholder='["ENV=production"]'
                rows={3}
              />
            </div>
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-1">Docker Compose</label>
            <textarea
              value={formData.docker_compose}
              onChange={(e) => setFormData({...formData, docker_compose: e.target.value})}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary font-mono text-sm"
              placeholder="version: '3.8'\nservices:\n  app:\n    image: nginx:latest"
              rows={8}
            />
          </div>
          
          <div className="flex justify-end gap-3 pt-4">
            <button
              type="button"
              onClick={() => {
                setShowModal(false);
                setEditingTemplate(null);
                setFormData({
                  name: '',
                  description: '',
                  image: '',
                  ports: '',
                  volumes: '',
                  environment: '',
                  docker_compose: ''
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
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-foreground mb-2">描述</h4>
              <p className="text-foreground-secondary">{selectedTemplate.description}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-foreground mb-2">镜像</h4>
              <code className="bg-background-secondary px-2 py-1 rounded text-sm">{selectedTemplate.image}</code>
            </div>
            
            {selectedTemplate.ports && (
              <div>
                <h4 className="font-medium text-foreground mb-2">端口映射</h4>
                <pre className="bg-background-secondary p-2 rounded text-sm overflow-x-auto">
                  <code>{selectedTemplate.ports}</code>
                </pre>
              </div>
            )}
            
            {selectedTemplate.volumes && (
              <div>
                <h4 className="font-medium text-foreground mb-2">数据卷</h4>
                <pre className="bg-background-secondary p-2 rounded text-sm overflow-x-auto">
                  <code>{selectedTemplate.volumes}</code>
                </pre>
              </div>
            )}
            
            {selectedTemplate.environment && (
              <div>
                <h4 className="font-medium text-foreground mb-2">环境变量</h4>
                <pre className="bg-background-secondary p-2 rounded text-sm overflow-x-auto">
                  <code>{selectedTemplate.environment}</code>
                </pre>
              </div>
            )}
            
            {selectedTemplate.docker_compose && (
              <div>
                <div className="flex items-center justify-between mb-2">
                  <h4 className="font-medium text-foreground">Docker Compose</h4>
                  <button
                    onClick={() => handleCopyCompose(selectedTemplate.docker_compose)}
                    className="flex items-center gap-1 px-2 py-1 text-xs bg-background-secondary text-foreground border border-border rounded hover:bg-background-secondary/80 transition-colors"
                  >
                    <Copy className="w-3 h-3" />
                    复制
                  </button>
                </div>
                <pre className="bg-background-secondary p-4 rounded-lg text-sm overflow-x-auto">
                  <code>{selectedTemplate.docker_compose}</code>
                </pre>
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => handleDownloadCompose(selectedTemplate)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                下载Compose文件
              </button>
              <button
                onClick={() => handleCopyCompose(selectedTemplate.docker_compose)}
                className="flex items-center gap-2 px-4 py-2 bg-background-secondary text-foreground border border-border rounded-lg hover:bg-background-secondary/80 transition-colors"
              >
                <Copy className="w-4 h-4" />
                复制到剪贴板
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DockerTemplates;