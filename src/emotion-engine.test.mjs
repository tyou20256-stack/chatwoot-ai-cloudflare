// ============================================
// Sloten AI CS — 感情エンジン テスト
// emotion-engine.test.mjs
// ============================================
// 実行: node emotion-engine.test.mjs

import {
  analyzeEmotion,
  adjustTone,
  buildEmotionPromptInjection,
  processEmotion,
  EmotionTracker,
} from './emotion-engine.mjs';

let passed = 0;
let failed = 0;

function assert(condition, testName) {
  if (condition) {
    passed++;
    console.log(`  ✅ ${testName}`);
  } else {
    failed++;
    console.error(`  ❌ ${testName}`);
  }
}

// ============================================
// 1. analyzeEmotion テスト
// ============================================
console.log('\n=== analyzeEmotion ===');

// --- angry ---
console.log('\n[angry]');
let r = analyzeEmotion('ふざけんな！なんでまだ反映されてないの！');
assert(r.emotion === 'angry', `"ふざけんな" → angry (got: ${r.emotion})`);
assert(r.score > 0, `score > 0 (got: ${r.score})`);

r = analyzeEmotion('最悪だよ、詐欺じゃないの');
assert(r.emotion === 'angry', `"最悪+詐欺" → angry (got: ${r.emotion})`);
assert(r.score >= 0.1, `high score for double angry (got: ${r.score})`);

r = analyzeEmotion('金返せ！');
assert(r.emotion === 'angry', `"金返せ" → angry (got: ${r.emotion})`);

r = analyzeEmotion('イライラするわ');
assert(r.emotion === 'angry', `"イライラ" → angry (got: ${r.emotion})`);

// --- frustrated ---
console.log('\n[frustrated]');
r = analyzeEmotion('何回も同じことやってるのにできない');
assert(r.emotion === 'frustrated', `"何回も+できない" → frustrated (got: ${r.emotion})`);

r = analyzeEmotion('まだですか？いつまで待てばいいんですか');
assert(r.emotion === 'frustrated', `"まだ+いつまで" → frustrated (got: ${r.emotion})`);

r = analyzeEmotion('全然うまくいかない');
assert(r.emotion === 'frustrated', `"全然+うまくいかない" → frustrated (got: ${r.emotion})`);

// --- confused ---
console.log('\n[confused]');
r = analyzeEmotion('え？どういうことですか？意味がわからない');
assert(r.emotion === 'confused', `"え+どういうこと+意味がわからない" → confused (got: ${r.emotion})`);

r = analyzeEmotion('どうすればいいですか？やり方がわからない');
assert(r.emotion === 'confused', `"どうすれば+やり方がわからない" → confused (got: ${r.emotion})`);

// --- happy ---
console.log('\n[happy]');
r = analyzeEmotion('ありがとう！助かりました！');
assert(r.emotion === 'happy', `"ありがとう+助かりました" → happy (got: ${r.emotion})`);

r = analyzeEmotion('できました！最高！');
assert(r.emotion === 'happy', `"できました+最高" → happy (got: ${r.emotion})`);

r = analyzeEmotion('解決しました、感謝です');
assert(r.emotion === 'happy', `"解決しました+感謝" → happy (got: ${r.emotion})`);

// --- sad ---
console.log('\n[sad]');
r = analyzeEmotion('残念です、がっかりしました');
assert(r.emotion === 'sad', `"残念+がっかり" → sad (got: ${r.emotion})`);

r = analyzeEmotion('つらいです');
assert(r.emotion === 'sad', `"つらい" → sad (got: ${r.emotion})`);

// --- neutral ---
console.log('\n[neutral]');
r = analyzeEmotion('入金方法を教えてください');
assert(r.emotion === 'neutral', `"入金方法を教えて" → neutral (got: ${r.emotion})`);

r = analyzeEmotion('パスワードのリセット方法');
assert(r.emotion === 'neutral', `"パスワードのリセット" → neutral (got: ${r.emotion})`);

r = analyzeEmotion('');
assert(r.emotion === 'neutral', `empty → neutral (got: ${r.emotion})`);

r = analyzeEmotion('こんにちは');
assert(r.emotion === 'neutral', `"こんにちは" → neutral (got: ${r.emotion})`);

// --- 感嘆符による増幅 ---
console.log('\n[exclamation amplification]');
const r1 = analyzeEmotion('ふざけんな');
const r2 = analyzeEmotion('ふざけんな！！！！');
assert(r2.score >= r1.score, `exclamation amplifies score (${r1.score} → ${r2.score})`);

