import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Download, RefreshCw, Shield, Calendar, AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { certificateAPI } from '../services/api';
import Modal from '../components/Modal';

const CertificateManagement = () => {
  const [certificates, setCertificates] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingCertificate, setEditingCertificate] = useState(null);
  const [formData, setFormData] = useState({
    domain: '',
    type: 'letsencrypt',
    email: '',
    auto_renew: true,
    deploy_path: '/etc/ssl/certs/',
    key_path: '/etc/ssl/private/'
  });

  useEffect(() => {
    fetchCertificates();
  }, []);

  const fetchCertificates = async () => {
    try {
      const response = await certificateAPI.getAll();
      setCertificates(response.data || []);
    } catch (error) {
      console.error('Failed to fetch certificates:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      if (editingCertificate) {
        await certificateAPI.update(editingCertificate.id, formData);
      } else {
        await certificateAPI.create(formData);
      }
      setShowModal(false);
      setEditingCertificate(null);
      setFormData({
        domain: '',
        type: 'letsencrypt',
        email: '',
        auto_renew: true,
        deploy_path: '/etc/ssl/certs/',
        key_path: '/etc/ssl/private/'
      });
      fetchCertificates();
    } catch (error) {
      console.error('Failed to save certificate:', error);
      alert('保存失败，请检查输入信息');
    }
  };

  const handleEdit = (certificate) => {
    setEditingCertificate(certificate);
    setFormData({
      domain: certificate.domain,
      type: certificate.type,
      email: certificate.email || '',
      auto_renew: certificate.auto_renew,
      deploy_path: certificate.deploy_path || '/etc/ssl/certs/',
      key_path: certificate.key_path || '/etc/ssl/private/'
    });
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm('确定要删除这个证书吗？')) {
      try {
        await certificateAPI.delete(id);
        fetchCertificates();
      } catch (error) {
        console.error('Failed to delete certificate:', error);
        alert('删除失败');
      }
    }
  };

  const handleRenew = async (id) => {
    if (window.confirm('确定要续签这个证书吗？')) {
      try {
        await certificateAPI.renew(id);
        alert('证书续签已启动，请查看日志了解执行结果');
        fetchCertificates();
      } catch (error) {
        console.error('Failed to renew certificate:', error);
        alert('续签失败');
      }
    }
  };

  const handleDeploy = async (id) => {
    if (window.confirm('确定要部署这个证书吗？')) {
      try {
        await certificateAPI.deploy(id);
        alert('证书部署已启动，请查看日志了解执行结果');
        fetchCertificates();
      } catch (error) {
        console.error('Failed to deploy certificate:', error);
        alert('部署失败');
      }
    }
  };

  const handleDownload = async (id) => {
    try {
      const response = await certificateAPI.download(id);
      const blob = new Blob([response.data], { type: 'application/zip' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `certificate-${id}.zip`;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (error) {
      console.error('Failed to download certificate:', error);
      alert('下载失败');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'active':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'expired':
        return <AlertCircle size={16} className="text-red-500" />;
      case 'expiring_soon':
        return <Clock size={16} className="text-orange-500" />;
      default:
        return <AlertCircle size={16} className="text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'active':
        return '有效';
      case 'expired':
        return '已过期';
      case 'expiring_soon':
        return '即将过期';
      default:
        return '未知';
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    return new Date(dateString).toLocaleDateString('zh-CN');
  };

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
        <h1 className="text-2xl font-bold text-foreground">证书管理</h1>
        <button 
          className="btn-primary flex items-center gap-2"
          onClick={() => {
            setEditingCertificate(null);
            setFormData({
              domain: '',
              type: 'letsencrypt',
              email: '',
              auto_renew: true,
              deploy_path: '/etc/ssl/certs/',
              key_path: '/etc/ssl/private/'
            });
            setShowModal(true);
          }}
        >
          <Plus size={16} />
          新增证书
        </button>
      </div>

      {/* 证书列表卡片 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {certificates.length === 0 ? (
          <div className="col-span-full flex flex-col items-center justify-center py-16 text-center">
            <Shield size={48} className="text-foreground-secondary mb-4" />
            <p className="text-foreground-secondary">暂无证书，点击上方按钮创建第一个证书</p>
          </div>
        ) : (
          certificates.map((certificate) => (
            <div key={certificate.id} className="bg-card rounded-xl border border-border p-6 hover:shadow-lg transition-shadow">
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <Shield className="w-5 h-5 text-primary" />
                  </div>
                  <div>
                    <h3 className="font-semibold text-foreground truncate">{certificate.domain}</h3>
                    <div className="flex items-center gap-2 mt-1">
                      {getStatusIcon(certificate.status)}
                      <span className="text-sm text-foreground-secondary">{getStatusText(certificate.status)}</span>
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  <button 
                    className="p-2 text-green-600 hover:text-green-800 hover:bg-green-50 rounded-lg transition-colors dark:text-green-400 dark:hover:text-green-300 dark:hover:bg-green-900/20"
                    onClick={() => handleRenew(certificate.id)}
                    title="续签证书"
                  >
                    <RefreshCw size={16} />
                  </button>
                  <button 
                    className="p-2 text-blue-600 hover:text-blue-800 hover:bg-blue-50 rounded-lg transition-colors dark:text-blue-400 dark:hover:text-blue-300 dark:hover:bg-blue-900/20"
                    onClick={() => handleDownload(certificate.id)}
                    title="下载证书"
                  >
                    <Download size={16} />
                  </button>
                  <button 
                    className="p-2 text-gray-600 hover:text-gray-800 hover:bg-gray-50 rounded-lg transition-colors dark:text-gray-400 dark:hover:text-gray-300 dark:hover:bg-gray-900/20"
                    onClick={() => handleEdit(certificate)}
                    title="编辑"
                  >
                    <Edit size={16} />
                  </button>
                  <button 
                    className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-lg transition-colors dark:text-red-400 dark:hover:text-red-300 dark:hover:bg-red-900/20"
                    onClick={() => handleDelete(certificate.id)}
                    title="删除"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
              <div className="space-y-3">
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-secondary">类型:</span>
                  <span className="font-medium text-foreground">
                    {certificate.type === 'letsencrypt' ? "Let's Encrypt" : '自签名'}
                  </span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-secondary">过期时间:</span>
                  <span className="font-medium text-foreground">{formatDate(certificate.expires_at)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-foreground-secondary">自动续签:</span>
                  <span className={`font-medium ${
                    certificate.auto_renew ? 'text-green-600' : 'text-gray-600'
                  }`}>
                    {certificate.auto_renew ? '已启用' : '已禁用'}
                  </span>
                </div>
                {certificate.status === 'active' && (
                  <button
                    className="w-full mt-3 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm font-medium"
                    onClick={() => handleDeploy(certificate.id)}
                  >
                    部署证书
                  </button>
                )}
              </div>
            </div>
          ))
        )}
      </div>

      {/* 创建/编辑证书弹窗 */}
      <Modal 
        isOpen={showModal} 
        onClose={() => setShowModal(false)}
        title={editingCertificate ? '编辑证书' : '新增证书'}
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">域名</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={formData.domain}
              onChange={(e) => setFormData({...formData, domain: e.target.value})}
              placeholder="例如: example.com"
              required
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">证书类型</label>
            <select
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={formData.type}
              onChange={(e) => setFormData({...formData, type: e.target.value})}
            >
              <option value="letsencrypt">Let's Encrypt (免费)</option>
              <option value="self_signed">自签名证书</option>
            </select>
          </div>

          {formData.type === 'letsencrypt' && (
            <div>
              <label className="block text-sm font-medium text-foreground mb-2">邮箱地址</label>
              <input
                type="email"
                className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                placeholder="用于Let's Encrypt通知"
                required={formData.type === 'letsencrypt'}
              />
            </div>
          )}

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">证书部署路径</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={formData.deploy_path}
              onChange={(e) => setFormData({...formData, deploy_path: e.target.value})}
              placeholder="证书文件部署路径"
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-foreground mb-2">私钥部署路径</label>
            <input
              type="text"
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              value={formData.key_path}
              onChange={(e) => setFormData({...formData, key_path: e.target.value})}
              placeholder="私钥文件部署路径"
            />
          </div>

          <div className="flex items-center gap-2">
            <input
              type="checkbox"
              id="auto_renew"
              className="custom-checkbox"
              checked={formData.auto_renew}
              onChange={(e) => setFormData({...formData, auto_renew: e.target.checked})}
            />
            <label htmlFor="auto_renew" className="text-sm text-foreground cursor-pointer">
              启用自动续签
            </label>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <button type="button" className="btn-secondary" onClick={() => setShowModal(false)}>
              取消
            </button>
            <button type="submit" className="btn-primary">
              {editingCertificate ? '更新' : '创建'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default CertificateManagement;