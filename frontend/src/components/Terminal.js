import React, { useEffect, useRef, useState } from 'react';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import 'xterm/css/xterm.css';
import { X } from 'lucide-react';

const TerminalComponent = ({ hostId, hostIP, onClose, fullscreen = false }) => {
  const terminalRef = useRef(null);
  const terminal = useRef(null);
  const websocket = useRef(null);
  const fitAddon = useRef(null);
  const [connected, setConnected] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    // 初始化终端
    terminal.current = new Terminal({
      cursorBlink: true,
      fontSize: 14,
      fontFamily: 'Monaco, Menlo, "Ubuntu Mono", monospace',
      theme: {
        background: '#1e1e1e',
        foreground: '#ffffff',
        cursor: '#ffffff',
        selection: '#3a3a3a',
      },
    });

    fitAddon.current = new FitAddon();
    terminal.current.loadAddon(fitAddon.current);

    // 打开终端
    terminal.current.open(terminalRef.current);
    fitAddon.current.fit();

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
      if (fitAddon.current) {
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
  }, [hostId, hostIP, connectWebSocket]);

  const connectWebSocket = () => {
    if (!hostId) return;

    // 使用主机ID建立WebSocket连接
    const wsUrl = `ws://localhost:8080/api/terminal/${hostId}`;
    
    websocket.current = new WebSocket(wsUrl);

    websocket.current.onopen = () => {
      setConnected(true);
      setError(null);
      terminal.current.write('\r\n正在连接到服务器...\r\n');
    };

    websocket.current.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data);
        switch (message.type) {
          case 'connected':
            terminal.current.write(`\r\n${message.data}\r\n`);
            break;
          case 'data':
            terminal.current.write(message.data);
            break;
          case 'error':
            terminal.current.write(`\r\n\x1b[31m错误: ${message.data}\x1b[0m\r\n`);
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
      terminal.current.write('\r\n\x1b[33m连接已断开\x1b[0m\r\n');
    };

    websocket.current.onerror = (err) => {
      setError('WebSocket连接错误');
      terminal.current.write('\r\n\x1b[31mWebSocket连接错误\x1b[0m\r\n');
    };
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-4/5 h-4/5 flex flex-col">
        {/* 标题栏 */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
          <div className="flex items-center gap-2">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
              SSH终端 - {hostIP}
            </h3>
            {connected && (
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300">
                已连接
              </span>
            )}
            {error && (
              <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300">
                连接失败
              </span>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        
        {/* 终端区域 */}
        <div className="flex-1 p-4">
          <div 
            ref={terminalRef} 
            className="w-full h-full rounded border border-gray-300 dark:border-gray-600"
            style={{ backgroundColor: '#1e1e1e' }}
          />
        </div>
      </div>
    </div>
  );
};

export default TerminalComponent;