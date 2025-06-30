import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Server, FileText, Terminal, Settings } from 'lucide-react';

const Layout = ({ children }) => {
  const location = useLocation();

  const menuItems = [
    {
      path: '/hostgroups',
      name: '主机组管理',
      icon: Server
    },
    {
      path: '/ansible',
      name: 'Ansible',
      icon: Settings
    },
    {
      path: '/scripts',
      name: '脚本管理',
      icon: FileText
    }
  ];

  return (
    <div className="flex min-h-screen bg-background">
      {/* 侧边栏 */}
      <div className="w-72 sidebar-gradient border-r border-border flex flex-col fixed h-screen left-0 top-0 z-50">
        <div className="p-6 border-b border-border">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-gradient-to-br from-primary to-blue-400 rounded-lg flex items-center justify-center shadow-lg shadow-primary/30">
              <Terminal className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold bg-gradient-to-r from-foreground to-primary bg-clip-text text-transparent">
              RunMe
            </span>
          </div>
        </div>
        
        <nav className="flex-1 p-4">
          {menuItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path;
            
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  flex items-center gap-3 p-3.5 mb-2 rounded-lg transition-all duration-200 relative overflow-hidden group
                  ${
                    isActive
                      ? 'bg-gradient-to-r from-primary to-blue-400 text-white shadow-lg shadow-primary/40'
                      : 'text-foreground-secondary hover:text-foreground hover:bg-background-tertiary hover:translate-x-1'
                  }
                `}
              >
                <Icon className="w-5 h-5 flex-shrink-0" />
                <span className="font-medium">{item.name}</span>
                {!isActive && (
                  <div className="absolute inset-0 bg-gradient-to-r from-transparent via-primary/10 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-500" />
                )}
              </Link>
            );
          })}
        </nav>
      </div>

      {/* 主内容区 */}
      <div className="flex-1 ml-72 bg-background min-h-screen">
        <div className="p-8 max-w-7xl mx-auto">
          {children}
        </div>
      </div>
    </div>
  );
};

export default Layout;