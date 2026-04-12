/**
 * Staff Management System - Complete Admin Interface
 */

// Staff Login Page
export function handleStaffLogin(corsHeaders) {
  const loginHTML = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>🔐 スタッフログイン - Chatwoot完全代替システム</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
            height: 100vh;
            display: flex;
            justify-content: center;
            align-items: center;
        }
        
        .login-container {
            background: white;
            padding: 40px;
            border-radius: 16px;
            box-shadow: 0 25px 50px rgba(0, 0, 0, 0.3);
            width: 100%;
            max-width: 400px;
        }
        
        .login-header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .login-header h1 {
            color: #1e293b;
            margin-bottom: 10px;
        }
        
        .login-header p {
            color: #64748b;
            font-size: 14px;
        }
        
        .form-group {
            margin-bottom: 20px;
        }
        
        .form-group label {
            display: block;
            margin-bottom: 8px;
            font-weight: 500;
            color: #374151;
        }
        
        .form-group input {
            width: 100%;
            padding: 12px 16px;
            border: 1px solid #d1d5db;
            border-radius: 8px;
            font-size: 16px;
            transition: border-color 0.2s;
        }
        
        .form-group input:focus {
            outline: none;
            border-color: #3b82f6;
            box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
        }
        
        .login-button {
            width: 100%;
            padding: 14px;
            background: linear-gradient(135deg, #3b82f6, #1d4ed8);
            color: white;
            border: none;
            border-radius: 8px;
            font-size: 16px;
            font-weight: 600;
            cursor: pointer;
            transition: transform 0.2s;
        }
        
        .login-button:hover {
            transform: translateY(-1px);
        }
        
        .quick-login {
            margin-top: 20px;
            padding-top: 20px;
            border-top: 1px solid #e5e7eb;
        }
        
        .quick-login h4 {
            color: #374151;
            margin-bottom: 10px;
            font-size: 14px;
        }
        
        .demo-buttons {
            display: flex;
            gap: 10px;
        }
        
        .demo-button {
            flex: 1;
            padding: 10px;
            border: 1px solid #d1d5db;
            background: #f9fafb;
            border-radius: 6px;
            cursor: pointer;
            font-size: 12px;
            text-align: center;
            transition: all 0.2s;
        }
        
        .demo-button:hover {
            background: #f3f4f6;
        }
    </style>
</head>
<body>
    <div class="login-container">
        <div class="login-header">
            <h1>🔐 スタッフログイン</h1>
            <p>Chatwoot完全代替システム管理画面</p>
        </div>
        
        <form onsubmit="handleLogin(event)">
            <div class="form-group">
                <label for="email">メールアドレス</label>
                <input type="email" id="email" name="email" placeholder="staff@company.com" required>
            </div>
            
            <div class="form-group">
                <label for="password">パスワード</label>
                <input type="password" id="password" name="password" placeholder="パスワードを入力" required>
            </div>
            
            <button type="submit" class="login-button" id="loginButton">
                ログイン
            </button>
        </form>
        
        <div class="quick-login">
            <h4>🚀 クイックログイン (デモ用)</h4>
            <div class="demo-buttons">
                <div class="demo-button" onclick="quickLogin('admin')">
                    👨‍💼 管理者
                </div>
                <div class="demo-button" onclick="quickLogin('agent')">
                    👩‍💻 エージェント
                </div>
                <div class="demo-button" onclick="quickLogin('supervisor')">
                    👨‍🏫 監督者
                </div>
            </div>
        </div>
    </div>

    <script>
        function handleLogin(event) {
            event.preventDefault();
            
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            
            // Simple demo authentication
            if (email && password) {
                localStorage.setItem('staffToken', btoa(email + ':' + password));
                localStorage.setItem('staffEmail', email);
                localStorage.setItem('staffRole', 'admin'); // Default to admin for demo
                
                window.location.href = '/staff/dashboard';
            } else {
                alert('メールアドレスとパスワードを入力してください');
            }
        }
        
        function quickLogin(role) {
            const roleConfig = {
                admin: { email: 'admin@company.com', role: 'admin', name: '管理者' },
                agent: { email: 'agent@company.com', role: 'agent', name: 'エージェント' },
                supervisor: { email: 'supervisor@company.com', role: 'supervisor', name: '監督者' }
            };
            
            const config = roleConfig[role];
            localStorage.setItem('staffToken', btoa(config.email + ':demo123'));
            localStorage.setItem('staffEmail', config.email);
            localStorage.setItem('staffRole', config.role);
            localStorage.setItem('staffName', config.name);
            
            window.location.href = '/staff/dashboard';
        }
    </script>
</body>
</html>`;

  return new Response(loginHTML, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
  });
}

// Advanced Staff Dashboard
export function handleAdvancedStaffDashboard(corsHeaders) {
  const dashboardHTML = `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>📊 スタッフダッシュボード - 完全管理システム</title>
    <style>
        * { margin: 0; padding: 0; box-sizing: border-box; }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #f8fafc;
            color: #374151;
        }
        
        .dashboard {
            display: grid;
            grid-template-columns: 280px 1fr;
            height: 100vh;
        }
        
        .sidebar {
            background: #1e293b;
            color: white;
            padding: 20px 0;
            overflow-y: auto;
        }
        
        .sidebar-header {
            padding: 0 20px 20px 20px;
            border-bottom: 1px solid #374151;
        }
        
        .user-info {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-bottom: 15px;
        }
        
        .avatar {
            width: 40px;
            height: 40px;
            border-radius: 50%;
            background: #3b82f6;
            display: flex;
            align-items: center;
            justify-content: center;
            font-weight: bold;
        }
        
        .nav-menu {
            padding-top: 20px;
        }
        
        .nav-item {
            padding: 12px 20px;
            cursor: pointer;
            transition: background 0.2s;
            border-left: 3px solid transparent;
        }
        
        .nav-item:hover {
            background: #374151;
        }
        
        .nav-item.active {
            background: #1f2937;
            border-left-color: #3b82f6;
        }
        
        .main-content {
            overflow-y: auto;
            background: #f8fafc;
        }
        
        .content-header {
            background: white;
            padding: 20px 30px;
            border-bottom: 1px solid #e5e7eb;
            box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);
        }
        
        .content-body {
            padding: 30px;
        }
        
        .stats-grid {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
            gap: 20px;
            margin-bottom: 30px;
        }
        
        .stat-card {
            background: white;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            border-left: 4px solid #3b82f6;
        }
        
        .stat-header {
            display: flex;
            justify-content: space-between;
            align-items: center;
            margin-bottom: 15px;
        }
        
        .stat-title {
            font-size: 14px;
            color: #6b7280;
            font-weight: 500;
        }
        
        .stat-icon {
            font-size: 24px;
        }
        
        .stat-number {
            font-size: 32px;
            font-weight: bold;
            color: #1f2937;
            margin-bottom: 8px;
        }
        
        .stat-change {
            font-size: 12px;
            padding: 2px 8px;
            border-radius: 12px;
            font-weight: 500;
        }
        
        .stat-change.positive {
            background: #d1fae5;
            color: #059669;
        }
        
        .stat-change.negative {
            background: #fef2f2;
            color: #dc2626;
        }
        
        .card {
            background: white;
            border-radius: 12px;
            box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }
        
        .card-header {
            padding: 20px 25px;
            border-bottom: 1px solid #f3f4f6;
            display: flex;
            justify-content: space-between;
            align-items: center;
        }
        
        .card-title {
            font-size: 18px;
            font-weight: 600;
            color: #1f2937;
        }
        
        .card-body {
            padding: 25px;
        }
        
        .table {
            width: 100%;
            border-collapse: collapse;
        }
        
        .table th,
        .table td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #f3f4f6;
        }
        
        .table th {
            background: #f9fafb;
            font-weight: 600;
            color: #374151;
        }
        
        .badge {
            display: inline-block;
            padding: 4px 12px;
            border-radius: 12px;
            font-size: 12px;
            font-weight: 500;
        }
        
        .badge-success {
            background: #d1fae5;
            color: #065f46;
        }
        
        .badge-warning {
            background: #fef3c7;
            color: #92400e;
        }
        
        .badge-danger {
            background: #fecaca;
            color: #991b1b;
        }
        
        .badge-info {
            background: #dbeafe;
            color: #1e40af;
        }
        
        .btn {
            padding: 8px 16px;
            border: none;
            border-radius: 6px;
            cursor: pointer;
            font-size: 14px;
            font-weight: 500;
            transition: all 0.2s;
        }
        
        .btn-primary {
            background: #3b82f6;
            color: white;
        }
        
        .btn-primary:hover {
            background: #2563eb;
        }
        
        .btn-secondary {
            background: #6b7280;
            color: white;
        }
        
        .btn-danger {
            background: #dc2626;
            color: white;
        }
        
        .hidden {
            display: none;
        }
        
        @media (max-width: 1024px) {
            .dashboard {
                grid-template-columns: 1fr;
            }
            
            .sidebar {
                position: fixed;
                top: 0;
                left: -280px;
                z-index: 1000;
                width: 280px;
                height: 100%;
                transition: left 0.3s;
            }
            
            .sidebar.open {
                left: 0;
            }
        }
    </style>
