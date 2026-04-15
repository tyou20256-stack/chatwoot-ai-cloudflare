// ============================================================================
// ボーナスコード申請 Webhook - Google Apps Script v9.2
// 新スプレッドシート「スロット天国_イベントシート」対応版
// v8.4: 終了イベント削除（ヘブンデー、セレフィム、リリシア、ハルピナ、天国タイム、鬼は外、福は内）
// v8.5: ヘブンズミッション追加（HEAVEN'S MISSION 10日間スタンプラリー）
// v8.6: ヘブンズウィン追加（週間スロット利益5%自動還元）
// v8.7: ELITE参加追加（ELITE CHALLENGE 3日間限定チャレンジ）
// v8.8: ホワイトデー追加（ホワイトデー・お返しチャレンジ）
// v8.9: お花見追加（桜満開チャレンジ × 配当開花）
// v9.0: BC_入学追加（ゲートリアン、リリシア、ルシフィーレ、入学10000/20000、ハルピナ、アークエル、ラフィエル、セレフィム）
// v9.1: ゾロ目チャレンジ追加
// v9.2: BC_ギルド追加（スロ天ドリーム）
// ============================================================================

// スプレッドシートのID
// https://docs.google.com/spreadsheets/d/1TS--7Ia1Ju9bgZGY07fOzhef_2-ifdQo_El-MNsSqF0/edit
const SPREADSHEET_ID = '1TS--7Ia1Ju9bgZGY07fOzhef_2-ifdQo_El-MNsSqF0';

// シート名（タブ名）- 新スプレッドシートの構成に合わせる
const SHEET_NAMES = {
  BONUS_CODE: 'BC_ボーナスコード',           // 通常のボーナスコード申請
  STEPUP: 'BC_ステップアップ',               // ステップアップ系ボーナス
  VAMOS: 'BC_バモスイボナ',                  // バモスイボナ
  AKEOME: 'BC_あけおめ',                     // あけおめ
  SPECIAL_CHANCE: 'BC_スペシャルチャンス',   // スペシャルチャンス
  TOKUBETSU_STEP: 'BC_特別ステップ',         // 特別ステップ
  TOKUBETSU_HEAVENS: 'BC_特別HS',            // 特別ヘブンズ
  CUSTOM_HEAVENS: 'BC_カスタムHS',           // カスタムヘブンズショット
  TRIATHLON: 'BC_トライアスロン',          // トライアスロン（Heaven Roadイベント）
  HINAMATSURI: 'BC_ひな祭り',               // ひな祭り（三人官女フリースピンキャンペーン）
  HEAVENS_MISSION: 'BC_ヘブンズミッション',  // ヘブンズミッション（HEAVEN'S MISSION）
  HEAVENS_WIN: 'BC_ヘブンズウィン',           // ヘブンズウィン（週間スロット利益5%自動還元）
  ELITE_CHALLENGE: 'BC_ELITE参加',           // ELITE参加（ELITE CHALLENGE 3日間限定チャレンジ）
  WHITE_DAY: 'BC_ホワイトデー',               // ホワイトデー（ホワイトデー・お返しチャレンジ）
  OHANAMI: 'BC_お花見',                       // お花見（桜満開チャレンジ × 配当開花）
  NYUUGAKU: 'BC_入学',                         // 入学イベント（ゲートリアン、リリシア、ルシフィーレ、ハルピナ、アークエル、ラフィエル、セレフィム）
  ZOROME: 'BC_ゾロ目チャレンジ',               // ゾロ目チャレンジ
  GUILD: 'BC_ギルド'                          // ギルドイベント（スロ天ドリーム）
};

