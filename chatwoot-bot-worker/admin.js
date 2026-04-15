// ============================================================================
// 管理画面 HTML（ボーナスコード管理 + メニュー閲覧 + 運用監視）
// v2: WCAG AA準拠、XSS対策、addEventListener化、楽観更新、apiFetch共通化
// ============================================================================

export function getAdminHTML() {
  return `<!DOCTYPE html>
<html lang="ja">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Chatwoot Bot 管理パネル</title>
    <style>
        /* デザイントークン */
        :root {
            --color-primary:      #0f766e;
            --color-primary-hover:#115e59;
            --color-primary-light:#14b8a6;
            --color-primary-50:   #f0fdfa;
            --color-text:         #1f2937;
            --color-text-muted:   #4b5563;
            --color-border:       #e5e7eb;
            --color-surface:      #ffffff;
            --color-surface-alt:  #f8fafc;
            --color-bg:           #f3f4f6;
            --color-success:      #15803d;
            --color-success-bg:   #dcfce7;
            --color-danger:       #b91c1c;
            --color-danger-bg:    #fee2e2;
            --color-warning:      #a16207;
            --color-warning-bg:   #fef3c7;
            --color-info:         #1e40af;
            --color-info-bg:      #dbeafe;

            --space-1: 4px;  --space-2: 8px;  --space-3: 12px;
            --space-4: 16px; --space-5: 24px; --space-6: 32px; --space-8: 48px;

            --radius-sm: 6px; --radius-md: 8px; --radius-lg: 12px;
            --shadow-sm: 0 1px 2px rgba(17,24,39,.06);
            --shadow-md: 0 4px 12px rgba(17,24,39,.08);

            --font-sans: -apple-system, BlinkMacSystemFont, 'Segoe UI',
                         'Hiragino Sans', 'Noto Sans JP', sans-serif;
            --fs-xs: 12px; --fs-sm: 14px; --fs-base: 16px;
            --fs-lg: 18px; --fs-xl: 22px; --fs-2xl: 28px;

            --transition: 160ms ease;
        }

        *, *::before, *::after { box-sizing: border-box; }

        body {
            font-family: var(--font-sans);
            font-size: var(--fs-base);
            line-height: 1.6;
            color: var(--color-text);
            margin: 0;
            padding: var(--space-5);
            background: var(--color-bg);
        }

        .container { max-width: 1200px; margin: 0 auto; }

        .card {
            background: var(--color-surface);
            padding: var(--space-6);
            margin: var(--space-4) 0;
            border-radius: var(--radius-lg);
            box-shadow: var(--shadow-sm);
            transition: box-shadow var(--transition);
        }
        .card:hover { box-shadow: var(--shadow-md); }

        h1 {
            font-size: var(--fs-2xl);
            font-weight: 700;
            color: var(--color-text);
            text-align: center;
            margin: var(--space-4) 0;
        }
        h2 {
            font-size: var(--fs-xl);
            font-weight: 600;
            color: var(--color-text);
            border-bottom: 2px solid var(--color-primary);
            padding-bottom: var(--space-2);
            margin-top: 0;
        }
        h3 {
            font-size: var(--fs-lg);
            font-weight: 600;
            color: var(--color-primary);
            margin-top: var(--space-5);
        }

        /* フォーカス可視化（WCAG 2.4.7） */
        :focus-visible {
            outline: 3px solid var(--color-primary-light);
            outline-offset: 2px;
            border-radius: var(--radius-sm);
        }
        .form-control:focus { outline: 2px solid var(--color-primary); outline-offset: 1px; border-color: var(--color-primary); }

        /* ボタン */
        .btn {
            background: var(--color-primary);
            color: #fff;
            border: none;
            padding: var(--space-3) var(--space-5);
            border-radius: var(--radius-sm);
            cursor: pointer;
            margin: var(--space-2) var(--space-2) var(--space-2) 0;
            font-size: var(--fs-sm);
            font-weight: 600;
            transition: background var(--transition), transform var(--transition), box-shadow var(--transition);
        }
        .btn:hover:not(:disabled) { background: var(--color-primary-hover); transform: translateY(-1px); box-shadow: var(--shadow-md); }
        .btn:active:not(:disabled) { transform: translateY(0); }
        .btn:disabled { opacity: 0.5; cursor: not-allowed; }
        .btn-sm { padding: var(--space-2) var(--space-3); font-size: var(--fs-xs); margin: var(--space-1); }
        .btn-danger { background: var(--color-danger); }
        .btn-danger:hover:not(:disabled) { background: #991b1b; }
        .btn-secondary { background: #4b5563; }
        .btn-secondary:hover:not(:disabled) { background: #374151; }

        /* アラート */
        .alert { padding: var(--space-4); border-radius: var(--radius-sm); margin: var(--space-2) 0; }
        .alert-success { background: var(--color-success-bg); color: var(--color-success); border: 1px solid #86efac; }
        .alert-error { background: var(--color-danger-bg); color: var(--color-danger); border: 1px solid #fca5a5; }
        .alert-info { background: var(--color-info-bg); color: var(--color-info); border: 1px solid #93c5fd; }

        /* フォーム */
        .form-control {
            width: 100%;
            padding: var(--space-3);
            border: 1px solid var(--color-border);
            border-radius: var(--radius-sm);
            margin-bottom: var(--space-2);
            font-size: var(--fs-sm);
            font-family: inherit;
        }
        textarea.form-control { min-height: 80px; resize: vertical; }
        label { display: block; margin-bottom: var(--space-2); font-weight: 600; color: var(--color-text); }
        .field-error { display: block; color: var(--color-danger); font-size: var(--fs-xs); margin-top: -4px; margin-bottom: var(--space-2); }

        /* ステータスバッジ */
        .status-badge { display: inline-block; padding: var(--space-1) var(--space-3); border-radius: 12px; font-size: var(--fs-xs); font-weight: 600; }
        .status-active { background: var(--color-success-bg); color: var(--color-success); }

        /* 統計カード */
        .stats { display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: var(--space-4); margin-top: var(--space-4); }
        .stat-card { background: var(--color-surface-alt); padding: var(--space-4); border-radius: var(--radius-md); text-align: center; border: 1px solid var(--color-border); }
        .stat-number { font-size: var(--fs-2xl); font-weight: 700; color: var(--color-primary); }
        .stat-label { font-size: var(--fs-xs); color: var(--color-text-muted); }

        /* タブ */
        .tab-nav { display: flex; gap: 0; border-bottom: 2px solid var(--color-border); margin-bottom: var(--space-5); }
        .tab-btn {
            background: none;
            border: none;
            padding: var(--space-3) var(--space-5);
            cursor: pointer;
            font-size: var(--fs-base);
            font-weight: 600;
            color: var(--color-text-muted);
            border-bottom: 3px solid transparent;
            transition: color var(--transition), border-color var(--transition);
            font-family: inherit;
        }
        .tab-btn[aria-selected="true"] { color: var(--color-primary); border-bottom-color: var(--color-primary); }
        .tab-btn:hover { color: var(--color-primary); }
        .tab-content { display: none; }
        .tab-content.active { display: block; }

        /* アコーディオン */
        .bonus-group { border: 1px solid var(--color-border); border-radius: var(--radius-md); margin-bottom: var(--space-2); overflow: hidden; }
        .bonus-header {
            display: flex; align-items: center; gap: var(--space-3);
            padding: var(--space-3) var(--space-4);
            background: var(--color-surface-alt);
            cursor: pointer; flex-wrap: wrap;
            border: none; width: 100%; text-align: left;
            font-family: inherit; font-size: var(--fs-sm);
        }
        .bonus-header:hover { background: #f1f5f9; }
        .chevron { font-size: var(--fs-xs); transition: transform var(--transition); min-width: 1rem; }
        .chevron.open { transform: rotate(90deg); }
        .bonus-type-name { font-weight: 600; font-size: var(--fs-base); color: var(--color-text); }
        .bonus-type-id { font-size: var(--fs-xs); color: var(--color-text-muted); }
        .badge { font-size: var(--fs-xs); padding: var(--space-1) var(--space-2); border-radius: 4px; white-space: nowrap; font-weight: 600; }
        .badge-hardcoded { background: var(--color-success-bg); color: var(--color-success); }
        .badge-dynamic { background: var(--color-info-bg); color: var(--color-info); }
        .badge-enabled { background: var(--color-success-bg); color: var(--color-success); }
        .badge-disabled { background: var(--color-danger-bg); color: var(--color-danger); }
        .bonus-body { padding: var(--space-4); border-top: 1px solid var(--color-border); display: none; }
        .bonus-body.open { display: block; }

        /* バリアントタグ */
        .variant-tags { display: flex; flex-wrap: wrap; gap: var(--space-2); margin-bottom: var(--space-3); }
        .variant-tag { display: inline-flex; align-items: center; gap: var(--space-2); padding: var(--space-1) var(--space-3); border-radius: 20px; font-size: var(--fs-sm); }
        .variant-tag.hardcoded { background: var(--color-success-bg); color: var(--color-success); }
        .variant-tag.dynamic { background: var(--color-info-bg); color: var(--color-info); }
        .variant-tag .remove-btn { background: none; border: none; color: var(--color-danger); cursor: pointer; font-size: var(--fs-base); padding: 0; line-height: 1; font-weight: 700; }
        .variant-tag .source-label { font-size: var(--fs-xs); color: var(--color-text-muted); }
        .add-variant-row { display: flex; gap: var(--space-2); margin-top: var(--space-2); }
        .add-variant-row input { flex: 1; padding: var(--space-2) var(--space-3); border: 1px solid var(--color-border); border-radius: var(--radius-sm); font-size: var(--fs-sm); }
        .bonus-meta { margin-top: var(--space-3); font-size: var(--fs-xs); color: var(--color-text-muted); }

        /* トグルスイッチ */
        .toggle-switch { position: relative; display: inline-block; width: 44px; height: 24px; }
        .toggle-switch input { opacity: 0; width: 0; height: 0; }
        .toggle-slider { position: absolute; cursor: pointer; top: 0; left: 0; right: 0; bottom: 0; background: #9ca3af; border-radius: 24px; transition: 0.3s; }
        .toggle-slider:before { position: absolute; content: ""; height: 18px; width: 18px; left: 3px; bottom: 3px; background: white; border-radius: 50%; transition: 0.3s; }
        .toggle-switch input:checked + .toggle-slider { background: var(--color-primary); }
        .toggle-switch input:checked + .toggle-slider:before { transform: translateX(20px); }
        .toggle-switch input:focus-visible + .toggle-slider { outline: 3px solid var(--color-primary-light); outline-offset: 2px; }

        /* 新規作成フォーム */
        .create-form { background: var(--color-surface-alt); padding: var(--space-5); border-radius: var(--radius-md); margin-top: var(--space-4); display: none; border: 1px solid var(--color-border); }
        .create-form.open { display: block; }
        .form-row { margin-bottom: var(--space-4); }
        .form-row small { color: var(--color-text-muted); font-size: var(--fs-xs); }

        /* 確認ダイアログ */
        .confirm-overlay { position: fixed; top: 0; left: 0; width: 100%; height: 100%; background: rgba(0,0,0,0.5); display: flex; align-items: center; justify-content: center; z-index: 1000; }
        .confirm-dialog { background: white; padding: var(--space-6); border-radius: var(--radius-lg); max-width: 440px; width: 90%; text-align: center; box-shadow: var(--shadow-md); }
        .confirm-dialog p { margin: var(--space-4) 0; }
        .confirm-dialog .btn { min-width: 100px; }

        /* トースト */
        .toast-container { position: fixed; top: var(--space-5); right: var(--space-5); z-index: 1001; }
        .toast { padding: var(--space-4) var(--space-5); border-radius: var(--radius-md); color: white; font-weight: 600; margin-bottom: var(--space-2); animation: slideIn 0.3s ease-out; max-width: 350px; box-shadow: var(--shadow-md); }
        .toast-success { background: var(--color-success); }
        .toast-error { background: var(--color-danger); }
        @keyframes slideIn { from { transform: translateX(100%); opacity: 0; } to { transform: translateX(0); opacity: 1; } }
        @keyframes fadeOut { from { opacity: 1; } to { opacity: 0; transform: translateY(-10px); } }

        /* メニューツリー */
        .menu-search { margin-bottom: var(--space-4); }
        .tree-section { margin-bottom: var(--space-5); }
        .tree-section-header { font-weight: 600; font-size: var(--fs-base); color: var(--color-text); padding: var(--space-2) 0; cursor: pointer; display: flex; align-items: center; gap: var(--space-2); border-bottom: 2px solid var(--color-border); margin-bottom: var(--space-2); user-select: none; background: none; border-top: none; border-left: none; border-right: none; width: 100%; text-align: left; font-family: inherit; }
        .tree-section-header:hover { color: var(--color-primary); }
        .tree-section-header .count { font-size: var(--fs-xs); color: var(--color-text-muted); font-weight: 400; }
        .tree-section-body { display: none; padding-left: 4px; }
        .tree-section-body.open { display: block; }
        .tree-node { position: relative; }
        .tree-children { margin-left: 16px; padding-left: 12px; border-left: 2px solid var(--color-border); }
        .tree-node-row { display: flex; align-items: center; gap: 4px; padding: 4px 6px; border-radius: 4px; font-size: var(--fs-sm); }
        .tree-node-row:hover { background: var(--color-primary-50); }
        .tree-toggle { width: 18px; text-align: center; font-size: 10px; color: var(--color-text-muted); flex-shrink: 0; cursor: pointer; line-height: 1; padding: 4px 0; user-select: none; background: none; border: none; }
        .tree-toggle:hover { color: var(--color-primary); }
        .tree-label { flex: 1; min-width: 0; display: flex; align-items: baseline; gap: 6px; overflow: hidden; cursor: pointer; background: none; border: none; padding: 0; text-align: left; font-family: inherit; font-size: inherit; color: inherit; }
        .tree-title { font-weight: 500; font-size: var(--fs-sm); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
        .tree-key { color: var(--color-text-muted); font-size: var(--fs-xs); font-family: monospace; white-space: nowrap; }
        .tree-badge { font-size: 10px; padding: 1px 5px; border-radius: 3px; white-space: nowrap; font-weight: 700; margin-left: 2px; }
        .tree-badge-gas { background: #fef3c7; color: #854d0e; }
        .tree-badge-bank { background: #dcfce7; color: #14532d; }
        .tree-badge-ec { background: #dbeafe; color: #1e3a8a; }
        .tree-badge-agent { background: #fce7f3; color: #831843; }
        .tree-detail { margin: 2px 0 6px 28px; padding: var(--space-3); background: var(--color-surface-alt); border-radius: var(--radius-sm); border-left: 3px solid var(--color-primary); font-size: var(--fs-xs); display: none; }
        .tree-detail.open { display: block; }
        .tree-detail pre { background: #fff; padding: var(--space-2); border-radius: 4px; border: 1px solid var(--color-border); white-space: pre-wrap; word-wrap: break-word; font-size: var(--fs-xs); margin: 4px 0; }
        .tree-ref .tree-node-row { opacity: 0.6; }
        .tree-detail table { width: 100%; border-collapse: collapse; font-size: var(--fs-xs); margin-top: 6px; }
        .tree-detail th, .tree-detail td { padding: 3px 6px; border: 1px solid var(--color-border); text-align: left; }
        .tree-detail th { background: var(--color-surface-alt); }
        .tree-content-preview { color: var(--color-text-muted); font-size: var(--fs-xs); padding-left: 24px; margin: -1px 0 2px 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; cursor: pointer; max-width: 95%; line-height: 1.3; }
        .tree-content-preview:hover { color: var(--color-text); }
        .tree-link { color: var(--color-primary); cursor: pointer; text-decoration: none; font-family: monospace; font-size: var(--fs-xs); background: none; border: none; padding: 0; }
        .tree-link:hover { text-decoration: underline; color: var(--color-primary-hover); }
        .tree-nav-type { font-size: var(--fs-xs); color: var(--color-text-muted); white-space: nowrap; }
        .tree-node.highlight > .tree-node-row { background: rgba(15, 118, 110, 0.15) !important; transition: background 0.5s; }
        .tree-node.highlight > .tree-content-preview { color: var(--color-primary); font-weight: 600; }

        /* スクリーンリーダー専用 */
        .sr-only { position: absolute; width: 1px; height: 1px; padding: 0; margin: -1px; overflow: hidden; clip: rect(0,0,0,0); white-space: nowrap; border: 0; }

        /* モーション削減 */
        @media (prefers-reduced-motion: reduce) {
            *, *::before, *::after {
                animation-duration: 0.01ms !important;
                transition-duration: 0.01ms !important;
            }
        }

        /* レスポンシブ */
        @media (max-width: 768px) {
            body { padding: var(--space-3); }
            .card { padding: var(--space-4); }
            .tab-nav { flex-wrap: wrap; }
            .tab-btn { flex: 1; min-width: 120px; text-align: center; font-size: var(--fs-sm); padding: var(--space-2) var(--space-2); }
            .bonus-header { font-size: var(--fs-sm); }
            .bonus-type-id { display: none; }
            .add-variant-row { flex-direction: column; }
            .stats { grid-template-columns: repeat(2, 1fr); }
            .confirm-dialog { width: 95%; }
            .toast { max-width: none; left: var(--space-2); right: var(--space-2); }
        }
    </style>
</head>
<body>
    <main class="container">
        <h1>Chatwoot Bot 管理パネル</h1>
        <p style="text-align: center; color: var(--color-text-muted);">BotPress置き換え — Cloudflare Worker版</p>

        <section class="card" aria-labelledby="status-heading">
            <h2 id="status-heading">Bot ステータス</h2>
            <p><span class="status-badge status-active">Active</span> Webhook受信待機中</p>
            <div class="stats">
                <div class="stat-card">
                    <div class="stat-number" id="stat-menus">-</div>
                    <div class="stat-label">メニュー画面</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="stat-codes">-</div>
                    <div class="stat-label">ボーナスコード種別</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="stat-games">60</div>
                    <div class="stat-label">機種選択（6種×10）</div>
                </div>
                <div class="stat-card">
                    <div class="stat-number" id="stat-gas">4</div>
                    <div class="stat-label">GAS連携</div>
                </div>
            </div>
        </section>

        <section class="card" aria-labelledby="test-heading">
            <h2 id="test-heading">Webhook テスト</h2>
            <p>Chatwoot Webhookのシミュレーション送信ができます。</p>
            <div>
                <label for="test-message">メッセージ:</label>
                <input type="text" id="test-message" class="form-control" placeholder="welcome_message / deposit_withdrawal / スペシャルステップ ...">
                <label for="test-conv-id">会話ID:</label>
                <input type="text" id="test-conv-id" class="form-control" placeholder="123">
                <button class="btn" id="btn-test-webhook">テスト送信</button>
            </div>
            <div id="test-results"></div>
        </section>

        <div class="card">
            <div class="tab-nav" role="tablist" aria-label="管理セクション">
                <button class="tab-btn" role="tab" id="tab-btn-bonus" aria-selected="true" aria-controls="tab-bonus" data-tab="bonus" tabindex="0">ボーナスコード管理</button>
                <button class="tab-btn" role="tab" id="tab-btn-menus" aria-selected="false" aria-controls="tab-menus" data-tab="menus" tabindex="-1">メニュー・メッセージ</button>
                <button class="tab-btn" role="tab" id="tab-btn-ops" aria-selected="false" aria-controls="tab-ops" data-tab="ops" tabindex="-1">運用・監視</button>
            </div>

            <!-- ボーナスコード管理タブ -->
            <div id="tab-bonus" class="tab-content active" role="tabpanel" aria-labelledby="tab-btn-bonus" tabindex="0">
                <div id="bonus-loading" aria-live="polite" aria-busy="true"><p>読み込み中...</p></div>
                <div id="bonus-list"></div>
                <button class="btn" id="btn-create-form-toggle" style="display:none;">+ 新しいボーナスコード種別を追加</button>
                <div class="create-form" id="create-form" aria-labelledby="create-form-heading">
                    <h3 id="create-form-heading" style="margin-top:0;">新しいボーナスコード種別</h3>
                    <div class="form-row">
                        <label for="new-type-id">種別ID (英数):</label>
                        <input type="text" id="new-type-id" class="form-control" placeholder="例: sakura_bonus" pattern="[a-z0-9_]+" aria-describedby="new-type-id-help">
                        <small id="new-type-id-help">英小文字・数字・アンダースコアのみ</small>
                        <span class="field-error" id="err-new-type-id"></span>
                    </div>
                    <div class="form-row">
                        <label for="new-display-name">表示名:</label>
                        <input type="text" id="new-display-name" class="form-control" placeholder="例: 桜ボーナス">
                        <span class="field-error" id="err-new-display-name"></span>
                    </div>
                    <div class="form-row">
                        <label for="new-variant-input">コードバリアント:</label>
                        <div class="add-variant-row">
                            <input type="text" id="new-variant-input" placeholder="例: サクラボーナス" aria-describedby="new-variant-help">
                            <button class="btn btn-sm" id="btn-add-new-variant">追加</button>
                        </div>
                        <div id="new-variants-list" class="variant-tags" style="margin-top: var(--space-2);" aria-live="polite"></div>
                        <small id="new-variant-help">ユーザーが入力するテキスト（ひらがな、カタカナなど複数追加可）</small>
                        <span class="field-error" id="err-new-variants"></span>
                    </div>
                    <div class="form-row">
                        <label for="new-success-message">成功メッセージ:</label>
                        <textarea id="new-success-message" class="form-control" placeholder="例: ✅ ボーナスコードを受け付けました！&#10;&#10;お申込ありがとうございます。&#10;担当者が確認後、ボーナスを付与いたします。"></textarea>
                        <span class="field-error" id="err-new-success"></span>
                    </div>
                    <div class="form-row">
                        <label for="new-match-mode">マッチモード:</label>
                        <select id="new-match-mode" class="form-control">
                            <option value="case_insensitive">大文字小文字を区別しない（推奨）</option>
                            <option value="exact">完全一致</option>
                        </select>
                    </div>
                    <div style="display: flex; gap: var(--space-2); margin-top: var(--space-4);">
                        <button class="btn" id="btn-create-save">保存</button>
                        <button class="btn btn-secondary" id="btn-create-cancel">キャンセル</button>
                    </div>
                </div>
            </div>

            <!-- メニューツリータブ -->
            <div id="tab-menus" class="tab-content" role="tabpanel" aria-labelledby="tab-btn-menus" tabindex="0" hidden>
                <div class="menu-search">
                    <label for="menu-filter" class="sr-only">メニューをフィルター</label>
                    <input type="text" id="menu-filter" class="form-control" placeholder="キーワードでフィルター...">
                </div>
                <div id="menus-loading" aria-live="polite" aria-busy="true"><p>読み込み中...</p></div>
                <div id="menus-tree" style="display:none">
                    <div class="tree-section">
                        <button class="tree-section-header" data-section="main" aria-expanded="true" aria-controls="sec-body-main">
                            <span class="chevron open" id="sec-chev-main" aria-hidden="true">▶</span> メインメニューフロー
                        </button>
                        <div class="tree-section-body open" id="sec-body-main"></div>
                    </div>
                    <div class="tree-section">
                        <button class="tree-section-header" data-section="bonus" aria-expanded="true" aria-controls="sec-body-bonus">
                            <span class="chevron open" id="sec-chev-bonus" aria-hidden="true">▶</span> ボーナスコード応答フロー
                        </button>
                        <div class="tree-section-body open" id="sec-body-bonus"></div>
                    </div>
                    <div class="tree-section" id="sec-other" style="display:none">
                        <button class="tree-section-header" data-section="other" aria-expanded="false" aria-controls="sec-body-other">
                            <span class="chevron" id="sec-chev-other" aria-hidden="true">▶</span> テンプレート・その他
                        </button>
                        <div class="tree-section-body" id="sec-body-other"></div>
                    </div>
                </div>
            </div>

            <!-- 運用・監視タブ -->
            <div id="tab-ops" class="tab-content" role="tabpanel" aria-labelledby="tab-btn-ops" tabindex="0" hidden>
                <h3 style="color: var(--color-primary); margin-top:0;">GAS Webhook URL 設定</h3>
                <p style="font-size: var(--fs-sm); color: var(--color-text-muted);">各GAS Webhook URLを設定・変更できます。保存後すぐに反映されます。</p>
                <div class="form-row">
                    <label for="gas-url-bonus">ボーナスコード記録 URL:</label>
                    <input type="text" id="gas-url-bonus" class="form-control" placeholder="https://script.google.com/macros/s/...">
                </div>
                <div class="form-row">
                    <label for="gas-url-gasbot">PayPay入金 (GAS BOT) URL:</label>
                    <input type="text" id="gas-url-gasbot" class="form-control" placeholder="https://script.google.com/macros/s/...">
                </div>
                <div class="form-row">
                    <label for="gas-url-bank">銀行振込 URL:</label>
                    <input type="text" id="gas-url-bank" class="form-control" placeholder="https://script.google.com/macros/s/...">
                </div>
                <div class="form-row">
                    <label for="gas-url-ec">コンビニ入金 (EC) URL:</label>
                    <input type="text" id="gas-url-ec" class="form-control" placeholder="https://... (HTTPSのみ)">
                </div>
                <button class="btn" id="btn-save-gas-urls">保存</button>

                <hr style="border:none; border-top:1px solid var(--color-border); margin: var(--space-5) 0;">

                <h3>GAS Webhook 疎通テスト</h3>
                <button class="btn" id="btn-test-gas">疎通テストを実行</button>
                <div id="gas-test-results" style="margin-top: var(--space-4);" aria-live="polite"></div>

                <hr style="border:none; border-top:1px solid var(--color-border); margin: var(--space-5) 0;">

                <h3>監査ログ（直近200件）</h3>
                <button class="btn" id="btn-load-audit">再読み込み</button>
                <div id="audit-log-results" style="margin-top: var(--space-4);" aria-live="polite"></div>

                <hr style="border:none; border-top:1px solid var(--color-border); margin: var(--space-5) 0;">

                <h3>最近のエラー（直近100件）</h3>
                <button class="btn" id="btn-load-errors">再読み込み</button>
                <div id="error-log-results" style="margin-top: var(--space-4);" aria-live="polite"></div>

                <hr style="border:none; border-top:1px solid var(--color-border); margin: var(--space-5) 0;">

                <h3>バックアップ / リストア</h3>
                <div style="display:flex; gap: var(--space-2); flex-wrap:wrap;">
                    <button class="btn" id="btn-export-backup">エクスポート (JSON)</button>
                    <label class="btn btn-secondary" style="cursor:pointer;" for="import-file-input">
                        インポート (JSON)
                        <input type="file" id="import-file-input" accept=".json" style="display:none;">
                    </label>
                </div>
                <div id="backup-results" style="margin-top: var(--space-4);" aria-live="polite"></div>
            </div>
        </div>
    </main>

    <div class="toast-container" id="toast-container" aria-live="polite" aria-atomic="true"></div>

    <script>
        // ====================================================================
        // 状態管理（集約）
        // ====================================================================
        const state = {
            adminToken: new URLSearchParams(window.location.search).get('token') || '',
            bonusData: [],
            menusData: null,
            newVariants: [],
            opsLoaded: false,
        };

        // ====================================================================
        // ユーティリティ
        // ====================================================================
        function escapeHtml(str) {
            if (str == null) return '';
            return String(str)
                .replace(/&/g, '&amp;')
                .replace(/</g, '&lt;')
                .replace(/>/g, '&gt;')
                .replace(/"/g, '&quot;')
                .replace(/'/g, '&#39;')
                .replace(new RegExp(String.fromCharCode(96), 'g'), '&#96;');
        }

        // ====================================================================
        // API 共通ラッパー（タイムアウト + エラーハンドリング）
        // ====================================================================
        async function apiFetch(path, opts = {}) {
            const controller = new AbortController();
            const timeoutMs = opts.timeoutMs || 15000;
            const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

            const url = state.adminToken ? path + (path.includes('?') ? '&' : '?') + 'token=' + encodeURIComponent(state.adminToken) : path;
            const fetchOpts = {
                method: opts.method || 'GET',
                headers: { 'Content-Type': 'application/json', ...(opts.headers || {}) },
                signal: controller.signal,
            };
            if (opts.body) {
                fetchOpts.body = JSON.stringify({ ...opts.body, token: state.adminToken });
            }

            try {
                const res = await fetch(url, fetchOpts);
                clearTimeout(timeoutId);
                if (!res.ok) {
                    throw new Error('HTTP ' + res.status);
                }
                return await res.json();
            } catch (e) {
                clearTimeout(timeoutId);
                if (e.name === 'AbortError') throw new Error('タイムアウト');
                throw e;
            }
        }

        // ボタン連打防止ラッパー
        async function withLoading(btn, fn) {
            const original = btn.textContent;
            btn.disabled = true;
            btn.textContent = '処理中...';
            try { await fn(); }
            finally {
                btn.disabled = false;
                btn.textContent = original;
            }
        }

        // ====================================================================
        // トースト通知
        // ====================================================================
        function showToast(message, type = 'success') {
            const container = document.getElementById('toast-container');
            const toast = document.createElement('div');
            toast.className = 'toast toast-' + type;
            if (type === 'error') toast.setAttribute('role', 'alert');
            toast.textContent = message;
            container.appendChild(toast);
            setTimeout(() => {
                toast.style.animation = 'fadeOut 0.3s ease-out forwards';
                setTimeout(() => toast.remove(), 300);
            }, 3000);
        }

        // ====================================================================
        // 確認ダイアログ（フォーカストラップ + Escape対応）
        // ====================================================================
        function showConfirm({ title, message, warning, confirmLabel = '実行する', confirmClass = 'btn-danger', onConfirm }) {
            const triggerBtn = document.activeElement;
            const overlay = document.createElement('div');
            overlay.className = 'confirm-overlay';
            overlay.setAttribute('role', 'dialog');
            overlay.setAttribute('aria-modal', 'true');
            overlay.setAttribute('aria-labelledby', 'dlg-title');

            const dialog = document.createElement('div');
            dialog.className = 'confirm-dialog';

            const titleEl = document.createElement('p');
            titleEl.id = 'dlg-title';
            titleEl.style.fontWeight = '600';
            titleEl.textContent = message;

            const warnEl = document.createElement('p');
            warnEl.style.fontSize = '0.9rem';
            warnEl.style.color = 'var(--color-text-muted)';
            warnEl.textContent = warning || 'この操作は元に戻せません。';

            const btnWrap = document.createElement('div');
            btnWrap.style.cssText = 'display:flex;gap:var(--space-2);justify-content:center;';

            const cancelBtn = document.createElement('button');
            cancelBtn.className = 'btn btn-secondary';
            cancelBtn.textContent = 'キャンセル';

            const okBtn = document.createElement('button');
            okBtn.className = 'btn ' + confirmClass;
            okBtn.textContent = confirmLabel;

            btnWrap.appendChild(cancelBtn);
            btnWrap.appendChild(okBtn);
            dialog.appendChild(titleEl);
            dialog.appendChild(warnEl);
            dialog.appendChild(btnWrap);
            overlay.appendChild(dialog);
            document.body.appendChild(overlay);

            const close = () => {
                overlay.remove();
                if (triggerBtn && triggerBtn.focus) triggerBtn.focus();
                document.removeEventListener('keydown', keyHandler);
            };
            const keyHandler = (e) => {
                if (e.key === 'Escape') close();
                else if (e.key === 'Enter') { onConfirm(); close(); }
                else if (e.key === 'Tab') {
                    // フォーカストラップ
                    const focusables = [cancelBtn, okBtn];
                    const idx = focusables.indexOf(document.activeElement);
                    e.preventDefault();
                    focusables[(idx + (e.shiftKey ? -1 : 1) + 2) % 2].focus();
                }
            };

            cancelBtn.addEventListener('click', close);
            okBtn.addEventListener('click', () => { onConfirm(); close(); });
            overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
            document.addEventListener('keydown', keyHandler);
            okBtn.focus();
        }

        // ====================================================================
        // タブ切替（ARIA対応 + キーボード操作）
        // ====================================================================
        function switchTab(targetTab) {
            document.querySelectorAll('.tab-btn').forEach(btn => {
                const isSelected = btn.dataset.tab === targetTab;
                btn.setAttribute('aria-selected', isSelected ? 'true' : 'false');
                btn.setAttribute('tabindex', isSelected ? '0' : '-1');
            });
            document.querySelectorAll('.tab-content').forEach(panel => {
                const isActive = panel.id === 'tab-' + targetTab;
                panel.classList.toggle('active', isActive);
                panel.hidden = !isActive;
            });

            // 遅延ロード
            if (targetTab === 'bonus' && state.bonusData.length === 0) loadBonusCodes();
            if (targetTab === 'menus' && !state.menusData) loadMenus();
            if (targetTab === 'ops' && !state.opsLoaded) {
                loadGasUrls();
                loadAuditLog();
                loadErrorLog();
                state.opsLoaded = true;
            }
        }

        // ====================================================================
        // ボーナスコード管理
        // ====================================================================
        async function loadBonusCodes() {
            const loading = document.getElementById('bonus-loading');
            const listEl = document.getElementById('bonus-list');
            loading.style.display = 'block';
            listEl.innerHTML = '';
            try {
                const result = await apiFetch('/api/bonus-codes');
                loading.style.display = 'none';
                if (!result.success) {
                    listEl.innerHTML = '<div class="alert alert-error">読み込みエラー: ' + escapeHtml(result.error || 'unknown') + '</div>';
                    return;
                }
                state.bonusData = result.data;
                renderBonusList();
                document.getElementById('btn-create-form-toggle').style.display = 'inline-block';
                document.getElementById('stat-codes').textContent = state.bonusData.length;
            } catch (e) {
                loading.style.display = 'none';
                listEl.innerHTML = '<div class="alert alert-error">エラー: ' + escapeHtml(e.message) + '</div>';
            }
        }

        function renderBonusList() {
            const listEl = document.getElementById('bonus-list');
            listEl.innerHTML = '';
            state.bonusData.forEach(item => {
                const isEnabled = item.enabled !== false;
                const group = document.createElement('div');
                group.className = 'bonus-group';
                group.dataset.type = item.type;

                // ヘッダー（button要素でキーボード操作可能に）
                const header = document.createElement('button');
                header.className = 'bonus-header';
                header.type = 'button';
                header.setAttribute('aria-expanded', 'false');
                header.setAttribute('aria-controls', 'body-' + item.type);

                const chevron = document.createElement('span');
                chevron.className = 'chevron';
                chevron.setAttribute('aria-hidden', 'true');
                chevron.textContent = '▶';

                const nameSpan = document.createElement('span');
                nameSpan.className = 'bonus-type-name';
                nameSpan.textContent = item.displayName;

                const idSpan = document.createElement('span');
                idSpan.className = 'bonus-type-id';
                idSpan.textContent = '(' + item.type + ')';

                const sourceBadge = document.createElement('span');
                sourceBadge.className = 'badge ' + (item.source === 'hardcoded' ? 'badge-hardcoded' : 'badge-dynamic');
                sourceBadge.textContent = item.source === 'hardcoded' ? 'システム固定' : 'カスタム';

                const enabledBadge = document.createElement('span');
                enabledBadge.className = 'badge ' + (isEnabled ? 'badge-enabled' : 'badge-disabled');
                enabledBadge.textContent = isEnabled ? '有効' : '無効';

                const toggleLabel = document.createElement('label');
                toggleLabel.className = 'toggle-switch';
                toggleLabel.setAttribute('aria-label', item.displayName + ' を' + (isEnabled ? '無効化' : '有効化'));
                toggleLabel.addEventListener('click', (e) => e.stopPropagation());
                const toggleInput = document.createElement('input');
                toggleInput.type = 'checkbox';
                toggleInput.checked = isEnabled;
                toggleInput.addEventListener('change', () => toggleBonusType(item.type, toggleInput.checked, item.displayName));
                const toggleSlider = document.createElement('span');
                toggleSlider.className = 'toggle-slider';
                toggleLabel.appendChild(toggleInput);
                toggleLabel.appendChild(toggleSlider);

                header.appendChild(chevron);
                header.appendChild(nameSpan);
                header.appendChild(idSpan);
                header.appendChild(sourceBadge);
                header.appendChild(enabledBadge);
                header.appendChild(toggleLabel);

                // ボディ
                const body = document.createElement('div');
                body.className = 'bonus-body';
                body.id = 'body-' + item.type;

                header.addEventListener('click', () => {
                    const isOpen = body.classList.toggle('open');
                    chevron.classList.toggle('open', isOpen);
                    header.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                });

                // バリアント
                const variantTags = document.createElement('div');
                variantTags.className = 'variant-tags';

                (item.hardcodedCodes || []).forEach(code => {
                    const tag = document.createElement('span');
                    tag.className = 'variant-tag hardcoded';
                    tag.textContent = code + ' ';
                    const label = document.createElement('span');
                    label.className = 'source-label';
                    label.textContent = '(固定)';
                    tag.appendChild(label);
                    variantTags.appendChild(tag);
                });

                (item.dynamicCodes || []).forEach(code => {
                    const tag = document.createElement('span');
                    tag.className = 'variant-tag dynamic';
                    tag.textContent = code + ' ';
                    const removeBtn = document.createElement('button');
                    removeBtn.className = 'remove-btn';
                    removeBtn.type = 'button';
                    removeBtn.setAttribute('aria-label', 'バリアント ' + code + ' を削除');
                    removeBtn.textContent = '×';
                    removeBtn.title = '削除';
                    removeBtn.addEventListener('click', () => removeVariant(item.type, code));
                    tag.appendChild(removeBtn);
                    variantTags.appendChild(tag);
                });

                body.appendChild(variantTags);

                // バリアント追加フォーム
                const addRow = document.createElement('div');
                addRow.className = 'add-variant-row';
                const addInput = document.createElement('input');
                addInput.type = 'text';
                addInput.placeholder = '新しいバリアントを入力';
                addInput.setAttribute('aria-label', item.displayName + 'に新しいバリアントを追加');
                addInput.addEventListener('keydown', (e) => {
                    if (e.key === 'Enter') { e.preventDefault(); addVariant(item.type, addInput); }
                });
                const addBtn = document.createElement('button');
                addBtn.className = 'btn btn-sm';
                addBtn.type = 'button';
                addBtn.textContent = '追加';
                addBtn.addEventListener('click', () => addVariant(item.type, addInput));
                addRow.appendChild(addInput);
                addRow.appendChild(addBtn);
                body.appendChild(addRow);

                // メタ情報
                const meta = document.createElement('div');
                meta.className = 'bonus-meta';
                if (item.successKey) meta.appendChild(makeDiv('成功メッセージ: ' + item.successKey));
                if (item.hasGameSelection) meta.appendChild(makeDiv('ゲーム選択: 対応'));
                meta.appendChild(makeDiv('マッチモード: ' + (item.matchMode === 'exact' ? '完全一致' : '大文字小文字区別なし')));

                if (item.source === 'dynamic') {
                    const deleteBtn = document.createElement('button');
                    deleteBtn.className = 'btn btn-danger btn-sm';
                    deleteBtn.type = 'button';
                    deleteBtn.style.marginTop = 'var(--space-2)';
                    deleteBtn.textContent = 'この種別を削除';
                    deleteBtn.addEventListener('click', () => deleteBonusType(item.type, item.displayName));
                    meta.appendChild(deleteBtn);
                }
                body.appendChild(meta);

                group.appendChild(header);
                group.appendChild(body);
                listEl.appendChild(group);
            });
        }

        function makeDiv(text) {
            const d = document.createElement('div');
            d.textContent = text;
            return d;
        }

        async function toggleBonusType(type, enabled, displayName) {
            // 楽観更新
            const item = state.bonusData.find(i => i.type === type);
            if (item) item.enabled = enabled;
            renderBonusList();
            try {
                const result = await apiFetch('/api/bonus-codes/' + encodeURIComponent(type), {
                    method: 'PUT', body: { enabled }
                });
                if (result.success) {
                    showToast(displayName + ' を' + (enabled ? '有効化' : '無効化') + 'しました', 'success');
                } else {
                    // ロールバック
                    if (item) item.enabled = !enabled;
                    renderBonusList();
                    showToast('エラー: ' + (result.error || 'unknown'), 'error');
                }
            } catch (e) {
                if (item) item.enabled = !enabled;
                renderBonusList();
                showToast('通信エラー: ' + e.message, 'error');
            }
        }

        async function addVariant(type, input) {
            const variant = input.value.trim();
            if (!variant) return;
            try {
                const result = await apiFetch('/api/bonus-codes/' + encodeURIComponent(type), {
                    method: 'PUT', body: { addVariant: variant }
                });
                if (result.success) {
                    showToast('バリアント「' + variant + '」を追加しました', 'success');
                    input.value = '';
                    loadBonusCodes();
                } else {
                    showToast('エラー: ' + (result.error || 'unknown'), 'error');
                }
            } catch (e) { showToast('通信エラー: ' + e.message, 'error'); }
        }

        function removeVariant(type, variant) {
            showConfirm({
                message: 'バリアント「' + variant + '」を削除しますか？',
                confirmLabel: '削除する',
                onConfirm: async () => {
                    try {
                        const result = await apiFetch('/api/bonus-codes/' + encodeURIComponent(type), {
                            method: 'PUT', body: { removeVariant: variant }
                        });
                        if (result.success) {
                            showToast('バリアント「' + variant + '」を削除しました', 'success');
                            loadBonusCodes();
                        } else {
                            showToast('エラー: ' + (result.error || 'unknown'), 'error');
                        }
                    } catch (e) { showToast('通信エラー: ' + e.message, 'error'); }
                }
            });
        }

        function deleteBonusType(type, displayName) {
            showConfirm({
                message: '種別「' + displayName + '」を完全に削除しますか？',
                confirmLabel: '削除する',
                onConfirm: async () => {
                    try {
                        const result = await apiFetch('/api/bonus-codes/' + encodeURIComponent(type), {
                            method: 'DELETE'
                        });
                        if (result.success) {
                            showToast('種別「' + displayName + '」を削除しました', 'success');
                            loadBonusCodes();
                        } else {
                            showToast('エラー: ' + (result.error || 'unknown'), 'error');
                        }
                    } catch (e) { showToast('通信エラー: ' + e.message, 'error'); }
                }
            });
        }

        // ====================================================================
        // 新規作成フォーム
        // ====================================================================
        function toggleCreateForm() {
            document.getElementById('create-form').classList.toggle('open');
        }

        function addNewVariant() {
            const input = document.getElementById('new-variant-input');
            const variant = input.value.trim();
            if (!variant || state.newVariants.includes(variant)) return;
            state.newVariants.push(variant);
            input.value = '';
            renderNewVariants();
        }

        function renderNewVariants() {
            const container = document.getElementById('new-variants-list');
            container.innerHTML = '';
            state.newVariants.forEach((v, i) => {
                const tag = document.createElement('span');
                tag.className = 'variant-tag dynamic';
                tag.textContent = v + ' ';
                const rm = document.createElement('button');
                rm.className = 'remove-btn';
                rm.type = 'button';
                rm.setAttribute('aria-label', v + ' を削除');
                rm.textContent = '×';
                rm.addEventListener('click', () => {
                    state.newVariants.splice(i, 1);
                    renderNewVariants();
                });
                tag.appendChild(rm);
                container.appendChild(tag);
            });
        }

        function validateCreateForm() {
            let valid = true;
            const id = document.getElementById('new-type-id').value.trim();
            const displayName = document.getElementById('new-display-name').value.trim();
            const successMsg = document.getElementById('new-success-message').value.trim();

            document.getElementById('err-new-type-id').textContent = '';
            document.getElementById('err-new-display-name').textContent = '';
            document.getElementById('err-new-variants').textContent = '';
            document.getElementById('err-new-success').textContent = '';

            if (!id) {
                document.getElementById('err-new-type-id').textContent = '種別IDを入力してください';
                valid = false;
            } else if (!/^[a-z0-9_]+$/.test(id)) {
                document.getElementById('err-new-type-id').textContent = '英小文字・数字・アンダースコアのみ使用できます';
                valid = false;
            }
            if (!displayName) {
                document.getElementById('err-new-display-name').textContent = '表示名を入力してください';
                valid = false;
            }
            if (state.newVariants.length === 0) {
                document.getElementById('err-new-variants').textContent = 'バリアントを1つ以上追加してください';
                valid = false;
            }
            if (!successMsg) {
                document.getElementById('err-new-success').textContent = '成功メッセージを入力してください';
                valid = false;
            }
            return valid;
        }

        async function createBonusType() {
            if (!validateCreateForm()) return;
            const id = document.getElementById('new-type-id').value.trim();
            const displayName = document.getElementById('new-display-name').value.trim();
            const successMsg = document.getElementById('new-success-message').value.trim();
            const matchMode = document.getElementById('new-match-mode').value;

            try {
                const result = await apiFetch('/api/bonus-codes', {
                    method: 'POST',
                    body: {
                        id, displayName, codes: state.newVariants, matchMode,
                        successMessage: {
                            content: successMsg,
                            items: [{ title: '↩️ メインメニューに戻る', value: 'welcome_message' }]
                        }
                    }
                });
                if (result.success) {
                    showToast('種別「' + displayName + '」を作成しました', 'success');
                    document.getElementById('new-type-id').value = '';
                    document.getElementById('new-display-name').value = '';
                    document.getElementById('new-success-message').value = '';
                    state.newVariants = [];
                    renderNewVariants();
                    toggleCreateForm();
                    loadBonusCodes();
                } else {
                    const errorMsg = result.errors ? result.errors.map(e => e.message).join(', ') : (result.error || '');
                    showToast('エラー: ' + errorMsg, 'error');
                }
            } catch (e) { showToast('通信エラー: ' + e.message, 'error'); }
        }

        // ====================================================================
        // メニューツリー
        // ====================================================================
        async function loadMenus() {
            const loading = document.getElementById('menus-loading');
            const tree = document.getElementById('menus-tree');
            loading.style.display = 'block';
            tree.style.display = 'none';
            try {
                const result = await apiFetch('/api/menus');
                loading.style.display = 'none';
                if (!result.success) {
                    document.getElementById('sec-body-main').innerHTML = '<div class="alert alert-error">読み込みエラー</div>';
                    tree.style.display = '';
                    return;
                }
                state.menusData = result.data;
                renderMenuTree();
                tree.style.display = '';
                document.getElementById('stat-menus').textContent = result.totalKeys;
            } catch (e) {
                loading.style.display = 'none';
                document.getElementById('sec-body-main').innerHTML = '<div class="alert alert-error">エラー: ' + escapeHtml(e.message) + '</div>';
                tree.style.display = '';
            }
        }

        function renderMenuTree() {
            const mainEl = document.getElementById('sec-body-main');
            const bonusEl = document.getElementById('sec-body-bonus');
            const otherEl = document.getElementById('sec-body-other');

            if (state.menusData.mainMenu) {
                mainEl.innerHTML = renderTreeNode(state.menusData.mainMenu, 0, true);
            }
            if (state.menusData.bonusFlows && state.menusData.bonusFlows.length > 0) {
                bonusEl.innerHTML = state.menusData.bonusFlows.map(f => renderTreeNode(f, 0, false)).join('');
            } else {
                bonusEl.innerHTML = '<p style="color: var(--color-text-muted)">ボーナスフローなし</p>';
            }
            if (state.menusData.other && state.menusData.other.length > 0) {
                otherEl.innerHTML = state.menusData.other.map(n => renderTreeNode(n, 0, false)).join('');
                document.getElementById('sec-other').style.display = '';
            }
        }

        function renderTreeNode(node, depth, expanded) {
            const safeKey = escapeHtml(node.key);
            if (node.isRef) {
                return '<div class="tree-node tree-ref"><div class="tree-node-row">' +
                    '<span class="tree-toggle" style="color:#9ca3af" aria-hidden="true">↗</span>' +
                    '<span class="tree-label">' +
                    '<span class="tree-title" style="font-style:italic;color:var(--color-text-muted)">' + escapeHtml(node.label) + '</span>' +
                    '<span class="tree-key">' + safeKey + '</span>' +
                    '</span>' +
                    '<span class="tree-badge" style="background:#f3f4f6;color:var(--color-text-muted)">参照</span>' +
                    '</div></div>';
            }

            const hasChildren = node.children && node.children.length > 0;
            const toggleIcon = hasChildren ? (expanded ? '▼' : '▶') : '📄';

            let badges = '';
            if (node.flags) {
                if (node.flags.handoff_to_gasbot) badges += '<span class="tree-badge tree-badge-gas">GAS</span>';
                if (node.flags.handoff_to_bank_bot) badges += '<span class="tree-badge tree-badge-bank">銀行</span>';
                if (node.flags.handoff_to_ec_bot) badges += '<span class="tree-badge tree-badge-ec">EC</span>';
                if (node.flags.transfer_to_agent) badges += '<span class="tree-badge tree-badge-agent">転送</span>';
            }

            let html = '<div class="tree-node" data-key="' + safeKey + '">';
            html += '<div class="tree-node-row">';
            html += '<button type="button" class="tree-toggle" data-action="' + (hasChildren ? 'toggleChildren' : 'toggleDetail') + '" data-key="' + safeKey + '" aria-label="展開/折りたたみ">' + toggleIcon + '</button>';
            html += '<button type="button" class="tree-label" data-action="toggleDetail" data-key="' + safeKey + '">';
            html += '<span class="tree-title">' + escapeHtml(node.label) + '</span>';
            html += '<span class="tree-key">' + safeKey + '</span>';
            html += '</button>';
            html += badges;
            html += '</div>';

            const previewLine = (node.content || '').split('\\n').filter(l => l.trim())[0] || '';
            const truncated = previewLine.length > 80 ? previewLine.substring(0, 80) + '…' : previewLine;
            if (truncated) {
                html += '<div class="tree-content-preview" data-action="toggleDetail" data-key="' + safeKey + '">' + escapeHtml(truncated) + '</div>';
            }

            html += '<div class="tree-detail" id="det-' + safeKey + '">';
            html += '<pre>' + escapeHtml(node.content || '') + '</pre>';
            if (node.items && node.items.length > 0) {
                html += '<table><caption class="sr-only">' + escapeHtml(node.label) + ' のボタン一覧</caption><thead><tr><th scope="col">ボタン</th><th scope="col">遷移先</th><th scope="col" style="width:60px">種別</th></tr></thead><tbody>';
                node.items.forEach(btn => {
                    const isBack = /[↩⇔↔]/.test(btn.title || '') || btn.value === 'welcome_message';
                    const isAgent = btn.value === 'transfer_to_agent';
                    const typeLabel = isAgent ? '<span class="tree-nav-type">🙋 転送</span>' :
                                     isBack ? '<span class="tree-nav-type">🔙 戻る</span>' :
                                     '<span class="tree-nav-type">➡️ 遷移</span>';
                    html += '<tr><td>' + escapeHtml(btn.title) + '</td>';
                    html += '<td><button type="button" class="tree-link" data-action="navigate" data-target="' + escapeHtml(btn.value) + '">' + escapeHtml(btn.value) + '</button></td>';
                    html += '<td>' + typeLabel + '</td></tr>';
                });
                html += '</tbody></table>';
            }
            html += '</div>';

            if (hasChildren) {
                html += '<div class="tree-children" id="ch-' + safeKey + '" style="display:' + (expanded ? '' : 'none') + '">';
                node.children.forEach(child => {
                    html += renderTreeNode(child, depth + 1, expanded && depth < 1);
                });
                html += '</div>';
            }

            html += '</div>';
            return html;
        }

        // イベント委譲: ツリー操作
        function setupTreeEventDelegation() {
            const tree = document.getElementById('menus-tree');
            tree.addEventListener('click', (e) => {
                const target = e.target.closest('[data-action]');
                if (!target) return;
                const action = target.dataset.action;
                const key = target.dataset.key;
                if (action === 'toggleChildren') {
                    const el = document.getElementById('ch-' + key);
                    const togEl = target;
                    if (el) {
                        const isOpen = el.style.display !== 'none';
                        el.style.display = isOpen ? 'none' : '';
                        if (togEl) togEl.textContent = isOpen ? '▶' : '▼';
                    }
                } else if (action === 'toggleDetail') {
                    const el = document.getElementById('det-' + key);
                    if (el) el.classList.toggle('open');
                } else if (action === 'navigate') {
                    navigateToNode(target.dataset.target);
                }
            });
        }

        function navigateToNode(key) {
            if (key === 'transfer_to_agent') {
                showToast('🙋 オペレーターに転送されます', 'success');
                return;
            }
            const nodeEl = document.querySelector('.tree-node[data-key="' + CSS.escape(key) + '"]');
            if (!nodeEl) {
                showToast('「' + key + '」はメニューツリー外の処理です', 'success');
                return;
            }
            let parent = nodeEl.parentElement;
            while (parent) {
                if (parent.classList.contains('tree-children')) {
                    parent.style.display = '';
                    const parentNode = parent.closest('.tree-node');
                    if (parentNode) {
                        const togEl = parentNode.querySelector('.tree-toggle');
                        if (togEl && togEl.textContent === '▶') togEl.textContent = '▼';
                    }
                }
                if (parent.classList.contains('tree-section-body') && !parent.classList.contains('open')) {
                    parent.classList.add('open');
                    const chevId = parent.id.replace('sec-body-', 'sec-chev-');
                    const chevEl = document.getElementById(chevId);
                    if (chevEl) chevEl.classList.add('open');
                }
                parent = parent.parentElement;
            }
            const detEl = nodeEl.querySelector('.tree-detail');
            if (detEl && !detEl.classList.contains('open')) detEl.classList.add('open');
            nodeEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
            nodeEl.classList.add('highlight');
            setTimeout(() => nodeEl.classList.remove('highlight'), 2500);
        }

        function filterMenus() {
            if (!state.menusData) return;
            const filter = (document.getElementById('menu-filter').value || '').toLowerCase();
            if (!filter) { renderMenuTree(); return; }
            const all = flattenTree(state.menusData.mainMenu)
                .concat((state.menusData.bonusFlows || []).reduce((acc, f) => acc.concat(flattenTree(f)), []))
                .concat(state.menusData.other || []);
            const filtered = all.filter(n => {
                return n.key.toLowerCase().includes(filter) ||
                    (n.content || '').toLowerCase().includes(filter) ||
                    (n.label || '').toLowerCase().includes(filter);
            });
            const html = filtered.map(n => renderTreeNode({ ...n, children: [] }, 0, false)).join('');
            document.getElementById('sec-body-main').innerHTML = html || '<p style="color: var(--color-text-muted)">一致するメニューがありません</p>';
            document.getElementById('sec-body-bonus').innerHTML = '';
            document.getElementById('sec-body-other').innerHTML = '';
        }

        function flattenTree(node) {
            if (!node || node.isRef) return [];
            const result = [{ ...node, children: [] }];
            if (node.children) {
                node.children.forEach(c => { result.push(...flattenTree(c)); });
            }
            return result;
        }

        // ====================================================================
        // Webhookテスト
        // ====================================================================
        async function sendTestWebhook() {
            const message = document.getElementById('test-message').value || 'welcome_message';
            const convId = document.getElementById('test-conv-id').value || '999';
            const resultsDiv = document.getElementById('test-results');
            resultsDiv.innerHTML = '<p>送信中...</p>';
            try {
                const result = await apiFetch('/api/test-webhook', {
                    method: 'POST',
                    body: { message, conversationId: parseInt(convId) }
                });
                const icon = result.success ? '✅' : '⚠️';
                const action = result.action || '(不明)';
                resultsDiv.innerHTML = '<div class="alert alert-success">' +
                    icon + ' 結果: <strong>' + escapeHtml(action) + '</strong>' +
                    (result.skipped ? ' (スキップ: ' + escapeHtml(result.reason || '') + ')' : '') +
                    '</div>';
            } catch (e) {
                resultsDiv.innerHTML = '<div class="alert alert-error">エラー: ' + escapeHtml(e.message) + '</div>';
            }
        }

        // ====================================================================
        // 運用・監視
        // ====================================================================
        async function loadGasUrls() {
            try {
                const result = await apiFetch('/api/gas-urls');
                if (result.success && result.data) {
                    document.getElementById('gas-url-bonus').value = result.data.BONUS_CODE_WEBHOOK_URL || '';
                    document.getElementById('gas-url-gasbot').value = result.data.GAS_BOT_WEBHOOK_URL || '';
                    document.getElementById('gas-url-bank').value = result.data.BANK_TRANSFER_BOT_WEBHOOK_URL || '';
                    document.getElementById('gas-url-ec').value = result.data.EC_DEPOSIT_BOT_WEBHOOK_URL || '';
                }
            } catch (e) { console.error('GAS URL読込失敗:', e); }
        }

        async function saveGasUrls(btn) {
            return withLoading(btn, async () => {
                try {
                    const result = await apiFetch('/api/gas-urls', {
                        method: 'POST',
                        body: {
                            BONUS_CODE_WEBHOOK_URL: document.getElementById('gas-url-bonus').value.trim(),
                            GAS_BOT_WEBHOOK_URL: document.getElementById('gas-url-gasbot').value.trim(),
                            BANK_TRANSFER_BOT_WEBHOOK_URL: document.getElementById('gas-url-bank').value.trim(),
                            EC_DEPOSIT_BOT_WEBHOOK_URL: document.getElementById('gas-url-ec').value.trim()
                        }
                    });
                    if (result.success) showToast('GAS URL設定を保存しました', 'success');
                    else showToast('保存失敗: ' + (result.error || '不明'), 'error');
                } catch (e) { showToast('通信エラー: ' + e.message, 'error'); }
            });
        }

        async function testGasConnections(btn) {
            const div = document.getElementById('gas-test-results');
            return withLoading(btn, async () => {
                div.innerHTML = '<p>テスト中...</p>';
                try {
                    const data = await apiFetch('/api/test-gas', { method: 'POST', body: {} });
                    if (!data.results) { div.innerHTML = '<div class="alert alert-error">結果取得失敗</div>'; return; }
                    renderTable(div, ['名前', 'ステータス', '応答時間'], data.results.map(r => [
                        r.name,
                        { text: r.status, color: r.ok ? 'var(--color-success)' : 'var(--color-danger)' },
                        r.ms ? r.ms + 'ms' : '-'
                    ]));
                } catch (e) { div.innerHTML = '<div class="alert alert-error">' + escapeHtml(e.message) + '</div>'; }
            });
        }

        async function loadAuditLog() {
            const div = document.getElementById('audit-log-results');
            div.innerHTML = '<p>読み込み中...</p>';
            try {
                const data = await apiFetch('/api/audit-log');
                const logs = data.data || [];
                if (logs.length === 0) { div.innerHTML = '<div class="alert alert-info">ログなし</div>'; return; }
                renderTable(div, ['日時', '操作', '詳細'], logs.map(log => {
                    let detail = log.typeId || '';
                    if (log.displayName) detail += ' (' + log.displayName + ')';
                    if (log.action_detail) detail += ' [' + log.action_detail + ']';
                    return [
                        { text: log.ts, style: 'white-space:nowrap;font-size:var(--fs-xs);' },
                        { html: '<span class="badge badge-' + (log.action === 'bonus_delete' ? 'disabled' : 'enabled') + '">' + escapeHtml(log.action) + '</span>' },
                        { text: detail, style: 'font-size:var(--fs-xs);' }
                    ];
                }));
            } catch (e) { div.innerHTML = '<div class="alert alert-error">' + escapeHtml(e.message) + '</div>'; }
        }

        async function loadErrorLog() {
            const div = document.getElementById('error-log-results');
            div.innerHTML = '<p>読み込み中...</p>';
            try {
                const data = await apiFetch('/api/errors');
                const errors = data.data || [];
                if (errors.length === 0) { div.innerHTML = '<div class="alert alert-info">エラーなし</div>'; return; }
                renderTable(div, ['日時', '種別', '詳細'], errors.map(err => {
                    const detail = err.message || err.url || JSON.stringify(err);
                    return [
                        { text: err.ts, style: 'white-space:nowrap;font-size:var(--fs-xs);' },
                        { html: '<span class="badge badge-disabled">' + escapeHtml(err.type) + '</span>' },
                        { text: detail, style: 'font-size:var(--fs-xs);' }
                    ];
                }));
            } catch (e) { div.innerHTML = '<div class="alert alert-error">' + escapeHtml(e.message) + '</div>'; }
        }

        // 共通テーブルレンダラー
        function renderTable(container, headers, rows) {
            const table = document.createElement('table');
            table.style.cssText = 'width:100%;border-collapse:collapse;font-size:var(--fs-sm);';
            const thead = document.createElement('thead');
            const thr = document.createElement('tr');
            headers.forEach(h => {
                const th = document.createElement('th');
                th.scope = 'col';
                th.style.cssText = 'text-align:left;padding:var(--space-2);border-bottom:2px solid var(--color-border);';
                th.textContent = h;
                thr.appendChild(th);
            });
            thead.appendChild(thr);
            table.appendChild(thead);
            const tbody = document.createElement('tbody');
            rows.forEach(row => {
                const tr = document.createElement('tr');
                row.forEach(cell => {
                    const td = document.createElement('td');
                    td.style.cssText = 'padding:var(--space-2);border-bottom:1px solid var(--color-border);';
                    if (typeof cell === 'object') {
                        if (cell.html) td.innerHTML = cell.html;
                        else {
                            td.textContent = cell.text;
                            if (cell.color) td.style.color = cell.color;
                            if (cell.style) td.style.cssText += cell.style;
                        }
                    } else {
                        td.textContent = cell;
                    }
                    tr.appendChild(td);
                });
                tbody.appendChild(tr);
            });
            table.appendChild(tbody);
            container.innerHTML = '';
            container.appendChild(table);
        }

        async function exportBackup() {
            try {
                const data = await apiFetch('/api/backup');
                const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
                const a = document.createElement('a');
                a.href = URL.createObjectURL(blob);
                a.download = 'chatwoot-backup-' + new Date().toISOString().slice(0, 10) + '.json';
                a.click();
                showToast('バックアップをダウンロードしました', 'success');
            } catch (e) { showToast('エクスポート失敗: ' + e.message, 'error'); }
        }

        function importBackup(event) {
            const file = event.target.files[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (e) => {
                try {
                    const data = JSON.parse(e.target.result);
                    if (!data.data) { showToast('無効なバックアップファイル', 'error'); return; }
                    showConfirm({
                        message: 'リストアしますか？',
                        warning: '現在のボーナスコード設定が上書きされます。この操作は元に戻せません。',
                        confirmLabel: 'リストアする',
                        onConfirm: async () => {
                            try {
                                const result = await apiFetch('/api/restore', {
                                    method: 'POST', body: { data: data.data }
                                });
                                if (result.success) showToast('リストア完了。ページを再読み込みしてください。', 'success');
                                else showToast('リストア失敗: ' + (result.error || '不明'), 'error');
                            } catch (err) { showToast('リストア失敗: ' + err.message, 'error'); }
                        }
                    });
                } catch (err) { showToast('JSONパースエラー', 'error'); }
            };
            reader.readAsText(file);
            event.target.value = '';
        }

        // ====================================================================
        // イベントリスナー登録（addEventListener化）
        // ====================================================================
        function setupEventListeners() {
            // タブ切替（キーボード対応: ←→ Home End）
            const tabBtns = document.querySelectorAll('.tab-btn');
            tabBtns.forEach(btn => {
                btn.addEventListener('click', () => switchTab(btn.dataset.tab));
                btn.addEventListener('keydown', (e) => {
                    const tabs = Array.from(tabBtns);
                    const idx = tabs.indexOf(btn);
                    let next = -1;
                    if (e.key === 'ArrowRight') next = (idx + 1) % tabs.length;
                    else if (e.key === 'ArrowLeft') next = (idx - 1 + tabs.length) % tabs.length;
                    else if (e.key === 'Home') next = 0;
                    else if (e.key === 'End') next = tabs.length - 1;
                    if (next !== -1) {
                        e.preventDefault();
                        tabs[next].focus();
                        switchTab(tabs[next].dataset.tab);
                    }
                });
            });

            // セクションヘッダー
            document.querySelectorAll('.tree-section-header').forEach(btn => {
                btn.addEventListener('click', () => {
                    const id = btn.dataset.section;
                    const body = document.getElementById('sec-body-' + id);
                    const chev = document.getElementById('sec-chev-' + id);
                    const isOpen = body.classList.toggle('open');
                    chev.classList.toggle('open', isOpen);
                    btn.setAttribute('aria-expanded', isOpen ? 'true' : 'false');
                });
            });

            // Webhookテスト
            document.getElementById('btn-test-webhook').addEventListener('click', sendTestWebhook);

            // 新規作成フォーム
            document.getElementById('btn-create-form-toggle').addEventListener('click', toggleCreateForm);
            document.getElementById('btn-add-new-variant').addEventListener('click', addNewVariant);
            document.getElementById('new-variant-input').addEventListener('keydown', (e) => {
                if (e.key === 'Enter') { e.preventDefault(); addNewVariant(); }
            });
            document.getElementById('btn-create-save').addEventListener('click', createBonusType);
            document.getElementById('btn-create-cancel').addEventListener('click', toggleCreateForm);

            // メニューフィルター
            document.getElementById('menu-filter').addEventListener('input', filterMenus);

            // 運用・監視
            document.getElementById('btn-save-gas-urls').addEventListener('click', (e) => saveGasUrls(e.currentTarget));
            document.getElementById('btn-test-gas').addEventListener('click', (e) => testGasConnections(e.currentTarget));
            document.getElementById('btn-load-audit').addEventListener('click', loadAuditLog);
            document.getElementById('btn-load-errors').addEventListener('click', loadErrorLog);
            document.getElementById('btn-export-backup').addEventListener('click', exportBackup);
            document.getElementById('import-file-input').addEventListener('change', importBackup);

            // ツリーイベント委譲
            setupTreeEventDelegation();
        }

        // ====================================================================
        // 初期化
        // ====================================================================
        document.addEventListener('DOMContentLoaded', () => {
            setupEventListeners();
            loadBonusCodes();
        });
    </script>
</body>
</html>`;
}
