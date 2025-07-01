import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Server, FileText, Terminal, Settings, Package, Monitor } from 'lucide-react';

const Layout = ({ children }) => {
  const location = useLocation();

  const menuItems = [
    {
      path: '/hostgroups',
      name: '主机组管理',
      icon: Server
    },
    {
      path: '/monitoring',
      name: '主机监控',
      icon: Monitor
    },
    {
      path: '/ansible',
      name: 'Ansible管理',
      icon: Settings
    },
    {
      path: '/scripts',
      name: 'Shell管理',
      icon: FileText
    },
    {
      path: '/docker-templates',
      name: 'Docker模板',
      icon: Package
    }
  ];

  return (
    <div className="flex min-h-screen bg-black">
      {/* 侧边栏容器 */}
      <div className="w-72 p-4 fixed h-screen left-0 top-0 z-50">
        {/* 浮动的侧边栏模块 - 使用指定的背景色 #18181b */}
        <div className="h-full rounded-2xl shadow-2xl border border-gray-900/30 flex flex-col overflow-hidden" style={{backgroundColor: '#18181b'}}>
          {/* 头部 - 移除底部边框 */}
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
              {menuItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                
                return (
                  <Link
                    key={item.path}
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