// ============================================================================
// メイン処理：POSTリクエストを受け取る
// ============================================================================
function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);

    console.log('Received data:', JSON.stringify(data));

    const userId = data.userId || '不明';
    const bonusCode = data.bonusCode || '不明';
    const amount = data.amount || '';
    const bonusType = data.bonusType || 'normal';
    const conditionText = data.conditionText || '';  // カスタムヘブンズの条件テキスト

    // ボーナスタイプに応じて異なるシートに記録
    switch (bonusType) {
      case 'stepup':
        // ステップアップボーナスコード（スペシャルステップ含む）
        recordToStepupSheet(userId, bonusCode);
        break;
      case 'vamos':
        // バモスイボナボーナスコード
        recordToVamosSheet(userId, bonusCode);
        break;
      case 'akeome':
        // あけおめボーナスコード
        recordToAkeomeSheet(userId, bonusCode);
        break;
      case 'special_chance':
        // スペシャルチャンスボーナスコード
        recordToSpecialChanceSheet(userId, bonusCode);
        break;
      case 'tokubetsu_step':
        // 特別ステップボーナスコード
        recordToTokubetsuStepSheet(userId, bonusCode);
        break;
      case 'tokubetsu_heavens':
        // 特別ヘブンズボーナスコード
        recordToTokubetsuHeavensSheet(userId, bonusCode);
        break;
      case 'custom_heavens':
        // カスタムヘブンズショットボーナスコード（初回申請）
        recordToCustomHeavensSheet(userId, bonusCode, '', 'コード申請済み');
        break;
      case 'custom_heavens_condition':
        // カスタムヘブンズショット条件（シミュレーターからコピー）
        recordToCustomHeavensSheet(userId, bonusCode, conditionText, '条件設定済み');
        break;
      case 'triathlon':
        // トライアスロン（Heaven Roadイベント）
        recordToTriathlonSheet(userId, bonusCode);
        break;
      case 'hinamatsuri':
        // ひな祭り（三人官女フリースピンキャンペーン）
        recordToHinamatsuriSheet(userId, bonusCode);
        break;
      case 'heavens_mission':
        // ヘブンズミッション（HEAVEN'S MISSION 10日間スタンプラリー）
        recordToHeavensMissionSheet(userId, bonusCode);
        break;
      case 'heavens_win':
        // ヘブンズウィン（週間スロット利益5%自動還元）
        recordToHeavensWinSheet(userId, bonusCode);
        break;
      case 'elite_challenge':
        // ELITE参加（ELITE CHALLENGE 3日間限定チャレンジ）
        recordToEliteChallengeSheet(userId, bonusCode);
        break;
      case 'white_day':
        // ホワイトデー（ホワイトデー・お返しチャレンジ）
        recordToWhiteDaySheet(userId, bonusCode);
        break;
      case 'ohanami':
        // お花見（桜満開チャレンジ × 配当開花）
        recordToOhanamiSheet(userId, bonusCode);
        break;
      case 'BC_入学':
        // 入学イベント（ゲートリアン、リリシア、ルシフィーレ、入学10000/20000、ハルピナ、アークエル、ラフィエル、セレフィム）
        recordToNyuugakuSheet(userId, bonusCode);
        break;
      case 'zorome':
        // ゾロ目チャレンジ
        recordToZoromeSheet(userId, bonusCode);
        break;
      case 'BC_ギルド':
        // ギルドイベント（スロ天ドリーム）
        recordToGuildSheet(userId, bonusCode);
        break;
      default:
        // 通常のボーナスコード
        recordToBonusCodeSheet(userId, bonusCode, amount);
    }

    return ContentService
      .createTextOutput(JSON.stringify({ success: true, message: '記録しました' }))
      .setMimeType(ContentService.MimeType.JSON);

  } catch (error) {
    console.error('Error:', error);
    return ContentService
      .createTextOutput(JSON.stringify({ success: false, message: error.toString() }))
      .setMimeType(ContentService.MimeType.JSON);
  }
}

// ============================================================================
// 通常のボーナスコードをシートに記録
// BC_ボーナスコード: 申請日時, ユーザーID, FTD, ボーナスコード, 参加希望金額, ステータス
// ============================================================================
function recordToBonusCodeSheet(userId, bonusCode, amount) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.BONUS_CODE);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.BONUS_CODE);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // データを追加（FTDは空欄、ステータスは「申請済み」）
  // 列: A=申請日時, B=ユーザーID, C=FTD, D=ボーナスコード, E=参加希望金額, F=ステータス
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 6).setValues([[timestamp, userId, '', bonusCode, amount, '申請済み']]);

  console.log('Recorded to BC_ボーナスコード:', userId, bonusCode, amount);
}

// ============================================================================
// ステップアップボーナスコードを記録
// BC_ステップアップ: 申請日時, ユーザーID, ボーナスコード, ステータス
// ============================================================================
function recordToStepupSheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.STEPUP);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.STEPUP);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // データを追加
  // 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 4).setValues([[timestamp, userId, bonusCode, '申請済み']]);

  console.log('Recorded to BC_ステップアップ:', userId, bonusCode);
}

// ============================================================================
// バモスイボナボーナスコードを記録
// BC_バモスイボナ: 申請日時, ユーザーID, ボーナスコード, ステータス
// ============================================================================
function recordToVamosSheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.VAMOS);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.VAMOS);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // データを追加
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 4).setValues([[timestamp, userId, bonusCode, '申請済み']]);

  console.log('Recorded to BC_バモスイボナ:', userId, bonusCode);
}

