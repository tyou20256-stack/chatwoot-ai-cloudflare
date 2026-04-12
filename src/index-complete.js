/**
 * Chatwoot完全代替システム - 完全版
 * CS業務70%削減を実現する企業級カスタマーサポートシステム
 */

import { 
  handleChatMessage, 
  handleCreateUser, 
  handleGetConversations, 
  handleDashboardStats,
  handleHealthCheck 
} from './api-handlers.js';

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;

      // CORS対応
      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
      };

      if (request.method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      // ルーティング
      switch (true) {
        // メインチャットUI
        case path === '/' || path === '/chat':
          return handleChatInterface(corsHeaders);
        
        // スタッフダッシュボード
        case path === '/dashboard':
          return handleStaffDashboard(corsHeaders);
        
        // API endpoints
        case path === '/health':
          return handleHealthCheck(corsHeaders);
        
        case path === '/api/chat/send' && request.method === 'POST':
          return await handleChatMessage(request, env, corsHeaders);
        
        case path === '/api/conversations' && request.method === 'GET':
          return await handleGetConversations(request, env, corsHeaders);
        
        case path === '/api/users' && request.method === 'POST':
          return await handleCreateUser(request, env, corsHeaders);
        
        case path === '/api/dashboard/stats' && request.method === 'GET':
          return await handleDashboardStats(request, env, corsHeaders);

        // 従来のWebhook（互換性）
        case path === '/webhooks/chatwoot' && request.method === 'POST':
          return await handleLegacyWebhook(request, env, corsHeaders);
        
        // FAQ管理
        case path === '/admin/faq/count':
          return await handleFAQCount(env, corsHeaders);

        default:
          return new Response('Not Found', { 
            status: 404, 
            headers: { ...corsHeaders, 'Content-Type': 'text/plain' }
          });
      }

    } catch (error) {
      console.error('Worker Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error' }), { 
        status: 500,
        headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};

/**
 * チャットインターフェイス（顧客向け）
 */
