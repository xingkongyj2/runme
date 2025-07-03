import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from '@xterm/xterm';
import { FitAddon } from '@xterm/addon-fit';
import '@xterm/xterm/css/xterm.css';
import { X, Wifi, WifiOff } from 'lucide-react';

const TerminalComponent = ({ hostId, hostIP, onClose, fullscreen = false }) => {
  const terminalRef = useRef(null);
  const terminal = useRef(null);
  const websocket = useRef(null);
  const fitAddon = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  // 将 connectWebSocket 函数移到 useEffect 之前
  const connectWebSocket = () => {
    if (!hostId) return;

    // 使用主机ID建立WebSocket连接
    const wsUrl = `ws://localhost:8080/api/terminal/${hostId}`;
    
    websocket.current = new WebSocket(wsUrl);

    websocket.current.onopen = () => {
      setConnected(true);
      setError(null);
      if (terminal.current) {
        terminal.current.write('\r\n正在连接到服务器...\r\n');
      }
    };

    websocket.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'connected':
            if (terminal.current) {
              terminal.current.write(`\r\n${message.data}\r\n`);
            }
            break;
          case 'data':
            if (terminal.current) {
              terminal.current.write(message.data);
            }
            break;
          case 'error':
            if (terminal.current) {
              terminal.current.write(`\r\n\x1b[31m错误: ${message.data}\x1b[0m\r\n`);
            }
            setError(message.data);
            break;
          default:
            break;
        }
      } catch (err) {
        console.error('解析WebSocket消息失败:', err);
      }
    };

    websocket.current.onclose = () => {
      setConnected(false);
      if (terminal.current) {
        terminal.current.write('\r\n\x1b[33m连接已断开\x1b[0m\r\n');
      }
    };

    websocket.current.onerror = (err) => {
      setError('WebSocket连接错误');
      if (terminal.current) {
        terminal.current.write('\r\n\x1b[31mWebSocket连接错误\x1b[0m\r\n');
      }
    };
  };

  useEffect(() => {
    // 确保DOM元素存在后再初始化终端
    if (!terminalRef.current) return;

    // 初始化终端 - 使用项目的深色主题
    terminal.current = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      theme: {
        background: '#000000', // 使用项目的纯黑背景
        foreground: '#ffffff', // 使用项目的纯白前景
        cursor: '#ffffff',
        selection: '#18181b', // 使用项目的secondary背景色
        black: '#000000',
        red: '#ef4444',
        green: '#22c55e',
        yellow: '#eab308',
        blue: '#3b82f6',
        magenta: '#a855f7',
        cyan: '#06b6d4',
        white: '#ffffff',
        brightBlack: '#374151',
        brightRed: '#f87171',
        brightGreen: '#4ade80',
        brightYellow: '#facc15',
        brightBlue: '#60a5fa',
        brightMagenta: '#c084fc',
        brightCyan: '#22d3ee',
        brightWhite: '#f9fafb'
      },
    });

    fitAddon.current = new FitAddon();
    terminal.current.loadAddon(fitAddon.current);

    // 打开终端
    terminal.current.open(terminalRef.current);
    
    // 延迟调用fit()确保DOM完全渲染
    setTimeout(() => {
      if (fitAddon.current && terminalRef.current && terminal.current) {
        try {
          fitAddon.current.fit();
        } catch (error) {
          console.warn('Terminal fit failed:', error);
          // 如果第一次失败，再尝试一次
          setTimeout(() => {
            if (fitAddon.current && terminal.current) {
              try {
                fitAddon.current.fit();
              } catch (retryError) {
                console.error('Terminal fit retry failed:', retryError);
              }
            }
          }, 100);
        }
      }
    }, 100);

    // 连接WebSocket
    connectWebSocket();

    // 监听终端输入
    terminal.current.onData((data) => {
      if (websocket.current && websocket.current.readyState === WebSocket.OPEN) {
        websocket.current.send(JSON.stringify({
          type: 'input',
          data: data
        }));
      }
    });

    // 监听窗口大小变化
    const handleResize = () => {
      if (fitAddon.current && terminalRef.current && terminal.current) {
        try {
          fitAddon.current.fit();
          if (websocket.current && websocket.current.readyState === WebSocket.OPEN) {
            websocket.current.send(JSON.stringify({
              type: 'resize',
              data: JSON.stringify({
                cols: terminal.current.cols,
                rows: terminal.current.rows
              })
            }));
          }
        } catch (error) {
          console.warn('Terminal resize failed:', error);
        }
      }
    };

    window.addEventListener('resize', handleResize);

    return () => {
      window.removeEventListener('resize', handleResize);
      if (websocket.current) {
        websocket.current.close();
      }
      if (terminal.current) {
        terminal.current.dispose();
      }
    };
  }, [hostId, hostIP]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      {/* 带透明度的黑色背景遮罩 - 与其他模块一致 */}
      <div className="fixed inset-0 bg-black bg-opacity-90" onClick={onClose}></div>
      
      {/* 弹窗容器 - 使用与其他模块一致的样式 */}
      <div className="relative w-full max-w-6xl h-[90vh] bg-card shadow-2xl rounded-xl border border-border flex flex-col">
        {/* 弹窗头部 - 与其他模块保持一致 */}
        <div className="flex items-center justify-between p-6 border-b border-border flex-shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-xl font-semibold text-foreground">SSH终端</h2>
            <span className="text-sm text-foreground-secondary font-mono">{hostIP}</span>
            {/* 连接状态指示器 */}
            <div className="flex items-center gap-2">
              {connected ? (
                <>
                  <Wifi size={16} className="text-green-500" />
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300">
                    已连接
                  </span>
                </>
              ) : error ? (
                <>
                  <WifiOff size={16} className="text-red-500" />
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-300">
                    连接失败
                  </span>
                </>
              ) : (
                <>
                  <div className="w-4 h-4 border-2 border-yellow-500 border-t-transparent rounded-full animate-spin" />
                  <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-300">
                    连接中
                  </span>
                </>
              )}
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-foreground-secondary hover:text-foreground hover:bg-background-secondary rounded-lg transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* 终端区域 - 移除内边距，让终端占满整个区域 */}
        <div className="flex-1 overflow-hidden">
          <div 
            ref={terminalRef} 
            className="w-full h-full"
          />
        </div>
      </div>
    </div>
  );
};

export default TerminalComponent;