// ============================================================================
// あけおめボーナスコードを記録
// BC_あけおめ: 申請日時, ユーザーID, ボーナスコード, ステータス
// ============================================================================
function recordToAkeomeSheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.AKEOME);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.AKEOME);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // データを追加
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 4).setValues([[timestamp, userId, bonusCode, '申請済み']]);

  console.log('Recorded to BC_あけおめ:', userId, bonusCode);
}

// ============================================================================
// スペシャルチャンスボーナスコードを記録
// BC_スペシャルチャンス: 申請日時, ユーザーID, ボーナスコード, ステータス
// ============================================================================
function recordToSpecialChanceSheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.SPECIAL_CHANCE);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.SPECIAL_CHANCE);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // データを追加
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 4).setValues([[timestamp, userId, bonusCode, '申請済み']]);

  console.log('Recorded to BC_スペシャルチャンス:', userId, bonusCode);
}

// ============================================================================
// 特別ステップボーナスコードを記録
// BC_特別ステップ: 申請日時, ユーザーID, ボーナスコード, ステータス
// ============================================================================
function recordToTokubetsuStepSheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.TOKUBETSU_STEP);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.TOKUBETSU_STEP);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // データを追加
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 4).setValues([[timestamp, userId, bonusCode, '申請済み']]);

  console.log('Recorded to BC_特別ステップ:', userId, bonusCode);
}

// ============================================================================
// 特別ヘブンズボーナスコードを記録
// BC_特別HS: 申請日時, ユーザーID, ボーナスコード, ステータス
// ============================================================================
function recordToTokubetsuHeavensSheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.TOKUBETSU_HEAVENS);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.TOKUBETSU_HEAVENS);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // データを追加
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 4).setValues([[timestamp, userId, bonusCode, '申請済み']]);

  console.log('Recorded to BC_特別HS:', userId, bonusCode);
}

// ============================================================================
// カスタムヘブンズショットを記録
// BC_カスタムHS: 申請日時, ユーザーID, ボーナスコード, 条件詳細, ステータス
// ============================================================================
function recordToCustomHeavensSheet(userId, bonusCode, conditionText, status) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.CUSTOM_HEAVENS);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.CUSTOM_HEAVENS);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // データを追加
  // 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=条件詳細, E=ステータス
  const lastRow = sheet.getLastRow();
  sheet.getRange(lastRow + 1, 1, 1, 5).setValues([[timestamp, userId, bonusCode, conditionText, status]]);

  console.log('Recorded to BC_カスタムHS:', userId, bonusCode, conditionText, status);
}

// ============================================================================
// トライアスロンイベントを記録
// BC_トライアスロン: 行1=タイトル（結合セル）, 行2=ヘッダー
// 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
// データ開始行: 3
// ============================================================================
function recordToTriathlonSheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.TRIATHLON);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.TRIATHLON);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // A列基準で最終行を取得（行1=タイトル、行2=ヘッダー、行3～=データ）
  const aColumnValues = sheet.getRange('A:A').getValues();
  let lastDataRow = 2; // ヘッダーが2行目
  for (let i = aColumnValues.length - 1; i >= 2; i--) {
    if (aColumnValues[i][0] !== '' && aColumnValues[i][0] !== null) {
      lastDataRow = i + 1; // 0-indexed → 1-indexed
      break;
    }
  }

  // データを追加
  // 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
  sheet.getRange(lastDataRow + 1, 1, 1, 4).setValues([[timestamp, userId, bonusCode, '申請済み']]);

  console.log('Recorded to BC_トライアスロン:', userId, bonusCode, 'at row:', lastDataRow + 1);
}

// ============================================================================
// ひな祭り（三人官女フリースピンキャンペーン）の記録
// シート確認済み: 行1=タイトル「ひな祭り」、行2=ヘッダー、行3～=データ
// 列構成: A=申請日時, B=ユーザーID, C=ステータス（ボーナスコード列なし）
// ============================================================================
function recordToHinamatsuriSheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.HINAMATSURI);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.HINAMATSURI);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // A列基準で最終行を取得（行1=タイトル、行2=ヘッダー、行3～=データ）
  const aColumnValues = sheet.getRange('A:A').getValues();
  let lastDataRow = 2; // ヘッダーが2行目
  for (let i = aColumnValues.length - 1; i >= 2; i--) {
    if (aColumnValues[i][0] !== '' && aColumnValues[i][0] !== null) {
      lastDataRow = i + 1; // 0-indexed → 1-indexed
      break;
    }
  }

  // データを追加（ボーナスコード列なし）
  // 列: A=申請日時, B=ユーザーID, C=ステータス
  sheet.getRange(lastDataRow + 1, 1, 1, 3).setValues([[timestamp, userId, '申請済み']]);

  console.log('Recorded to BC_ひな祭り:', userId, bonusCode, 'at row:', lastDataRow + 1);
}

