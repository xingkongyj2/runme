import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { hostAPI } from '../services/api';
import TerminalComponent from '../components/Terminal';

const Terminal = () => {
  const { hostId } = useParams();
  const [host, setHost] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    const fetchHost = async () => {
      try {
        const response = await hostAPI.getById(hostId);
        console.log('Host data:', response); // 添加调试日志
        setHost(response.data?.data || response.data); // 处理嵌套的data结构
      } catch (error) {
        console.error('Failed to fetch host:', error);
        setError('无法获取主机信息');
      } finally {
        setLoading(false);
      }
    };

    if (hostId) {
      fetchHost();
    } else {
      setError('缺少主机ID参数');
      setLoading(false);
    }
  }, [hostId]);

  const handleClose = () => {
    window.close();
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    );
  }

  if (error || !host) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-background">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-foreground mb-4">连接错误</h1>
          <p className="text-foreground-secondary mb-4">{error || '主机不存在'}</p>
          <button 
            onClick={handleClose}
            className="btn-primary"
          >
            关闭窗口
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="h-screen bg-background">
      <TerminalComponent
        hostId={hostId}
        hostIP={host.ip}
        onClose={handleClose}
        fullscreen={true}
      />
    </div>
  );
};

export default Terminal;