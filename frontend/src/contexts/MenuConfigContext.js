import React, { createContext, useContext, useState, useEffect } from 'react';
import { Server, FileText, Workflow, Package, Monitor, GitBranch, Shield } from 'lucide-react';

const MenuConfigContext = createContext();

export const useMenuConfig = () => {
  const context = useContext(MenuConfigContext);
  if (!context) {
    throw new Error('useMenuConfig must be used within a MenuConfigProvider');
  }
  return context;
};

// 默认菜单配置
const defaultMenuConfig = {
  items: [
    {
      id: 'hostgroups',
      path: '/hostgroups',
      name: '主机管理',
      icon: Server,
      visible: true,
      required: true // 常驻菜单，不能隐藏
    },
    {
      id: 'monitoring',
      path: '/monitoring',
      name: '主机监控',
      icon: Monitor,
      visible: true,
      required: false
    },
    {
      id: 'scripts',
      path: '/scripts',
      name: 'Shell管理',
      icon: FileText,
      visible: true,
      required: true // 常驻菜单，不能隐藏
    },
    // {
    //   id: 'ansible',
    //   path: '/ansible',
    //   name: 'Ansible管理',
    //   icon: Workflow,
    //   visible: false,
    //   required: false // 暂时隐藏
    // },
    {
      id: 'docker-templates',
      path: '/docker-templates',
      name: 'Docker模板',
      icon: Package,
      visible: true,
      required: false
    },
    {
      id: 'deployment',
      path: '/deployment',
      name: '项目部署',
      icon: GitBranch,
      visible: true,
      required: false
    },
    // {
    //   id: 'certificates',
    //   path: '/certificates',
    //   name: '证书管理',
    //   icon: Shield,
    //   visible: false,
    //   required: false
    // }
  ]
};

export const MenuConfigProvider = ({ children }) => {
  const [menuConfig, setMenuConfig] = useState(() => {
    // 从localStorage加载配置，如果没有则使用默认配置
    const savedConfig = localStorage.getItem('menuConfig');
    if (savedConfig) {
      try {
        const parsed = JSON.parse(savedConfig);
        // 确保所有必需的字段都存在，并且图标正确设置
        const mergedItems = defaultMenuConfig.items.map(defaultItem => {
          const savedItem = parsed.items?.find(item => item.id === defaultItem.id);
          return {
            ...defaultItem,
            ...savedItem,
            icon: defaultItem.icon // 确保图标始终是正确的组件
          };
        });
        return { ...defaultMenuConfig, items: mergedItems };
      } catch (error) {
        console.error('Failed to parse menu config from localStorage:', error);
        return defaultMenuConfig;
      }
    }
    return defaultMenuConfig;
  });

  // 保存配置到localStorage
  useEffect(() => {
    const configToSave = {
      ...menuConfig,
      items: menuConfig.items.map(item => ({
        ...item,
        icon: undefined // 不保存图标组件到localStorage
      }))
    };
    localStorage.setItem('menuConfig', JSON.stringify(configToSave));
  }, [menuConfig]);

  const updateMenuConfig = (newConfig) => {
    setMenuConfig(newConfig);
  };

  const resetMenuConfig = () => {
    setMenuConfig(defaultMenuConfig);
    localStorage.removeItem('menuConfig');
  };

  // 获取可见的菜单项
  const getVisibleMenuItems = () => {
    return menuConfig.items.filter(item => item.visible);
  };

  const value = {
    menuConfig,
    updateMenuConfig,
    resetMenuConfig,
    getVisibleMenuItems
  };

  return (
    <MenuConfigContext.Provider value={value}>
      {children}
    </MenuConfigContext.Provider>
  );
};