function handleChatInterface(corsHeaders) {
  const chatHTML = \`<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>AIカスタマーサポート</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .chat-widget {
            width: 400px;
            height: 600px;
            background: white;
            border-radius: 16px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.15);
            display: flex;
            flex-direction: column;
            overflow: hidden;
        }
        
        .chat-header {
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            padding: 20px;
            text-align: center;
        }
        
        .chat-messages {
            flex: 1;
            padding: 20px;
            overflow-y: auto;
            background: #f8fafc;
        }
        
        .chat-input {
            padding: 20px;
            background: white;
            border-top: 1px solid #e2e8f0;
        }
        
        .message {
            margin-bottom: 15px;
            padding: 12px 16px;
            border-radius: 18px;
            max-width: 80%;
            word-wrap: break-word;
        }
        
        .message.user {
            background: #3b82f6;
            color: white;
            margin-left: auto;
            border-bottom-right-radius: 4px;
        }
        
        .message.ai {
            background: white;
            border: 1px solid #e2e8f0;
            box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
            border-bottom-left-radius: 4px;
        }
        
        .message.system {
            background: #f1f5f9;
            color: #64748b;
            text-align: center;
            font-size: 14px;
            margin: 10px auto;
            max-width: 100%;
            border-radius: 8px;
        }
        
        .input-group {
            display: flex;
            gap: 10px;
        }
        
        .input-group input {
            flex: 1;
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 24px;
            font-size: 16px;
            outline: none;
        }
        
        .input-group input:focus {
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .input-group button {
            padding: 12px 20px;
            background: #3b82f6;
            color: white;
            border: none;
            border-radius: 24px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
            transition: background 0.2s;
        }
        
        .input-group button:hover:not(:disabled) {
            background: #2563eb;
        }
        
        .input-group button:disabled {
            background: #9ca3af;
            cursor: not-allowed;
        }
        
        .status-indicator {
            display: inline-block;
            width: 8px;
            height: 8px;
            border-radius: 50%;
            margin-right: 8px;
            background: #10b981;
        }
        
        .ai-typing {
            font-style: italic;
            color: #6b7280;
            padding: 12px 16px;
            background: #f3f4f6;
            border-radius: 18px;
            margin-bottom: 15px;
            animation: pulse 2s infinite;
        }
        
        @keyframes pulse {
            0%, 100% { opacity: 1; }
            50% { opacity: 0.5; }
        }
        
        @media (max-width: 480px) {
            .chat-widget {
                width: 100%;
                height: 100%;
                border-radius: 0;
            }
        }
    </style>
</head>
<body>
    <div class="chat-widget">
        <div class="chat-header">
            <h3>🤖 AIカスタマーサポート</h3>
            <p style="font-size: 14px; opacity: 0.9; margin-top: 8px;">
                <span class="status-indicator"></span>
                オンライン | 5言語対応 | 24時間サポート
            </p>
        </div>
        
        <div class="chat-messages" id="messagesArea">
            <div class="message system">
                🎉 Chatwoot完全代替システムへようこそ！<br>
                日本語、英語、中国語、韓国語、タガログ語でサポートいたします。<br>
                何でもお気軽にお声がけください。
            </div>
        </div>
        
        <div class="chat-input">
            <div class="input-group">
                <input type="text" id="messageInput" placeholder="メッセージを入力... (多言語対応)" 
                       onkeypress="handleKeyPress(event)">
                <button onclick="sendMessage()" id="sendButton">送信</button>
            </div>
        </div>
    </div>

    <script>
        const API_BASE = window.location.origin + '/api';
        let userId = localStorage.getItem('chatUserId') || null;
        let conversationId = localStorage.getItem('chatConversationId') || null;
        
        async function initializeChat() {
            if (!userId) {
                try {
                    const userResponse = await fetch(API_BASE + '/users', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            name: 'ゲストユーザー',
                            language: 'japanese'
                        })
                    });
                    const userData = await userResponse.json();
                    if (userData.success) {
                        userId = userData.user.id;
                        localStorage.setItem('chatUserId', userId);
                    }
                } catch (error) {
                    console.error('Failed to initialize user:', error);
                    userId = 'guest_' + Date.now(); // フォールバック
                    localStorage.setItem('chatUserId', userId);
                }
            }
        }
        
        async function sendMessage() {
            if (!userId) await initializeChat();
            
            const input = document.getElementById('messageInput');
            const message = input.value.trim();
            
            if (!message) return;
            
            addMessage(message, 'user');
            input.value = '';
            toggleSendButton(false);
            showTypingIndicator();
            
            try {
                const response = await fetch(API_BASE + '/chat/send', {
                    method: 'POST',
                    headers: { 
                        'Content-Type': 'application/json',
                        'X-User-ID': userId
                    },
                    body: JSON.stringify({
                        message: message,
                        conversation_id: conversationId
                    })
                });
                
                const data = await response.json();
                
                hideTypingIndicator();
                
                if (data.success) {
                    conversationId = data.conversation_id;
                    localStorage.setItem('chatConversationId', conversationId);
                    
                    addMessage(data.ai_reply, 'ai');
                    
                    if (data.should_escalate) {
                        addMessage('📞 専門スタッフに転送しました。少々お待ちください。', 'system');
                    }
                } else {
                    addMessage('申し訳ございませんが、一時的に応答できません。', 'system');
                }
                
            } catch (error) {
                console.error('Error:', error);
                hideTypingIndicator();
                addMessage('⚠️ 接続エラーが発生しました。', 'system');
            }
            
            toggleSendButton(true);
        }
        
        function addMessage(text, type) {
            const messagesArea = document.getElementById('messagesArea');
            const messageDiv = document.createElement('div');
            messageDiv.className = 'message ' + type;
            messageDiv.textContent = text;
            
            messagesArea.appendChild(messageDiv);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
        
        function showTypingIndicator() {
            const messagesArea = document.getElementById('messagesArea');
            const typingDiv = document.createElement('div');
            typingDiv.className = 'ai-typing';
            typingDiv.id = 'typingIndicator';
            typingDiv.textContent = '🤖 AIが回答を準備中...';
            
            messagesArea.appendChild(typingDiv);
            messagesArea.scrollTop = messagesArea.scrollHeight;
        }
        
        function hideTypingIndicator() {
            const indicator = document.getElementById('typingIndicator');
            if (indicator) indicator.remove();
        }
        
        function toggleSendButton(enabled) {
            const button = document.getElementById('sendButton');
            button.disabled = !enabled;
            button.textContent = enabled ? '送信' : '送信中...';
        }
        
        function handleKeyPress(event) {
            if (event.key === 'Enter') sendMessage();
        }
        
        document.addEventListener('DOMContentLoaded', function() {
            document.getElementById('messageInput').focus();
            initializeChat();
        });
    </script>
</body>
</html>\`;

  return new Response(chatHTML, {
    headers: {
      ...corsHeaders,
      'Content-Type': 'text/html; charset=utf-8'
    }
  });
}