// --- 短文による増幅 ---
console.log('\n[short message amplification]');
const rShort = analyzeEmotion('最悪');
assert(rShort.score > 0, `short "最悪" has score > 0 (got: ${rShort.score})`);


// ============================================
// 2. adjustTone テスト
// ============================================
console.log('\n=== adjustTone ===');

// angry
console.log('\n[angry tone]');
let tone = adjustTone({ emotion: 'angry', score: 0.8 }, 'PayPayで入金できます。');
assert(tone.toneAdjusted === true, 'angry → toneAdjusted=true');
assert(tone.response.startsWith('ご不便をおかけし大変申し訳ございません'), 'angry → apology prefix');
assert(tone.adjustment === 'angry_apology', `adjustment=${tone.adjustment}`);

// angry - already apologetic
tone = adjustTone({ emotion: 'angry', score: 0.8 }, 'ご不便をおかけし申し訳ございません。対応いたします。');
assert(tone.toneAdjusted === false, 'already apologetic → no double prefix');

// frustrated
console.log('\n[frustrated tone]');
tone = adjustTone({ emotion: 'frustrated', score: 0.5 }, 'こちらの手順でお試しください。');
assert(tone.toneAdjusted === true, 'frustrated → toneAdjusted=true');
assert(tone.response.includes('お手数おかけしております'), 'frustrated → cushion prefix');

// confused
console.log('\n[confused tone]');
tone = adjustTone({ emotion: 'confused', score: 0.6 }, 'ATMで振り込んでください。');
assert(tone.toneAdjusted === true, 'confused → toneAdjusted=true');
assert(tone.response.includes('一つずつご案内'), 'confused → step-by-step suffix');

// happy
console.log('\n[happy tone]');
tone = adjustTone({ emotion: 'happy', score: 0.7 }, '入金が反映されました。');
assert(tone.toneAdjusted === true, 'happy → toneAdjusted=true');
assert(tone.response.includes('お役に立てて嬉しい'), 'happy → positive suffix');

// sad
console.log('\n[sad tone]');
tone = adjustTone({ emotion: 'sad', score: 0.6 }, '申し訳ございませんが、現在対応できません。');
assert(tone.toneAdjusted === true, 'sad → toneAdjusted=true');
assert(tone.response.includes('お気持ちお察し'), 'sad → empathy prefix');

// neutral
console.log('\n[neutral tone]');
tone = adjustTone({ emotion: 'neutral', score: 0 }, 'PayPayで入金できます。');
assert(tone.toneAdjusted === false, 'neutral → no adjustment');
assert(tone.response === 'PayPayで入金できます。', 'neutral → unchanged');

// low score skip
console.log('\n[low score skip]');
tone = adjustTone({ emotion: 'angry', score: 0.02 }, 'テスト');
assert(tone.toneAdjusted === false, 'very low score → no adjustment');


// ============================================
// 3. buildEmotionPromptInjection テスト
// ============================================
console.log('\n=== buildEmotionPromptInjection ===');

const basePrompt = 'あなたはAIカスタマーサポートです。';

let injected = buildEmotionPromptInjection({ emotion: 'angry', score: 0.8, secondary: null }, basePrompt);
assert(injected.includes('■ 感情適応指示'), 'angry → injection includes header');
assert(injected.includes('[ユーザーの感情: angry'), 'angry → includes emotion label');
assert(injected.includes('真摯な謝罪'), 'angry → includes apology instruction');
assert(injected.startsWith(basePrompt), 'base prompt preserved');

injected = buildEmotionPromptInjection({ emotion: 'neutral', score: 0 }, basePrompt);
assert(injected === basePrompt, 'neutral → no injection');

injected = buildEmotionPromptInjection({ emotion: 'frustrated', score: 0.5, secondary: 'angry' }, basePrompt);
assert(injected.includes('副次感情'), 'secondary emotion noted');
assert(injected.includes('怒りも含む'), 'secondary angry noted');

injected = buildEmotionPromptInjection({ emotion: 'confused', score: 0.6 }, basePrompt);
assert(injected.includes('ステップバイステップ'), 'confused → step-by-step instruction');


// ============================================
// 4. EmotionTracker テスト
// ============================================
console.log('\n=== EmotionTracker ===');

// 連続angry検知
console.log('\n[consecutive angry escalation]');
let tracker = new EmotionTracker({ angryThreshold: 2 });
let tr = tracker.track({ emotion: 'angry', score: 0.8 });
assert(!tr.shouldEscalate, '1st angry → no escalation');
assert(tr.consecutiveAngry === 1, 'consecutiveAngry=1');