// ============================================================================
// ヘブンズミッション（HEAVEN'S MISSION）の記録
// BC_ヘブンズミッション: 行1=タイトル（結合セル）, 行2=ヘッダー
// 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
// データ開始行: 3
// ============================================================================
function recordToHeavensMissionSheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.HEAVENS_MISSION);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.HEAVENS_MISSION);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // A列基準で最終行を取得（行1=タイトル、行2=ヘッダー、行3～=データ）
  const aColumnValues = sheet.getRange('A:A').getValues();
  let lastDataRow = 2; // ヘッダーが2行目
  for (let i = aColumnValues.length - 1; i >= 2; i--) {
    if (aColumnValues[i][0] !== '' && aColumnValues[i][0] !== null) {
      lastDataRow = i + 1; // 0-indexed → 1-indexed
      break;
    }
  }

  // データを追加
  // 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
  sheet.getRange(lastDataRow + 1, 1, 1, 4).setValues([[timestamp, userId, bonusCode, '申請済み']]);

  console.log('Recorded to BC_ヘブンズミッション:', userId, bonusCode, 'at row:', lastDataRow + 1);
}

// ============================================================================
// ヘブンズウィン（週間スロット利益5%自動還元）の記録
// BC_ヘブンズウィン: 行1=タイトル（結合セル）, 行2=ヘッダー
// 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
// データ開始行: 3
// ============================================================================
function recordToHeavensWinSheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.HEAVENS_WIN);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.HEAVENS_WIN);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // A列基準で最終行を取得（行1=タイトル、行2=ヘッダー、行3～=データ）
  const aColumnValues = sheet.getRange('A:A').getValues();
  let lastDataRow = 2; // ヘッダーが2行目
  for (let i = aColumnValues.length - 1; i >= 2; i--) {
    if (aColumnValues[i][0] !== '' && aColumnValues[i][0] !== null) {
      lastDataRow = i + 1; // 0-indexed → 1-indexed
      break;
    }
  }

  // データを追加
  // 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
  sheet.getRange(lastDataRow + 1, 1, 1, 4).setValues([[timestamp, userId, bonusCode, '申請済み']]);

  console.log('Recorded to BC_ヘブンズウィン:', userId, bonusCode, 'at row:', lastDataRow + 1);
}

// ============================================================================
// ELITE参加（ELITE CHALLENGE 3日間限定チャレンジ）の記録
// BC_ELITE参加: 行1=タイトル（結合セル）, 行2=ヘッダー
// 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
// データ開始行: 3
// ============================================================================
function recordToEliteChallengeSheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.ELITE_CHALLENGE);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.ELITE_CHALLENGE);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // A列基準で最終行を取得（行1=タイトル、行2=ヘッダー、行3～=データ）
  const aColumnValues = sheet.getRange('A:A').getValues();
  let lastDataRow = 2; // ヘッダーが2行目
  for (let i = aColumnValues.length - 1; i >= 2; i--) {
    if (aColumnValues[i][0] !== '' && aColumnValues[i][0] !== null) {
      lastDataRow = i + 1; // 0-indexed → 1-indexed
      break;
    }
  }

  // データを追加
  // 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
  sheet.getRange(lastDataRow + 1, 1, 1, 4).setValues([[timestamp, userId, bonusCode, '申請済み']]);

  console.log('Recorded to BC_ELITE参加:', userId, bonusCode, 'at row:', lastDataRow + 1);
}

