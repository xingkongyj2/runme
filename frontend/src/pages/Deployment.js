import React, { useState, useEffect } from 'react';
import { Plus, PlayCircle, Trash2, ScrollText, GitBranch, Server, Clock, CheckCircle, XCircle, Loader, Edit } from 'lucide-react';
import { deploymentAPI, hostGroupAPI } from '../services/api';
import Modal from '../components/Modal';
import CustomSelect from '../components/CustomSelect';
import ToastContainer from '../components/ToastContainer';
import DeploymentLogModal from '../components/DeploymentLogModal';
import useToast from '../hooks/useToast';

const Deployment = () => {
  const [tasks, setTasks] = useState([]);
  const [hostGroups, setHostGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [deletingTask, setDeletingTask] = useState(null);
  const [editingTask, setEditingTask] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [runningTasks, setRunningTasks] = useState(new Set());
  const [newTask, setNewTask] = useState({
    name: '',
    github_url: '',
    branch: 'main',
    host_group_id: '',
    description: ''
  });
  const { toasts, showError, showSuccess, hideToast } = useToast();

  useEffect(() => {
    fetchTasks();
    fetchHostGroups();
  }, []);

  const fetchTasks = async () => {
    try {
      const response = await deploymentAPI.getAll();
      setTasks(response.data || []);
    } catch (error) {
      console.error('Failed to fetch tasks:', error);
    }
  };

  const fetchHostGroups = async () => {
    try {
      const response = await hostGroupAPI.getAll();
      // 修改：response.data.data 才是真正的数组
      const data = response.data.data || [];
      setHostGroups(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error('Failed to fetch host groups:', error);
      setHostGroups([]);
    }
  };

  // 在createTask函数中添加校验
  const createTask = async () => {
    // 校验必填字段
    if (!newTask.host_group_id) {
      showError('请选择目标主机组');
      return;
    }
    
    if (!newTask.name || !newTask.github_url || !newTask.host_group_id) {
      alert('请填写所有必填字段');
      return;
    }

    try {
      setLoading(true);
      
      if (editingTask) {
        // 更新任务
        await deploymentAPI.update(editingTask.id, newTask);
        showSuccess('任务更新成功');
      } else {
        // 创建新任务
        await deploymentAPI.create(newTask);
        showSuccess('任务创建成功');
      }
      
      setShowCreateModal(false);
      setEditingTask(null);
      setNewTask({
        name: '',
        github_url: '',
        branch: 'main',
        host_group_id: '',
        description: ''
      });
      fetchTasks();
    } catch (error) {
      console.error('Failed to save task:', error);
      showError(editingTask ? '更新任务失败' : '创建任务失败');
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (task) => {
    setEditingTask(task);
    setNewTask({
      name: task.name || '',
      github_url: task.github_url || '',
      branch: task.branch || 'main',
      host_group_id: task.host_group_id ? task.host_group_id.toString() : '',
      description: task.description || ''
    });
    setShowCreateModal(true);
  };

  const executeTask = async (taskId) => {
    try {
      // 立即设置前端运行状态
      setRunningTasks(prev => new Set([...prev, taskId]));
      
      // 调用后端API并等待执行结果
      const response = await deploymentAPI.execute(taskId);
      
      // 显示成功消息
      showSuccess('部署已开始，请查看日志了解进度');
      
      // 如果后端返回了最终状态，使用它；否则等待短暂时间后刷新
      if (response.data && response.data.status) {
        // 后端返回了最终状态，直接更新任务列表
        await fetchTasks();
        // 立即移除前端运行状态
        setRunningTasks(prev => {
          const newSet = new Set(prev);
          newSet.delete(taskId);
          return newSet;
        });
      } else {
        // 后端没有返回最终状态，等待一段时间后轮询获取状态
        let attempts = 0;
        const maxAttempts = 30; // 最多尝试30次，共30秒
        
        const pollStatus = async () => {
          try {
            await fetchTasks();
            const currentTasks = await deploymentAPI.getAll();
            const currentTask = currentTasks.data?.find(t => t.id === taskId);
            
            // 如果任务不再是running状态，停止轮询
            if (currentTask && currentTask.status !== 'running') {
              setRunningTasks(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
              });
              return;
            }
            
            // 继续轮询
            attempts++;
            if (attempts < maxAttempts) {
              setTimeout(pollStatus, 1000); // 1秒后再次检查
            } else {
              // 超时后也移除运行状态
              setRunningTasks(prev => {
                const newSet = new Set(prev);
                newSet.delete(taskId);
                return newSet;
              });
            }
          } catch (error) {
            console.error('Error polling task status:', error);
            // 出错时也移除运行状态
            setRunningTasks(prev => {
              const newSet = new Set(prev);
              newSet.delete(taskId);
              return newSet;
            });
          }
        };
        
        // 开始轮询
        setTimeout(pollStatus, 1000);
      }
      
    } catch (error) {
      console.error('Failed to execute task:', error);
      showError('启动部署失败');
      
      // 如果执行失败，立即移除运行状态
      setRunningTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const handleDelete = (task) => {
    setDeletingTask(task);
    setShowDeleteModal(true);
  };

  const deleteTask = async () => {
    if (deletingTask) {
      try {
        await deploymentAPI.delete(deletingTask.id);
        fetchTasks();
        setShowDeleteModal(false);
        setDeletingTask(null);
        showSuccess('任务删除成功');
      } catch (error) {
        console.error('Failed to delete task:', error);
        showError('删除任务失败');
      }
    }
  };

  const viewLogs = (task) => {
    setSelectedTask(task);
    setShowLogsModal(true);
  };

  const getHostGroupName = (hostGroupId) => {
    if (!Array.isArray(hostGroups)) return '未知主机组';
    const group = hostGroups.find(g => g.id === hostGroupId);
    return group ? group.name : '未知主机组';
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'success':
        return <CheckCircle className="w-5 h-5 text-green-500" />;
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />;
      case 'running':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />;
      default:
        return <Clock className="w-5 h-5 text-gray-500" />;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'success':
        return '成功';
      case 'failed':
        return '失败';
      case 'running':
        return '运行中';
      default:
        return '待执行';
    }
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <GitBranch size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground">项目部署</h1>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center gap-2"
        >
          <Plus className="w-4 h-4" />
          新建部署任务
        </button>
      </div>

      {/* 任务列表 */}
      {tasks.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center">
          <GitBranch size={48} className="text-foreground-secondary mb-4" />
          <p className="text-foreground-secondary">暂无部署任务，点击上方按钮创建第一个部署任务</p>
        </div>
      ) : (
        <div className="bg-card rounded-xl border border-border overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-background-secondary">
                <tr>
                  <th className="px-3 py-3 text-center text-xs font-medium text-foreground-secondary uppercase tracking-wider whitespace-nowrap">
                    任务名称
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-foreground-secondary uppercase tracking-wider whitespace-nowrap w-20">
                    状态
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-foreground-secondary tracking-wider whitespace-nowrap">
                    GitHub地址
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-foreground-secondary uppercase tracking-wider whitespace-nowrap w-32">
                    主机组
                  </th>
                  <th className="px-3 py-3 text-center text-xs font-medium text-foreground-secondary uppercase tracking-wider whitespace-nowrap w-32">
                    操作
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {tasks.map((task) => {
                  const isRunning = runningTasks.has(task.id) || task.status === 'running';
                  return (
                    <tr key={task.id} className="hover:bg-background-secondary transition-colors">
                      <td className="px-3 py-4 text-center">
                        <div>
                          <div className="font-medium text-foreground">{task.name}</div>
                          {task.description && (
                            <div className="text-sm text-foreground-secondary mt-1">{task.description}</div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <div className="flex justify-center" title={getStatusText(task.status)}>
                          {isRunning ? (
                            <Loader className="w-5 h-5 text-blue-500 animate-spin" />
                          ) : (
                            getStatusIcon(task.status)
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <div>
                          <span className="text-sm text-foreground font-mono truncate block" title={task.github_url}>
                            {task.github_url}
                          </span>
                          {task.branch && task.branch !== 'main' && (
                            <div className="text-xs text-foreground-secondary mt-1">
                              分支: {task.branch}
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <span className="inline-block px-2 py-1 bg-blue-100 text-blue-800 rounded-md text-xs font-medium dark:bg-blue-900/20 dark:text-blue-300 whitespace-nowrap">
                          {getHostGroupName(task.host_group_id)}
                        </span>
                      </td>
                      <td className="px-3 py-4 text-center">
                        <div className="flex items-center gap-1 justify-center">
                          <button 
                            className={`group relative p-2 rounded-xl transition-all duration-200 ${
                              isRunning
                                ? 'bg-gray-100 text-gray-400 cursor-not-allowed dark:bg-gray-800/50 dark:text-gray-500'
                                : 'bg-green-100 text-green-700 hover:bg-green-200 hover:shadow-md dark:bg-green-900/20 dark:text-green-400 dark:hover:bg-green-900/30'
                            }`}
                            onClick={() => !isRunning && executeTask(task.id)}
                            disabled={isRunning}
                            title={isRunning ? "部署执行中..." : "执行部署"}
                          >
                            {isRunning ? (
                              <Loader size={14} className="animate-spin" />
                            ) : (
                              <PlayCircle size={14} />
                            )}
                          </button>
                          
                          <button 
                            className="group relative p-2 rounded-xl transition-all duration-200 bg-gray-100 text-gray-600 hover:bg-gray-200 hover:shadow-md dark:bg-gray-800/50 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-300"
                            onClick={() => handleEdit(task)}
                            disabled={isRunning}
                            title="编辑任务"
                          >
                            <Edit size={14} />
                          </button>
                          
                          <button 
                            className="group relative p-2 rounded-xl transition-all duration-200 bg-blue-100 text-blue-700 hover:bg-blue-200 hover:shadow-md dark:bg-blue-900/20 dark:text-blue-400 dark:hover:bg-blue-900/30"
                            onClick={() => viewLogs(task)}
                            title="查看日志"
                          >
                            <ScrollText size={14} />
                          </button>
                          
                          <button 
                            className="group relative p-2 rounded-xl transition-all duration-200 bg-red-100 text-red-600 hover:bg-red-200 hover:shadow-md dark:bg-red-900/20 dark:text-red-400 dark:hover:bg-red-900/30"
                            onClick={() => handleDelete(task)}
                            disabled={isRunning}
                            title="删除任务"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 创建/编辑任务弹窗 */}
      <Modal 
        isOpen={showCreateModal} 
        onClose={() => {
          setShowCreateModal(false);
          setEditingTask(null);
          setNewTask({
            name: '',
            github_url: '',
            branch: 'main',
            host_group_id: '',
            description: ''
          });
        }}
        title={editingTask ? '编辑部署任务' : '新建部署任务'}
      >
        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">任务名称 *</label>
            <input
              type="text"
              value={newTask.name}
              onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="输入任务名称"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">GitHub地址 *</label>
            <input
              type="url"
              value={newTask.github_url}
              onChange={(e) => setNewTask({ ...newTask, github_url: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="https://github.com/user/repo.git"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">分支</label>
            <input
              type="text"
              value={newTask.branch}
              onChange={(e) => setNewTask({ ...newTask, branch: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              placeholder="main"
            />
          </div>
    
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">目标主机组 *</label>
            <CustomSelect
              value={newTask.host_group_id}
              onChange={(value) => setNewTask({ ...newTask, host_group_id: value })}
              options={hostGroups.map(group => ({ value: group.id, label: group.name }))}
              placeholder="请选择主机组"
              required
            />
          </div>
          
          <div>
            <label className="block text-sm font-medium text-foreground mb-2">描述</label>
            <textarea
              value={newTask.description}
              onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
              className="w-full px-3 py-2 border border-border rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent"
              rows="3"
              placeholder="任务描述（可选）"
            />
          </div>
        </div>
        
        <div className="flex justify-end gap-3 pt-4">
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setShowCreateModal(false);
              setNewTask({
                name: '',
                github_url: '',
                branch: 'main',
                host_group_id: '',
                description: ''
              });
            }}
          >
            取消
          </button>
          <button
            type="button"
            className="btn-primary"
            onClick={createTask}
            disabled={loading}
          >
            {loading ? (editingTask ? '更新中...' : '创建中...') : (editingTask ? '更新' : '创建')}
          </button>
        </div>
      </Modal>

      {/* 删除确认弹窗 */}
      <Modal 
        isOpen={showDeleteModal} 
        onClose={() => {
          setShowDeleteModal(false);
          setDeletingTask(null);
        }}
        title="删除确认"
      >
        <div className="space-y-4">
          <p className="text-foreground">
            确定要删除部署任务 <span className="font-medium text-red-600">{deletingTask?.name}</span> 吗？
          </p>
          <p className="text-sm text-foreground-secondary">
            此操作不可撤销，请谨慎操作。
          </p>
          
          <div className="flex justify-end gap-3 pt-4">
            <button 
              type="button" 
              className="btn-secondary"
              onClick={() => {
                setShowDeleteModal(false);
                setDeletingTask(null);
              }}
            >
              取消
            </button>
            <button 
              type="button" 
              className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              onClick={deleteTask}
            >
              确认删除
            </button>
          </div>
        </div>
      </Modal>

      {/* 部署日志弹窗 */}
      <DeploymentLogModal 
        show={showLogsModal}
        onClose={() => {
          setShowLogsModal(false);
          setSelectedTask(null);
        }}
        task={selectedTask}
      />

      {/* Toast容器 */}
      <ToastContainer toasts={toasts} onClose={hideToast} />
    </div>
  );
};

export default Deployment;