tr = tracker.track({ emotion: 'angry', score: 0.9 });
assert(tr.shouldEscalate === true, '2nd angry → escalation!');
assert(tr.reason === 'consecutive_angry', 'reason=consecutive_angry');
assert(tr.consecutiveAngry === 2, 'consecutiveAngry=2');

// リセットされるか
tr = tracker.track({ emotion: 'neutral', score: 0 });
assert(tr.consecutiveAngry === 0, 'neutral resets angry count');

// 連続frustrated検知
console.log('\n[consecutive frustrated escalation]');
tracker = new EmotionTracker({ frustrationThreshold: 3 });
tracker.track({ emotion: 'frustrated', score: 0.6 });
tracker.track({ emotion: 'frustrated', score: 0.7 });
tr = tracker.track({ emotion: 'frustrated', score: 0.8 });
assert(tr.shouldEscalate === true, '3rd frustrated → escalation');
assert(tr.reason === 'consecutive_frustrated', 'reason=consecutive_frustrated');

// 感情悪化トレンド
console.log('\n[escalating trend]');
tracker = new EmotionTracker();
tracker.track({ emotion: 'neutral', score: 0 });
tracker.track({ emotion: 'frustrated', score: 0.5 });
tr = tracker.track({ emotion: 'angry', score: 0.8 });
assert(tr.shouldEscalate === true, 'neutral→frustrated→angry → escalation');
assert(tr.reason === 'escalating_trend', 'reason=escalating_trend');

// エスカレーション1回のみ
console.log('\n[escalation once only]');
tracker = new EmotionTracker({ angryThreshold: 2 });
tracker.track({ emotion: 'angry', score: 0.8 });
tracker.track({ emotion: 'angry', score: 0.8 });  // escalation here
tr = tracker.track({ emotion: 'angry', score: 0.9 }); // should NOT escalate again
assert(!tr.shouldEscalate, '3rd angry → no repeat escalation');

// 履歴復元
console.log('\n[history restore]');
tracker = new EmotionTracker({ angryThreshold: 2 });
tracker.restoreFromHistory([
  { role: 'user', content: '最悪', emotion: { emotion: 'angry', score: 0.8 } },
  { role: 'assistant', content: '申し訳ございません' },
]);
// restoreFromHistory後、escalationSuggestedはリセットされる
tr = tracker.track({ emotion: 'angry', score: 0.9 });
assert(tr.shouldEscalate === true, 'restored history + new angry → escalation');

// エスカレーションメッセージ
console.log('\n[escalation messages]');
let msg = EmotionTracker.getEscalationMessage('consecutive_angry');
assert(msg.includes('オペレーター'), 'angry escalation mentions operator');
msg = EmotionTracker.getEscalationMessage('consecutive_frustrated');
assert(msg.includes('担当スタッフ'), 'frustrated escalation mentions staff');
msg = EmotionTracker.getEscalationMessage('escalating_trend');
assert(msg.includes('専門スタッフ'), 'trend escalation mentions specialist');

// サマリー
console.log('\n[summary]');
tracker = new EmotionTracker();
tracker.track({ emotion: 'happy', score: 0.7 });
tracker.track({ emotion: 'neutral', score: 0 });
const summary = tracker.getSummary();
assert(summary.historyLength === 2, `historyLength=2 (got: ${summary.historyLength})`);
assert(summary.consecutiveAngry === 0, 'no consecutive angry');


// ============================================
// 5. processEmotion 統合テスト
// ============================================
console.log('\n=== processEmotion (integration) ===');

let ctx = processEmotion('ふざけんな！入金が反映されない！', 'ベースプロンプト', []);
assert(ctx.emotion.emotion === 'angry', 'processEmotion detects angry');
assert(ctx.injectedPrompt.includes('感情適応指示'), 'prompt is injected');
assert(!ctx.shouldEscalate, '1st angry no escalation');

// 2回目のangryでエスカレーション
ctx = processEmotion('いい加減にしろ！', 'ベースプロンプト', [
  { role: 'user', content: 'ふざけんな', emotion: { emotion: 'angry', score: 0.8 } },
  { role: 'assistant', content: '申し訳ございません' },
]);
assert(ctx.shouldEscalate === true, '2nd angry with history → escalation');
assert(ctx.escalationMessage !== null, 'escalation message present');
assert(ctx.escalationMessage.includes('オペレーター'), 'suggests operator');


// ============================================
// 結果サマリー
// ============================================
console.log('\n' + '='.repeat(50));
console.log(`結果: ${passed} passed, ${failed} failed / ${passed + failed} total`);
if (failed > 0) {
  console.error(`\n❌ ${failed}件のテストが失敗しました`);
  process.exit(1);
} else {
  console.log('\n✅ 全テスト合格！');
}
