import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Terminal, User, LogOut, Settings, Zap } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMenuConfig } from '../contexts/MenuConfigContext';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { getVisibleMenuItems } = useMenuConfig();

  // 获取可见的菜单项
  const visibleMenuItems = getVisibleMenuItems();

  const handleLogout = () => {
    logout();
  };

  const handleSettingsClick = () => {
    navigate('/settings');
  };


  return (
    <div className="flex min-h-screen bg-black">
      {/* 侧边栏容器 */}
      <div className="w-72 p-4 fixed h-screen left-0 top-0 z-50">
        {/* 浮动的侧边栏模块 - 使用指定的背景色 #18181b */}
        <div className="h-full rounded-2xl shadow-2xl border border-gray-900/30 flex flex-col overflow-hidden" style={{backgroundColor: '#18181b'}}>
          {/* 头部 */}
          <div className="p-6">
            <Link to="/" className="flex items-center gap-3">
              <span className="text-2xl">👻</span>
              <span className="text-xl font-bold text-white">
                RunMe
              </span>
            </Link>
          </div>
          
          {/* 菜单区域 */}
          <nav className="flex-1 p-4">
            <div className="space-y-2">
              {visibleMenuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.id}
                    to={item.path}
                    className={`
                      flex items-center gap-3 p-3 rounded-xl transition-all duration-200 relative group
                      ${
                        isActive
                          ? 'bg-black text-white'
                          : 'text-gray-300 hover:text-white hover:bg-gray-800/50'
                      }
                    `}
                  >
                    <Icon className="w-4 h-4 flex-shrink-0" />
                    <span className="text-base font-medium">{item.name}</span>
                  </Link>
                );
              })}
            </div>
          </nav>

          {/* 底部用户区域 */}
          <div className="p-4 border-t border-gray-800">
            {/* 用户名和按钮同行 */}
            <div className="flex items-center justify-between">
              <div className="text-base font-semibold text-white pl-3">{user?.username}</div>
              <div className="flex gap-1">
                {/* 系统设置按钮 */}
                <button
                  onClick={handleSettingsClick}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-200"
                  title="系统设置"
                >
                  <Settings className="w-4 h-4" />
                </button>
                
                {/* 退出登录按钮 */}
                <button
                  onClick={handleLogout}
                  className="p-1.5 rounded-lg text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-200"
                  title="退出登录"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 ml-72 bg-black min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;