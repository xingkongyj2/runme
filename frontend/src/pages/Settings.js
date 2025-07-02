import React, { useState } from 'react';
import { DragDropContext, Droppable, Draggable } from 'react-beautiful-dnd';
import { GripVertical, Eye, EyeOff, RotateCcw } from 'lucide-react';
import { useMenuConfig } from '../contexts/MenuConfigContext';

const Settings = () => {
  const { menuConfig, updateMenuConfig, resetMenuConfig } = useMenuConfig();
  const [activeTab, setActiveTab] = useState('menu');

  const handleDragEnd = (result) => {
    if (!result.destination) return;

    const items = Array.from(menuConfig.items);
    const [reorderedItem] = items.splice(result.source.index, 1);
    items.splice(result.destination.index, 0, reorderedItem);

    updateMenuConfig({ ...menuConfig, items });
  };

  const toggleMenuVisibility = (menuId) => {
    const updatedItems = menuConfig.items.map(item => {
      if (item.id === menuId) {
        return { ...item, visible: !item.visible };
      }
      return item;
    });
    updateMenuConfig({ ...menuConfig, items: updatedItems });
  };

  const handleReset = () => {
    if (window.confirm('确定要重置所有设置吗？这将恢复默认的菜单配置。')) {
      resetMenuConfig();
    }
  };

  return (
    <div className="min-h-screen bg-background text-white p-8">
      <div className="max-w-4xl mx-auto">
        {/* 页面标题 */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold mb-2">系统设置</h1>
          <p className="text-gray-400">管理系统界面和功能配置</p>
        </div>

        {/* 标签页 */}
        <div className="mb-8">
          <div className="flex space-x-1 bg-card p-1 rounded-lg w-fit">
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'menu'
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              菜单配置
            </button>
            <button
              onClick={() => setActiveTab('system')}
              className={`px-4 py-2 rounded-md text-sm font-medium transition-colors ${
                activeTab === 'system'
                  ? 'bg-white text-black'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              系统配置
            </button>
          </div>
        </div>

        {/* 菜单配置标签页 */}
        {activeTab === 'menu' && (
          <div className="space-y-6">
            {/* 操作按钮 */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold">菜单管理</h2>
              <button
                onClick={handleReset}
                className="flex items-center gap-2 px-4 py-2 bg-card hover:bg-background-secondary rounded-lg transition-colors border border-border"
              >
                <RotateCcw className="w-4 h-4" />
                重置默认
              </button>
            </div>

            {/* 说明文字 */}
            <div className="bg-card p-4 rounded-lg border border-border">
              <p className="text-gray-300 text-sm">
                • 拖拽菜单项可以调整显示顺序
                • 点击眼睛图标可以显示/隐藏菜单项
                • 主机管理、Ansible管理、Shell管理为常驻菜单，不能隐藏
                • 设置会实时保存并应用到左侧菜单
              </p>
            </div>

            {/* 拖拽菜单列表 */}
            <div className="bg-card rounded-lg p-6 border border-border">
              <DragDropContext onDragEnd={handleDragEnd}>
                <Droppable droppableId="menu-items">
                  {(provided) => (
                    <div
                      {...provided.droppableProps}
                      ref={provided.innerRef}
                      className="space-y-3"
                    >
                      {menuConfig.items.map((item, index) => {
                        const Icon = item.icon;
                        const isRequired = item.required;
                        
                        return (
                          <Draggable
                            key={item.id}
                            draggableId={item.id}
                            index={index}
                          >
                            {(provided, snapshot) => (
                              <div
                                ref={provided.innerRef}
                                {...provided.draggableProps}
                                className={`flex items-center gap-4 p-4 bg-background-secondary rounded-lg border transition-all ${
                                  snapshot.isDragging
                                    ? 'border-white shadow-lg'
                                    : 'border-border'
                                } ${
                                  !item.visible ? 'opacity-50' : ''
                                }`}
                              >
                                {/* 拖拽手柄 */}
                                <div
                                  {...provided.dragHandleProps}
                                  className="text-gray-400 hover:text-white cursor-grab active:cursor-grabbing"
                                >
                                  <GripVertical className="w-5 h-5" />
                                </div>

                                {/* 菜单图标 */}
                                <div className="w-8 h-8 flex items-center justify-center">
                                  <Icon className="w-5 h-5 text-gray-300" />
                                </div>

                                {/* 菜单名称 */}
                                <div className="flex-1">
                                  <span className="font-medium">{item.name}</span>
                                  {isRequired && (
                                    <span className="ml-2 text-xs bg-blue-600 text-white px-2 py-1 rounded">
                                      常驻
                                    </span>
                                  )}
                                </div>

                                {/* 显示/隐藏切换 */}
                                <button
                                  onClick={() => !isRequired && toggleMenuVisibility(item.id)}
                                  disabled={isRequired}
                                  className={`p-2 rounded-lg transition-colors ${
                                    isRequired
                                      ? 'text-gray-500 cursor-not-allowed'
                                      : item.visible
                                      ? 'text-green-400 hover:bg-gray-700'
                                      : 'text-gray-400 hover:bg-gray-700'
                                  }`}
                                  title={isRequired ? '常驻菜单不能隐藏' : item.visible ? '点击隐藏' : '点击显示'}
                                >
                                  {item.visible ? (
                                    <Eye className="w-5 h-5" />
                                  ) : (
                                    <EyeOff className="w-5 h-5" />
                                  )}
                                </button>
                              </div>
                            )}
                          </Draggable>
                        );
                      })}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </DragDropContext>
            </div>
          </div>
        )}

        {/* 系统配置标签页 */}
        {activeTab === 'system' && (
          <div className="space-y-6">
            <h2 className="text-xl font-semibold">系统配置</h2>
            <div className="bg-card rounded-lg p-6 border border-border">
              <p className="text-gray-400">系统配置功能开发中...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Settings;