import { getAdminHTML } from './admin.js'
import { writeFileSync } from 'fs'
import { buildMenuTree } from './bonus-codes-api.js'
import { messages } from './messages.js'

let html = getAdminHTML()

// messages.js から実データでツリーを構築
const tree = buildMenuTree()
const totalKeys = Object.keys(messages).length
// </script> をエスケープして HTML 内に安全に埋め込む
const treeJson = JSON.stringify(tree).replace(/<\//g, '<\\/')

const mockScript = `
    <script>
    // Preview mode overrides
    const _origLoad = loadBonusCodes;
    loadBonusCodes = function() {
        document.getElementById('bonus-loading').style.display = 'none';
        bonusData = [
            { type: 'valid_bonus', displayName: '金額付きボーナス', hardcodedCodes: [], dynamicCodes: [], enabled: true, source: 'hardcoded', successKey: null, matchMode: 'exact', hasGameSelection: false },
            { type: 'vamos', displayName: 'バモスイボナ', hardcodedCodes: ['バモスイボナ', 'ばもすいぼな'], dynamicCodes: [], enabled: true, source: 'hardcoded', successKey: 'vamos_bonus_success', matchMode: 'exact', hasGameSelection: true },
            { type: 'akeome', displayName: 'あけおめ', hardcodedCodes: ['あけおめ', 'アケオメ'], dynamicCodes: [], enabled: true, source: 'hardcoded', successKey: 'akeome_bonus_success', matchMode: 'exact', hasGameSelection: true },
            { type: 'special_chance', displayName: 'スペシャルチャンス', hardcodedCodes: ['スペシャルチャンス', 'すぺしゃるちゃんす'], dynamicCodes: [], enabled: true, source: 'hardcoded', successKey: 'special_chance_success', matchMode: 'exact', hasGameSelection: true },
            { type: 'tokubetsu_step', displayName: '特別ステップ', hardcodedCodes: ['特別ステップ', 'とくべつすてっぷ'], dynamicCodes: [], enabled: true, source: 'hardcoded', successKey: 'tokubetsu_step_success', matchMode: 'exact', hasGameSelection: true },
            { type: 'tokubetsu_heavens', displayName: '特別ヘブンズ', hardcodedCodes: ['特別ヘブンズ', 'とくべつへぶんず'], dynamicCodes: [], enabled: true, source: 'hardcoded', successKey: 'tokubetsu_heavens_success', matchMode: 'exact', hasGameSelection: true },
            { type: 'custom_heavens', displayName: 'カスタムヘブンズショット', hardcodedCodes: ['カスタムヘブンズショット', 'カスタムヘブンズ', 'かすたむへぶんずしょっと'], dynamicCodes: [], enabled: true, source: 'hardcoded', successKey: 'custom_heavens_success', matchMode: 'exact', hasGameSelection: false },
            { type: 'triathlon', displayName: 'トライアスロン', hardcodedCodes: ['トライアスロン', 'とらいあすろん'], dynamicCodes: [], enabled: true, source: 'hardcoded', successKey: 'triathlon_success', matchMode: 'case_insensitive', hasGameSelection: false },
            { type: 'hinamatsuri', displayName: 'ひな祭り', hardcodedCodes: ['ひな祭り', 'ひなまつり', 'ヒナマツリ'], dynamicCodes: [], enabled: false, source: 'hardcoded', successKey: 'hinamatsuri_success', matchMode: 'case_insensitive', hasGameSelection: false },
            { type: 'heavens_mission', displayName: 'ヘブンズミッション', hardcodedCodes: ['ヘブンズミッション', 'へぶんずみっしょん'], dynamicCodes: [], enabled: true, source: 'hardcoded', successKey: 'heavens_mission_success', matchMode: 'case_insensitive', hasGameSelection: false },
            { type: 'heavens_win', displayName: 'ヘブンズウィン', hardcodedCodes: ['ヘブンズウィン', 'へぶんずうぃん'], dynamicCodes: [], enabled: true, source: 'hardcoded', successKey: 'heavens_win_success', matchMode: 'case_insensitive', hasGameSelection: false },
            { type: 'elite_challenge', displayName: 'ELITE参加', hardcodedCodes: ['ELITE参加', 'elite参加', 'Elite参加'], dynamicCodes: [], enabled: true, source: 'hardcoded', successKey: 'elite_challenge_success', matchMode: 'case_insensitive', hasGameSelection: false },
            { type: 'white_day', displayName: 'ホワイトデー', hardcodedCodes: ['ホワイトデー', 'ほわいとでー'], dynamicCodes: [], enabled: true, source: 'hardcoded', successKey: 'white_day_success', matchMode: 'case_insensitive', hasGameSelection: false },
            { type: 'stepup', displayName: 'スペシャルステップ', hardcodedCodes: ['スペシャルステップ'], dynamicCodes: ['すぺしゃるすてっぷ'], enabled: true, source: 'hardcoded', successKey: 'stepup_success', matchMode: 'exact', hasGameSelection: true },
            { type: 'sakura_bonus', displayName: '桜ボーナス', hardcodedCodes: [], dynamicCodes: ['サクラボーナス', 'さくらぼーなす'], enabled: true, source: 'dynamic', matchMode: 'case_insensitive', hasGameSelection: false },
        ];
        renderBonusList();
        document.getElementById('create-btn').style.display = 'inline-block';
        document.getElementById('stat-codes').textContent = bonusData.length;
    };

    const _origMenus = loadMenus;
    loadMenus = function() {
        document.getElementById('menus-loading').style.display = 'none';
        menusData = ${treeJson};
        renderMenuTree();
        document.getElementById('menus-tree').style.display = '';
        document.getElementById('stat-menus').textContent = '${totalKeys}';
    };

    // Override destructive actions for preview
    sendTestWebhook = function() { document.getElementById('test-results').innerHTML = '<div class="alert alert-info">プレビューモード</div>'; };
    toggleBonusType = function(t,e) { showToast((e?'有効化':'無効化')+'（プレビュー）','success'); };
    addVariant = function(t) { showToast('バリアント追加（プレビュー）','success'); };
    createBonusType = function() { showToast('種別作成（プレビュー）','success'); };
    </script>`

html = html.replace('</body>', mockScript + '\n</body>')

writeFileSync('admin-preview.html', html, 'utf-8')
console.log('admin-preview.html generated (totalKeys: ' + totalKeys + ')')