// ============================================================================
// ホワイトデー（ホワイトデー・お返しチャレンジ）の記録
// BC_ホワイトデー: 行1=タイトル（結合セル）, 行2=ヘッダー
// 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
// データ開始行: 3
// ============================================================================
function recordToWhiteDaySheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.WHITE_DAY);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.WHITE_DAY);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // A列基準で最終行を取得（行1=タイトル、行2=ヘッダー、行3～=データ）
  const aColumnValues = sheet.getRange('A:A').getValues();
  let lastDataRow = 2; // ヘッダーが2行目
  for (let i = aColumnValues.length - 1; i >= 2; i--) {
    if (aColumnValues[i][0] !== '' && aColumnValues[i][0] !== null) {
      lastDataRow = i + 1; // 0-indexed → 1-indexed
      break;
    }
  }

  // データを追加
  // 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
  sheet.getRange(lastDataRow + 1, 1, 1, 4).setValues([[timestamp, userId, bonusCode, '申請済み']]);

  console.log('Recorded to BC_ホワイトデー:', userId, bonusCode, 'at row:', lastDataRow + 1);
}

// ============================================================================
// お花見ボーナスコードをシートに記録
// BC_お花見: 申請日時, ユーザーID, ボーナスコード, ステータス
// ============================================================================
function recordToOhanamiSheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.OHANAMI);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.OHANAMI);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // A列基準で最終行を取得（行1=タイトル、行2=ヘッダー、行3～=データ）
  const aColumnValues = sheet.getRange('A:A').getValues();
  let lastDataRow = 2; // ヘッダーが2行目
  for (let i = aColumnValues.length - 1; i >= 2; i--) {
    if (aColumnValues[i][0] !== '' && aColumnValues[i][0] !== null) {
      lastDataRow = i + 1; // 0-indexed → 1-indexed
      break;
    }
  }

  // データを追加
  // 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
  sheet.getRange(lastDataRow + 1, 1, 1, 4).setValues([[timestamp, userId, bonusCode, '申請済み']]);

  console.log('Recorded to BC_お花見:', userId, bonusCode, 'at row:', lastDataRow + 1);
}

// ============================================================================
// 入学イベントをシートに記録
// BC_入学: 行1=タイトル（結合セル）, 行2=ヘッダー
// 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
// データ開始行: 3
// 対象コード: ゲートリアン、リリシア、ルシフィーレ、入学10000、入学20000、
//             ハルピナ、アークエル、ラフィエル、セレフィム
// ============================================================================
function recordToNyuugakuSheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.NYUUGAKU);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.NYUUGAKU);
    return;
  }

  // 現在の日時
  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  // A列基準で最終行を取得（行1=タイトル、行2=ヘッダー、行3～=データ）
  const aColumnValues = sheet.getRange('A:A').getValues();
  let lastDataRow = 2; // ヘッダーが2行目
  for (let i = aColumnValues.length - 1; i >= 2; i--) {
    if (aColumnValues[i][0] !== '' && aColumnValues[i][0] !== null) {
      lastDataRow = i + 1; // 0-indexed → 1-indexed
      break;
    }
  }

  // データを追加
  // 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
  sheet.getRange(lastDataRow + 1, 1, 1, 4).setValues([[timestamp, userId, bonusCode, '申請済み']]);

  console.log('Recorded to BC_入学:', userId, bonusCode, 'at row:', lastDataRow + 1);
}

// ============================================================================
// ゾロ目チャレンジをシートに記録
// BC_ゾロ目チャレンジ: 行1=タイトル（結合セル）, 行2=ヘッダー
// 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
// データ開始行: 3
// ============================================================================
function recordToZoromeSheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.ZOROME);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.ZOROME);
    return;
  }

  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  const aColumnValues = sheet.getRange('A:A').getValues();
  let lastDataRow = 2;
  for (let i = aColumnValues.length - 1; i >= 2; i--) {
    if (aColumnValues[i][0] !== '' && aColumnValues[i][0] !== null) {
      lastDataRow = i + 1;
      break;
    }
  }

  sheet.getRange(lastDataRow + 1, 1, 1, 4).setValues([[timestamp, userId, bonusCode, '申請済み']]);

  console.log('Recorded to BC_ゾロ目チャレンジ:', userId, bonusCode, 'at row:', lastDataRow + 1);
}

// ============================================================================
// ギルドイベントをシートに記録
// BC_ギルド: 行1=タイトル（結合セル）, 行2=ヘッダー
// 列: A=申請日時, B=ユーザーID, C=ボーナスコード, D=ステータス
// データ開始行: 3
// 対象コード: スロ天ドリーム
// ============================================================================
function recordToGuildSheet(userId, bonusCode) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const sheet = ss.getSheetByName(SHEET_NAMES.GUILD);

  if (!sheet) {
    console.error('Sheet not found:', SHEET_NAMES.GUILD);
    return;
  }

  const now = new Date();
  const timestamp = Utilities.formatDate(now, 'Asia/Tokyo', 'yyyy-MM-dd HH:mm:ss');

  const aColumnValues = sheet.getRange('A:A').getValues();
  let lastDataRow = 2;
  for (let i = aColumnValues.length - 1; i >= 2; i--) {
    if (aColumnValues[i][0] !== '' && aColumnValues[i][0] !== null) {
      lastDataRow = i + 1;
      break;
    }
  }

  sheet.getRange(lastDataRow + 1, 1, 1, 4).setValues([[timestamp, userId, bonusCode, '申請済み']]);

  console.log('Recorded to BC_ギルド:', userId, bonusCode, 'at row:', lastDataRow + 1);
}