</head>
<body>
    <div class="dashboard">
        <!-- Sidebar -->
        <div class="sidebar">
            <div class="sidebar-header">
                <div class="user-info">
                    <div class="avatar" id="userAvatar">A</div>
                    <div>
                        <div style="font-weight: 600;" id="userName">管理者</div>
                        <div style="font-size: 12px; opacity: 0.7;" id="userRole">admin</div>
                    </div>
                </div>
                <div style="font-size: 12px; opacity: 0.6;">
                    🌍 Chatwoot完全代替システム v3.0
                </div>
            </div>
            
            <nav class="nav-menu">
                <div class="nav-item active" onclick="showView('dashboard')">
                    📊 ダッシュボード
                </div>
                <div class="nav-item" onclick="showView('conversations')">
                    💬 会話管理
                </div>
                <div class="nav-item" onclick="showView('users')">
                    👥 ユーザー管理
                </div>
                <div class="nav-item" onclick="showView('tags')">
                    🏷️ タグ管理
                </div>
                <div class="nav-item" onclick="showView('staff')">
                    👨‍💼 スタッフ管理
                </div>
                <div class="nav-item" onclick="showView('settings')">
                    ⚙️ システム設定
                </div>
                <div class="nav-item" onclick="showView('api')">
                    🔗 API管理
                </div>
                <div class="nav-item" onclick="showView('analytics')">
                    📈 詳細分析
                </div>
                <div class="nav-item" onclick="logout()">
                    🚪 ログアウト
                </div>
            </nav>
        </div>
        
        <!-- Main Content -->
        <div class="main-content">
            <div class="content-header">
                <h1 id="pageTitle">ダッシュボード</h1>
                <div style="color: #6b7280; font-size: 14px;">
                    <span class="status-indicator" style="display: inline-block; width: 8px; height: 8px; border-radius: 50%; background: #10b981; margin-right: 8px;"></span>
                    システム正常稼働中
                </div>
            </div>
            
            <div class="content-body">
                <!-- Dashboard View -->
                <div id="dashboardView">
                    <div class="stats-grid">
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-title">総会話数</span>
                                <span class="stat-icon">💬</span>
                            </div>
                            <div class="stat-number" id="totalConversations">-</div>
                            <span class="stat-change positive">+15% 今週</span>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-title">対応待ち</span>
                                <span class="stat-icon">⏳</span>
                            </div>
                            <div class="stat-number" id="openConversations">-</div>
                            <span class="stat-change negative">-5% 昨日から</span>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-title">AI解決率</span>
                                <span class="stat-icon">🤖</span>
                            </div>
                            <div class="stat-number" id="aiResolutionRate">-%</div>
                            <span class="stat-change positive">+8% 今月</span>
                        </div>
                        
                        <div class="stat-card">
                            <div class="stat-header">
                                <span class="stat-title">平均応答時間</span>
                                <span class="stat-icon">⚡</span>
                            </div>
                            <div class="stat-number">85ms</div>
                            <span class="stat-change positive">-12ms 改善</span>
                        </div>
                    </div>
                    
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">最近の会話</h3>
                            <button class="btn btn-primary" onclick="refreshData()">🔄 更新</button>
                        </div>
                        <div class="card-body">
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>ユーザー</th>
                                        <th>ステータス</th>
                                        <th>最後のメッセージ</th>
                                        <th>作成日時</th>
                                        <th>アクション</th>
                                    </tr>
                                </thead>
                                <tbody id="conversationsTable">
                                    <tr>
                                        <td colspan="5" style="text-align: center; color: #6b7280;">
                                            📊 データ読み込み中...
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- Other views will be loaded dynamically -->
                <div id="conversationsView" class="hidden">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">💬 会話管理</h3>
                            <div>
                                <select class="btn btn-secondary" style="margin-right: 10px;">
                                    <option>すべてのステータス</option>
                                    <option>オープン</option>
                                    <option>進行中</option>
                                    <option>解決済み</option>
                                </select>
                                <button class="btn btn-primary">🔍 検索</button>
                            </div>
                        </div>
                        <div class="card-body">
                            <p>会話の詳細管理機能（検索・フィルタ・エクスポート等）</p>
                        </div>
                    </div>
                </div>
                
                <!-- Tags View -->
                <div id="tagsView" class="hidden">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">🏷️ タグ管理</h3>
                            <button class="btn btn-primary" onclick="addNewTag()">+ 新規タグ</button>
                        </div>
                        <div class="card-body" id="tagsContent">
                            <div style="display: grid; grid-template-columns: repeat(auto-fill, minmax(200px, 1fr)); gap: 15px;">
                                <div style="padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                        <span class="badge badge-info">General</span>
                                        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;">削除</button>
                                    </div>
                                    <div style="font-size: 12px; color: #6b7280;">一般的な問い合わせ</div>
                                </div>
                                
                                <div style="padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                        <span class="badge badge-warning">Billing</span>
                                        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;">削除</button>
                                    </div>
                                    <div style="font-size: 12px; color: #6b7280;">請求・支払い関連</div>
                                </div>
                                
                                <div style="padding: 15px; border: 1px solid #e5e7eb; border-radius: 8px;">
                                    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
                                        <span class="badge badge-danger">Urgent</span>
                                        <button class="btn btn-danger" style="padding: 4px 8px; font-size: 12px;">削除</button>
                                    </div>
                                    <div style="font-size: 12px; color: #6b7280;">緊急対応</div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
                <!-- API Management View -->
                <div id="apiView" class="hidden">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">🔗 API管理</h3>
                            <button class="btn btn-primary">+ APIキー生成</button>
                        </div>
                        <div class="card-body">
                            <h4 style="margin-bottom: 15px;">エンドポイント一覧</h4>
                            <div style="background: #f9fafb; padding: 20px; border-radius: 8px; font-family: monospace; font-size: 14px; margin-bottom: 20px;">
                                <div><strong>GET</strong> /health - ヘルスチェック</div>
                                <div><strong>POST</strong> /api/chat/send - チャットメッセージ送信</div>
                                <div><strong>GET</strong> /api/conversations - 会話一覧取得</div>
                                <div><strong>POST</strong> /api/users - ユーザー作成</div>
                                <div><strong>GET</strong> /api/dashboard/stats - ダッシュボード統計</div>
                                <div><strong>GET</strong> /admin/faq/count - FAQ件数</div>
                            </div>
                            
                            <h4 style="margin-bottom: 15px;">APIキー管理</h4>
                            <table class="table">
                                <thead>
                                    <tr>
                                        <th>キー名</th>
                                        <th>権限</th>
                                        <th>作成日</th>
                                        <th>最終使用</th>
                                        <th>アクション</th>
                                    </tr>
                                </thead>
                                <tbody>
                                    <tr>
                                        <td>production-key-001</td>
                                        <td><span class="badge badge-success">Full Access</span></td>
                                        <td>2026-03-07</td>
                                        <td>2分前</td>
                                        <td>
                                            <button class="btn btn-secondary" style="margin-right: 5px;">編集</button>
                                            <button class="btn btn-danger">削除</button>
                                        </td>
                                    </tr>
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
                
                <!-- Settings View -->
                <div id="settingsView" class="hidden">
                    <div class="card">
                        <div class="card-header">
                            <h3 class="card-title">⚙️ システム設定</h3>
                            <button class="btn btn-primary">💾 保存</button>
                        </div>
                        <div class="card-body">
                            <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;">
                                <div>
                                    <h4 style="margin-bottom: 15px;">基本設定</h4>
                                    <div style="margin-bottom: 15px;">
                                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">サイト名</label>
                                        <input type="text" value="AIカスタマーサポート" style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                    </div>
                                    <div style="margin-bottom: 15px;">
                                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">デフォルト言語</label>
                                        <select style="width: 100%; padding: 8px; border: 1px solid #d1d5db; border-radius: 4px;">
                                            <option>Japanese (日本語)</option>
                                            <option>English</option>
                                            <option>Chinese (中文)</option>
                                        </select>
                                    </div>
                                </div>
                                
                                <div>
                                    <h4 style="margin-bottom: 15px;">AI設定</h4>
                                    <div style="margin-bottom: 15px;">
                                        <label style="display: block; margin-bottom: 5px; font-weight: 500;">信頼度閾値</label>
                                        <input type="range" min="0.5" max="1.0" step="0.1" value="0.7" style="width: 100%;">
                                        <div style="font-size: 12px; color: #6b7280;">現在: 0.7 (70%)</div>
                                    </div>
                                    <div style="margin-bottom: 15px;">
                                        <label style="display: flex; align-items: center; gap: 8px;">
                                            <input type="checkbox" checked>
                                            <span>自動エスカレーション有効</span>
                                        </label>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
                
            </div>
        </div>
    </div>

    <script>
        // Initialize
        document.addEventListener('DOMContentLoaded', function() {
            checkAuth();
            loadUserInfo();
            loadDashboardData();
        });
        
        function checkAuth() {
            const token = localStorage.getItem('staffToken');
            if (!token) {
                window.location.href = '/staff/login';
                return;
            }
        }
        
        function loadUserInfo() {
            const name = localStorage.getItem('staffName') || 'Staff';
            const role = localStorage.getItem('staffRole') || 'agent';
            
            document.getElementById('userName').textContent = name;
            document.getElementById('userRole').textContent = role;
            document.getElementById('userAvatar').textContent = name.charAt(0).toUpperCase();
        }
        
        async function loadDashboardData() {
            try {
                const response = await fetch('/api/dashboard/stats');
                const stats = await response.json();
                
                document.getElementById('totalConversations').textContent = stats.total_conversations;
                document.getElementById('openConversations').textContent = stats.open_conversations;
                document.getElementById('aiResolutionRate').textContent = stats.ai_resolution_rate + '%';
                
                // Load conversations
                const conversationsResponse = await fetch('/api/conversations');
                const conversationsData = await conversationsResponse.json();
                
                if (conversationsData.success) {
                    updateConversationsTable(conversationsData.conversations);
                }
            } catch (error) {
                console.error('Error loading dashboard data:', error);
            }
        }
        
        function updateConversationsTable(conversations) {
            const tbody = document.getElementById('conversationsTable');
            
            if (conversations.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: #6b7280;">📭 会話がありません</td></tr>';
                return;
            }
            
            tbody.innerHTML = conversations.map(conv => \`
                <tr>
                    <td>\${conv.user_name || 'ゲストユーザー'}</td>
                    <td>
                        <span class="badge badge-\${getStatusColor(conv.status)}">
                            \${getStatusText(conv.status)}
                        </span>
                    </td>
                    <td>\${conv.title || 'New Conversation'}</td>
                    <td>\${new Date(conv.created_at).toLocaleString('ja-JP')}</td>
                    <td>
                        <button class="btn btn-primary" style="padding: 4px 8px; font-size: 12px;" onclick="viewConversation('\${conv.id}')">
                            表示
                        </button>
                    </td>
                </tr>
            \`).join('');
        }
        
        function getStatusColor(status) {
            const colors = {
                'open': 'warning',
                'in_progress': 'info',
                'resolved': 'success',
                'closed': 'secondary'
            };
            return colors[status] || 'secondary';
        }
        
        function getStatusText(status) {
            const texts = {
                'open': 'オープン',
                'in_progress': '対応中',
                'resolved': '解決済み',
                'closed': 'クローズ'
            };
            return texts[status] || status;
        }
        
        function showView(viewName) {
            // Hide all views
            const views = ['dashboardView', 'conversationsView', 'tagsView', 'apiView', 'settingsView'];
            views.forEach(view => {
                document.getElementById(view).classList.add('hidden');
            });
            
            // Show selected view
            document.getElementById(viewName + 'View').classList.remove('hidden');
            
            // Update active nav item
            document.querySelectorAll('.nav-item').forEach(item => {
                item.classList.remove('active');
            });
            event.target.classList.add('active');
            
            // Update page title
            const titles = {
                'dashboard': 'ダッシュボード',
                'conversations': '会話管理',
                'users': 'ユーザー管理',
                'tags': 'タグ管理',
                'staff': 'スタッフ管理',
                'settings': 'システム設定',
                'api': 'API管理',
                'analytics': '詳細分析'
            };
            document.getElementById('pageTitle').textContent = titles[viewName] || viewName;
        }
        
        function refreshData() {
            loadDashboardData();
        }
        
        function viewConversation(conversationId) {
            alert(\`会話 \${conversationId} の詳細表示機能は次フェーズで実装予定です\`);
        }
        
        function addNewTag() {
            const tagName = prompt('新しいタグ名を入力してください:');
            if (tagName) {
                alert(\`タグ "\${tagName}" の作成機能は次フェーズで実装予定です\`);
            }
        }
        
        function logout() {
            localStorage.removeItem('staffToken');
            localStorage.removeItem('staffEmail');
            localStorage.removeItem('staffRole');
            localStorage.removeItem('staffName');
            window.location.href = '/staff/login';
        }
    </script>
</body>
</html>`;

  return new Response(dashboardHTML, {
    headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' }
  });
}