import React, { useState } from 'react';
import { Play, Copy, Download, Search, Filter, Container } from 'lucide-react';
import Modal from '../components/Modal';
import CustomSelect from '../components/CustomSelect';

const DockerTemplates = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [showModal, setShowModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState(null);

  // Docker模板数据
  const dockerTemplates = [
    {
      id: 1,
      name: 'Nginx',
      category: 'web',
      description: '高性能的HTTP和反向代理服务器',
      image: 'nginx:latest',
      ports: ['80:80', '443:443'],
      volumes: ['/etc/nginx/nginx.conf:/etc/nginx/nginx.conf'],
      environment: [],
      dockerCompose: `version: '3.8'
services:
  nginx:
    image: nginx:latest
    ports:
      - "80:80"
      - "443:443"
    volumes:
      - ./nginx.conf:/etc/nginx/nginx.conf
    restart: unless-stopped`
    },
    {
      id: 2,
      name: 'Redis',
      category: 'database',
      description: '内存数据结构存储，用作数据库、缓存和消息代理',
      image: 'redis:alpine',
      ports: ['6379:6379'],
      volumes: ['redis-data:/data'],
      environment: [],
      dockerCompose: `version: '3.8'
services:
  redis:
    image: redis:alpine
    ports:
      - "6379:6379"
    volumes:
      - redis-data:/data
    restart: unless-stopped
    command: redis-server --appendonly yes

volumes:
  redis-data:`
    },
    {
      id: 3,
      name: 'MySQL',
      category: 'database',
      description: '世界上最流行的开源关系数据库',
      image: 'mysql:8.0',
      ports: ['3306:3306'],
      volumes: ['mysql-data:/var/lib/mysql'],
      environment: ['MYSQL_ROOT_PASSWORD=your_password', 'MYSQL_DATABASE=your_database'],
      dockerCompose: `version: '3.8'
services:
  mysql:
    image: mysql:8.0
    ports:
      - "3306:3306"
    volumes:
      - mysql-data:/var/lib/mysql
    environment:
      MYSQL_ROOT_PASSWORD: your_password
      MYSQL_DATABASE: your_database
      MYSQL_USER: your_user
      MYSQL_PASSWORD: your_user_password
    restart: unless-stopped

volumes:
  mysql-data:`
    },
    {
      id: 4,
      name: 'PostgreSQL',
      category: 'database',
      description: '先进的开源关系数据库',
      image: 'postgres:15',
      ports: ['5432:5432'],
      volumes: ['postgres-data:/var/lib/postgresql/data'],
      environment: ['POSTGRES_PASSWORD=your_password', 'POSTGRES_DB=your_database'],
      dockerCompose: `version: '3.8'
services:
  postgres:
    image: postgres:15
    ports:
      - "5432:5432"
    volumes:
      - postgres-data:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: your_password
      POSTGRES_DB: your_database
      POSTGRES_USER: your_user
    restart: unless-stopped

volumes:
  postgres-data:`
    },
    {
      id: 5,
      name: 'MongoDB',
      category: 'database',
      description: '面向文档的NoSQL数据库',
      image: 'mongo:latest',
      ports: ['27017:27017'],
      volumes: ['mongo-data:/data/db'],
      environment: ['MONGO_INITDB_ROOT_USERNAME=admin', 'MONGO_INITDB_ROOT_PASSWORD=password'],
      dockerCompose: `version: '3.8'
services:
  mongodb:
    image: mongo:latest
    ports:
      - "27017:27017"
    volumes:
      - mongo-data:/data/db
    environment:
      MONGO_INITDB_ROOT_USERNAME: admin
      MONGO_INITDB_ROOT_PASSWORD: password
    restart: unless-stopped

volumes:
  mongo-data:`
    },
    {
      id: 6,
      name: 'Node.js',
      category: 'runtime',
      description: 'JavaScript运行时环境',
      image: 'node:18-alpine',
      ports: ['3000:3000'],
      volumes: ['./app:/usr/src/app'],
      environment: ['NODE_ENV=production'],
      dockerCompose: `version: '3.8'
services:
  nodejs:
    image: node:18-alpine
    ports:
      - "3000:3000"
    volumes:
      - ./app:/usr/src/app
    working_dir: /usr/src/app
    environment:
      NODE_ENV: production
    command: npm start
    restart: unless-stopped`
    }
  ];

  const categories = [
    { value: 'all', label: '全部' },
    { value: 'web', label: 'Web服务' },
    { value: 'database', label: '数据库' },
    { value: 'runtime', label: '运行时' }
  ];

  const filteredTemplates = dockerTemplates.filter(template => {
    const matchesSearch = template.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         template.description.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleViewTemplate = (template) => {
    setSelectedTemplate(template);
    setShowModal(true);
  };

  const handleCopyCompose = (compose) => {
    navigator.clipboard.writeText(compose);
    // 这里可以添加一个toast提示
  };

  const handleDownloadCompose = (template) => {
    const element = document.createElement('a');
    const file = new Blob([template.dockerCompose], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `docker-compose-${template.name.toLowerCase()}.yml`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  return (
    <div className="space-y-6">
      {/* 页面标题 */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <Container size={24} className="text-primary" />
          <h1 className="text-2xl font-bold text-foreground">Docker模板</h1>
        </div>
      </div>

      {/* 搜索和筛选区域 */}
      <div className="flex flex-col sm:flex-row gap-3">
        {/* 搜索区域 */}
        <div className="relative max-w-xs">
          <Search size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-secondary" />
          <input
            type="text"
            placeholder="搜索模板名称、描述"
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border-2 border-primary rounded-lg bg-background text-foreground placeholder-foreground-secondary focus:outline-none focus:ring-2 focus:ring-primary focus:border-primary"
          />
        </div>

        {/* 分类筛选区域 */}
        <div className="relative max-w-xs">
          <Filter size={20} className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-secondary" />
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-foreground-secondary w-4 h-4" />
            <CustomSelect
              value={selectedCategory}
              onChange={setSelectedCategory}
              options={[
                { value: 'all', label: '全部分类' },
                ...categories.map(category => ({ value: category, label: category }))
              ]}
              placeholder="选择分类"
              className="pl-10"
            />
          </div>
        </div>
      </div>
      {/* 模板网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredTemplates.map((template) => (
          <div key={template.id} className="bg-card border border-border rounded-xl p-6 hover:shadow-lg transition-shadow">
            <div className="flex items-start justify-between mb-4">
              <div>
                <h3 className="text-lg font-semibold text-foreground mb-2">{template.name}</h3>
                <span className="inline-block px-2 py-1 bg-primary/10 text-primary text-xs rounded-full">
                  {categories.find(c => c.value === template.category)?.label}
                </span>
              </div>
            </div>
            
            <p className="text-foreground-secondary text-sm mb-4">{template.description}</p>
            
            <div className="space-y-2 mb-4">
              <div className="text-xs text-foreground-secondary">
                <span className="font-medium">镜像:</span> {template.image}
              </div>
              {template.ports.length > 0 && (
                <div className="text-xs text-foreground-secondary">
                  <span className="font-medium">端口:</span> {template.ports.join(', ')}
                </div>
              )}
            </div>
            
            <div className="flex gap-2">
              <button
                onClick={() => handleViewTemplate(template)}
                className="flex-1 flex items-center justify-center gap-2 px-3 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors text-sm"
              >
                <Play className="w-4 h-4" />
                查看详情
              </button>
              <button
                onClick={() => handleDownloadCompose(template)}
                className="px-3 py-2 bg-background-secondary text-foreground border border-border rounded-lg hover:bg-background-secondary/80 transition-colors"
                title="下载Docker Compose文件"
              >
                <Download className="w-4 h-4" />
              </button>
            </div>
          </div>
        ))}
      </div>

      {filteredTemplates.length === 0 && (
        <div className="text-center py-12">
          <p className="text-foreground-secondary">没有找到匹配的模板</p>
        </div>
      )}

      {/* 模板详情弹窗 */}
      <Modal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
        title={selectedTemplate?.name || ''}
      >
        {selectedTemplate && (
          <div className="space-y-6">
            <div>
              <h4 className="font-medium text-foreground mb-2">描述</h4>
              <p className="text-foreground-secondary">{selectedTemplate.description}</p>
            </div>
            
            <div>
              <h4 className="font-medium text-foreground mb-2">镜像</h4>
              <code className="bg-background-secondary px-2 py-1 rounded text-sm">{selectedTemplate.image}</code>
            </div>
            
            {selectedTemplate.ports.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-2">端口映射</h4>
                <div className="space-y-1">
                  {selectedTemplate.ports.map((port, index) => (
                    <code key={index} className="block bg-background-secondary px-2 py-1 rounded text-sm">{port}</code>
                  ))}
                </div>
              </div>
            )}
            
            {selectedTemplate.volumes.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-2">数据卷</h4>
                <div className="space-y-1">
                  {selectedTemplate.volumes.map((volume, index) => (
                    <code key={index} className="block bg-background-secondary px-2 py-1 rounded text-sm">{volume}</code>
                  ))}
                </div>
              </div>
            )}
            
            {selectedTemplate.environment.length > 0 && (
              <div>
                <h4 className="font-medium text-foreground mb-2">环境变量</h4>
                <div className="space-y-1">
                  {selectedTemplate.environment.map((env, index) => (
                    <code key={index} className="block bg-background-secondary px-2 py-1 rounded text-sm">{env}</code>
                  ))}
                </div>
              </div>
            )}
            
            <div>
              <div className="flex items-center justify-between mb-2">
                <h4 className="font-medium text-foreground">Docker Compose</h4>
                <button
                  onClick={() => handleCopyCompose(selectedTemplate.dockerCompose)}
                  className="flex items-center gap-1 px-2 py-1 text-xs bg-background-secondary text-foreground border border-border rounded hover:bg-background-secondary/80 transition-colors"
                >
                  <Copy className="w-3 h-3" />
                  复制
                </button>
              </div>
              <pre className="bg-background-secondary p-4 rounded-lg text-sm overflow-x-auto">
                <code>{selectedTemplate.dockerCompose}</code>
              </pre>
            </div>
            
            <div className="flex gap-3 pt-4">
              <button
                onClick={() => handleDownloadCompose(selectedTemplate)}
                className="flex items-center gap-2 px-4 py-2 bg-primary text-primary-foreground rounded-lg hover:bg-primary/90 transition-colors"
              >
                <Download className="w-4 h-4" />
                下载Compose文件
              </button>
              <button
                onClick={() => handleCopyCompose(selectedTemplate.dockerCompose)}
                className="flex items-center gap-2 px-4 py-2 bg-background-secondary text-foreground border border-border rounded-lg hover:bg-background-secondary/80 transition-colors"
              >
                <Copy className="w-4 h-4" />
                复制到剪贴板
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default DockerTemplates;