// ============================================================================
// GETリクエスト（テスト用）
// ============================================================================
function doGet(e) {
  return ContentService
    .createTextOutput(JSON.stringify({
      status: 'ok',
      message: 'Bonus Code Webhook v9.2 is running',
      spreadsheet: 'スロット天国_イベントシート'
    }))
    .setMimeType(ContentService.MimeType.JSON);
}

// ============================================================================
// テスト関数
// ============================================================================
function testRecordToBonusCodeSheet() {
  recordToBonusCodeSheet('testUser', 'テストボーナス', '1万円');
}

function testRecordToStepupSheet() {
  recordToStepupSheet('testUser', 'スペシャルステップ');
}

function testRecordToVamosSheet() {
  recordToVamosSheet('testUser', 'バモスイボナ');
}

function testRecordToAkeomeSheet() {
  recordToAkeomeSheet('testUser', 'あけおめ');
}

function testRecordToSpecialChanceSheet() {
  recordToSpecialChanceSheet('testUser', 'スペシャルチャンス');
}

function testRecordToTokubetsuStepSheet() {
  recordToTokubetsuStepSheet('testUser', '特別ステップ');
}

function testRecordToTokubetsuHeavensSheet() {
  recordToTokubetsuHeavensSheet('testUser', '特別ヘブンズ');
}

function testRecordToCustomHeavensSheet() {
  // ボーナスコード申請のテスト
  recordToCustomHeavensSheet('testUser', 'カスタムヘブンズショット', '', 'コード申請済み');
}

function testRecordToCustomHeavensCondition() {
  // 条件設定のテスト
  const testCondition = 'カスタムヘブンズショット | BUY額: ￥10,000 | 勝利条件: 3倍以上 | 受け取り: 4分割(150%) | 機種: Gates of Olympus';
  recordToCustomHeavensSheet('testUser', 'カスタムヘブンズショット', testCondition, '条件設定済み');
}


function testRecordToHinamatsuriSheet() {
  recordToHinamatsuriSheet('test_user', 'ひな祭り');
}

function testRecordToHeavensMissionSheet() {
  recordToHeavensMissionSheet('testUser', 'ヘブンズミッション');
}

function testRecordToHeavensWinSheet() {
  recordToHeavensWinSheet('testUser', 'ヘブンズウィン');
}

function testRecordToEliteChallengeSheet() {
  recordToEliteChallengeSheet('testUser', 'ELITE参加');
}

function testRecordToWhiteDaySheet() {
  recordToWhiteDaySheet('testUser', 'ホワイトデー');
}

function testRecordToOhanamiSheet() {
  recordToOhanamiSheet('testUser', 'お花見');
}

function testRecordToTriathlonSheet() {
  // トライアスロンイベントのテスト
  recordToTriathlonSheet('testUser', 'トライアスロン');
}

function testRecordToNyuugakuSheet() {
  recordToNyuugakuSheet('testUser', 'ゲートリアン');
}

function testRecordToZoromeSheet() {
  recordToZoromeSheet('testUser', 'ゾロ目チャレンジ');
}

function testRecordToGuildSheet() {
  recordToGuildSheet('testUser', 'スロ天ドリーム');
}

// ============================================================================
// 全シート接続テスト
// ============================================================================
function testAllSheetConnections() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const results = [];

  for (const [key, sheetName] of Object.entries(SHEET_NAMES)) {
    const sheet = ss.getSheetByName(sheetName);
    results.push({
      key: key,
      sheetName: sheetName,
      exists: sheet !== null,
      lastRow: sheet ? sheet.getLastRow() : 0
    });
  }

  console.log('Sheet connection test results:');
  results.forEach(r => {
    console.log(`  ${r.key}: ${r.sheetName} - ${r.exists ? '✓ Found' : '✗ Not Found'} (${r.lastRow} rows)`);
  });

  return results;
}
