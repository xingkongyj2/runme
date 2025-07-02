import React, { useState, useEffect } from 'react';
import { Plus, Play, Trash2, Eye, RefreshCw, GitBranch, Server, Clock, CheckCircle, XCircle, Loader } from 'lucide-react';
import { deploymentAPI, hostGroupAPI } from '../services/api';

const Deployment = () => {
  const [tasks, setTasks] = useState([]);
  const [hostGroups, setHostGroups] = useState([]);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showLogsModal, setShowLogsModal] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [logs, setLogs] = useState([]);
  const [loading, setLoading] = useState(false);
  const [newTask, setNewTask] = useState({
    name: '',
    github_url: '',
    branch: 'main',
    host_group_id: '',
    description: ''
  });

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
      setHostGroups(response.data || []);
    } catch (error) {
      console.error('Failed to fetch host groups:', error);
    }
  };

  const createTask = async () => {
    if (!newTask.name || !newTask.github_url || !newTask.host_group_id) {
      alert('请填写所有必填字段');
      return;
    }

    try {
      setLoading(true);
      await deploymentAPI.create(newTask);
      setShowCreateModal(false);
      setNewTask({
        name: '',
        github_url: '',
        branch: 'main',
        host_group_id: '',
        description: ''
      });
      fetchTasks();
    } catch (error) {
      console.error('Failed to create task:', error);
      alert('创建任务失败');
    } finally {
      setLoading(false);
    }
  };

  const executeTask = async (taskId) => {
    try {
      setLoading(true);
      await deploymentAPI.execute(taskId);
      alert('部署已开始，请查看日志了解进度');
      fetchTasks();
    } catch (error) {
      console.error('Failed to execute task:', error);
      alert('启动部署失败');
    } finally {
      setLoading(false);
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('确定要删除这个部署任务吗？')) {
      return;
    }

    try {
      await deploymentAPI.delete(taskId);
      fetchTasks();
    } catch (error) {
      console.error('Failed to delete task:', error);
      alert('删除任务失败');
    }
  };

  const viewLogs = async (task) => {
    try {
      setSelectedTask(task);
      const response = await deploymentAPI.getLogs(task.id);
      setLogs(response.data || []);
      setShowLogsModal(true);
    } catch (error) {
      console.error('Failed to fetch logs:', error);
      alert('获取日志失败');
    }
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
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">项目部署</h1>
          <p className="text-gray-400 mt-2">管理和执行项目自动部署任务</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
        >
          <Plus className="w-4 h-4" />
          新建部署任务
        </button>
      </div>

      {/* 任务列表 */}
      <div className="bg-gray-900 rounded-xl border border-gray-800">
        <div className="p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-white">部署任务</h2>
            <button
              onClick={fetchTasks}
              className="text-gray-400 hover:text-white transition-colors"
            >
              <RefreshCw className="w-5 h-5" />
            </button>
          </div>

          {tasks.length === 0 ? (
            <div className="text-center py-12">
              <div className="text-gray-500 text-lg">暂无部署任务</div>
              <div className="text-gray-600 text-sm mt-2">点击上方按钮创建第一个部署任务</div>
            </div>
          ) : (
            <div className="space-y-4">
              {tasks.map((task) => (
                <div key={task.id} className="bg-gray-800 rounded-lg p-4 border border-gray-700">
                  <div className="flex items-center justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-3 mb-2">
                        <h3 className="text-lg font-medium text-white">{task.name}</h3>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(task.status)}
                          <span className="text-sm text-gray-400">{getStatusText(task.status)}</span>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                        <div className="flex items-center gap-2 text-gray-400">
                          <GitBranch className="w-4 h-4" />
                          <span>{task.github_url}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Server className="w-4 h-4" />
                          <span>{task.host_group_name}</span>
                        </div>
                        <div className="flex items-center gap-2 text-gray-400">
                          <Clock className="w-4 h-4" />
                          <span>{new Date(task.created_at).toLocaleString()}</span>
                        </div>
                      </div>
                      
                      {task.description && (
                        <p className="text-gray-500 text-sm mt-2">{task.description}</p>
                      )}
                    </div>
                    
                    <div className="flex items-center gap-2 ml-4">
                      <button
                        onClick={() => viewLogs(task)}
                        className="text-blue-400 hover:text-blue-300 p-2 rounded transition-colors"
                        title="查看日志"
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => executeTask(task.id)}
                        disabled={task.status === 'running' || loading}
                        className="text-green-400 hover:text-green-300 p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="执行部署"
                      >
                        <Play className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => deleteTask(task.id)}
                        disabled={task.status === 'running'}
                        className="text-red-400 hover:text-red-300 p-2 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="删除任务"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* 创建任务模态框 */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-md border border-gray-800">
            <h3 className="text-xl font-semibold text-white mb-4">新建部署任务</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">任务名称 *</label>
                <input
                  type="text"
                  value={newTask.name}
                  onChange={(e) => setNewTask({ ...newTask, name: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="输入任务名称"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">GitHub地址 *</label>
                <input
                  type="url"
                  value={newTask.github_url}
                  onChange={(e) => setNewTask({ ...newTask, github_url: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="https://github.com/user/repo.git"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">分支</label>
                <input
                  type="text"
                  value={newTask.branch}
                  onChange={(e) => setNewTask({ ...newTask, branch: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  placeholder="main"
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">目标主机组 *</label>
                <select
                  value={newTask.host_group_id}
                  onChange={(e) => setNewTask({ ...newTask, host_group_id: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                >
                  <option value="">选择主机组</option>
                  {hostGroups.map((group) => (
                    <option key={group.id} value={group.id}>
                      {group.name}
                    </option>
                  ))}
                </select>
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">描述</label>
                <textarea
                  value={newTask.description}
                  onChange={(e) => setNewTask({ ...newTask, description: e.target.value })}
                  className="w-full px-3 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:outline-none focus:border-blue-500"
                  rows="3"
                  placeholder="任务描述（可选）"
                />
              </div>
            </div>
            
            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setShowCreateModal(false)}
                className="px-4 py-2 text-gray-400 hover:text-white transition-colors"
              >
                取消
              </button>
              <button
                onClick={createTask}
                disabled={loading}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {loading ? '创建中...' : '创建'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 日志模态框 */}
      {showLogsModal && selectedTask && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-gray-900 rounded-xl p-6 w-full max-w-4xl max-h-[80vh] border border-gray-800">
            <div className="flex justify-between items-center mb-4">
              <h3 className="text-xl font-semibold text-white">
                {selectedTask.name} - 部署日志
              </h3>
              <button
                onClick={() => setShowLogsModal(false)}
                className="text-gray-400 hover:text-white transition-colors"
              >
                ✕
              </button>
            </div>
            
            <div className="bg-gray-800 rounded-lg p-4 max-h-96 overflow-y-auto">
              {logs.length === 0 ? (
                <div className="text-gray-500 text-center py-8">暂无日志</div>
              ) : (
                <div className="space-y-4">
                  {logs.map((log) => (
                    <div key={log.id} className="border-b border-gray-700 pb-4 last:border-b-0">
                      <div className="flex items-center gap-3 mb-2">
                        <span className="text-blue-400 font-medium">{log.host}</span>
                        <div className="flex items-center gap-2">
                          {getStatusIcon(log.status)}
                          <span className="text-sm text-gray-400">{getStatusText(log.status)}</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {new Date(log.deployed_at).toLocaleString()}
                        </span>
                      </div>
                      
                      {log.output && (
                        <div className="bg-gray-900 rounded p-3 mb-2">
                          <div className="text-xs text-gray-400 mb-1">输出:</div>
                          <pre className="text-sm text-green-400 whitespace-pre-wrap">{log.output}</pre>
                        </div>
                      )}
                      
                      {log.error && (
                        <div className="bg-gray-900 rounded p-3">
                          <div className="text-xs text-gray-400 mb-1">错误:</div>
                          <pre className="text-sm text-red-400 whitespace-pre-wrap">{log.error}</pre>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Deployment;