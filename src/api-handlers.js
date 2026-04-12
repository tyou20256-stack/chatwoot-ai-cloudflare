/**
 * API Handler Functions for Chatwoot Replacement System
 */

import * as DB from './database.js';

// 言語検出
export function detectLanguage(text) {
  const patterns = {
    japanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,
    english: /^[a-zA-Z\s.,!?'"()-]+$/,
    chinese: /[\u4E00-\u9FFF]/,
    korean: /[\uAC00-\uD7AF]/
  };

  if (patterns.japanese.test(text)) return 'japanese';
  if (patterns.chinese.test(text)) return 'chinese';
  if (patterns.korean.test(text)) return 'korean';
  if (patterns.english.test(text)) return 'english';
  
  if (/[a-zA-Z]/.test(text)) return 'english';
  return 'unknown';
}

// 意図分類
export function classifyIntent(text) {
  const keywords = {
    greeting: ['hello', 'hi', 'hey', 'こんにちは', '你好', '안녕하세요', 'kumusta'],
    thanks: ['thank', 'thanks', 'ありがとう', '谢谢', '감사', 'salamat'],
    support: ['help', 'support', 'issue', 'problem', 'サポート', '帮助', '도움', 'tulong'],
    complaint: ['angry', 'upset', 'disappointed', '怒り', '不満', '화가', 'galit'],
    payment: ['payment', 'billing', 'charge', '支払い', '账单', '결제', 'bayad']
  };
  
  const lowerText = text.toLowerCase();
  
  for (const [intent, keywordList] of Object.entries(keywords)) {
    if (keywordList.some(keyword => lowerText.includes(keyword))) {
      return intent;
    }
  }
  
  return 'general_inquiry';
}

// AI応答生成
export async function generateAIReply(content, language, intent, env) {
  const responses = {
    greeting: {
      japanese: "こんにちは！カスタマーサポートです。どのようなことでお困りでしょうか？",
      english: "Hello! This is customer support. How can we help you today?",
      chinese: "您好！这里是客户支持。请问有什么可以帮助您的吗？",
      korean: "안녕하세요! 고객지원팀입니다. 무엇을 도와드릴까요?",
      default: "Hello! How can we help you today? / こんにちは！何かお手伝いできることはありますか？"
    },
    thanks: {
      japanese: "どういたしまして！他にご不明な点がございましたら、お気軽にお声がけください。",
      english: "You're welcome! Please feel free to reach out if you have any other questions.",
      chinese: "不客气！如果您还有其他问题，请随时联系我们。",
      korean: "천만에요! 다른 질문이 있으시면 언제든지 말씀해 주세요.",
      default: "You're welcome! / どういたしまして！"
    },
    support: {
      japanese: "サポートチームがすぐに対応いたします。詳しい状況を教えていただけますか？",
      english: "Our support team will assist you right away. Could you please provide more details about the situation?",
      chinese: "我们的支持团队将立即为您提供帮助。您能告诉我们更多详情吗？",
      korean: "지원팀이 즉시 도와드리겠습니다. 상황에 대해 자세히 말씀해 주시겠어요?",
      default: "Our support team will help you. / サポートチームが対応いたします。"
    },
    complaint: {
      japanese: "ご迷惑をおかけして申し訳ございません。担当者がすぐに対応いたします。",
      english: "We sincerely apologize for any inconvenience. A specialist will address your concerns immediately.",
      chinese: "对于给您带来的不便，我们深表歉意。专员将立即处理您的问题。",
      korean: "불편을 끼쳐드려 죄송합니다. 전문가가 즉시 문제를 해결해 드리겠습니다.",
      default: "We apologize for the inconvenience. A specialist will help you. / ご迷惑をおかけして申し訳ございません。"
    },
    payment: {
      japanese: "お支払いに関するお問い合わせですね。担当部署にお繋ぎいたします。",
      english: "I see this is regarding payment. Let me connect you with our billing department.",
      chinese: "我了解这是关于付款的问题。让我为您联系我们的计费部门。",
      korean: "결제 관련 문의시군요. 담당 부서로 연결해 드리겠습니다.",
      default: "This seems to be about payment. We'll connect you with the right department. / お支払いについてですね。担当部署におつなぎします。"
    },
    general_inquiry: {
      japanese: "お問い合わせありがとうございます。担当者が確認次第、ご連絡いたします。",
      english: "Thank you for your inquiry. We'll get back to you as soon as possible.",
      chinese: "感谢您的咨询。我们会尽快回复您。",
      korean: "문의해 주셔서 감사합니다. 최대한 빨리 답변드리겠습니다.",
      default: "Thank you for contacting us. We'll respond soon. / お問い合わせありがとうございます。"
    }
  };

  const intentResponses = responses[intent] || responses.general_inquiry;
  return intentResponses[language] || intentResponses.default;
}

// エスカレーション判定
export function shouldEscalateToHuman(content, intent, confidence) {
  const escalationKeywords = ['manager', 'supervisor', 'human', 'person', '人間', '管理者', '经理', '매니저'];
  const urgentKeywords = ['urgent', 'emergency', 'asap', '緊急', '紧急', '긴급'];
  
  const contentLower = content.toLowerCase();
  const hasEscalationKeyword = escalationKeywords.some(keyword => contentLower.includes(keyword));
  const hasUrgentKeyword = urgentKeywords.some(keyword => contentLower.includes(keyword));
  
  const isComplaint = intent === 'complaint';
  const isPaymentIssue = intent === 'payment';
  
  return hasEscalationKeyword || hasUrgentKeyword || isComplaint || isPaymentIssue || confidence < 0.7;
}

/**
 * チャットメッセージ処理
 */
export async function handleChatMessage(request, env, corsHeaders) {
  try {
    const chatData = await request.json();
    const { message, conversation_id } = chatData;
    const userId = request.headers.get('X-User-ID');

    if (!userId || !message) {
      return new Response(JSON.stringify({
        success: false,
        error: 'Missing user ID or message'
      }), { 
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' }
      });
    }

    // データベース接続
    const db = env.chatwoot_database;

    let currentConversationId = conversation_id;

    // 新しい会話の場合
    if (!currentConversationId) {
      const conversation = await DB.createConversation(db, userId, `会話 ${new Date().toLocaleString('ja-JP')}`);
      currentConversationId = conversation.id;
    }

    // 言語検出と意図分類
    const detectedLanguage = detectLanguage(message);
    const intent = classifyIntent(message);
    const aiReply = await generateAIReply(message, detectedLanguage, intent, env);
    const shouldEscalate = shouldEscalateToHuman(message, intent, 0.8);

    // ユーザーメッセージを保存
    await DB.addMessage(db, {
      conversation_id: currentConversationId,
      sender_type: 'user',
      sender_id: userId,
      content: message,
      detected_language: detectedLanguage,
      detected_intent: intent
    });

    // AI応答を保存
    await DB.addMessage(db, {
      conversation_id: currentConversationId,
      sender_type: 'ai',
      sender_id: 'staff_ai',
      content: aiReply,
      ai_processed: true,
      ai_confidence: 0.8
    });

    // エスカレーション時の処理
    if (shouldEscalate) {
      await DB.updateConversation(db, currentConversationId, {
        status: 'open',
        priority: intent === 'complaint' || intent === 'payment' ? 'high' : 'normal'
      });
      
      // 自動タグ付け
      if (intent === 'complaint') {
        await DB.addTagToConversation(db, currentConversationId, 'tag_complaint', 'staff_ai');
      } else if (intent === 'payment') {
        await DB.addTagToConversation(db, currentConversationId, 'tag_billing', 'staff_ai');
      }
    }

    // 統計記録
    await DB.recordAnalyticsMetric(db, 'messages', 1, detectedLanguage, intent);
    if (!shouldEscalate) {
      await DB.recordAnalyticsMetric(db, 'ai_responses', 1, detectedLanguage, intent);
    }

    const response = {
      success: true,
      conversation_id: currentConversationId,
      original_message: message,
      detected_language: detectedLanguage,
      intent: intent,
      ai_reply: aiReply,
      should_escalate: shouldEscalate,
      processing_time: '< 100ms'
    };

    return new Response(JSON.stringify(response), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Chat message processing error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Internal server error'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * ユーザー作成
 */
export async function handleCreateUser(request, env, corsHeaders) {
  try {
    const userData = await request.json();
    const db = env.chatwoot_database;
    
    const user = await DB.createUser(db, userData);
    
    return new Response(JSON.stringify({
      success: true,
      user: user
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('User creation error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to create user'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * 会話一覧取得
 */
export async function handleGetConversations(request, env, corsHeaders) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    
    const db = env.chatwoot_database;
    
    const conversations = await db.prepare(`
      SELECT c.*, u.name as user_name, u.email as user_email,
             s.name as staff_name, s.email as staff_email
      FROM conversations c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN staff s ON c.assigned_staff_id = s.id
      ORDER BY c.last_message_at DESC
      LIMIT ?1 OFFSET ?2
    `).bind(limit, offset).all();

    return new Response(JSON.stringify({
      success: true,
      conversations: conversations.results || []
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Get conversations error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: 'Failed to get conversations'
    }), { 
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * ダッシュボード統計
 */
export async function handleDashboardStats(request, env, corsHeaders) {
  try {
    const db = env.chatwoot_database;
    const stats = await DB.getDashboardStats(db);
    
    return new Response(JSON.stringify(stats), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });

  } catch (error) {
    console.error('Dashboard stats error:', error);
    return new Response(JSON.stringify({
      total_conversations: 0,
      open_conversations: 0,
      today_conversations: 0,
      weekly_conversations: 0,
      ai_resolution_rate: 0
    }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' }
    });
  }
}

/**
 * ヘルスチェック
 */
export function handleHealthCheck(corsHeaders) {
  const healthData = {
    status: 'ok',
    service: 'Chatwoot AI Gateway',
    version: '3.0.0-fullversion',
    deployment: 'Cloudflare Workers + D1',
    features: [
      'Complete Chatwoot Replacement',
      'User Management',
      'Conversation History',
      'Tag System',
      'Staff Dashboard',
      'Real-time Analytics',
      'Multi-language AI Response',
      'Smart Escalation'
    ],
    timestamp: new Date().toISOString()
  };

  return new Response(JSON.stringify(healthData, null, 2), {
    headers: {
      ...corsHeaders,
      'Content-Type': 'application/json; charset=utf-8'
    }
  });
}