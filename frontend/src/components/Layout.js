import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Terminal, User, LogOut } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { useMenuConfig } from '../contexts/MenuConfigContext';

const Layout = ({ children }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const { getVisibleMenuItems } = useMenuConfig();
  const [showUserMenu, setShowUserMenu] = useState(false);

  // 获取可见的菜单项
  const visibleMenuItems = getVisibleMenuItems();

  const handleLogout = () => {
    logout();
    setShowUserMenu(false);
  };

  const handleSettingsClick = () => {
    setShowUserMenu(false);
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
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-white rounded-lg flex items-center justify-center">
                <Terminal className="w-5 h-5 text-black" />
              </div>
              <span className="text-xl font-bold text-white">
                RunMe
              </span>
            </div>
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
            <div className="relative">
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="w-full flex items-center gap-3 p-3 rounded-xl text-gray-300 hover:text-white hover:bg-gray-800/50 transition-all duration-200"
              >
                <div className="w-8 h-8 bg-gray-600 rounded-lg flex items-center justify-center">
                  <User className="w-4 h-4" />
                </div>
                <div className="flex-1 text-left">
                  <div className="text-sm font-medium">{user?.username}</div>
                  <div className="text-xs text-gray-500">{user?.role}</div>
                </div>
              </button>

              {/* 用户菜单下拉 */}
              {showUserMenu && (
                <div className="absolute bottom-full left-0 right-0 mb-2 bg-black border border-gray-700 rounded-lg shadow-lg overflow-hidden">
                  <button
                    onClick={handleSettingsClick}
                    className="w-full flex items-center gap-3 p-3 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <Terminal className="w-4 h-4" />
                    <span className="text-sm">系统设置</span>
                  </button>
                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-3 p-3 text-gray-300 hover:text-white hover:bg-gray-800 transition-colors"
                  >
                    <LogOut className="w-4 h-4" />
                    <span className="text-sm">退出登录</span>
                  </button>
                </div>
              )}
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