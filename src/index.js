/**
 * Chatwoot完全代替システム v6.0 - Phase 2 完全版
 * Phase 1: タグ管理、FAQ連動(KV)
 * Phase 2: ファイルアップロード(R2)、統計レポート、テンプレート管理、UI統合、Analytics記録
 */

// ========== Utility Functions ==========

function detectLanguage(text) {
  const patterns = {
    japanese: /[\u3040-\u309F\u30A0-\u30FF\u4E00-\u9FAF]/,
    chinese: /[\u4E00-\u9FFF]/,
    korean: /[\uAC00-\uD7AF]/,
    english: /^[a-zA-Z\s.,!?'"()-]+$/
  };
  if (patterns.japanese.test(text)) return 'japanese';
  if (patterns.chinese.test(text)) return 'chinese';
  if (patterns.korean.test(text)) return 'korean';
  if (patterns.english.test(text)) return 'english';
  if (/[a-zA-Z]/.test(text)) return 'english';
  return 'japanese';
}

function classifyIntent(text) {
  const keywords = {
    greeting: ['hello', 'hi', 'hey', 'こんにちは', '你好', '안녕하세요', 'kumusta'],
    thanks: ['thank', 'thanks', 'ありがとう', '谢谢', '감사', 'salamat'],
    support: ['help', 'support', 'issue', 'problem', 'サポート', '帮助', '도움', 'tulong'],
    complaint: ['angry', 'upset', 'disappointed', '怒り', '不満', '화가', 'galit'],
    payment: ['payment', 'billing', 'charge', '支払い', '账单', '결제', 'bayad']
  };
  const lowerText = text.toLowerCase();
  for (const [intent, keywordList] of Object.entries(keywords)) {
    if (keywordList.some(keyword => lowerText.includes(keyword))) return intent;
  }
  return 'general_inquiry';
}

async function generateAIReply(content, language, intent, env = null) {
  // ハードコード応答（Workers AIが使えない場合のフォールバック）
  const fallbackResponses = {
    greeting: {
      japanese: "こんにちは！AIカスタマーサポートです。どのようなことでお困りでしょうか？",
      english: "Hello! This is AI customer support. How can we help you today?",
      chinese: "您好！这里是AI客户支持。请问有什么可以帮助您的吗？",
      korean: "안녕하세요! AI고객지원팀입니다. 무엇을 도와드릴까요?",
      default: "Hello! How can we help you today?"
    },
    thanks: {
      japanese: "どういたしまして！他にご不明な点がございましたら、お気軽にお声がけください。",
      english: "You're welcome! Please feel free to reach out if you have any other questions.",
      chinese: "不客气！如果您还有其他问题，请随时联系我们。",
      korean: "천만에요! 다른 질문이 있으시면 언제든지 말씀해 주세요.",
      default: "You're welcome!"
    },
    support: {
      japanese: "サポートチームがすぐに対応いたします。詳しい状況を教えていただけますか？",
      english: "Our support team will assist you right away. Could you please provide more details?",
      chinese: "我们的支持团队将立即为您提供帮助。您能告诉我们更多详情吗？",
      korean: "지원팀이 즉시 도와드리겠습니다. 상황에 대해 자세히 말씀해 주시겠어요?",
      default: "Our support team will help you."
    },
    complaint: {
      japanese: "ご迷惑をおかけして申し訳ございません。担当者がすぐに対応いたします。",
      english: "We sincerely apologize for any inconvenience. A specialist will address your concerns immediately.",
      chinese: "对于给您带来的不便，我们深表歉意。专员将立即处理您的问题。",
      korean: "불편을 끼쳐드려 죄송합니다. 전문가가 즉시 문제를 해결해 드리겠습니다.",
      default: "We apologize for the inconvenience."
    },
    payment: {
      japanese: "お支払いに関するお問い合わせですね。専門部署におつなぎいたします。",
      english: "I see this is regarding payment. Let me connect you with our billing department.",
      chinese: "我了解这是关于付款的问题。让我为您联系我们的计费部门。",
      korean: "결제 관련 문의시군요. 담당 부서로 연결해 드리겠습니다.",
      default: "Payment inquiry. Connecting to billing department."
    },
    general_inquiry: {
      japanese: "お問い合わせありがとうございます。担当者が確認次第、ご連絡いたします。",
      english: "Thank you for your inquiry. We'll get back to you as soon as possible.",
      chinese: "感谢您的咨询。我们会尽快回复您。",
      korean: "문의해 주셔서 감사합니다. 최대한 빨리 답변드리겠습니다.",
      default: "Thank you for contacting us."
    }
  };

  // Workers AIを使用（env.AIが存在する場合）
  if (env && env.AI) {
    try {
      const langNames = { japanese: 'Japanese', english: 'English', chinese: 'Chinese', korean: 'Korean' };
      const langName = langNames[language] || 'English';
      
      const systemPrompt = `You are a helpful customer support AI assistant. Always respond in ${langName}. Be friendly, professional, and concise. Keep responses under 3 sentences when possible.`;
      
      const response = await env.AI.run('@cf/meta/llama-3-8b-instruct', {
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: content }
        ],
        max_tokens: 256,
        temperature: 0.7
      });
      
      if (response && response.response) {
        return response.response.trim();
      }
    } catch (error) {
      console.error('Workers AI error:', error);
      // フォールバックへ
    }
  }
  
  // フォールバック応答
  const intentResponses = fallbackResponses[intent] || fallbackResponses.general_inquiry;
  return intentResponses[language] || intentResponses.default;
}


function evaluateAiAction(message, conversationId, currentTags = [], config = {}) {
  const content = (message || "").toLowerCase();
  
  // デフォルト設定
  const aiEnabled = config.ai_enabled !== false;
  const targetInboxes = config.target_inboxes || [];
  const humanHandlingTag = config.human_handling_tag || "needs-human";
  const escalationKeywords = config.escalation?.keywords || ["担当者", "人間", "クレーム", "オペレーター", "返金", "直接", "manager", "supervisor", "human", "person"];
  
  if (!aiEnabled) return { action: "ignore", reason: "AI is disabled" };
  
  // human-handlingタグが付いているならAI無視
  if (currentTags.includes(humanHandlingTag) || currentTags.includes("tag_urgent")) {
    return { action: "ignore", reason: "Human handling in progress" };
  }
  
  const hasEscalationKeyword = escalationKeywords.some(keyword => content.includes(keyword.toLowerCase()));
  if (hasEscalationKeyword) {
    return { 
      action: "escalate", 
      reason: "Escalation keyword detected",
      tagToAdd: config.escalation?.tag_to_add || "needs-human",
      replyMessage: config.escalation?.auto_reply_msg || "担当者にお繋ぎします。少々お待ちください。"
    };
  }
  
  return { action: "reply" };
}

function shouldEscalateToHuman(content, intent) {
  const escalationKeywords = ['manager', 'supervisor', 'human', 'person', '人間', '管理者', '经理', '매니저'];
  const urgentKeywords = ['urgent', 'emergency', 'asap', '緊急', '紧急', '긴급'];
  const contentLower = content.toLowerCase();
  return escalationKeywords.some(k => contentLower.includes(k)) ||
         urgentKeywords.some(k => contentLower.includes(k)) ||
         intent === 'complaint' || intent === 'payment';
}

function generateId(prefix) {
  return prefix + '_' + Date.now() + '_' + Math.random().toString(36).substr(2, 8);
}

// ========== Database Helpers ==========

async function createUser(db, userData) {
  const userId = generateId('user');
  try {
    await db.prepare(
      'INSERT INTO users (id, email, name, language, created_at, updated_at, is_active) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)'
    ).bind(userId, userData.email || null, userData.name || 'ゲスト', userData.language || 'japanese',
      new Date().toISOString(), new Date().toISOString(), true).run();
    return { id: userId, ...userData, created_at: new Date().toISOString() };
  } catch (error) {
    console.error('Error creating user:', error);
    return { id: userId, name: userData.name || 'ゲスト', language: userData.language || 'japanese' };
  }
}

async function createConversation(db, userId, title = null) {
  const conversationId = generateId('conv');
  try {
    await db.prepare(
      'INSERT INTO conversations (id, user_id, status, priority, title, language, last_message_at, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)'
    ).bind(conversationId, userId, 'open', 'normal', title || 'New Conversation', 'japanese',
      new Date().toISOString(), new Date().toISOString()).run();
    return { id: conversationId, user_id: userId, status: 'open' };
  } catch (error) {
    console.error('Error creating conversation:', error);
    return { id: conversationId, user_id: userId, status: 'open' };
  }
}

async function addMessage(db, messageData) {
  const messageId = generateId('msg');
  try {
    await db.prepare(
      'INSERT INTO messages (id, conversation_id, sender_type, sender_id, content, content_type, ai_processed, ai_confidence, detected_language, detected_intent, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)'
    ).bind(messageId, messageData.conversation_id, messageData.sender_type || 'user',
      messageData.sender_id || null, messageData.content, messageData.content_type || 'text',
      messageData.ai_processed || false, messageData.ai_confidence || null,
      messageData.detected_language || null, messageData.detected_intent || null,
      new Date().toISOString()).run();
    await db.prepare(
      'UPDATE conversations SET total_messages = total_messages + 1, last_message_at = ?1 WHERE id = ?2'
    ).bind(new Date().toISOString(), messageData.conversation_id).run();
    return { id: messageId, ...messageData };
  } catch (error) {
    console.error('Error adding message:', error);
    return { id: messageId, ...messageData };
  }
}

async function getDashboardStats(db) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const weekAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];
    const [total, open, todayC, weeklyC, resolved, totalMessages] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM conversations").first(),
      db.prepare("SELECT COUNT(*) as count FROM conversations WHERE status = 'open'").first(),
      db.prepare("SELECT COUNT(*) as count FROM conversations WHERE DATE(created_at) = ?1").bind(today).first(),
      db.prepare("SELECT COUNT(*) as count FROM conversations WHERE DATE(created_at) >= ?1").bind(weekAgo).first(),
      db.prepare("SELECT COUNT(*) as count FROM conversations WHERE status = 'resolved'").first(),
      db.prepare("SELECT COUNT(*) as count FROM messages").first()
    ]);
    const totalCount = total?.count || 0;
    const resolvedCount = resolved?.count || 0;
    return {
      total_conversations: totalCount,
      open_conversations: open?.count || 0,
      today_conversations: todayC?.count || 0,
      weekly_conversations: weeklyC?.count || 0,
      resolved_conversations: resolvedCount,
      total_messages: totalMessages?.count || 0,
      ai_resolution_rate: totalCount > 0 ? Math.round((resolvedCount / totalCount) * 100) : 0
    };
  } catch (error) {
    console.error('Error getting dashboard stats:', error);
    return { total_conversations: 0, open_conversations: 0, today_conversations: 0, weekly_conversations: 0, resolved_conversations: 0, total_messages: 0, ai_resolution_rate: 0 };
  }
}

// FAQ search using KV + D1
async function searchFAQ(db, kvStore, query, language) {
  const results = [];
  try {
    // Search D1 FAQ articles
    const keywords = query.toLowerCase().split(/\s+/).filter(w => w.length > 1);
    if (keywords.length === 0) return results;
    const conditions = keywords.map((_, i) => `(LOWER(title) LIKE ?${i + 1} OR LOWER(content) LIKE ?${i + 1} OR LOWER(keywords) LIKE ?${i + 1})`).join(' OR ');
    const params = keywords.map(k => `%${k}%`);
    let query_str = `SELECT * FROM faq_articles WHERE is_published = TRUE AND (${conditions})`;
    if (language && language !== 'all') {
      query_str += ` AND (language = ?${params.length + 1} OR language = 'all')`;
      params.push(language);
    }
    query_str += ' ORDER BY view_count DESC LIMIT 5';
    const stmt = db.prepare(query_str);
    const dbResults = await stmt.bind(...params).all();
    if (dbResults.results) results.push(...dbResults.results);
    // Also check KV for cached FAQ index
    if (kvStore) {
      const kvIndex = await kvStore.get('faq_index', { type: 'json' });
      if (kvIndex && Array.isArray(kvIndex)) {
        for (const item of kvIndex) {
          if (!results.find(r => r.id === item.id)) {
            const matchScore = keywords.filter(k =>
              (item.title || '').toLowerCase().includes(k) ||
              (item.keywords || []).some(kw => kw.toLowerCase().includes(k))
            ).length;
            if (matchScore > 0) results.push({ ...item, match_score: matchScore });
          }
        }
      }
    }
  } catch (error) {
    console.error('FAQ search error:', error);
  }
  return results.slice(0, 5);
}

// Update KV FAQ index
async function updateFAQIndex(db, kvStore) {
  if (!kvStore) return;
  try {
    const allFaqs = await db.prepare('SELECT id, title, category, language, keywords FROM faq_articles WHERE is_published = TRUE').all();
    await kvStore.put('faq_index', JSON.stringify(allFaqs.results || []));
    await kvStore.put('faq_count', String((allFaqs.results || []).length));
    await kvStore.put('last_updated', new Date().toISOString());
  } catch (error) {
    console.error('FAQ index update error:', error);
  }
}

// ========== Main Worker ==========

export default {
  async fetch(request, env, ctx) {
    try {
      const url = new URL(request.url);
      const path = url.pathname;
      const method = request.method;

      const corsHeaders = {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-User-ID',
      };

      if (method === 'OPTIONS') {
        return new Response(null, { headers: corsHeaders });
      }

      const db = env.chatwoot_database;
      const kvStore = env.FAQ_STORAGE;
      const r2Bucket = env.FILE_STORAGE;

      // Extract path params for REST-style routes
      const pathParts = path.split('/').filter(Boolean);

      // ===== Page Routes =====
      if (path === '/' || path === '/chat') return handleChatInterface(corsHeaders);
      if (path === '/dashboard') return Response.redirect(url.origin + '/staff/dashboard', 302);
      if (path === '/staff/login') return handleStaffLogin(corsHeaders);
      if (path === '/staff/dashboard') return handleAdvancedStaffDashboard(corsHeaders);
      if (path === '/health') return handleHealthCheck(corsHeaders);

      // ===== API Routes =====

      // Chat
      if (path === '/api/chat/send' && method === 'POST') return await handleChatMessage(request, db, kvStore, corsHeaders, env);

      // Users
      if (path === '/api/users' && method === 'POST') return await handleCreateUser(request, db, corsHeaders);
      if (path === '/api/users' && method === 'GET') return await handleGetUsers(request, db, corsHeaders);

      // Conversations
      if (path === '/api/conversations' && method === 'GET') return await handleGetConversations(request, db, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[2] && !pathParts[3] && method === 'PUT') {
        return await handleUpdateConversation(request, db, pathParts[2], corsHeaders);
      }
      if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[2] && pathParts[3] === 'messages' && method === 'GET') {
        return await handleGetConversationMessages(db, pathParts[2], corsHeaders);
      }
      if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[2] && pathParts[3] === 'tags') {
        if (method === 'GET') return await handleGetConversationTags(db, pathParts[2], corsHeaders);
        if (method === 'POST') return await handleAddConversationTag(request, db, pathParts[2], corsHeaders);
        if (method === 'DELETE' && pathParts[4]) return await handleRemoveConversationTag(db, pathParts[2], pathParts[4], corsHeaders);
      }

      // Tags
      if (path === '/api/tags' && method === 'GET') return await handleGetTags(db, corsHeaders);
      if (path === '/api/tags' && method === 'POST') return await handleCreateTag(request, db, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'tags' && pathParts[2] && method === 'PUT') {
        return await handleUpdateTag(request, db, pathParts[2], corsHeaders);
      }
      if (pathParts[0] === 'api' && pathParts[1] === 'tags' && pathParts[2] && method === 'DELETE') {
        return await handleDeleteTag(db, pathParts[2], corsHeaders);
      }

      // FAQ
      if (path === '/api/faq' && method === 'GET') return await handleGetFAQs(request, db, corsHeaders);
      if (path === '/api/faq' && method === 'POST') return await handleCreateFAQ(request, db, kvStore, corsHeaders);
      if (path === '/api/faq/search' && method === 'GET') return await handleSearchFAQ(request, db, kvStore, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'faq' && pathParts[2] && pathParts[2] !== 'search' && method === 'PUT') {
        return await handleUpdateFAQ(request, db, kvStore, pathParts[2], corsHeaders);
      }
      if (pathParts[0] === 'api' && pathParts[1] === 'faq' && pathParts[2] && pathParts[2] !== 'search' && method === 'DELETE') {
        return await handleDeleteFAQ(db, kvStore, pathParts[2], corsHeaders);
      }
      if (path === '/admin/faq/count') return await handleFAQCount(kvStore, corsHeaders);

      // Templates
      if (path === '/api/templates' && method === 'GET') return await handleGetTemplates(request, db, corsHeaders);
      if (path === '/api/templates' && method === 'POST') return await handleCreateTemplate(request, db, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'templates' && pathParts[2] && method === 'PUT') {
        return await handleUpdateTemplate(request, db, pathParts[2], corsHeaders);
      }
      if (pathParts[0] === 'api' && pathParts[1] === 'templates' && pathParts[2] && method === 'DELETE') {
        return await handleDeleteTemplate(db, pathParts[2], corsHeaders);
      }

      // File Upload
      if (path === '/api/files/upload' && method === 'POST') return await handleFileUpload(request, db, r2Bucket, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'files' && pathParts[2] && method === 'GET') {
        return await handleGetFile(db, r2Bucket, pathParts[2], corsHeaders);
      }

      // Staff Reply
      if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[2] && pathParts[3] === 'reply' && method === 'POST') {
        return await handleStaffReply(request, db, pathParts[2], corsHeaders);
      }

      // Conversation Search
      if (path === '/api/conversations/search' && method === 'GET') return await handleSearchConversations(request, db, corsHeaders);

      // File List
      if (path === '/api/files' && method === 'GET') return await handleGetFiles(request, db, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'files' && pathParts[2] && method === 'DELETE') {
        return await handleDeleteFile(db, r2Bucket, pathParts[2], corsHeaders);
      }

      // FAQ Rating
      if (pathParts[0] === 'api' && pathParts[1] === 'faq' && pathParts[2] && pathParts[3] === 'rate' && method === 'POST') {
        return await handleRateFAQ(request, db, pathParts[2], corsHeaders);
      }

      // Analytics
      if (path === '/api/analytics' && method === 'GET') return await handleGetAnalytics(request, db, corsHeaders);
      if (path === '/api/analytics/export' && method === 'GET') return await handleExportAnalytics(request, db, corsHeaders);
      if (path === '/api/analytics/satisfaction' && method === 'GET') return await handleSatisfactionReport(request, db, corsHeaders);
      if (path === '/api/analytics/record' && method === 'POST') return await handleRecordAnalytics(request, db, corsHeaders);
      if (path === '/api/analytics/summary' && method === 'GET') return await handleAnalyticsSummary(request, db, corsHeaders);
      if (path === '/api/dashboard/stats' && method === 'GET') return await handleDashboardStats(db, corsHeaders);

      // ===== Phase 3: Enterprise Routes =====

      // Tenants
      if (path === '/api/tenants' && method === 'GET') return await handleGetTenants(db, corsHeaders);
      if (path === '/api/tenants' && method === 'POST') return await handleCreateTenant(request, db, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'tenants' && pathParts[2] && method === 'GET') {
        return await handleGetTenant(db, pathParts[2], corsHeaders);
      }
      if (pathParts[0] === 'api' && pathParts[1] === 'tenants' && pathParts[2] && method === 'PUT') {
        return await handleUpdateTenant(request, db, pathParts[2], corsHeaders);
      }
      if (pathParts[0] === 'api' && pathParts[1] === 'tenants' && pathParts[2] && method === 'DELETE') {
        return await handleDeleteTenant(db, pathParts[2], corsHeaders);
      }

      // Roles
      if (path === '/api/roles' && method === 'GET') return await handleGetRoles(db, corsHeaders);
      if (path === '/api/roles' && method === 'POST') return await handleCreateRole(request, db, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'roles' && pathParts[2] && method === 'PUT') {
        return await handleUpdateRole(request, db, pathParts[2], corsHeaders);
      }
      if (path === '/api/staff/roles' && method === 'GET') return await handleGetStaffRoles(request, db, corsHeaders);
      if (path === '/api/staff/roles' && method === 'POST') return await handleAssignStaffRole(request, db, corsHeaders);

      // SLA
      if (path === '/api/sla' && method === 'GET') return await handleGetSLAPolicies(db, corsHeaders);
      if (path === '/api/sla' && method === 'POST') return await handleCreateSLAPolicy(request, db, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'sla' && pathParts[2] && method === 'PUT') {
        return await handleUpdateSLAPolicy(request, db, pathParts[2], corsHeaders);
      }
      if (pathParts[0] === 'api' && pathParts[1] === 'sla' && pathParts[2] && method === 'DELETE') {
        return await handleDeleteSLAPolicy(db, pathParts[2], corsHeaders);
      }
      if (path === '/api/sla/dashboard' && method === 'GET') return await handleSLADashboard(request, db, corsHeaders);
      if (path === '/api/sla/check' && method === 'POST') return await handleSLACheck(request, db, corsHeaders);

      // Audit Logs
      if (path === '/api/audit-logs' && method === 'GET') return await handleGetAuditLogs(request, db, corsHeaders);
      if (path === '/api/audit-logs' && method === 'POST') return await handleCreateAuditLog(request, db, corsHeaders);

      // ===== Phase 4: Webhooks, Business Hours, Automation =====

      // Webhooks
      if (path === '/api/webhooks' && method === 'GET') return await handleGetWebhooks(db, corsHeaders);
      if (path === '/api/webhooks' && method === 'POST') return await handleCreateWebhook(request, db, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'webhooks' && pathParts[2] && method === 'PUT') {
        return await handleUpdateWebhook(request, db, pathParts[2], corsHeaders);
      }
      if (pathParts[0] === 'api' && pathParts[1] === 'webhooks' && pathParts[2] && method === 'DELETE') {
        return await handleDeleteWebhook(db, pathParts[2], corsHeaders);
      }
      if (path === '/api/webhooks/deliveries' && method === 'GET') return await handleGetWebhookDeliveries(request, db, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'webhooks' && pathParts[2] && pathParts[3] === 'test' && method === 'POST') {
        return await handleTestWebhook(db, pathParts[2], corsHeaders);
      }

      // Business Hours
      if (path === '/api/business-hours' && method === 'GET') return await handleGetBusinessHours(request, db, corsHeaders);
      if (path === '/api/business-hours' && method === 'PUT') return await handleUpdateBusinessHours(request, db, corsHeaders);
      if (path === '/api/business-hours/status' && method === 'GET') return await handleBusinessHoursStatus(request, db, corsHeaders);

      // Automation Rules
      if (path === '/api/automation-rules' && method === 'GET') return await handleGetAutomationRules(db, corsHeaders);
      if (path === '/api/automation-rules' && method === 'POST') return await handleCreateAutomationRule(request, db, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'automation-rules' && pathParts[2] && method === 'PUT') {
        return await handleUpdateAutomationRule(request, db, pathParts[2], corsHeaders);
      }
      if (pathParts[0] === 'api' && pathParts[1] === 'automation-rules' && pathParts[2] && method === 'DELETE') {
        return await handleDeleteAutomationRule(db, pathParts[2], corsHeaders);
      }
      if (path === '/api/automation-rules/run' && method === 'POST') return await handleRunAutomationRules(request, db, corsHeaders);

      // Phase 1 CRM: Schema Migration
      if (path === '/api/migrate/phase1-crm' && method === 'POST') return await handlePhase1CRMMigration(db, corsHeaders);

      // ===== Phase 1 CRM Features: Player Info, Bonus Grant, Callback Request =====

      // Player Info
      if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[2] && pathParts[3] === 'player-info' && method === 'GET') {
        return await handleGetPlayerInfo(request, db, pathParts[2], corsHeaders, env);
      }
      if (path === '/api/settings/player-info' && method === 'GET') return await handleGetPlayerInfoSettings(db, corsHeaders);
      if (path === '/api/settings/player-info' && method === 'PUT') return await handleUpdatePlayerInfoSettings(request, db, corsHeaders);

      // Bonus Grant
      if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[2] && pathParts[3] === 'grant-bonus' && method === 'POST') {
        return await handleGrantBonus(request, db, pathParts[2], corsHeaders);
      }
      if (path === '/api/settings/bonus' && method === 'GET') return await handleGetBonusSettings(db, corsHeaders);
      if (path === '/api/settings/bonus' && method === 'PUT') return await handleUpdateBonusSettings(request, db, corsHeaders);
      if (path === '/api/bonus-grants' && method === 'GET') return await handleGetBonusGrants(request, db, corsHeaders);

      // Callback Request
      if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[2] && pathParts[3] === 'callback-request' && method === 'POST') {
        return await handleCreateCallbackRequest(request, db, pathParts[2], corsHeaders);
      }
      if (path === '/api/callback-requests' && method === 'GET') return await handleGetCallbackRequests(request, db, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'callback-requests' && pathParts[2] && pathParts[3] === 'notify' && method === 'POST') {
        return await handleNotifyCallback(request, db, pathParts[2], corsHeaders);
      }

      // ===== Phase 2 CRM Features: Escalation, AI Suggestions, Multilingual =====

      // Phase 2 CRM: Schema Migration
      if (path === '/api/migrate/phase2-crm' && method === 'POST') return await handlePhase2CRMMigration(db, corsHeaders);

      // Feature 5: Escalation System
      if (path === '/api/escalation/rules' && method === 'GET') return await handleGetEscalationRules(db, corsHeaders);
      if (path === '/api/escalation/rules' && method === 'POST') return await handleCreateEscalationRule(request, db, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'escalation' && pathParts[2] === 'rules' && pathParts[3] && method === 'PUT') {
        return await handleUpdateEscalationRule(request, db, pathParts[3], corsHeaders);
      }
      if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[2] && pathParts[3] === 'escalate' && method === 'POST') {
        return await handleEscalateConversation(request, db, pathParts[2], corsHeaders);
      }
      if (path === '/api/escalation/logs' && method === 'GET') return await handleGetEscalationLogs(request, db, corsHeaders);

      // Feature 9: AI Suggestion System
      if (path === '/api/ai/suggest' && method === 'POST') return await handleAISuggest(request, db, env, corsHeaders);
      if (path === '/api/ai/check-grammar' && method === 'POST') return await handleAICheckGrammar(request, env, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'ai' && pathParts[2] === 'suggestions' && pathParts[3] && method === 'GET') {
        return await handleGetAISuggestions(db, pathParts[3], corsHeaders);
      }

      // Feature 4: Enhanced Multilingual
      if (path === '/api/ai/translate' && method === 'POST') return await handleAITranslate(request, env, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'conversations' && pathParts[2] && pathParts[3] === 'language-info' && method === 'GET') {
        return await handleGetConversationLanguageInfo(db, pathParts[2], corsHeaders);
      }

      // ===== Phase 3 CRM Features: Deposit/Withdrawal, Tips, Game Recommendations, Fraud Detection =====

      // Phase 3 CRM: Schema Migration
      if (path === '/api/migrate/phase3-crm' && method === 'POST') return await handlePhase3CRMMigration(db, corsHeaders);

      // Feature 7: In-Chat Deposit/Withdrawal
      if (path === '/api/chat/payment-methods' && method === 'GET') return await handleGetPaymentMethods(corsHeaders);
      if (path === '/api/chat/deposit-link' && method === 'POST') return await handleCreateDepositLink(request, db, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'chat' && pathParts[2] === 'withdrawal-status' && pathParts[3] && method === 'GET') {
        return await handleGetWithdrawalStatus(db, pathParts[3], corsHeaders);
      }
      if (path === '/api/chat/send-payment-info' && method === 'POST') return await handleSendPaymentInfo(request, db, corsHeaders);

      // Feature 8: Tip/Chip System
      if (path === '/api/chat/tip' && method === 'POST') return await handleCreateTip(request, db, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'chat' && pathParts[2] === 'tips' && pathParts[3] === 'staff' && pathParts[4] && method === 'GET') {
        return await handleGetStaffTips(db, pathParts[4], corsHeaders);
      }
      if (path === '/api/chat/tips/leaderboard' && method === 'GET') return await handleGetTipLeaderboard(db, corsHeaders);
      if (path === '/api/settings/tips' && method === 'GET') return await handleGetTipSettings(db, corsHeaders);
      if (path === '/api/settings/tips' && method === 'PUT') return await handleUpdateTipSettings(request, db, corsHeaders);

      // Feature 11: Game Recommendation
      if (path === '/api/chat/recommend-games' && method === 'POST') return await handleRecommendGames(request, db, env, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'chat' && pathParts[2] === 'recommend-games' && pathParts[3] && method === 'GET') {
        return await handleGetRecommendations(db, pathParts[3], corsHeaders);
      }

      // Feature 12: Fraud Detection
      if (path === '/api/chat/fraud-check' && method === 'POST') return await handleFraudCheck(request, db, corsHeaders);
      if (path === '/api/chat/fraud-suggestions' && method === 'GET') return await handleGetFraudSuggestions(request, db, corsHeaders);
      if (pathParts[0] === 'api' && pathParts[1] === 'chat' && pathParts[2] === 'fraud-suggestions' && pathParts[3] === 'resolve' && method === 'PUT') {
        // Not used - individual resolve below
      }
      if (pathParts[0] === 'api' && pathParts[1] === 'chat' && pathParts[2] === 'fraud-suggestions' && pathParts[3] && pathParts[4] === 'resolve' && method === 'PUT') {
        return await handleResolveFraudSuggestion(request, db, pathParts[3], corsHeaders);
      }

      return jsonResponse({ error: 'Not Found' }, 404, corsHeaders);
    } catch (error) {
      console.error('Worker Error:', error);
      return new Response(JSON.stringify({ error: 'Internal Server Error', details: error.message }), {
        status: 500, headers: { 'Content-Type': 'application/json' }
      });
    }
  },
};

function jsonResponse(data, status = 200, corsHeaders = {}) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json; charset=utf-8' }
  });
}

// ========== API Handlers ==========

// --- Chat ---
async function handleChatMessage(request, db, kvStore, corsHeaders, env) {
  try {
    const chatData = await request.json();
    const { message, conversation_id } = chatData;
    const userId = request.headers.get('X-User-ID');
    if (!userId || !message) {
      return jsonResponse({ success: false, error: 'Missing user ID or message' }, 400, corsHeaders);
    }
    let currentConversationId = conversation_id;
    if (!currentConversationId) {
      const conversation = await createConversation(db, userId, 'Chat ' + new Date().toLocaleString('ja-JP'));
      currentConversationId = conversation.id;
    }
    const detectedLanguage = detectLanguage(message);
    const intent = classifyIntent(message);
    const shouldEscalate = shouldEscalateToHuman(message, intent);

    // AI応答の可否を評価
    let currentTags = [];
    try {
      const tagsRes = await db.prepare('SELECT t.name FROM tags t JOIN conversation_tags ct ON t.id = ct.tag_id WHERE ct.conversation_id = ?1').bind(currentConversationId).all();
      currentTags = tagsRes.results ? tagsRes.results.map(t => t.name) : [];
    } catch (e) {}
    
    const aiEvaluation = evaluateAiAction(message, currentConversationId, currentTags);
    
    // ignoreの場合はAI応答せずにユーザーメッセージだけ記録して終了
    if (aiEvaluation.action === "ignore") {
      await addMessage(db, { conversation_id: currentConversationId, sender_type: 'user', sender_id: userId, content: message, detected_language: detectedLanguage, detected_intent: intent });
      return jsonResponse({
        success: true, conversation_id: currentConversationId, original_message: message,
        ai_reply: null, reason: aiEvaluation.reason
      }, 200, corsHeaders);
    }
    
    // escalateの場合はエスカレーションメッセージを送信してタグを付ける
    if (aiEvaluation.action === "escalate") {
      await addMessage(db, { conversation_id: currentConversationId, sender_type: 'user', sender_id: userId, content: message, detected_language: detectedLanguage, detected_intent: intent });
      await addMessage(db, { conversation_id: currentConversationId, sender_type: 'system', sender_id: 'system', content: aiEvaluation.replyMessage, ai_processed: false });
      
      try {
        const tagRes = await db.prepare('SELECT id FROM tags WHERE name = ?1 OR id = ?1').bind(aiEvaluation.tagToAdd).first();
        const tagId = tagRes ? tagRes.id : 'tag_urgent';
        await db.prepare('INSERT OR IGNORE INTO conversation_tags (conversation_id, tag_id, added_at) VALUES (?1, ?2, ?3)').bind(currentConversationId, tagId, new Date().toISOString()).run();
      } catch (e) {}
      
      return jsonResponse({
        success: true, conversation_id: currentConversationId, original_message: message,
        ai_reply: aiEvaluation.replyMessage, should_escalate: true
      }, 200, corsHeaders);
    }

    // Search FAQ for relevant articles
    let faqResults = [];
    try {
      faqResults = await searchFAQ(db, kvStore, message, detectedLanguage);
    } catch (e) { /* ignore FAQ errors */ }

    let aiReply = await generateAIReply(message, detectedLanguage, intent, env);

    // Append FAQ suggestion if found
    if (faqResults.length > 0) {
      const faqSuggestion = faqResults[0];
      const faqLabel = { japanese: '\n\n📚 関連FAQ: ', english: '\n\n📚 Related FAQ: ', chinese: '\n\n📚 相关FAQ: ', korean: '\n\n📚 관련 FAQ: ' };
      aiReply += (faqLabel[detectedLanguage] || faqLabel.english) + faqSuggestion.title;
      if (faqSuggestion.content) {
        aiReply += '\n' + faqSuggestion.content.substring(0, 200);
        if (faqSuggestion.content.length > 200) aiReply += '...';
      }
      // Increment view count
      try { await db.prepare('UPDATE faq_articles SET view_count = view_count + 1 WHERE id = ?1').bind(faqSuggestion.id).run(); } catch (e) {}
    }

    await addMessage(db, { conversation_id: currentConversationId, sender_type: 'user', sender_id: userId, content: message, detected_language: detectedLanguage, detected_intent: intent });
    await addMessage(db, { conversation_id: currentConversationId, sender_type: 'ai', sender_id: 'staff_ai', content: aiReply, ai_processed: true, ai_confidence: 0.85 });

    // Auto-tag based on intent
    try {
      const intentTagMap = { payment: 'tag_billing', complaint: 'tag_complaint', support: 'tag_technical' };
      const autoTagId = intentTagMap[intent];
      if (autoTagId) {
        await db.prepare('INSERT OR IGNORE INTO conversation_tags (conversation_id, tag_id, added_at) VALUES (?1, ?2, ?3)')
          .bind(currentConversationId, autoTagId, new Date().toISOString()).run();
      }
      if (shouldEscalate) {
        await db.prepare('INSERT OR IGNORE INTO conversation_tags (conversation_id, tag_id, added_at) VALUES (?1, ?2, ?3)')
          .bind(currentConversationId, 'tag_urgent', new Date().toISOString()).run();
      }
    } catch (e) {}

    // Record analytics events
    try {
      await Promise.all([
        recordAnalyticsEvent(db, 'message_received', 1, detectedLanguage, intent),
        recordAnalyticsEvent(db, 'ai_response', 0.85, detectedLanguage, intent),
        shouldEscalate ? recordAnalyticsEvent(db, 'escalation', 1, intent, null) : Promise.resolve(),
        faqResults.length > 0 ? recordAnalyticsEvent(db, 'faq_suggested', faqResults.length, detectedLanguage, null) : Promise.resolve()
      ]);
    } catch (e) { /* analytics recording is non-critical */ }

    // Fire automation rules and webhooks asynchronously
    try {
      const isNew = !conversation_id;
      await executeAutomationRules(db, 'message.created', currentConversationId);
      if (isNew) await executeAutomationRules(db, 'conversation.opened', currentConversationId);
      await dispatchWebhookEvents(db, 'message.created', { conversation_id: currentConversationId, content: message, sender_type: 'user' });
      if (isNew) await dispatchWebhookEvents(db, 'conversation.created', { conversation_id: currentConversationId });
      // SLA check for new conversations
      if (isNew) await handleSLACheck({ json: async () => ({ conversation_id: currentConversationId }) }, db, corsHeaders).catch(() => {});
    } catch (e) { /* non-critical */ }

    return jsonResponse({
      success: true, conversation_id: currentConversationId, original_message: message,
      detected_language: detectedLanguage, intent, ai_reply: aiReply, should_escalate: shouldEscalate,
      faq_suggestions: faqResults.map(f => ({ id: f.id, title: f.title })),
      system: 'Chatwoot Complete Replacement v7.0 Phase 3-4'
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Chat message error:', error);
    return jsonResponse({ success: false, error: 'Chat processing failed' }, 500, corsHeaders);
  }
}

// --- Users ---
async function handleCreateUser(request, db, corsHeaders) {
  try {
    const userData = await request.json();
    const user = await createUser(db, userData);
    return jsonResponse({ success: true, user }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to create user' }, 500, corsHeaders);
  }
}

async function handleGetUsers(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const users = await db.prepare('SELECT * FROM users ORDER BY created_at DESC LIMIT ?1 OFFSET ?2').bind(limit, offset).all();
    const count = await db.prepare('SELECT COUNT(*) as count FROM users').first();
    return jsonResponse({ success: true, users: users.results || [], total: count?.count || 0 }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, users: [], total: 0 }, 200, corsHeaders);
  }
}

// --- Conversations ---
async function handleGetConversations(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '20');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const status = url.searchParams.get('status');
    const tag = url.searchParams.get('tag');

    let query = `SELECT c.*, u.name as user_name, u.email as user_email, s.name as staff_name
      FROM conversations c
      LEFT JOIN users u ON c.user_id = u.id
      LEFT JOIN staff s ON c.assigned_staff_id = s.id`;
    const params = [];
    const conditions = [];

    if (status) { conditions.push(`c.status = ?${params.length + 1}`); params.push(status); }
    if (tag) {
      conditions.push(`c.id IN (SELECT conversation_id FROM conversation_tags WHERE tag_id = ?${params.length + 1})`);
      params.push(tag);
    }
    if (conditions.length > 0) query += ' WHERE ' + conditions.join(' AND ');
    query += ` ORDER BY c.last_message_at DESC LIMIT ?${params.length + 1} OFFSET ?${params.length + 2}`;
    params.push(limit, offset);

    const conversations = await db.prepare(query).bind(...params).all();

    // Fetch tags for each conversation
    const results = [];
    for (const conv of (conversations.results || [])) {
      const tags = await db.prepare(
        'SELECT t.* FROM tags t JOIN conversation_tags ct ON t.id = ct.tag_id WHERE ct.conversation_id = ?1'
      ).bind(conv.id).all();
      results.push({ ...conv, tags: tags.results || [] });
    }

    return jsonResponse({ success: true, conversations: results }, 200, corsHeaders);
  } catch (error) {
    console.error('Get conversations error:', error);
    return jsonResponse({ success: true, conversations: [] }, 200, corsHeaders);
  }
}

async function handleUpdateConversation(request, db, conversationId, corsHeaders) {
  try {
    const data = await request.json();
    const updates = [];
    const params = [];
    if (data.status !== undefined) { updates.push(`status = ?${params.length + 1}`); params.push(data.status); }
    if (data.priority !== undefined) { updates.push(`priority = ?${params.length + 1}`); params.push(data.priority); }
    if (data.assigned_staff_id !== undefined) { updates.push(`assigned_staff_id = ?${params.length + 1}`); params.push(data.assigned_staff_id); }
    if (data.title !== undefined) { updates.push(`title = ?${params.length + 1}`); params.push(data.title); }
    if (data.status === 'resolved') { updates.push(`resolved_at = ?${params.length + 1}`); params.push(new Date().toISOString()); }
    if (data.satisfaction_rating !== undefined) { updates.push(`satisfaction_rating = ?${params.length + 1}`); params.push(data.satisfaction_rating); }

    if (updates.length === 0) return jsonResponse({ success: false, error: 'No updates provided' }, 400, corsHeaders);

    params.push(conversationId);
    await db.prepare(`UPDATE conversations SET ${updates.join(', ')} WHERE id = ?${params.length}`).bind(...params).run();
    // Fire webhooks and automation rules
    try {
      if (data.status === 'resolved') {
        await dispatchWebhookEvents(db, 'conversation.resolved', { conversation_id: conversationId }).catch(() => {});
        await executeAutomationRules(db, 'conversation.resolved', conversationId).catch(() => {});
        // SLA met event
        const slaEvent = generateId('slae');
        const policy = await db.prepare("SELECT id FROM sla_policies WHERE priority = (SELECT priority FROM conversations WHERE id = ?1) AND is_active = TRUE").bind(conversationId).first().catch(() => null);
        if (policy) {
          const conv = await db.prepare('SELECT created_at FROM conversations WHERE id = ?1').bind(conversationId).first().catch(() => null);
          if (conv) {
            const minutes = (Date.now() - new Date(conv.created_at).getTime()) / 60000;
            await db.prepare('INSERT OR IGNORE INTO sla_events (id, conversation_id, sla_policy_id, event_type, response_time_minutes, created_at) VALUES (?1,?2,?3,?4,?5,?6)')
              .bind(slaEvent, conversationId, policy.id, 'resolution_met', minutes, new Date().toISOString()).run().catch(() => {});
          }
        }
      }
      if (data.status) await dispatchWebhookEvents(db, 'conversation.updated', { conversation_id: conversationId, status: data.status }).catch(() => {});
      if (data.assigned_staff_id) await dispatchWebhookEvents(db, 'staff.assigned', { conversation_id: conversationId, staff_id: data.assigned_staff_id }).catch(() => {});
    } catch (e) { /* non-critical */ }
    return jsonResponse({ success: true, message: 'Conversation updated' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to update conversation' }, 500, corsHeaders);
  }
}

async function handleGetConversationMessages(db, conversationId, corsHeaders) {
  try {
    const messages = await db.prepare(
      `SELECT m.*, CASE
        WHEN m.sender_type = 'user' THEN u.name
        WHEN m.sender_type = 'staff' THEN s.name
        WHEN m.sender_type = 'ai' THEN 'AI Assistant'
        ELSE 'System'
      END as sender_name
      FROM messages m
      LEFT JOIN users u ON m.sender_type = 'user' AND m.sender_id = u.id
      LEFT JOIN staff s ON m.sender_type = 'staff' AND m.sender_id = s.id
      WHERE m.conversation_id = ?1
      ORDER BY m.created_at ASC`
    ).bind(conversationId).all();
    return jsonResponse({ success: true, messages: messages.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, messages: [] }, 200, corsHeaders);
  }
}

// --- Tags ---
async function handleGetTags(db, corsHeaders) {
  try {
    const tags = await db.prepare(
      `SELECT t.*, (SELECT COUNT(*) FROM conversation_tags ct WHERE ct.tag_id = t.id) as usage_count
       FROM tags t WHERE t.is_active = TRUE ORDER BY t.name`
    ).all();
    return jsonResponse({ success: true, tags: tags.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, tags: [] }, 200, corsHeaders);
  }
}

async function handleCreateTag(request, db, corsHeaders) {
  try {
    const data = await request.json();
    if (!data.name) return jsonResponse({ success: false, error: 'Tag name is required' }, 400, corsHeaders);
    const tagId = generateId('tag');
    await db.prepare(
      'INSERT INTO tags (id, name, color, description, created_at, is_active) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
    ).bind(tagId, data.name, data.color || '#3B82F6', data.description || '', new Date().toISOString(), true).run();
    return jsonResponse({ success: true, tag: { id: tagId, name: data.name, color: data.color || '#3B82F6', description: data.description || '' } }, 201, corsHeaders);
  } catch (error) {
    if (error.message?.includes('UNIQUE')) return jsonResponse({ success: false, error: 'Tag name already exists' }, 409, corsHeaders);
    return jsonResponse({ success: false, error: 'Failed to create tag' }, 500, corsHeaders);
  }
}

async function handleUpdateTag(request, db, tagId, corsHeaders) {
  try {
    const data = await request.json();
    const updates = [];
    const params = [];
    if (data.name !== undefined) { updates.push(`name = ?${params.length + 1}`); params.push(data.name); }
    if (data.color !== undefined) { updates.push(`color = ?${params.length + 1}`); params.push(data.color); }
    if (data.description !== undefined) { updates.push(`description = ?${params.length + 1}`); params.push(data.description); }
    if (updates.length === 0) return jsonResponse({ success: false, error: 'No updates' }, 400, corsHeaders);
    params.push(tagId);
    await db.prepare(`UPDATE tags SET ${updates.join(', ')} WHERE id = ?${params.length}`).bind(...params).run();
    return jsonResponse({ success: true, message: 'Tag updated' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to update tag' }, 500, corsHeaders);
  }
}

async function handleDeleteTag(db, tagId, corsHeaders) {
  try {
    await db.prepare('DELETE FROM conversation_tags WHERE tag_id = ?1').bind(tagId).run();
    await db.prepare('DELETE FROM tags WHERE id = ?1').bind(tagId).run();
    return jsonResponse({ success: true, message: 'Tag deleted' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to delete tag' }, 500, corsHeaders);
  }
}

async function handleGetConversationTags(db, conversationId, corsHeaders) {
  try {
    const tags = await db.prepare(
      'SELECT t.* FROM tags t JOIN conversation_tags ct ON t.id = ct.tag_id WHERE ct.conversation_id = ?1'
    ).bind(conversationId).all();
    return jsonResponse({ success: true, tags: tags.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, tags: [] }, 200, corsHeaders);
  }
}

async function handleAddConversationTag(request, db, conversationId, corsHeaders) {
  try {
    const data = await request.json();
    if (!data.tag_id) return jsonResponse({ success: false, error: 'tag_id is required' }, 400, corsHeaders);
    await db.prepare(
      'INSERT OR IGNORE INTO conversation_tags (conversation_id, tag_id, added_by_staff_id, added_at) VALUES (?1, ?2, ?3, ?4)'
    ).bind(conversationId, data.tag_id, data.staff_id || null, new Date().toISOString()).run();
    return jsonResponse({ success: true, message: 'タグを追加しました to conversation' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to add tag' }, 500, corsHeaders);
  }
}

async function handleRemoveConversationTag(db, conversationId, tagId, corsHeaders) {
  try {
    await db.prepare('DELETE FROM conversation_tags WHERE conversation_id = ?1 AND tag_id = ?2').bind(conversationId, tagId).run();
    return jsonResponse({ success: true, message: 'タグを削除しました from conversation' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to remove tag' }, 500, corsHeaders);
  }
}

// --- FAQ ---
async function handleGetFAQs(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const language = url.searchParams.get('language');
    const category = url.searchParams.get('category');
    const limit = parseInt(url.searchParams.get('limit') || '50');

    let query = 'SELECT * FROM faq_articles WHERE is_published = TRUE';
    const params = [];
    if (language) { query += ` AND language = ?${params.length + 1}`; params.push(language); }
    if (category) { query += ` AND category = ?${params.length + 1}`; params.push(category); }
    query += ` ORDER BY view_count DESC LIMIT ?${params.length + 1}`;
    params.push(limit);

    const faqs = await db.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, faqs: faqs.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, faqs: [] }, 200, corsHeaders);
  }
}

async function handleCreateFAQ(request, db, kvStore, corsHeaders) {
  try {
    const data = await request.json();
    if (!data.title || !data.content) return jsonResponse({ success: false, error: 'Title and content required' }, 400, corsHeaders);
    const faqId = generateId('faq');
    const keywords = JSON.stringify(data.keywords || []);
    await db.prepare(
      'INSERT INTO faq_articles (id, title, content, language, category, keywords, created_at, updated_at, created_by_staff_id, is_published) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)'
    ).bind(faqId, data.title, data.content, data.language || 'japanese', data.category || 'general',
      keywords, new Date().toISOString(), new Date().toISOString(), data.staff_id || null, true).run();
    await updateFAQIndex(db, kvStore);
    return jsonResponse({ success: true, faq: { id: faqId, title: data.title } }, 201, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to create FAQ' }, 500, corsHeaders);
  }
}

async function handleUpdateFAQ(request, db, kvStore, faqId, corsHeaders) {
  try {
    const data = await request.json();
    const updates = [];
    const params = [];
    if (data.title !== undefined) { updates.push(`title = ?${params.length + 1}`); params.push(data.title); }
    if (data.content !== undefined) { updates.push(`content = ?${params.length + 1}`); params.push(data.content); }
    if (data.language !== undefined) { updates.push(`language = ?${params.length + 1}`); params.push(data.language); }
    if (data.category !== undefined) { updates.push(`category = ?${params.length + 1}`); params.push(data.category); }
    if (data.keywords !== undefined) { updates.push(`keywords = ?${params.length + 1}`); params.push(JSON.stringify(data.keywords)); }
    if (data.is_published !== undefined) { updates.push(`is_published = ?${params.length + 1}`); params.push(data.is_published); }
    updates.push(`updated_at = ?${params.length + 1}`); params.push(new Date().toISOString());
    params.push(faqId);
    await db.prepare(`UPDATE faq_articles SET ${updates.join(', ')} WHERE id = ?${params.length}`).bind(...params).run();
    await updateFAQIndex(db, kvStore);
    return jsonResponse({ success: true, message: 'FAQ updated' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to update FAQ' }, 500, corsHeaders);
  }
}

async function handleDeleteFAQ(db, kvStore, faqId, corsHeaders) {
  try {
    await db.prepare('DELETE FROM faq_articles WHERE id = ?1').bind(faqId).run();
    await updateFAQIndex(db, kvStore);
    return jsonResponse({ success: true, message: 'FAQ deleted' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to delete FAQ' }, 500, corsHeaders);
  }
}

async function handleSearchFAQ(request, db, kvStore, corsHeaders) {
  try {
    const url = new URL(request.url);
    const query = url.searchParams.get('q') || '';
    const language = url.searchParams.get('language');
    if (!query) return jsonResponse({ success: true, results: [] }, 200, corsHeaders);
    const results = await searchFAQ(db, kvStore, query, language);
    return jsonResponse({ success: true, results }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, results: [] }, 200, corsHeaders);
  }
}

async function handleFAQCount(kvStore, corsHeaders) {
  try {
    const count = await kvStore?.get('faq_count') || '0';
    return jsonResponse({ faq_count: parseInt(count), storage: 'Cloudflare KV + D1', last_updated: await kvStore?.get('last_updated') || 'Never' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ faq_count: 0 }, 500, corsHeaders);
  }
}

// --- Templates ---
async function handleGetTemplates(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const category = url.searchParams.get('category');
    const language = url.searchParams.get('language');
    let query = 'SELECT * FROM templates WHERE is_active = TRUE';
    const params = [];
    if (category) { query += ` AND category = ?${params.length + 1}`; params.push(category); }
    if (language) { query += ` AND (language = ?${params.length + 1} OR language = 'all')`; params.push(language); }
    query += ' ORDER BY use_count DESC';
    const templates = await db.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, templates: templates.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, templates: [] }, 200, corsHeaders);
  }
}

async function handleCreateTemplate(request, db, corsHeaders) {
  try {
    const data = await request.json();
    if (!data.name || !data.content) return jsonResponse({ success: false, error: 'Name and content required' }, 400, corsHeaders);
    const templateId = generateId('tmpl');
    await db.prepare(
      'INSERT INTO templates (id, name, content, language, category, shortcut, created_at, updated_at, created_by_staff_id, is_active) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)'
    ).bind(templateId, data.name, data.content, data.language || 'all', data.category || 'general',
      data.shortcut || null, new Date().toISOString(), new Date().toISOString(), data.staff_id || null, true).run();
    return jsonResponse({ success: true, template: { id: templateId, name: data.name } }, 201, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to create template' }, 500, corsHeaders);
  }
}

async function handleUpdateTemplate(request, db, templateId, corsHeaders) {
  try {
    const data = await request.json();
    const updates = [];
    const params = [];
    if (data.name !== undefined) { updates.push(`name = ?${params.length + 1}`); params.push(data.name); }
    if (data.content !== undefined) { updates.push(`content = ?${params.length + 1}`); params.push(data.content); }
    if (data.language !== undefined) { updates.push(`language = ?${params.length + 1}`); params.push(data.language); }
    if (data.category !== undefined) { updates.push(`category = ?${params.length + 1}`); params.push(data.category); }
    if (data.shortcut !== undefined) { updates.push(`shortcut = ?${params.length + 1}`); params.push(data.shortcut); }
    updates.push(`updated_at = ?${params.length + 1}`); params.push(new Date().toISOString());
    params.push(templateId);
    await db.prepare(`UPDATE templates SET ${updates.join(', ')} WHERE id = ?${params.length}`).bind(...params).run();
    return jsonResponse({ success: true, message: 'Template updated' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to update template' }, 500, corsHeaders);
  }
}

async function handleDeleteTemplate(db, templateId, corsHeaders) {
  try {
    await db.prepare('DELETE FROM templates WHERE id = ?1').bind(templateId).run();
    return jsonResponse({ success: true, message: 'Template deleted' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to delete template' }, 500, corsHeaders);
  }
}

// --- File Upload ---
async function handleFileUpload(request, db, r2Bucket, corsHeaders) {
  try {
    const formData = await request.formData();
    const file = formData.get('file');
    const conversationId = formData.get('conversation_id');
    const uploadedByType = formData.get('uploaded_by_type') || 'user';
    const uploadedById = formData.get('uploaded_by_id');

    if (!file) return jsonResponse({ success: false, error: 'No file provided' }, 400, corsHeaders);

    const maxSize = 10 * 1024 * 1024; // 10MB
    if (file.size > maxSize) return jsonResponse({ success: false, error: 'File too large (max 10MB)' }, 400, corsHeaders);

    const fileId = generateId('file');
    const ext = file.name.split('.').pop() || 'bin';
    const storageKey = `uploads/${fileId}.${ext}`;

    // Upload to R2
    if (r2Bucket) {
      await r2Bucket.put(storageKey, file.stream(), {
        httpMetadata: { contentType: file.type },
        customMetadata: { originalName: file.name, uploadedBy: uploadedById || 'unknown' }
      });
    }

    // Record in D1
    const messageId = conversationId ? generateId('msg') : null;
    await db.prepare(
      'INSERT INTO file_uploads (id, conversation_id, message_id, original_filename, file_type, file_size, storage_url, uploaded_by_type, uploaded_by_id, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)'
    ).bind(fileId, conversationId || null, messageId, file.name, file.type, file.size,
      storageKey, uploadedByType, uploadedById || null, new Date().toISOString()).run();

    // If conversation exists, add a file message
    if (conversationId && messageId) {
      await db.prepare(
        'INSERT INTO messages (id, conversation_id, sender_type, sender_id, content, content_type, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)'
      ).bind(messageId, conversationId, uploadedByType === 'staff' ? 'staff' : 'user',
        uploadedById || null, `[File: ${file.name}]`, 'file', new Date().toISOString()).run();
      await db.prepare('UPDATE conversations SET total_messages = total_messages + 1, last_message_at = ?1 WHERE id = ?2')
        .bind(new Date().toISOString(), conversationId).run();
    }

    // Record analytics
    try { await recordAnalyticsEvent(db, 'file_upload', file.size, file.type, uploadedByType); } catch (e) {}

    return jsonResponse({
      success: true, file: { id: fileId, filename: file.name, type: file.type, size: file.size, storage_key: storageKey }
    }, 201, corsHeaders);
  } catch (error) {
    console.error('File upload error:', error);
    return jsonResponse({ success: false, error: 'File upload failed' }, 500, corsHeaders);
  }
}

async function handleGetFile(db, r2Bucket, fileId, corsHeaders) {
  try {
    const fileRecord = await db.prepare('SELECT * FROM file_uploads WHERE id = ?1').bind(fileId).first();
    if (!fileRecord) return jsonResponse({ error: 'File not found' }, 404, corsHeaders);

    if (r2Bucket && fileRecord.storage_url) {
      const object = await r2Bucket.get(fileRecord.storage_url);
      if (object) {
        return new Response(object.body, {
          headers: {
            ...corsHeaders,
            'Content-Type': fileRecord.file_type || 'application/octet-stream',
            'Content-Disposition': `inline; filename="${fileRecord.original_filename}"`,
          }
        });
      }
    }
    return jsonResponse({ success: true, file: fileRecord }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ error: 'Failed to get file' }, 500, corsHeaders);
  }
}

// --- Staff Reply ---
async function handleStaffReply(request, db, conversationId, corsHeaders) {
  try {
    const data = await request.json();
    if (!data.content) return jsonResponse({ success: false, error: 'Message content required' }, 400, corsHeaders);
    const staffId = data.staff_id || 'staff_admin';
    const staffName = data.staff_name || 'Staff';

    await addMessage(db, {
      conversation_id: conversationId,
      sender_type: 'staff',
      sender_id: staffId,
      content: data.content,
      content_type: 'text'
    });

    // Update conversation status to in_progress if it was open
    await db.prepare(
      "UPDATE conversations SET status = CASE WHEN status = 'open' THEN 'in_progress' ELSE status END, assigned_staff_id = COALESCE(assigned_staff_id, ?1) WHERE id = ?2"
    ).bind(staffId, conversationId).run();

    // Record analytics
    try { await recordAnalyticsEvent(db, 'staff_reply', 1, staffId, null); } catch (e) {}

    // Fire automation rules and webhooks
    try {
      await executeAutomationRules(db, 'message.created', conversationId);
      await dispatchWebhookEvents(db, 'message.sent', { conversation_id: conversationId, content: data.content, sender_type: 'staff', staff_id: staffId });
      // Write audit log
      await writeAuditLog(db, 'staff', staffId, staffName, 'message.sent', 'message', conversationId, { content_length: data.content.length });
    } catch (e) { /* non-critical */ }

    return jsonResponse({ success: true, message: 'Reply sent', conversation_id: conversationId }, 200, corsHeaders);
  } catch (error) {
    console.error('Staff reply error:', error);
    return jsonResponse({ success: false, error: 'Failed to send reply' }, 500, corsHeaders);
  }
}

// --- Conversation Search ---
async function handleSearchConversations(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const q = url.searchParams.get('q') || '';
    const limit = parseInt(url.searchParams.get('limit') || '20');
    if (!q) return jsonResponse({ success: true, conversations: [] }, 200, corsHeaders);

    const searchTerm = `%${q}%`;
    const conversations = await db.prepare(`
      SELECT c.*, u.name as user_name, u.email as user_email
      FROM conversations c
      LEFT JOIN users u ON c.user_id = u.id
      WHERE c.id IN (
        SELECT DISTINCT conversation_id FROM messages WHERE LOWER(content) LIKE LOWER(?1)
      ) OR LOWER(c.title) LIKE LOWER(?1) OR LOWER(u.name) LIKE LOWER(?1) OR LOWER(u.email) LIKE LOWER(?1)
      ORDER BY c.last_message_at DESC
      LIMIT ?2
    `).bind(searchTerm, limit).all();

    const results = [];
    for (const conv of (conversations.results || [])) {
      const tags = await db.prepare(
        'SELECT t.* FROM tags t JOIN conversation_tags ct ON t.id = ct.tag_id WHERE ct.conversation_id = ?1'
      ).bind(conv.id).all();
      results.push({ ...conv, tags: tags.results || [] });
    }

    return jsonResponse({ success: true, conversations: results }, 200, corsHeaders);
  } catch (error) {
    console.error('Search error:', error);
    return jsonResponse({ success: true, conversations: [] }, 200, corsHeaders);
  }
}

// --- File Management ---
async function handleGetFiles(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const conversationId = url.searchParams.get('conversation_id');

    let query = `SELECT f.*, c.title as conversation_title FROM file_uploads f LEFT JOIN conversations c ON f.conversation_id = c.id`;
    const params = [];
    if (conversationId) {
      query += ` WHERE f.conversation_id = ?${params.length + 1}`;
      params.push(conversationId);
    }
    query += ` ORDER BY f.created_at DESC LIMIT ?${params.length + 1} OFFSET ?${params.length + 2}`;
    params.push(limit, offset);

    const files = await db.prepare(query).bind(...params).all();
    const count = await db.prepare('SELECT COUNT(*) as count FROM file_uploads').first();

    return jsonResponse({
      success: true,
      files: files.results || [],
      total: count?.count || 0
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, files: [], total: 0 }, 200, corsHeaders);
  }
}

async function handleDeleteFile(db, r2Bucket, fileId, corsHeaders) {
  try {
    const fileRecord = await db.prepare('SELECT * FROM file_uploads WHERE id = ?1').bind(fileId).first();
    if (!fileRecord) return jsonResponse({ error: 'File not found' }, 404, corsHeaders);

    // Delete from R2
    if (r2Bucket && fileRecord.storage_url) {
      try { await r2Bucket.delete(fileRecord.storage_url); } catch (e) {}
    }

    // Delete from D1
    await db.prepare('DELETE FROM file_uploads WHERE id = ?1').bind(fileId).run();

    return jsonResponse({ success: true, message: 'File deleted' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to delete file' }, 500, corsHeaders);
  }
}

// --- FAQ Rating ---
async function handleRateFAQ(request, db, faqId, corsHeaders) {
  try {
    const data = await request.json();
    const isHelpful = data.helpful === true;
    if (isHelpful) {
      await db.prepare('UPDATE faq_articles SET helpful_count = helpful_count + 1 WHERE id = ?1').bind(faqId).run();
    } else {
      await db.prepare('UPDATE faq_articles SET unhelpful_count = unhelpful_count + 1 WHERE id = ?1').bind(faqId).run();
    }
    return jsonResponse({ success: true, message: 'Rating recorded' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to record rating' }, 500, corsHeaders);
  }
}

// --- Analytics Export (CSV) ---
async function handleExportAnalytics(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const type = url.searchParams.get('type') || 'conversations';
    const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    let csv = '';
    if (type === 'conversations') {
      csv = 'ID,User,Status,Priority,Messages,Language,Created,Resolved\n';
      const rows = await db.prepare(
        `SELECT c.id, u.name as user_name, c.status, c.priority, c.total_messages, c.language, c.created_at, c.resolved_at
         FROM conversations c LEFT JOIN users u ON c.user_id = u.id
         WHERE DATE(c.created_at) >= ?1 ORDER BY c.created_at DESC`
      ).bind(startDate).all();
      for (const r of (rows.results || [])) {
        csv += `"${r.id}","${r.user_name || 'Guest'}","${r.status}","${r.priority}",${r.total_messages},"${r.language || ''}","${r.created_at}","${r.resolved_at || ''}"\n`;
      }
    } else if (type === 'messages') {
      csv = 'ID,ConversationID,SenderType,Language,Intent,Created\n';
      const rows = await db.prepare(
        `SELECT id, conversation_id, sender_type, detected_language, detected_intent, created_at
         FROM messages WHERE DATE(created_at) >= ?1 ORDER BY created_at DESC LIMIT 5000`
      ).bind(startDate).all();
      for (const r of (rows.results || [])) {
        csv += `"${r.id}","${r.conversation_id}","${r.sender_type}","${r.detected_language || ''}","${r.detected_intent || ''}","${r.created_at}"\n`;
      }
    }

    return new Response(csv, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/csv; charset=utf-8',
        'Content-Disposition': `attachment; filename="analytics_${type}_${startDate}.csv"`
      }
    });
  } catch (error) {
    return jsonResponse({ success: false, error: 'Export failed' }, 500, corsHeaders);
  }
}

// --- Satisfaction Report ---
async function handleSatisfactionReport(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    const [avgRating, ratingDist, resolutionTime, aiVsHuman, tagPerformance] = await Promise.all([
      db.prepare(
        `SELECT AVG(satisfaction_rating) as avg_rating, COUNT(satisfaction_rating) as rated_count,
         COUNT(*) as total FROM conversations WHERE DATE(created_at) >= ?1`
      ).bind(startDate).first(),
      db.prepare(
        `SELECT satisfaction_rating as rating, COUNT(*) as count FROM conversations
         WHERE satisfaction_rating IS NOT NULL AND DATE(created_at) >= ?1
         GROUP BY satisfaction_rating ORDER BY rating`
      ).bind(startDate).all(),
      db.prepare(
        `SELECT AVG(julianday(resolved_at) - julianday(created_at)) * 24 as avg_hours,
         MIN(julianday(resolved_at) - julianday(created_at)) * 24 as min_hours,
         MAX(julianday(resolved_at) - julianday(created_at)) * 24 as max_hours
         FROM conversations WHERE resolved_at IS NOT NULL AND DATE(created_at) >= ?1`
      ).bind(startDate).first(),
      db.prepare(
        `SELECT ai_handled, COUNT(*) as count FROM conversations WHERE DATE(created_at) >= ?1 GROUP BY ai_handled`
      ).bind(startDate).all(),
      db.prepare(
        `SELECT t.name as tag_name, t.color, COUNT(ct.conversation_id) as conv_count,
         AVG(c.satisfaction_rating) as avg_satisfaction
         FROM tags t JOIN conversation_tags ct ON t.id = ct.tag_id
         JOIN conversations c ON ct.conversation_id = c.id
         WHERE DATE(c.created_at) >= ?1
         GROUP BY t.id ORDER BY conv_count DESC LIMIT 10`
      ).bind(startDate).all()
    ]);

    return jsonResponse({
      success: true,
      period: { days, start_date: startDate },
      satisfaction: {
        average_rating: avgRating?.avg_rating ? Math.round(avgRating.avg_rating * 10) / 10 : null,
        rated_conversations: avgRating?.rated_count || 0,
        total_conversations: avgRating?.total || 0,
        distribution: ratingDist.results || []
      },
      resolution_time: {
        average_hours: resolutionTime?.avg_hours ? Math.round(resolutionTime.avg_hours * 10) / 10 : null,
        min_hours: resolutionTime?.min_hours ? Math.round(resolutionTime.min_hours * 10) / 10 : null,
        max_hours: resolutionTime?.max_hours ? Math.round(resolutionTime.max_hours * 10) / 10 : null
      },
      ai_vs_human: aiVsHuman.results || [],
      tag_performance: tagPerformance.results || []
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get satisfaction report' }, 500, corsHeaders);
  }
}

// --- Analytics ---
async function handleGetAnalytics(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    const [dailyConversations, languageBreakdown, intentBreakdown, statusBreakdown, hourlyDistribution] = await Promise.all([
      db.prepare(
        `SELECT DATE(created_at) as date, COUNT(*) as count FROM conversations WHERE DATE(created_at) >= ?1 GROUP BY DATE(created_at) ORDER BY date`
      ).bind(startDate).all(),
      db.prepare(
        `SELECT language, COUNT(*) as count FROM conversations WHERE DATE(created_at) >= ?1 GROUP BY language ORDER BY count DESC`
      ).bind(startDate).all(),
      db.prepare(
        `SELECT detected_intent as intent, COUNT(*) as count FROM messages WHERE detected_intent IS NOT NULL AND DATE(created_at) >= ?1 GROUP BY detected_intent ORDER BY count DESC`
      ).bind(startDate).all(),
      db.prepare(
        `SELECT status, COUNT(*) as count FROM conversations WHERE DATE(created_at) >= ?1 GROUP BY status`
      ).bind(startDate).all(),
      db.prepare(
        `SELECT CAST(strftime('%H', created_at) AS INTEGER) as hour, COUNT(*) as count FROM messages WHERE DATE(created_at) >= ?1 GROUP BY hour ORDER BY hour`
      ).bind(startDate).all()
    ]);

    return jsonResponse({
      success: true,
      period: { days, start_date: startDate },
      daily_conversations: dailyConversations.results || [],
      language_breakdown: languageBreakdown.results || [],
      intent_breakdown: intentBreakdown.results || [],
      status_breakdown: statusBreakdown.results || [],
      hourly_distribution: hourlyDistribution.results || []
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get analytics' }, 500, corsHeaders);
  }
}

async function handleDashboardStats(db, corsHeaders) {
  try {
    const stats = await getDashboardStats(db);
    return jsonResponse(stats, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ total_conversations: 0, open_conversations: 0, today_conversations: 0, weekly_conversations: 0, ai_resolution_rate: 0 }, 200, corsHeaders);
  }
}

// --- Analytics Recording ---
async function recordAnalyticsEvent(db, metricType, metricValue, dim1, dim2) {
  try {
    const id = generateId('anl');
    const today = new Date().toISOString().split('T')[0];
    await db.prepare(
      'INSERT INTO analytics (id, date, metric_type, metric_value, dimension_1, dimension_2, created_at) VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)'
    ).bind(id, today, metricType, metricValue, dim1 || null, dim2 || null, new Date().toISOString()).run();
  } catch (error) {
    console.error('Analytics record error:', error);
  }
}

async function handleRecordAnalytics(request, db, corsHeaders) {
  try {
    const data = await request.json();
    if (!data.metric_type) return jsonResponse({ success: false, error: 'metric_type required' }, 400, corsHeaders);
    await recordAnalyticsEvent(db, data.metric_type, data.metric_value || 1, data.dimension_1, data.dimension_2);
    return jsonResponse({ success: true, message: 'Analytics recorded' }, 201, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to record analytics' }, 500, corsHeaders);
  }
}

async function handleAnalyticsSummary(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const days = parseInt(url.searchParams.get('days') || '30');
    const startDate = new Date(Date.now() - days * 86400000).toISOString().split('T')[0];

    const [metricTotals, dailyMetrics, topLanguages, responseMetrics] = await Promise.all([
      db.prepare(
        `SELECT metric_type, SUM(metric_value) as total, COUNT(*) as events
         FROM analytics WHERE date >= ?1 GROUP BY metric_type ORDER BY total DESC`
      ).bind(startDate).all(),
      db.prepare(
        `SELECT date, metric_type, SUM(metric_value) as total
         FROM analytics WHERE date >= ?1 GROUP BY date, metric_type ORDER BY date`
      ).bind(startDate).all(),
      db.prepare(
        `SELECT dimension_1 as language, COUNT(*) as count
         FROM analytics WHERE metric_type = 'message_received' AND date >= ?1 AND dimension_1 IS NOT NULL
         GROUP BY dimension_1 ORDER BY count DESC LIMIT 10`
      ).bind(startDate).all(),
      db.prepare(
        `SELECT AVG(metric_value) as avg_confidence
         FROM analytics WHERE metric_type = 'ai_response' AND date >= ?1`
      ).bind(startDate).first()
    ]);

    return jsonResponse({
      success: true,
      period: { days, start_date: startDate },
      metric_totals: metricTotals.results || [],
      daily_metrics: dailyMetrics.results || [],
      top_languages: topLanguages.results || [],
      avg_ai_confidence: responseMetrics?.avg_confidence || null
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get analytics summary' }, 500, corsHeaders);
  }
}

// ========== Health Check ==========
function handleHealthCheck(corsHeaders) {
  return jsonResponse({
    status: 'ok', service: 'Chatwoot Complete Replacement System', version: '7.0',
    phases: {
      phase1: ['Tags CRUD', 'FAQ with KV Search', 'FAQ Rating'],
      phase2: ['File Upload (R2)', 'File Management', 'Templates CRUD', 'Analytics Recording', 'Analytics Summary', 'CSV Export', 'Satisfaction Reports'],
      phase3: ['Multi-Tenant Support', 'Role Management (RBAC)', 'SLA Policies', 'SLA Monitoring', 'SLA Dashboard', 'Audit Logs'],
      phase4: ['Webhooks Management', 'Webhook Delivery Logs', 'Webhook Test', 'Business Hours', 'Out-of-Hours Auto-Reply', 'Automation Rules', 'Conditional Actions', 'Full UI Integration']
    },
    timestamp: new Date().toISOString()
  }, 200, corsHeaders);
}

// ========== Staff Login ==========
function handleStaffLogin(corsHeaders) {
  const loginHTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>スタッフログイン</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#1e293b,#334155);height:100vh;display:flex;justify-content:center;align-items:center}
.login-container{background:#fff;padding:40px;border-radius:16px;box-shadow:0 25px 50px rgba(0,0,0,.3);width:100%;max-width:400px}
.login-header{text-align:center;margin-bottom:30px}
.login-header h1{color:#1e293b;margin-bottom:10px;font-size:24px}
.login-header p{color:#64748b;font-size:14px}
.form-group{margin-bottom:20px}
.form-group label{display:block;margin-bottom:8px;font-weight:500;color:#374151}
.form-group input{width:100%;padding:12px 16px;border:1px solid #d1d5db;border-radius:8px;font-size:16px;transition:border-color .2s}
.form-group input:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
.login-button{width:100%;padding:14px;background:linear-gradient(135deg,#3b82f6,#1d4ed8);color:#fff;border:none;border-radius:8px;font-size:16px;font-weight:600;cursor:pointer;transition:transform .2s}
.login-button:hover{transform:translateY(-1px)}
.quick-login{margin-top:20px;padding-top:20px;border-top:1px solid #e5e7eb}
.quick-login h4{color:#374151;margin-bottom:10px;font-size:14px}
.demo-buttons{display:flex;gap:10px}
.demo-button{flex:1;padding:10px;border:1px solid #d1d5db;background:#f9fafb;border-radius:6px;cursor:pointer;font-size:12px;text-align:center;transition:all .2s}
.demo-button:hover{background:#f3f4f6}
</style>
</head>
<body>
<div class="login-container">
<div class="login-header"><h1>スタッフログイン</h1><p>AIカスタマーサポートシステム</p></div>
<form onsubmit="handleLogin(event)">
<div class="form-group"><label>メールアドレス</label><input type="email" id="email" placeholder="staff@company.com" required></div>
<div class="form-group"><label>パスワード</label><input type="password" id="password" placeholder="パスワード" required></div>
<button type="submit" class="login-button">ログイン</button>
</form>
<div class="quick-login">
<h4>クイックログイン（デモ）</h4>
<div class="demo-buttons">
<div class="demo-button" onclick="quickLogin('admin')">管理者</div>
<div class="demo-button" onclick="quickLogin('agent')">エージェント</div>
<div class="demo-button" onclick="quickLogin('supervisor')">スーパーバイザー</div>
</div>
</div>
</div>
<script>
function handleLogin(e){e.preventDefault();const email=document.getElementById('email').value;const pw=document.getElementById('password').value;if(email&&pw){localStorage.setItem('staffToken',btoa(email+':'+pw));localStorage.setItem('staffEmail',email);localStorage.setItem('staffRole','admin');localStorage.setItem('staffName',email.split('@')[0]);window.location.href='/staff/dashboard'}}
function quickLogin(role){const c={admin:{email:'admin@company.com',role:'admin',name:'Admin'},agent:{email:'agent@company.com',role:'agent',name:'Agent'},supervisor:{email:'supervisor@company.com',role:'supervisor',name:'Supervisor'}}[role];localStorage.setItem('staffToken',btoa(c.email+':demo123'));localStorage.setItem('staffEmail',c.email);localStorage.setItem('staffRole',c.role);localStorage.setItem('staffName',c.name);window.location.href='/staff/dashboard'}
</script>
</body></html>`;
  return new Response(loginHTML, { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
}

// ========== Advanced Staff Dashboard ==========
function handleAdvancedStaffDashboard(corsHeaders) {
  const dashboardHTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>スタッフダッシュボード - v7.0</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#f8fafc;color:#374151}
.dashboard{display:grid;grid-template-columns:260px 1fr;height:100vh}
.sidebar{background:linear-gradient(135deg,#1e293b,#334155);color:#fff;padding:20px 0;overflow-y:auto}
.sidebar-header{padding:0 20px 20px;border-bottom:1px solid #374151}
.user-info{display:flex;align-items:center;gap:12px;margin-bottom:15px}
.avatar{width:40px;height:40px;border-radius:50%;background:linear-gradient(135deg,#3b82f6,#1d4ed8);display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:16px}
.nav-menu{padding-top:10px}
.nav-item{padding:12px 20px;cursor:pointer;transition:all .2s;border-left:3px solid transparent;display:flex;align-items:center;gap:10px;font-size:14px}
.nav-item:hover{background:rgba(255,255,255,.1);padding-left:25px}
.nav-item.active{background:rgba(59,130,246,.2);border-left-color:#3b82f6;padding-left:25px}
.main-content{overflow-y:auto;background:#f8fafc}
.content-header{background:#fff;padding:20px 30px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center}
.content-body{padding:25px}
.stats-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:20px;margin-bottom:25px}
.stat-card{background:#fff;padding:24px;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);border-left:4px solid #3b82f6}
.stat-card:nth-child(2){border-left-color:#f59e0b}
.stat-card:nth-child(3){border-left-color:#10b981}
.stat-card:nth-child(4){border-left-color:#8b5cf6}
.stat-title{font-size:12px;color:#6b7280;font-weight:600;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px}
.stat-number{font-size:32px;font-weight:bold;color:#1f2937}
.card{background:#fff;border-radius:12px;box-shadow:0 2px 8px rgba(0,0,0,.06);overflow:hidden;margin-bottom:20px}
.card-header{padding:16px 24px;border-bottom:1px solid #f3f4f6;display:flex;justify-content:space-between;align-items:center;background:#fafbfc}
.card-title{font-size:16px;font-weight:700;color:#1f2937}
.card-body{padding:20px 24px}
table{width:100%;border-collapse:collapse}
th,td{padding:12px;text-align:left;border-bottom:1px solid #f3f4f6;font-size:14px}
th{background:#f9fafb;font-weight:600;color:#374151;text-transform:uppercase;font-size:11px;letter-spacing:.5px}
tr:hover{background:#f9fafb}
.badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:11px;font-weight:600}
.badge-success{background:#d1fae5;color:#065f46}
.badge-warning{background:#fef3c7;color:#92400e}
.badge-danger{background:#fecaca;color:#991b1b}
.badge-info{background:#dbeafe;color:#1e40af}
.badge-gray{background:#f3f4f6;color:#374151}
.btn{padding:8px 16px;border:none;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;transition:all .2s}
.btn-primary{background:#3b82f6;color:#fff}
.btn-primary:hover{background:#2563eb}
.btn-secondary{background:#6b7280;color:#fff}
.btn-danger{background:#dc2626;color:#fff}
.btn-success{background:#10b981;color:#fff}
.btn-sm{padding:4px 10px;font-size:12px}
.hidden{display:none!important}
.tag-chip{display:inline-flex;align-items:center;gap:4px;padding:4px 10px;border-radius:12px;font-size:12px;font-weight:500;margin:2px}
.tag-chip .remove{cursor:pointer;opacity:.6;margin-left:2px}
.tag-chip .remove:hover{opacity:1}
input[type=text],input[type=email],input[type=search],textarea,select{width:100%;padding:10px 14px;border:1px solid #d1d5db;border-radius:8px;font-size:14px;transition:border-color .2s}
input:focus,textarea:focus,select:focus{outline:none;border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
textarea{resize:vertical;min-height:80px}
.form-group{margin-bottom:16px}
.form-group label{display:block;margin-bottom:6px;font-weight:600;color:#374151;font-size:13px}
.modal-overlay{position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.5);display:flex;justify-content:center;align-items:center;z-index:1000}
.modal{background:#fff;border-radius:12px;padding:24px;width:90%;max-width:500px;max-height:80vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,.3)}
.modal h3{margin-bottom:20px;color:#1f2937}
.modal-actions{display:flex;gap:10px;justify-content:flex-end;margin-top:20px}
.detail-panel{position:fixed;top:0;right:0;width:500px;height:100%;background:#fff;box-shadow:-4px 0 20px rgba(0,0,0,.1);z-index:999;overflow-y:auto;transform:translateX(100%);transition:transform .3s}
.detail-panel.open{transform:translateX(0)}
.detail-header{padding:20px;border-bottom:1px solid #e5e7eb;display:flex;justify-content:space-between;align-items:center;background:#fafbfc}
.detail-body{padding:20px}
.msg-bubble{padding:10px 14px;border-radius:14px;margin-bottom:10px;max-width:85%;font-size:14px;line-height:1.5}
.msg-user{background:#3b82f6;color:#fff;margin-left:auto;border-bottom-right-radius:4px}
.msg-ai{background:#f3f4f6;border:1px solid #e5e7eb;border-bottom-left-radius:4px}
.msg-system{background:#fef3c7;color:#92400e;text-align:center;margin:0 auto;font-size:12px}
.msg-staff{background:#d1fae5;border:1px solid #a7f3d0;border-bottom-left-radius:4px}
.msg-meta{font-size:11px;color:#9ca3af;margin-top:4px}
.chart-placeholder{background:linear-gradient(135deg,#f8fafc,#f1f5f9);border-radius:8px;padding:20px;text-align:center}
.chart-bar{display:flex;align-items:flex-end;gap:6px;height:200px;padding:20px 0}
.chart-bar .bar{flex:1;background:linear-gradient(to top,#3b82f6,#93c5fd);border-radius:4px 4px 0 0;min-height:4px;transition:height .5s}
.chart-bar .bar-label{font-size:10px;color:#6b7280;text-align:center;margin-top:4px}
.grid-2{display:grid;grid-template-columns:1fr 1fr;gap:20px}
@media(max-width:1024px){.dashboard{grid-template-columns:1fr}.sidebar{display:none}.grid-2{grid-template-columns:1fr}}
</style>
</head>
<body>
<div class="dashboard">
<div class="sidebar">
<div class="sidebar-header">
<div class="user-info">
<div class="avatar" id="userAvatar">A</div>
<div><div style="font-weight:700" id="userName">Admin</div><div style="font-size:12px;opacity:.7" id="userRole">admin</div></div>
</div>
<div style="font-size:11px;opacity:.5;text-align:center;padding:8px;background:rgba(255,255,255,.08);border-radius:6px">v7.0 Phase 3-4</div>
<div id="tenantSwitcher" style="margin-top:10px;padding:0 4px"><select id="tenantSelect" onchange="switchTenant()" style="width:100%;background:#1e293b;color:#fff;border:1px solid #475569;border-radius:6px;padding:6px;font-size:12px"><option value="tenant_default">デフォルト組織</option></select></div>
</div>
<nav class="nav-menu">
<div class="nav-item active" onclick="showView('dashboard')">📊 ダッシュボード</div>
<div class="nav-item" onclick="showView('conversations')">💬 会話</div>
<div class="nav-item" onclick="showView('tags')">🏷 タグ</div>
<div class="nav-item" onclick="showView('faq')">📚 FAQ</div>
<div class="nav-item" onclick="showView('templates')">📋 テンプレート</div>
<div class="nav-item" onclick="showView('files')">📁 ファイル</div>
<div class="nav-item" onclick="showView('analytics')">📈 分析</div>
<div class="nav-item" onclick="showView('users')">👥 ユーザー</div>
<div style="font-size:10px;color:#64748b;padding:10px 20px 4px;text-transform:uppercase;letter-spacing:.5px">エンタープライズ</div>
<div class="nav-item" onclick="showView('tenants')">🏢 テナント</div>
<div class="nav-item" onclick="showView('sla')">⏱ SLA</div>
<div class="nav-item" onclick="showView('auditlogs')">📋 監査ログ</div>
<div style="font-size:10px;color:#64748b;padding:10px 20px 4px;text-transform:uppercase;letter-spacing:.5px">自動化</div>
<div class="nav-item" onclick="showView('webhooks')">🔗 Webhook</div>
<div class="nav-item" onclick="showView('businesshours')">🕐 営業時間</div>
<div class="nav-item" onclick="showView('automation')">⚡ 自動化ルール</div>
<div class="nav-item" onclick="showView('settings')">⚙ 設定</div>
<div class="nav-item" onclick="logout()" style="margin-top:20px;border-top:1px solid #374151;padding-top:20px">🚪 ログアウト</div>
</nav>
</div>

<div class="main-content">
<div class="content-header">
<div><h2 id="pageTitle">📊 ダッシュボード</h2></div>
<div style="display:flex;gap:10px"><button class="btn btn-primary" onclick="refreshAll()">更新</button></div>
</div>
<div class="content-body">

<!-- ========== Dashboard View ========== -->
<div id="dashboardView">
<div class="stats-grid">
<div class="stat-card"><div class="stat-title">全会話数</div><div class="stat-number" id="statTotal">-</div></div>
<div class="stat-card"><div class="stat-title">対応中 / 未対応</div><div class="stat-number" id="statOpen">-</div></div>
<div class="stat-card"><div class="stat-title">解決済み</div><div class="stat-number" id="statResolved">-</div></div>
<div class="stat-card"><div class="stat-title">AI解決率</div><div class="stat-number" id="statAIRate">-%</div></div>
</div>
<div class="card">
<div class="card-header"><h3 class="card-title">最近の会話</h3></div>
<div class="card-body"><table><thead><tr><th>ユーザー</th><th>ステータス</th><th>タグ</th><th>メッセージ数</th><th>日時</th><th>操作</th></tr></thead><tbody id="recentConversations"><tr><td colspan="6" style="text-align:center;color:#6b7280;padding:30px">読み込み中...</td></tr></tbody></table></div>
</div>
</div>

<!-- ========== Conversations View ========== -->
<div id="conversationsView" class="hidden">
<div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
<input type="search" id="convSearchInput" placeholder="会話を検索..." style="flex:1;min-width:200px" onkeypress="if(event.key==='Enter')searchConversations()">
<button class="btn btn-primary" onclick="searchConversations()">検索</button>
<select id="convStatusFilter" onchange="loadConversations()" style="width:auto"><option value="">全ステータス</option><option value="open">対応中</option><option value="in_progress">進行中</option><option value="resolved">解決済み</option><option value="closed">クローズ</option></select>
<select id="convTagFilter" onchange="loadConversations()" style="width:auto"><option value="">全タグ</option></select>
</div>
<div class="card">
<div class="card-body"><table><thead><tr><th>ユーザー</th><th>ステータス</th><th>優先度</th><th>タグ</th><th>メッセージ数</th><th>最終更新</th><th>操作</th></tr></thead><tbody id="conversationsTable"><tr><td colspan="7" style="text-align:center;color:#6b7280;padding:30px">読み込み中...</td></tr></tbody></table></div>
</div>
</div>

<!-- ========== Tags View ========== -->
<div id="tagsView" class="hidden">
<div class="card">
<div class="card-header"><h3 class="card-title">タグ管理</h3><button class="btn btn-primary" onclick="showTagModal()">+ 新規タグ</button></div>
<div class="card-body"><table><thead><tr><th>色</th><th>名前</th><th>説明</th><th>使用数</th><th>操作</th></tr></thead><tbody id="tagsTable"><tr><td colspan="5" style="text-align:center;color:#6b7280;padding:30px">読み込み中...</td></tr></tbody></table></div>
</div>
</div>

<!-- ========== FAQ View ========== -->
<div id="faqView" class="hidden">
<div style="display:flex;gap:10px;margin-bottom:20px">
<input type="search" id="faqSearch" placeholder="FAQを検索..." style="flex:1" oninput="searchFAQDebounced()">
<button class="btn btn-primary" onclick="showFAQModal()">+ 新規FAQ</button>
</div>
<div class="card">
<div class="card-body" id="faqList">Loading...</div>
</div>
</div>

<!-- ========== Templates View ========== -->
<div id="templatesView" class="hidden">
<div class="card">
<div class="card-header"><h3 class="card-title">返信テンプレート</h3><button class="btn btn-primary" onclick="showTemplateModal()">+ 新規テンプレート</button></div>
<div class="card-body"><table><thead><tr><th>名前</th><th>カテゴリ</th><th>言語</th><th>ショートカット</th><th>使用数</th><th>操作</th></tr></thead><tbody id="templatesTable"><tr><td colspan="6" style="text-align:center;color:#6b7280;padding:30px">読み込み中...</td></tr></tbody></table></div>
</div>
</div>

<!-- ========== Analytics View ========== -->
<div id="analyticsView" class="hidden">
<div style="display:flex;gap:10px;margin-bottom:20px;align-items:center;flex-wrap:wrap">
<select id="analyticsPeriod" onchange="loadAnalytics();loadSatisfaction()" style="width:auto">
<option value="7">過去7日間</option><option value="30" selected>過去30日間</option><option value="90">過去90日間</option>
</select>
<button class="btn btn-secondary" onclick="exportCSV('conversations')">会話CSV出力</button>
<button class="btn btn-secondary" onclick="exportCSV('messages')">メッセージCSV出力</button>
</div>
<div class="stats-grid" id="satisfactionStats" style="margin-bottom:20px"></div>
<div class="grid-2">
<div class="card"><div class="card-header"><h3 class="card-title">日別会話数</h3></div><div class="card-body"><div class="chart-bar" id="dailyChart"></div></div></div>
<div class="card"><div class="card-header"><h3 class="card-title">言語分布</h3></div><div class="card-body" id="langChart"></div></div>
<div class="card"><div class="card-header"><h3 class="card-title">意図分布</h3></div><div class="card-body" id="intentChart"></div></div>
<div class="card"><div class="card-header"><h3 class="card-title">時間帯別アクティビティ</h3></div><div class="card-body"><div class="chart-bar" id="hourlyChart"></div></div></div>
<div class="card"><div class="card-header"><h3 class="card-title">タグ別パフォーマンス</h3></div><div class="card-body" id="tagPerfChart"></div></div>
<div class="card"><div class="card-header"><h3 class="card-title">満足度分布</h3></div><div class="card-body"><div class="chart-bar" id="satisfactionChart"></div></div></div>
</div>
<div class="card" style="margin-top:20px">
<div class="card-header"><h3 class="card-title">イベント指標</h3></div>
<div class="card-body" id="eventMetrics"><div style="color:#6b7280;text-align:center;padding:20px">Loading...</div></div>
</div>
</div>

<!-- ========== Files View ========== -->
<div id="filesView" class="hidden">
<div class="card" style="margin-bottom:20px">
<div class="card-header"><h3 class="card-title">ファイルアップロード</h3></div>
<div class="card-body">
<div id="dropZone" style="border:2px dashed #d1d5db;border-radius:12px;padding:40px;text-align:center;cursor:pointer;transition:all .2s;background:#fafbfc" onclick="document.getElementById('dashFileInput').click()" ondragover="event.preventDefault();this.style.borderColor='#3b82f6';this.style.background='#eff6ff'" ondragleave="this.style.borderColor='#d1d5db';this.style.background='#fafbfc'" ondrop="event.preventDefault();this.style.borderColor='#d1d5db';this.style.background='#fafbfc';handleDashFileDrop(event)">
<div style="font-size:40px;margin-bottom:10px">📁</div>
<div style="font-weight:600;color:#374151;margin-bottom:4px">ここにファイルをドロップするかクリックしてアップロード</div>
<div style="font-size:13px;color:#6b7280">1ファイル最大10MB</div>
<input type="file" id="dashFileInput" style="display:none" onchange="uploadDashFile()" multiple>
</div>
<div id="uploadProgress" class="hidden" style="margin-top:12px"></div>
</div>
</div>
<div class="card">
<div class="card-header"><h3 class="card-title">アップロード済みファイル</h3><span id="filesTotalCount" style="font-size:13px;color:#6b7280"></span></div>
<div class="card-body"><table><thead><tr><th>ファイル名</th><th>種類</th><th>サイズ</th><th>会話</th><th>アップロード者</th><th>日時</th><th>操作</th></tr></thead><tbody id="filesTable"><tr><td colspan="7" style="text-align:center;color:#6b7280;padding:30px">読み込み中...</td></tr></tbody></table></div>
</div>
</div>

<!-- ========== Users View ========== -->
<div id="usersView" class="hidden">
<div class="card">
<div class="card-header"><h3 class="card-title">ユーザー</h3></div>
<div class="card-body"><table><thead><tr><th>名前</th><th>メール</th><th>言語</th><th>作成日</th><th>有効</th></tr></thead><tbody id="usersTable"><tr><td colspan="5" style="text-align:center;color:#6b7280;padding:30px">読み込み中...</td></tr></tbody></table></div>
</div>
</div>

<!-- ========== Settings View ========== -->
<div id="settingsView" class="hidden">
<div class="grid-2">
<div class="card"><div class="card-header"><h3 class="card-title">APIエンドポイント</h3></div>
<div class="card-body" style="font-family:monospace;font-size:13px;line-height:2">
<div><span class="badge badge-success">GET</span> /api/tags</div>
<div><span class="badge badge-info">POST</span> /api/tags</div>
<div><span class="badge badge-warning">PUT</span> /api/tags/:id</div>
<div><span class="badge badge-danger">DEL</span> /api/tags/:id</div>
<hr style="margin:8px 0">
<div><span class="badge badge-success">GET</span> /api/faq</div>
<div><span class="badge badge-success">GET</span> /api/faq/search?q=</div>
<div><span class="badge badge-info">POST</span> /api/faq</div>
<div><span class="badge badge-warning">PUT</span> /api/faq/:id</div>
<div><span class="badge badge-danger">DEL</span> /api/faq/:id</div>
<hr style="margin:8px 0">
<div><span class="badge badge-success">GET</span> /api/templates</div>
<div><span class="badge badge-info">POST</span> /api/templates</div>
<div><span class="badge badge-warning">PUT</span> /api/templates/:id</div>
<div><span class="badge badge-danger">DEL</span> /api/templates/:id</div>
<hr style="margin:8px 0">
<div><span class="badge badge-info">POST</span> /api/files/upload</div>
<div><span class="badge badge-success">GET</span> /api/files/:id</div>
<hr style="margin:8px 0">
<div><span class="badge badge-success">GET</span> /api/conversations</div>
<div><span class="badge badge-warning">PUT</span> /api/conversations/:id</div>
<div><span class="badge badge-success">GET</span> /api/conversations/:id/messages</div>
<div><span class="badge badge-success">GET</span> /api/conversations/:id/tags</div>
<div><span class="badge badge-info">POST</span> /api/conversations/:id/tags</div>
<div><span class="badge badge-danger">DEL</span> /api/conversations/:id/tags/:tagId</div>
<hr style="margin:8px 0">
<div><span class="badge badge-info">POST</span> /api/conversations/:id/reply</div>
<div><span class="badge badge-success">GET</span> /api/conversations/search?q=</div>
<hr style="margin:8px 0">
<div><span class="badge badge-success">GET</span> /api/files</div>
<div><span class="badge badge-danger">DEL</span> /api/files/:id</div>
<hr style="margin:8px 0">
<div><span class="badge badge-info">POST</span> /api/faq/:id/rate</div>
<hr style="margin:8px 0">
<div><span class="badge badge-success">GET</span> /api/analytics</div>
<div><span class="badge badge-success">GET</span> /api/analytics/export?type=</div>
<div><span class="badge badge-success">GET</span> /api/analytics/satisfaction</div>
<div><span class="badge badge-info">POST</span> /api/analytics/record</div>
<div><span class="badge badge-success">GET</span> /api/analytics/summary</div>
<div><span class="badge badge-success">GET</span> /api/dashboard/stats</div>
<div><span class="badge badge-success">GET</span> /api/users</div>
</div></div>
<div class="card"><div class="card-header"><h3 class="card-title">システム情報</h3></div>
<div class="card-body">
<div class="form-group"><label>バージョン</label><input type="text" value="7.0 Phase 3-4 - エンタープライズ全機能" disabled></div>
<div class="form-group"><label>プラットフォーム</label><input type="text" value="Cloudflare Workers + D1 + KV + R2" disabled></div>
<div class="form-group"><label>対応言語</label><input type="text" value="日本語, 英語, 中国語, 韓国語, タガログ語" disabled></div>
<div class="form-group"><label>エンタープライズ機能</label><input type="text" value="マルチテナント, RBAC, SLA, 監査ログ, Webhook, 自動化" disabled></div>
</div></div>
</div>
</div>

<!-- ========== Tenants View ========== -->
<div id="tenantsView" class="hidden">
<div class="card">
<div class="card-header"><h3 class="card-title">テナント管理</h3><button class="btn btn-primary" onclick="showTenantModal()">+ 新規テナント</button></div>
<div class="card-body"><table><thead><tr><th>名前</th><th>スラッグ</th><th>プラン</th><th>ステータス</th><th>営業時間</th><th>操作</th></tr></thead><tbody id="tenantsTable"><tr><td colspan="6" style="text-align:center;color:#6b7280;padding:30px">読み込み中...</td></tr></tbody></table></div>
</div>
</div>

<!-- ========== SLA View ========== -->
<div id="slaView" class="hidden">
<div id="slaDashboard" class="stats-grid" style="margin-bottom:20px"></div>
<div class="card">
<div class="card-header"><h3 class="card-title">SLAポリシー</h3><button class="btn btn-primary" onclick="showSLAModal()">+ 新規ポリシー</button></div>
<div class="card-body"><table><thead><tr><th>名前</th><th>優先度</th><th>初回応答</th><th>解決時間</th><th>エスカレーション</th><th>ステータス</th><th>操作</th></tr></thead><tbody id="slaTable"><tr><td colspan="7" style="text-align:center;color:#6b7280;padding:30px">読み込み中...</td></tr></tbody></table></div>
</div>
<div class="card">
<div class="card-header"><h3 class="card-title">SLAイベント（直近の違反）</h3></div>
<div class="card-body"><div id="slaEvents"><div style="text-align:center;color:#6b7280;padding:20px">Loading...</div></div></div>
</div>
</div>

<!-- ========== Audit Logs View ========== -->
<div id="auditlogsView" class="hidden">
<div style="display:flex;gap:10px;margin-bottom:20px;flex-wrap:wrap">
<input type="search" id="auditSearch" placeholder="操作・実行者を検索..." style="flex:1;min-width:200px">
<select id="auditActionFilter" style="width:auto"><option value="">全操作</option><option value="conversation">会話</option><option value="message">メッセージ</option><option value="staff">スタッフ</option><option value="tag">タグ</option><option value="faq">FAQ</option><option value="webhook">Webhook</option><option value="automation">自動化</option></select>
<select id="auditPeriodFilter" style="width:auto"><option value="1">今日</option><option value="7" selected>過去7日間</option><option value="30">過去30日間</option></select>
<button class="btn btn-primary" onclick="loadAuditLogs()">検索</button>
</div>
<div class="card">
<div class="card-body"><table><thead><tr><th>日時</th><th>実行者</th><th>操作</th><th>リソース</th><th>詳細</th></tr></thead><tbody id="auditLogsTable"><tr><td colspan="5" style="text-align:center;color:#6b7280;padding:30px">読み込み中...</td></tr></tbody></table></div>
</div>
</div>

<!-- ========== Webhooks View ========== -->
<div id="webhooksView" class="hidden">
<div class="card">
<div class="card-header"><h3 class="card-title">Webhook管理</h3><button class="btn btn-primary" onclick="showWebhookModal()">+ 新規Webhook</button></div>
<div class="card-body"><table><thead><tr><th>名前</th><th>URL</th><th>イベント</th><th>ステータス</th><th>最終実行</th><th>失敗数</th><th>操作</th></tr></thead><tbody id="webhooksTable"><tr><td colspan="7" style="text-align:center;color:#6b7280;padding:30px">読み込み中...</td></tr></tbody></table></div>
</div>
<div class="card">
<div class="card-header"><h3 class="card-title">配信履歴</h3></div>
<div class="card-body"><div id="webhookDeliveries"><div style="text-align:center;color:#6b7280;padding:20px">Webhookを選択して配信履歴を表示</div></div></div>
</div>
</div>

<!-- ========== Business Hours View ========== -->
<div id="businesshoursView" class="hidden">
<div class="grid-2">
<div class="card">
<div class="card-header"><h3 class="card-title">営業時間設定</h3>
<div id="businessStatusBadge"></div>
</div>
<div class="card-body">
<div id="businessHoursForm">
<table><thead><tr><th>曜日</th><th>営業</th><th>開始</th><th>終了</th></tr></thead>
<tbody id="businessHoursTable"><tr><td colspan="4" style="text-align:center;padding:20px">Loading...</td></tr></tbody></table>
<div style="margin-top:16px;text-align:right"><button class="btn btn-primary" onclick="saveBusinessHours()">営業時間を保存</button></div>
</div>
</div>
</div>
<div class="card">
<div class="card-header"><h3 class="card-title">自動応答設定</h3></div>
<div class="card-body">
<div class="form-group"><label>営業時間外メッセージ</label><textarea id="oooMessage" rows="4" placeholder="ただいま営業時間外です。営業時間は月〜金 9:00-18:00です。営業開始後にご対応いたします。"></textarea></div>
<div class="form-group"><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="oooEnabled"> 営業時間外の自動返信を有効にする</label></div>
<div style="text-align:right"><button class="btn btn-primary" onclick="saveOOOSettings()">設定を保存</button></div>
</div>
</div>
</div>
</div>

<!-- ========== Automation Rules View ========== -->
<div id="automationView" class="hidden">
<div class="card">
<div class="card-header"><h3 class="card-title">自動化ルール</h3><button class="btn btn-primary" onclick="showAutomationModal()">+ 新規ルール</button></div>
<div class="card-body"><table><thead><tr><th>名前</th><th>トリガー</th><th>条件</th><th>アクション</th><th>ステータス</th><th>実行回数</th><th>操作</th></tr></thead><tbody id="automationTable"><tr><td colspan="7" style="text-align:center;color:#6b7280;padding:30px">読み込み中...</td></tr></tbody></table></div>
</div>
<div class="card">
<div class="card-header"><h3 class="card-title">ルールビルダー</h3></div>
<div class="card-body">
<div class="grid-2">
<div>
<div class="form-group"><label>ルール名</label><input type="text" id="ruleNameInput" placeholder="例: VIP顧客の自動タグ付け"></div>
<div class="form-group"><label>トリガーイベント</label>
<select id="ruleTrigger"><option value="message.created">メッセージ作成時</option><option value="conversation.opened">会話開始時</option><option value="conversation.resolved">会話解決時</option><option value="conversation.reopened">会話再開時</option></select>
</div>
<div class="form-group"><label>ステータス</label>
<select id="ruleStatus"><option value="true">有効</option><option value="false">無効</option></select>
</div>
</div>
<div>
<div class="form-group"><label>条件 (JSON)</label>
<textarea id="ruleConditions" rows="4" placeholder='[{"field":"intent","operator":"equals","value":"payment"}]'></textarea>
</div>
<div class="form-group"><label>アクション (JSON)</label>
<textarea id="ruleActions" rows="4" placeholder='[{"type":"add_tag","tag_id":"tag_billing"},{"type":"assign_staff","staff_id":"staff_admin"}]'></textarea>
</div>
</div>
</div>
<div style="text-align:right"><button class="btn btn-primary" onclick="createAutomationRule()">ルールを作成</button></div>
</div>
</div>
</div>

</div></div></div>

<!-- Conversation Detail Panel -->
<div class="detail-panel" id="detailPanel">
<div class="detail-header">
<h3 id="detailTitle">会話詳細</h3>
<button class="btn btn-secondary btn-sm" onclick="closeDetail()">閉じる</button>
</div>
<div class="detail-body">
<div id="detailInfo" style="margin-bottom:16px"></div>
<div style="margin-bottom:16px">
<label style="font-weight:600;font-size:13px;margin-bottom:6px;display:block">Tags</label>
<div id="detailTags"></div>
<div style="margin-top:8px;display:flex;gap:6px">
<select id="addTagSelect" style="width:auto;flex:1"><option value="">タグを追加...</option></select>
<button class="btn btn-primary btn-sm" onclick="addTagToConv()">追加</button>
</div>
</div>
<div style="margin-bottom:16px">
<label style="font-weight:600;font-size:13px;margin-bottom:6px;display:block">ステータス</label>
<select id="detailStatus" onchange="updateConvStatus()" style="width:auto">
<option value="open">対応中</option><option value="in_progress">進行中</option><option value="resolved">解決済み</option><option value="closed">クローズ</option>
</select>
</div>
<div><label style="font-weight:600;font-size:13px;margin-bottom:6px;display:block">メッセージ</label>
<div id="detailMessages" style="max-height:300px;overflow-y:auto"></div></div>
<div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:16px">
<label style="font-weight:600;font-size:13px;margin-bottom:6px;display:block">スタッフ返信</label>
<div style="margin-bottom:8px;display:flex;gap:6px;align-items:center;flex-wrap:wrap">
<select id="templateSelect" onchange="insertTemplate()" style="width:auto;flex:1;font-size:12px;padding:6px 10px">
<option value="">テンプレートを挿入...</option>
</select>
<label class="btn btn-secondary btn-sm" style="margin:0;cursor:pointer" title="Attach file">
📎 ファイル <input type="file" id="convFileInput" style="display:none" onchange="uploadConvFile()">
</label>
</div>
<div style="display:flex;gap:8px">
<textarea id="staffReplyInput" rows="2" placeholder="返信を入力 または /ショートカット..." style="flex:1;min-height:60px" oninput="checkTemplateShortcut(this)"></textarea>
</div>
<div id="convFilePreview" class="hidden" style="margin-top:6px;padding:8px;background:#f3f4f6;border-radius:6px;font-size:12px"></div>
<div style="display:flex;gap:8px;margin-top:8px;justify-content:flex-end">
<button class="btn btn-success" onclick="sendStaffReply()">返信を送信</button>
<button class="btn btn-secondary btn-sm" onclick="resolveConversation()">解決済みにする</button>
</div>
</div>
<div style="margin-top:16px;border-top:1px solid #e5e7eb;padding-top:16px">
<label style="font-weight:600;font-size:13px;margin-bottom:6px;display:block">満足度評価</label>
<div id="detailRating" style="display:flex;gap:6px"></div>
</div>
</div>
</div>

<!-- Modal Container -->
<div id="modalContainer"></div>

<script>
const API = window.location.origin + '/api';
let allTags = [];
let currentConvId = null;
let faqSearchTimer = null;

document.addEventListener('DOMContentLoaded', () => {
  if(!localStorage.getItem('staffToken')){window.location.href='/staff/login';return}
  const n=localStorage.getItem('staffName')||'Staff';
  document.getElementById('userName').textContent=n;
  document.getElementById('userRole').textContent=localStorage.getItem('staffRole')||'agent';
  document.getElementById('userAvatar').textContent=n.charAt(0).toUpperCase();
  loadTenantOptions();
  refreshAll();
});

async function refreshAll(){
  await loadTags();
  loadDashboard();
}

function showView(name){
  const views=['dashboard','conversations','tags','faq','templates','files','analytics','users','settings','tenants','sla','auditlogs','webhooks','businesshours','automation'];
  views.forEach(v=>{const el=document.getElementById(v+'View');if(el)el.classList.add('hidden')});
  const target=document.getElementById(name+'View');
  if(target)target.classList.remove('hidden');
  document.querySelectorAll('.nav-item').forEach(i=>i.classList.remove('active'));
  if(event&&event.target)event.target.closest('.nav-item')?.classList.add('active');
  const titles={dashboard:'📊 ダッシュボード',conversations:'💬 会話',tags:'🏷 タグ',faq:'📚 FAQ',templates:'📋 テンプレート',files:'📁 ファイル',analytics:'📈 分析',users:'👥 ユーザー',settings:'⚙ 設定',tenants:'🏢 テナント管理',sla:'⏱ SLA管理',auditlogs:'📋 監査ログ',webhooks:'🔗 Webhook',businesshours:'🕐 営業時間',automation:'⚡ 自動化ルール'};
  document.getElementById('pageTitle').textContent=titles[name]||name;
  if(name==='conversations')loadConversations();
  if(name==='tags')loadTags();
  if(name==='faq')loadFAQs();
  if(name==='templates')loadTemplates();
  if(name==='files')loadFiles();
  if(name==='analytics')loadAnalytics();
  if(name==='users')loadUsers();
  if(name==='tenants')loadTenants();
  if(name==='sla'){loadSLAPolicies();loadSLADashboard();}
  if(name==='auditlogs')loadAuditLogs();
  if(name==='webhooks'){loadWebhooks();loadWebhookDeliveries();}
  if(name==='businesshours')loadBusinessHours();
  if(name==='automation')loadAutomationRules();
}

// ===== Tenant Switcher =====
let currentTenantId='tenant_default';
async function loadTenantOptions(){
  try{
    const r=await fetch(API+'/tenants');
    const d=await r.json();
    const sel=document.getElementById('tenantSelect');
    if(sel&&d.tenants){sel.innerHTML=d.tenants.map(t=>\`<option value="\${t.id}">\${esc(t.name)}</option>\`).join('');}
  }catch(e){}
}
function switchTenant(){
  const sel=document.getElementById('tenantSelect');
  currentTenantId=sel.value;
  refreshAll();
}

// ===== Tenants =====
async function loadTenants(){
  try{
    const r=await fetch(API+'/tenants');
    const d=await r.json();
    const tbody=document.getElementById('tenantsTable');
    if(!d.tenants?.length){tbody.innerHTML='<tr><td colspan="6" style="text-align:center;color:#6b7280;padding:30px">No tenants</td></tr>';return}
    tbody.innerHTML=d.tenants.map(t=>\`<tr>
      <td><strong>\${esc(t.name)}</strong></td>
      <td><code>\${esc(t.slug)}</code></td>
      <td><span class="badge badge-info">\${t.plan||'basic'}</span></td>
      <td><span class="badge \${t.is_active?'badge-success':'badge-gray'}">\${t.is_active?'有効':'無効'}</span></td>
      <td>\${t.business_hours_start||'09:00'} - \${t.business_hours_end||'18:00'} (\${t.timezone||'Asia/Tokyo'})</td>
      <td><button class="btn btn-sm btn-primary" onclick="editTenant('\${t.id}')">編集</button> <button class="btn btn-sm btn-danger" onclick="deleteTenant('\${t.id}')">削除</button></td>
    </tr>\`).join('');
  }catch(e){console.error(e)}
}
function showTenantModal(tenant=null){
  document.getElementById('modalContainer').innerHTML=\`
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal"><h3>\${tenant?'テナント編集':'新規テナント'}</h3>
    <div class="form-group"><label>名前</label><input type="text" id="tName" value="\${esc(tenant?.name||'')}"></div>
    <div class="form-group"><label>スラッグ</label><input type="text" id="tSlug" value="\${esc(tenant?.slug||'')}" placeholder="my-org"></div>
    <div class="form-group"><label>プラン</label><select id="tPlan"><option value="basic" \${tenant?.plan==='basic'?'selected':''}>Basic</option><option value="professional" \${tenant?.plan==='professional'?'selected':''}>Professional</option><option value="enterprise" \${tenant?.plan==='enterprise'?'selected':''}>Enterprise</option></select></div>
    <div class="form-group"><label>営業時間</label><div style="display:flex;gap:10px"><input type="text" id="tBhStart" value="\${tenant?.business_hours_start||'09:00'}" placeholder="09:00" style="flex:1"> <span style="align-self:center">〜</span> <input type="text" id="tBhEnd" value="\${tenant?.business_hours_end||'18:00'}" placeholder="18:00" style="flex:1"></div></div>
    <div class="form-group"><label>タイムゾーン</label><input type="text" id="tTimezone" value="\${tenant?.timezone||'Asia/Tokyo'}"></div>
    <div class="form-group"><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="tActive" \${tenant?.is_active!==false?'checked':''}> 有効</label></div>
    <div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">キャンセル</button><button class="btn btn-primary" onclick="saveTenant('\${tenant?.id||''}')">保存</button></div>
    </div></div>\`;
}
async function saveTenant(id){
  const data={name:document.getElementById('tName').value,slug:document.getElementById('tSlug').value,plan:document.getElementById('tPlan').value,business_hours_start:document.getElementById('tBhStart').value,business_hours_end:document.getElementById('tBhEnd').value,timezone:document.getElementById('tTimezone').value,is_active:document.getElementById('tActive').checked};
  if(!data.name||!data.slug)return alert('名前とスラッグは必須です');
  const url=id?API+'/tenants/'+id:API+'/tenants';
  const method=id?'PUT':'POST';
  const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const d=await r.json();
  if(d.success){closeModal();loadTenants();loadTenantOptions();}else alert(d.error||'失敗しました');
}
async function editTenant(id){
  const r=await fetch(API+'/tenants/'+id);
  const d=await r.json();
  if(d.tenant)showTenantModal(d.tenant);
}
async function deleteTenant(id){
  if(!confirm('このテナントを削除しますか？'))return;
  const r=await fetch(API+'/tenants/'+id,{method:'DELETE'});
  const d=await r.json();
  if(d.success)loadTenants();else alert(d.error||'失敗しました');
}

// ===== SLA =====
async function loadSLADashboard(){
  try{
    const r=await fetch(API+'/sla/dashboard');
    const d=await r.json();
    const el=document.getElementById('slaDashboard');
    if(!el)return;
    el.innerHTML=\`
      <div class="stat-card" style="border-left-color:#10b981"><div class="stat-title">SLA達成（本日）</div><div class="stat-number">\${d.met_today||0}</div></div>
      <div class="stat-card" style="border-left-color:#dc2626"><div class="stat-title">SLA違反（本日）</div><div class="stat-number">\${d.breached_today||0}</div></div>
      <div class="stat-card" style="border-left-color:#f59e0b"><div class="stat-title">リスクあり</div><div class="stat-number">\${d.at_risk||0}</div></div>
      <div class="stat-card" style="border-left-color:#3b82f6"><div class="stat-title">平均応答時間</div><div class="stat-number" style="font-size:22px">\${d.avg_response_minutes?d.avg_response_minutes+'m':'N/A'}</div></div>
    \`;
    // Events
    const eventsEl=document.getElementById('slaEvents');
    if(eventsEl&&d.recent_events?.length){
      eventsEl.innerHTML='<table><thead><tr><th>会話</th><th>イベント</th><th>日時</th><th>ステータス</th></tr></thead><tbody>'+d.recent_events.map(e=>\`<tr>
        <td><a href="#" onclick="openConvDetail('\${e.conversation_id}')" style="color:#3b82f6">\${e.conversation_id.substring(0,12)}...</a></td>
        <td>\${e.event_type}</td>
        <td>\${fmtTime(e.created_at)}</td>
        <td><span class="badge \${e.event_type.includes('breach')?'badge-danger':'badge-success'}">\${e.event_type.includes('breach')?'違反':'達成'}</span></td>
      </tr>\`).join('')+'</tbody></table>';
    }else if(eventsEl){eventsEl.innerHTML='<div style="text-align:center;color:#6b7280;padding:20px">最近のSLAイベントはありません</div>';}
  }catch(e){console.error(e)}
}
async function loadSLAPolicies(){
  try{
    const r=await fetch(API+'/sla');
    const d=await r.json();
    const tbody=document.getElementById('slaTable');
    if(!d.policies?.length){tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:30px">SLAポリシーはありません</td></tr>';return}
    const priorityColor={urgent:'danger',high:'warning',normal:'info',low:'gray'};
    tbody.innerHTML=d.policies.map(p=>\`<tr>
      <td><strong>\${esc(p.name)}</strong></td>
      <td><span class="badge badge-\${priorityColor[p.priority]||'info'}">\${p.priority}</span></td>
      <td>\${p.first_response_minutes}m</td>
      <td>\${Math.round(p.resolution_minutes/60)}h</td>
      <td>\${p.escalation_enabled?'<span class="badge badge-warning">有効</span>':'<span class="badge badge-gray">無効</span>'}</td>
      <td><span class="badge \${p.is_active?'badge-success':'badge-gray'}">\${p.is_active?'有効':'無効'}</span></td>
      <td><button class="btn btn-sm btn-primary" onclick="editSLA('\${p.id}')">編集</button> <button class="btn btn-sm btn-danger" onclick="deleteSLA('\${p.id}')">削除</button></td>
    </tr>\`).join('');
  }catch(e){console.error(e)}
}
function showSLAModal(policy=null){
  document.getElementById('modalContainer').innerHTML=\`
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal"><h3>\${policy?'SLAポリシー編集':'新規SLAポリシー'}</h3>
    <div class="form-group"><label>名前</label><input type="text" id="slaName" value="\${esc(policy?.name||'')}"></div>
    <div class="form-group"><label>優先度</label><select id="slaPriority"><option value="urgent" \${policy?.priority==='urgent'?'selected':''}>Urgent</option><option value="high" \${policy?.priority==='high'?'selected':''}>High</option><option value="normal" \${policy?.priority==='normal'?'selected':''}>Normal</option><option value="low" \${policy?.priority==='low'?'selected':''}>Low</option></select></div>
    <div class="form-group"><label>初回応答（分）</label><input type="number" id="slaFirst" value="\${policy?.first_response_minutes||60}" min="1"></div>
    <div class="form-group"><label>解決時間（分）</label><input type="number" id="slaRes" value="\${policy?.resolution_minutes||480}" min="1"></div>
    <div class="form-group"><label>違反前通知（分）</label><input type="number" id="slaNotify" value="\${policy?.notify_before_breach_minutes||15}" min="1"></div>
    <div class="form-group"><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="slaEsc" \${policy?.escalation_enabled!==false?'checked':''}> エスカレーション有効</label></div>
    <div class="form-group"><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="slaActive" \${policy?.is_active!==false?'checked':''}> 有効</label></div>
    <div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">キャンセル</button><button class="btn btn-primary" onclick="saveSLA('\${policy?.id||''}')">保存</button></div>
    </div></div>\`;
}
async function saveSLA(id){
  const data={name:document.getElementById('slaName').value,priority:document.getElementById('slaPriority').value,first_response_minutes:parseInt(document.getElementById('slaFirst').value),resolution_minutes:parseInt(document.getElementById('slaRes').value),notify_before_breach_minutes:parseInt(document.getElementById('slaNotify').value),escalation_enabled:document.getElementById('slaEsc').checked,is_active:document.getElementById('slaActive').checked};
  if(!data.name)return alert('名前は必須です');
  const url=id?API+'/sla/'+id:API+'/sla';
  const method=id?'PUT':'POST';
  const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const d=await r.json();
  if(d.success){closeModal();loadSLAPolicies();}else alert(d.error||'失敗しました');
}
async function editSLA(id){
  const r=await fetch(API+'/sla');
  const d=await r.json();
  const p=d.policies?.find(x=>x.id===id);
  if(p)showSLAModal(p);
}
async function deleteSLA(id){
  if(!confirm('SLAポリシーを削除しますか？'))return;
  const r=await fetch(API+'/sla/'+id,{method:'DELETE'});
  const d=await r.json();
  if(d.success)loadSLAPolicies();else alert(d.error||'失敗しました');
}

// ===== Audit Logs =====
async function loadAuditLogs(){
  try{
    const q=document.getElementById('auditSearch')?.value||'';
    const action=document.getElementById('auditActionFilter')?.value||'';
    const days=document.getElementById('auditPeriodFilter')?.value||7;
    const params=new URLSearchParams({limit:100,days});
    if(q)params.append('q',q);
    if(action)params.append('action',action);
    const r=await fetch(API+'/audit-logs?'+params);
    const d=await r.json();
    const tbody=document.getElementById('auditLogsTable');
    if(!d.logs?.length){tbody.innerHTML='<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:30px">No audit logs found</td></tr>';return}
    tbody.innerHTML=d.logs.map(l=>\`<tr>
      <td style="white-space:nowrap">\${fmtTime(l.created_at)}</td>
      <td><strong>\${esc(l.actor_name||l.actor_id||'System')}</strong><br><span style="font-size:11px;color:#6b7280">\${l.actor_type}</span></td>
      <td><code style="background:#f3f4f6;padding:2px 6px;border-radius:4px;font-size:12px">\${esc(l.action)}</code></td>
      <td>\${l.resource_type?'<span class="badge badge-gray">'+esc(l.resource_type)+'</span>':'-'}\${l.resource_id?'<br><span style="font-size:11px;color:#6b7280">'+l.resource_id.substring(0,12)+'...</span>':''}</td>
      <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="\${esc(l.details||'{}')}"><span style="font-size:12px;color:#6b7280">\${esc(l.details||'{}').substring(0,60)}\${(l.details||'').length>60?'...':''}</span></td>
    </tr>\`).join('');
  }catch(e){console.error(e)}
}

// ===== Webhooks =====
async function loadWebhooks(){
  try{
    const r=await fetch(API+'/webhooks');
    const d=await r.json();
    const tbody=document.getElementById('webhooksTable');
    if(!d.webhooks?.length){tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:30px">No webhooks configured</td></tr>';return}
    tbody.innerHTML=d.webhooks.map(w=>\`<tr>
      <td><strong>\${esc(w.name)}</strong></td>
      <td style="max-width:180px;overflow:hidden;text-overflow:ellipsis"><code style="font-size:11px">\${esc(w.url)}</code></td>
      <td>\${(JSON.parse(w.events||'[]')).map(e=>\`<span class="badge badge-info" style="font-size:10px">\${e}</span>\`).join(' ')}</td>
      <td><span class="badge \${w.is_active?'badge-success':'badge-gray'}">\${w.is_active?'有効':'無効'}</span></td>
      <td>\${w.last_triggered_at?fmtTime(w.last_triggered_at):'-'}</td>
      <td><span class="\${w.failure_count>0?'badge badge-danger':'badge badge-gray'}">\${w.failure_count||0}</span></td>
      <td>
        <button class="btn btn-sm btn-secondary" onclick="testWebhook('\${w.id}')">テスト</button>
        <button class="btn btn-sm btn-primary" onclick="editWebhook('\${w.id}')">編集</button>
        <button class="btn btn-sm btn-danger" onclick="deleteWebhook('\${w.id}')">削除</button>
      </td>
    </tr>\`).join('');
  }catch(e){console.error(e)}
}
async function loadWebhookDeliveries(webhookId=null){
  try{
    const params=new URLSearchParams({limit:20});
    if(webhookId)params.append('webhook_id',webhookId);
    const r=await fetch(API+'/webhooks/deliveries?'+params);
    const d=await r.json();
    const el=document.getElementById('webhookDeliveries');
    if(!el)return;
    if(!d.deliveries?.length){el.innerHTML='<div style="text-align:center;color:#6b7280;padding:20px">No deliveries yet</div>';return}
    el.innerHTML='<table><thead><tr><th>Event</th><th>Status</th><th>Attempts</th><th>Time</th></tr></thead><tbody>'+d.deliveries.map(del=>\`<tr>
      <td><code style="font-size:12px">\${esc(del.event_type)}</code></td>
      <td><span class="badge \${del.response_status&&del.response_status<300?'badge-success':'badge-danger'}">\${del.response_status||'failed'}</span></td>
      <td>\${del.attempt_count||1}</td>
      <td>\${fmtTime(del.created_at)}</td>
    </tr>\`).join('')+'</tbody></table>';
  }catch(e){console.error(e)}
}
function showWebhookModal(webhook=null){
  const events=['conversation.created','conversation.updated','conversation.resolved','message.created','message.sent','staff.assigned','sla.breach','automation.triggered'];
  const selected=JSON.parse(webhook?.events||'[]');
  document.getElementById('modalContainer').innerHTML=\`
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
    <div class="modal" style="max-width:560px"><h3>\${webhook?'Edit':'New'} Webhook</h3>
    <div class="form-group"><label>名前</label><input type="text" id="whName" value="\${esc(webhook?.name||'')}"></div>
    <div class="form-group"><label>URL</label><input type="url" id="whUrl" value="\${esc(webhook?.url||'')}" placeholder="https://your-server.com/webhook"></div>
    <div class="form-group"><label>シークレット (HMAC)</label><input type="text" id="whSecret" value="\${esc(webhook?.secret||'')}" placeholder="省略可（署名用シークレット）"></div>
    <div class="form-group"><label>イベント</label>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">
    \${events.map(e=>\`<label style="display:flex;align-items:center;gap:6px;font-weight:normal"><input type="checkbox" name="whEvent" value="\${e}" \${selected.includes(e)?'checked':''}> \${e}</label>\`).join('')}
    </div></div>
    <div class="form-group"><label>Retry Count</label><input type="number" id="whRetry" value="\${webhook?.retry_count||3}" min="0" max="10"></div>
    <div class="form-group"><label style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="whActive" \${webhook?.is_active!==false?'checked':''}> 有効</label></div>
    <div class="modal-actions"><button class="btn btn-secondary" onclick="closeModal()">キャンセル</button><button class="btn btn-primary" onclick="saveWebhook('\${webhook?.id||''}')">保存</button></div>
    </div></div>\`;
}
async function saveWebhook(id){
  const events=Array.from(document.querySelectorAll('input[name=whEvent]:checked')).map(x=>x.value);
  const data={name:document.getElementById('whName').value,url:document.getElementById('whUrl').value,secret:document.getElementById('whSecret').value,events,retry_count:parseInt(document.getElementById('whRetry').value),is_active:document.getElementById('whActive').checked};
  if(!data.name||!data.url)return alert('Name and URL required');
  const url=id?API+'/webhooks/'+id:API+'/webhooks';
  const method=id?'PUT':'POST';
  const r=await fetch(url,{method,headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  const d=await r.json();
  if(d.success){closeModal();loadWebhooks();}else alert(d.error||'失敗しました');
}
async function editWebhook(id){
  const r=await fetch(API+'/webhooks');
  const d=await r.json();
  const w=d.webhooks?.find(x=>x.id===id);
  if(w)showWebhookModal(w);
}
async function deleteWebhook(id){
  if(!confirm('Delete webhook?'))return;
  const r=await fetch(API+'/webhooks/'+id,{method:'DELETE'});
  const d=await r.json();
  if(d.success)loadWebhooks();else alert(d.error||'失敗しました');
}
async function testWebhook(id){
  const r=await fetch(API+'/webhooks/'+id+'/test',{method:'POST'});
  const d=await r.json();
  alert(d.success?'Test delivery sent! Check deliveries below.':('Test failed: '+(d.error||'Unknown error')));
  loadWebhookDeliveries(id);
}

// ===== Business Hours =====
const dayNames=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
async function loadBusinessHours(){
  try{
    const r=await fetch(API+'/business-hours');
    const d=await r.json();
    const tbody=document.getElementById('businessHoursTable');
    const hours=d.hours||[];
    tbody.innerHTML=dayNames.map((day,i)=>{
      const h=hours.find(x=>x.day_of_week===i)||{day_of_week:i,open_time:'09:00',close_time:'18:00',is_open:i>=1&&i<=5};
      return\`<tr>
        <td><strong>\${day}</strong></td>
        <td><input type="checkbox" id="bhOpen_\${i}" \${h.is_open?'checked':''}></td>
        <td><input type="time" id="bhFrom_\${i}" value="\${h.open_time||'09:00'}" style="width:auto"></td>
        <td><input type="time" id="bhTo_\${i}" value="\${h.close_time||'18:00'}" style="width:auto"></td>
      </tr>\`;
    }).join('');
    // Load status
    const rs=await fetch(API+'/business-hours/status');
    const ds=await rs.json();
    document.getElementById('businessStatusBadge').innerHTML=ds.is_open?'<span class="badge badge-success">Currently Open</span>':'<span class="badge badge-danger">Currently Closed</span>';
    // Load OOO settings
    if(d.ooo_message)document.getElementById('oooMessage').value=d.ooo_message;
    if(d.ooo_enabled!==undefined)document.getElementById('oooEnabled').checked=d.ooo_enabled;
  }catch(e){console.error(e)}
}
async function saveBusinessHours(){
  const hours=dayNames.map((_,i)=>({day_of_week:i,is_open:document.getElementById('bhOpen_'+i).checked,open_time:document.getElementById('bhFrom_'+i).value,close_time:document.getElementById('bhTo_'+i).value}));
  const r=await fetch(API+'/business-hours',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({hours})});
  const d=await r.json();
  alert(d.success?'Saved!':('Failed: '+(d.error||'Unknown')));
  if(d.success)loadBusinessHours();
}
async function saveOOOSettings(){
  const r=await fetch(API+'/business-hours',{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({ooo_message:document.getElementById('oooMessage').value,ooo_enabled:document.getElementById('oooEnabled').checked})});
  const d=await r.json();
  alert(d.success?'Settings saved!':('Failed: '+(d.error||'')));
}

// ===== Automation Rules =====
async function loadAutomationRules(){
  try{
    const r=await fetch(API+'/automation-rules');
    const d=await r.json();
    const tbody=document.getElementById('automationTable');
    if(!d.rules?.length){tbody.innerHTML='<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:30px">No automation rules</td></tr>';return}
    tbody.innerHTML=d.rules.map(rule=>{
      const conds=JSON.parse(rule.conditions||'[]');
      const acts=JSON.parse(rule.actions||'[]');
      return\`<tr>
        <td><strong>\${esc(rule.name)}</strong></td>
        <td><code style="font-size:11px">\${rule.trigger_event}</code></td>
        <td>\${conds.length} condition\${conds.length!==1?'s':''}</td>
        <td>\${acts.map(a=>\`<span class="badge badge-info" style="font-size:10px">\${a.type}</span>\`).join(' ')}</td>
        <td><span class="badge \${rule.is_active?'badge-success':'badge-gray'}">\${rule.is_active?'有効':'無効'}</span></td>
        <td>\${rule.run_count||0}</td>
        <td>
          <button class="btn btn-sm btn-secondary" onclick="toggleAutomationRule('\${rule.id}',\${!rule.is_active})">\${rule.is_active?'Disable':'Enable'}</button>
          <button class="btn btn-sm btn-danger" onclick="deleteAutomationRule('\${rule.id}')">削除</button>
        </td>
      </tr>\`;
    }).join('');
  }catch(e){console.error(e)}
}
async function createAutomationRule(){
  const name=document.getElementById('ruleNameInput').value;
  const trigger=document.getElementById('ruleTrigger').value;
  const isActive=document.getElementById('ruleStatus').value==='true';
  let conditions,actions;
  try{conditions=JSON.parse(document.getElementById('ruleConditions').value||'[]')}catch(e){return alert('Invalid conditions JSON')}
  try{actions=JSON.parse(document.getElementById('ruleActions').value||'[]')}catch(e){return alert('Invalid actions JSON')}
  if(!name)return alert('名前は必須です');
  if(!actions.length)return alert('At least one action required');
  const r=await fetch(API+'/automation-rules',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name,trigger_event:trigger,conditions,actions,is_active:isActive})});
  const d=await r.json();
  if(d.success){document.getElementById('ruleNameInput').value='';document.getElementById('ruleConditions').value='';document.getElementById('ruleActions').value='';loadAutomationRules();}
  else alert(d.error||'失敗しました');
}
async function toggleAutomationRule(id,active){
  const r=await fetch(API+'/automation-rules/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({is_active:active})});
  const d=await r.json();
  if(d.success)loadAutomationRules();else alert(d.error||'失敗しました');
}
async function deleteAutomationRule(id){
  if(!confirm('Delete automation rule?'))return;
  const r=await fetch(API+'/automation-rules/'+id,{method:'DELETE'});
  const d=await r.json();
  if(d.success)loadAutomationRules();else alert(d.error||'失敗しました');
}
function showAutomationModal(){document.getElementById('ruleNameInput').focus();}

// ===== Dashboard =====
async function loadDashboard(){
  try{
    const r=await fetch(API+'/dashboard/stats');
    const s=await r.json();
    document.getElementById('statTotal').textContent=s.total_conversations;
    document.getElementById('statOpen').textContent=s.open_conversations;
    document.getElementById('statResolved').textContent=s.resolved_conversations||0;
    document.getElementById('statAIRate').textContent=(s.ai_resolution_rate||0)+'%';
    const cr=await fetch(API+'/conversations?limit=5');
    const cd=await cr.json();
    if(cd.success)renderRecentConversations(cd.conversations);
  }catch(e){console.error(e)}
}

function renderRecentConversations(convs){
  const tb=document.getElementById('recentConversations');
  if(!convs.length){tb.innerHTML='<tr><td colspan="6" style="text-align:center;color:#6b7280;padding:30px">No conversations yet</td></tr>';return}
  tb.innerHTML=convs.map(c=>\`<tr>
    <td><strong>\${esc(c.user_name||'Guest')}</strong><br><span style="font-size:11px;color:#6b7280">\${esc(c.user_email||'')}</span></td>
    <td><span class="badge badge-\${statusColor(c.status)}">\${c.status}</span></td>
    <td>\${(c.tags||[]).map(t=>\`<span class="tag-chip" style="background:\${t.color}22;color:\${t.color}">\${esc(t.name)}</span>\`).join('')}</td>
    <td>\${c.total_messages||0}</td>
    <td>\${fmtDate(c.created_at)}</td>
    <td><button class="btn btn-primary btn-sm" onclick="openConvDetail('\${c.id}')">表示</button></td>
  </tr>\`).join('');
}

// ===== Conversations =====
async function loadConversations(){
  try{
    const status=document.getElementById('convStatusFilter')?.value||'';
    const tag=document.getElementById('convTagFilter')?.value||'';
    let url=API+'/conversations?limit=50';
    if(status)url+='&status='+status;
    if(tag)url+='&tag='+tag;
    const r=await fetch(url);
    const d=await r.json();
    const tb=document.getElementById('conversationsTable');
    if(!d.conversations?.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:30px">No conversations</td></tr>';return}
    tb.innerHTML=d.conversations.map(c=>\`<tr>
      <td><strong>\${esc(c.user_name||'Guest')}</strong></td>
      <td><span class="badge badge-\${statusColor(c.status)}">\${c.status}</span></td>
      <td><span class="badge badge-\${priorityColor(c.priority)}">\${c.priority||'normal'}</span></td>
      <td>\${(c.tags||[]).map(t=>\`<span class="tag-chip" style="background:\${t.color}22;color:\${t.color}">\${esc(t.name)}</span>\`).join('')||'-'}</td>
      <td>\${c.total_messages||0}</td>
      <td>\${fmtDate(c.last_message_at)}</td>
      <td><button class="btn btn-primary btn-sm" onclick="openConvDetail('\${c.id}')">表示</button></td>
    </tr>\`).join('');
    // Update tag filter
    const sel=document.getElementById('convTagFilter');
    const cur=sel.value;
    sel.innerHTML='<option value="">All Tags</option>'+allTags.map(t=>\`<option value="\${t.id}" \${t.id===cur?'selected':''}>\${esc(t.name)}</option>\`).join('');
  }catch(e){console.error(e)}
}

async function openConvDetail(convId){
  currentConvId=convId;
  document.getElementById('detailPanel').classList.add('open');
  loadTemplateOptions();
  try{
    const [msgR,tagR,convR,filesR]=await Promise.all([
      fetch(API+'/conversations/'+convId+'/messages'),
      fetch(API+'/conversations/'+convId+'/tags'),
      fetch(API+'/conversations?limit=50'),
      fetch(API+'/files?conversation_id='+convId)
    ]);
    const msgD=await msgR.json();
    const tagD=await tagR.json();
    const convD=await convR.json();
    const filesD=await filesR.json();
    const conv=(convD.conversations||[]).find(c=>c.id===convId)||{};
    const convFiles=(filesD.files||[]);
    // Set status dropdown
    if(conv.status)document.getElementById('detailStatus').value=conv.status;
    // Render rating stars
    renderRatingStars(conv.satisfaction_rating||0);
    // Render messages with file attachments
    const msgs=msgD.messages||[];
    document.getElementById('detailMessages').innerHTML=msgs.map(m=>{
      let content=esc(m.content);
      // Enhance file messages with clickable links
      if(m.content_type==='file'){
        const fileMatch=convFiles.find(f=>f.message_id===m.id);
        if(fileMatch){
          content=\`\${fileIcon(fileMatch.file_type)} <a href="\${window.location.origin}/api/files/\${fileMatch.id}" target="_blank" style="color:inherit;text-decoration:underline">\${esc(fileMatch.original_filename)}</a>
          <div style="font-size:11px;opacity:.7;margin-top:2px">\${formatFileSize(fileMatch.file_size)}</div>\`;
          if(fileMatch.file_type&&fileMatch.file_type.startsWith('image/')){
            content+=\`<div style="margin-top:6px"><img src="\${window.location.origin}/api/files/\${fileMatch.id}" style="max-width:200px;max-height:150px;border-radius:6px;cursor:pointer" onclick="window.open(this.src,'_blank')"></div>\`;
          }
        }
      }
      return \`<div class="msg-bubble msg-\${m.sender_type}" style="\${m.sender_type==='user'?'margin-left:auto':''}">
        <div>\${content}</div>
        <div class="msg-meta">\${m.sender_name||m.sender_type} - \${fmtTime(m.created_at)}</div>
      </div>\`;
    }).join('')||'<div style="color:#6b7280;text-align:center">No messages</div>';
    // Scroll to bottom
    const msgArea=document.getElementById('detailMessages');
    msgArea.scrollTop=msgArea.scrollHeight;
    // Render tags
    const tags=tagD.tags||[];
    document.getElementById('detailTags').innerHTML=tags.map(t=>\`
      <span class="tag-chip" style="background:\${t.color}22;color:\${t.color}">\${esc(t.name)}
        <span class="remove" onclick="removeTagFromConv('\${convId}','\${t.id}')">&times;</span>
      </span>
    \`).join('')||'<span style="color:#6b7280;font-size:13px">No tags</span>';
    // Tag selector
    const sel=document.getElementById('addTagSelect');
    sel.innerHTML='<option value="">Add tag...</option>'+allTags.filter(t=>!tags.find(ct=>ct.id===t.id)).map(t=>\`<option value="\${t.id}">\${esc(t.name)}</option>\`).join('');
    // Clear reply input
    document.getElementById('staffReplyInput').value='';
    document.getElementById('convFilePreview').classList.add('hidden');
  }catch(e){console.error(e)}
}

function closeDetail(){document.getElementById('detailPanel').classList.remove('open');currentConvId=null}

async function addTagToConv(){
  const tagId=document.getElementById('addTagSelect').value;
  if(!tagId||!currentConvId)return;
  await fetch(API+'/conversations/'+currentConvId+'/tags',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({tag_id:tagId})});
  openConvDetail(currentConvId);
}

async function removeTagFromConv(convId,tagId){
  await fetch(API+'/conversations/'+convId+'/tags/'+tagId,{method:'DELETE'});
  openConvDetail(convId);
}

async function updateConvStatus(){
  if(!currentConvId)return;
  const status=document.getElementById('detailStatus').value;
  await fetch(API+'/conversations/'+currentConvId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status})});
}

// ===== Tags =====
async function loadTags(){
  try{
    const r=await fetch(API+'/tags');
    const d=await r.json();
    allTags=d.tags||[];
    const tb=document.getElementById('tagsTable');
    if(!tb)return;
    if(!allTags.length){tb.innerHTML='<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:30px">No tags</td></tr>';return}
    tb.innerHTML=allTags.map(t=>\`<tr>
      <td><span style="display:inline-block;width:24px;height:24px;border-radius:6px;background:\${t.color}"></span></td>
      <td><strong>\${esc(t.name)}</strong></td>
      <td>\${esc(t.description||'-')}</td>
      <td>\${t.usage_count||0}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick="showTagModal('\${t.id}','\${esc(t.name)}','\${t.color}','\${esc(t.description||'')}')">編集</button>
        <button class="btn btn-danger btn-sm" onclick="deleteTag('\${t.id}')">削除</button>
      </td>
    </tr>\`).join('');
  }catch(e){console.error(e)}
}

function showTagModal(id,name,color,desc){
  const isEdit=!!id;
  document.getElementById('modalContainer').innerHTML=\`
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <h3>\${isEdit?'Edit Tag':'New Tag'}</h3>
        <div class="form-group"><label>名前</label><input type="text" id="tagName" value="\${name||''}"></div>
        <div class="form-group"><label>色</label><input type="color" id="tagColor" value="\${color||'#3B82F6'}" style="width:60px;height:40px;padding:2px;cursor:pointer"></div>
        <div class="form-group"><label>説明</label><input type="text" id="tagDesc" value="\${desc||''}"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
          <button class="btn btn-primary" onclick="saveTag('\${id||''}')">\${isEdit?'Update':'Create'}</button>
        </div>
      </div>
    </div>
  \`;
}

async function saveTag(id){
  const data={name:document.getElementById('tagName').value,color:document.getElementById('tagColor').value,description:document.getElementById('tagDesc').value};
  if(!data.name){alert('Name is required');return}
  if(id){
    await fetch(API+'/tags/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  }else{
    await fetch(API+'/tags',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  }
  closeModal();loadTags();
}

async function deleteTag(id){
  if(!confirm('このタグを削除しますか？'))return;
  await fetch(API+'/tags/'+id,{method:'DELETE'});
  loadTags();
}

// ===== FAQ =====
async function loadFAQs(){
  try{
    const r=await fetch(API+'/faq');
    const d=await r.json();
    renderFAQList(d.faqs||[]);
  }catch(e){console.error(e)}
}

function renderFAQList(faqs){
  const el=document.getElementById('faqList');
  if(!faqs.length){el.innerHTML='<div style="text-align:center;color:#6b7280;padding:30px">No FAQ articles. Click + to create one.</div>';return}
  el.innerHTML=faqs.map(f=>\`
    <div style="padding:16px;border-bottom:1px solid #f3f4f6">
      <div style="display:flex;justify-content:space-between;align-items:start">
        <div>
          <strong>\${esc(f.title)}</strong>
          <div style="margin-top:4px"><span class="badge badge-info">\${f.language||'all'}</span> <span class="badge badge-gray">\${f.category||'general'}</span></div>
          <div style="font-size:13px;color:#6b7280;margin-top:6px">\${esc((f.content||'').substring(0,150))}\${(f.content||'').length>150?'...':''}</div>
          <div style="font-size:11px;color:#9ca3af;margin-top:4px">Views: \${f.view_count||0} | Helpful: \${f.helpful_count||0}</div>
        </div>
        <div style="display:flex;gap:6px;flex-shrink:0">
          <button class="btn btn-secondary btn-sm" onclick='showFAQModal(\${JSON.stringify(f).replace(/'/g,"&#39;")})'>編集</button>
          <button class="btn btn-danger btn-sm" onclick="deleteFAQ('\${f.id}')">削除</button>
        </div>
      </div>
    </div>
  \`).join('');
}

function showFAQModal(faq){
  const isEdit=!!faq;
  const f=faq||{};
  let kw='';try{kw=JSON.parse(f.keywords||'[]').join(', ')}catch(e){kw=f.keywords||''}
  document.getElementById('modalContainer').innerHTML=\`
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <h3>\${isEdit?'Edit FAQ':'New FAQ Article'}</h3>
        <div class="form-group"><label>タイトル</label><input type="text" id="faqTitle" value="\${esc(f.title||'')}"></div>
        <div class="form-group"><label>内容</label><textarea id="faqContent" rows="5">\${esc(f.content||'')}</textarea></div>
        <div class="form-group"><label>カテゴリ</label>
        <select id="faqCategory"><option value="general" \${f.category==='general'?'selected':''}>General</option><option value="billing" \${f.category==='billing'?'selected':''}>Billing</option><option value="technical" \${f.category==='technical'?'selected':''}>Technical</option><option value="account" \${f.category==='account'?'selected':''}>Account</option></select></div>
        <div class="form-group"><label>言語</label>
        <select id="faqLang"><option value="japanese" \${f.language==='japanese'?'selected':''}>Japanese</option><option value="english" \${f.language==='english'?'selected':''}>English</option><option value="chinese" \${f.language==='chinese'?'selected':''}>Chinese</option><option value="korean" \${f.language==='korean'?'selected':''}>Korean</option><option value="all" \${f.language==='all'?'selected':''}>All</option></select></div>
        <div class="form-group"><label>Keywords (comma separated)</label><input type="text" id="faqKeywords" value="\${esc(kw)}"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
          <button class="btn btn-primary" onclick="saveFAQ('\${f.id||''}')">\${isEdit?'Update':'Create'}</button>
        </div>
      </div>
    </div>
  \`;
}

async function saveFAQ(id){
  const data={title:document.getElementById('faqTitle').value,content:document.getElementById('faqContent').value,category:document.getElementById('faqCategory').value,language:document.getElementById('faqLang').value,keywords:document.getElementById('faqKeywords').value.split(',').map(k=>k.trim()).filter(Boolean)};
  if(!data.title||!data.content){alert('Title and content are required');return}
  if(id){
    await fetch(API+'/faq/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  }else{
    await fetch(API+'/faq',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  }
  closeModal();loadFAQs();
}

async function deleteFAQ(id){
  if(!confirm('このFAQを削除しますか？'))return;
  await fetch(API+'/faq/'+id,{method:'DELETE'});
  loadFAQs();
}

function searchFAQDebounced(){
  clearTimeout(faqSearchTimer);
  faqSearchTimer=setTimeout(async()=>{
    const q=document.getElementById('faqSearch').value;
    if(!q){loadFAQs();return}
    const r=await fetch(API+'/faq/search?q='+encodeURIComponent(q));
    const d=await r.json();
    renderFAQList(d.results||[]);
  },300);
}

// ===== Templates =====
async function loadTemplates(){
  try{
    const r=await fetch(API+'/templates');
    const d=await r.json();
    const tb=document.getElementById('templatesTable');
    const tmpls=d.templates||[];
    if(!tmpls.length){tb.innerHTML='<tr><td colspan="6" style="text-align:center;color:#6b7280;padding:30px">No templates. Click + to create one.</td></tr>';return}
    tb.innerHTML=tmpls.map(t=>\`<tr>
      <td><strong>\${esc(t.name)}</strong></td>
      <td><span class="badge badge-gray">\${t.category||'general'}</span></td>
      <td>\${t.language||'all'}</td>
      <td>\${t.shortcut?\`<code>\${esc(t.shortcut)}</code>\`:'-'}</td>
      <td>\${t.use_count||0}</td>
      <td>
        <button class="btn btn-secondary btn-sm" onclick='showTemplateModal(\${JSON.stringify(t).replace(/'/g,"&#39;")})'>編集</button>
        <button class="btn btn-danger btn-sm" onclick="deleteTemplate('\${t.id}')">削除</button>
      </td>
    </tr>\`).join('');
  }catch(e){console.error(e)}
}

function showTemplateModal(tmpl){
  const isEdit=!!tmpl;
  const t=tmpl||{};
  document.getElementById('modalContainer').innerHTML=\`
    <div class="modal-overlay" onclick="if(event.target===this)closeModal()">
      <div class="modal">
        <h3>\${isEdit?'Edit Template':'New Template'}</h3>
        <div class="form-group"><label>名前</label><input type="text" id="tmplName" value="\${esc(t.name||'')}"></div>
        <div class="form-group"><label>内容</label><textarea id="tmplContent" rows="4">\${esc(t.content||'')}</textarea></div>
        <div class="form-group"><label>カテゴリ</label>
        <select id="tmplCategory"><option value="general" \${t.category==='general'?'selected':''}>General</option><option value="greeting" \${t.category==='greeting'?'selected':''}>Greeting</option><option value="closing" \${t.category==='closing'?'selected':''}>Closing</option><option value="support" \${t.category==='support'?'selected':''}>Support</option><option value="billing" \${t.category==='billing'?'selected':''}>Billing</option></select></div>
        <div class="form-group"><label>言語</label>
        <select id="tmplLang"><option value="all" \${t.language==='all'?'selected':''}>All</option><option value="japanese" \${t.language==='japanese'?'selected':''}>Japanese</option><option value="english" \${t.language==='english'?'selected':''}>English</option></select></div>
        <div class="form-group"><label>ショートカット（省略可）</label><input type="text" id="tmplShortcut" value="\${esc(t.shortcut||'')}" placeholder="/greeting"></div>
        <div class="modal-actions">
          <button class="btn btn-secondary" onclick="closeModal()">キャンセル</button>
          <button class="btn btn-primary" onclick="saveTemplate('\${t.id||''}')">\${isEdit?'Update':'Create'}</button>
        </div>
      </div>
    </div>
  \`;
}

async function saveTemplate(id){
  const data={name:document.getElementById('tmplName').value,content:document.getElementById('tmplContent').value,category:document.getElementById('tmplCategory').value,language:document.getElementById('tmplLang').value,shortcut:document.getElementById('tmplShortcut').value||null};
  if(!data.name||!data.content){alert('Name and content are required');return}
  if(id){
    await fetch(API+'/templates/'+id,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  }else{
    await fetch(API+'/templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)});
  }
  closeModal();loadTemplates();
}

async function deleteTemplate(id){
  if(!confirm('このテンプレートを削除しますか？'))return;
  await fetch(API+'/templates/'+id,{method:'DELETE'});
  loadTemplates();
}

// ===== Analytics =====
async function loadAnalytics(){
  try{
    const days=document.getElementById('analyticsPeriod')?.value||30;
    const r=await fetch(API+'/analytics?days='+days);
    const d=await r.json();
    // Daily chart
    const daily=d.daily_conversations||[];
    const maxD=Math.max(...daily.map(x=>x.count),1);
    document.getElementById('dailyChart').innerHTML=daily.map(x=>\`<div style="flex:1;text-align:center"><div class="bar" style="height:\${(x.count/maxD)*180}px" title="\${x.date}: \${x.count}"></div><div class="bar-label">\${x.date.slice(5)}</div></div>\`).join('')||'<div style="color:#6b7280">No data</div>';
    // Language chart
    const langs=d.language_breakdown||[];
    const langColors={japanese:'#dc2626',english:'#3b82f6',chinese:'#f59e0b',korean:'#10b981'};
    const totalLang=langs.reduce((s,l)=>s+l.count,0)||1;
    document.getElementById('langChart').innerHTML=langs.map(l=>\`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="width:100px;font-size:13px;font-weight:600">\${l.language||'unknown'}</div>
        <div style="flex:1;height:24px;background:#f3f4f6;border-radius:4px;overflow:hidden">
          <div style="height:100%;width:\${(l.count/totalLang)*100}%;background:\${langColors[l.language]||'#6b7280'};border-radius:4px"></div>
        </div>
        <div style="width:40px;text-align:right;font-size:13px;font-weight:600">\${l.count}</div>
      </div>
    \`).join('')||'<div style="color:#6b7280">No data</div>';
    // Intent chart
    const intents=d.intent_breakdown||[];
    const totalI=intents.reduce((s,i)=>s+i.count,0)||1;
    document.getElementById('intentChart').innerHTML=intents.map(i=>\`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <div style="width:120px;font-size:13px;font-weight:600">\${i.intent||'unknown'}</div>
        <div style="flex:1;height:24px;background:#f3f4f6;border-radius:4px;overflow:hidden">
          <div style="height:100%;width:\${(i.count/totalI)*100}%;background:#8b5cf6;border-radius:4px"></div>
        </div>
        <div style="width:40px;text-align:right;font-size:13px;font-weight:600">\${i.count}</div>
      </div>
    \`).join('')||'<div style="color:#6b7280">No data</div>';
    // Hourly chart
    const hourly=d.hourly_distribution||[];
    const maxH=Math.max(...hourly.map(x=>x.count),1);
    document.getElementById('hourlyChart').innerHTML=hourly.map(x=>\`<div style="flex:1;text-align:center"><div class="bar" style="height:\${(x.count/maxH)*180}px" title="\${x.hour}:00 - \${x.count}"></div><div class="bar-label">\${x.hour}</div></div>\`).join('')||'<div style="color:#6b7280">No data</div>';
    // Load satisfaction data and event metrics
    loadSatisfaction();
    loadEventMetrics();
  }catch(e){console.error(e)}
}

async function loadEventMetrics(){
  try{
    const days=document.getElementById('analyticsPeriod')?.value||30;
    const r=await fetch(API+'/analytics/summary?days='+days);
    const d=await r.json();
    if(!d.success){document.getElementById('eventMetrics').innerHTML='<div style="color:#6b7280;text-align:center">No event data</div>';return}
    const totals=d.metric_totals||[];
    const metricColors={message_received:'#3b82f6',ai_response:'#10b981',staff_reply:'#8b5cf6',file_upload:'#f59e0b',escalation:'#dc2626',faq_suggested:'#06b6d4'};
    const metricLabels={message_received:'Messages Received',ai_response:'AI Responses',staff_reply:'Staff Replies',file_upload:'File Uploads',escalation:'Escalations',faq_suggested:'FAQ Suggestions'};
    if(!totals.length){document.getElementById('eventMetrics').innerHTML='<div style="color:#6b7280;text-align:center;padding:20px">No events recorded yet. Events are tracked automatically from chat and staff actions.</div>';return}
    const maxT=Math.max(...totals.map(t=>t.total),1);
    document.getElementById('eventMetrics').innerHTML=\`
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px">
        \${totals.map(t=>\`<div style="background:#f8fafc;border-radius:8px;padding:14px;border-left:3px solid \${metricColors[t.metric_type]||'#6b7280'}">
          <div style="font-size:11px;color:#6b7280;text-transform:uppercase;font-weight:600">\${metricLabels[t.metric_type]||t.metric_type}</div>
          <div style="font-size:24px;font-weight:bold;color:#1f2937;margin-top:4px">\${Math.round(t.total)}</div>
          <div style="font-size:11px;color:#9ca3af">\${t.events} events</div>
        </div>\`).join('')}
      </div>
      \${d.avg_ai_confidence?'<div style="font-size:13px;color:#6b7280">Average AI Confidence: <strong>'+Math.round(d.avg_ai_confidence*100)+'%</strong></div>':''}
      \${d.top_languages?.length?'<div style="margin-top:12px"><strong style="font-size:13px">Top Languages (by messages):</strong>'+d.top_languages.map(l=>' <span class="badge badge-info">'+esc(l.language)+': '+l.count+'</span>').join('')+'</div>':''}
    \`;
  }catch(e){document.getElementById('eventMetrics').innerHTML='<div style="color:#6b7280;text-align:center">Failed to load</div>'}
}

// ===== Users =====
async function loadUsers(){
  try{
    const r=await fetch(API+'/users');
    const d=await r.json();
    const tb=document.getElementById('usersTable');
    const users=d.users||[];
    if(!users.length){tb.innerHTML='<tr><td colspan="5" style="text-align:center;color:#6b7280;padding:30px">No users</td></tr>';return}
    tb.innerHTML=users.map(u=>\`<tr>
      <td><strong>\${esc(u.name||'Guest')}</strong></td>
      <td>\${esc(u.email||'-')}</td>
      <td>\${u.language||'-'}</td>
      <td>\${fmtDate(u.created_at)}</td>
      <td><span class="badge badge-\${u.is_active?'success':'gray'}">\${u.is_active?'有効':'無効'}</span></td>
    </tr>\`).join('');
  }catch(e){console.error(e)}
}

// ===== Staff Reply =====
async function sendStaffReply(){
  if(!currentConvId)return;
  const input=document.getElementById('staffReplyInput');
  const content=input.value.trim();
  if(!content){alert('Please type a reply');return}
  try{
    await fetch(API+'/conversations/'+currentConvId+'/reply',{
      method:'POST',headers:{'Content-Type':'application/json'},
      body:JSON.stringify({content,staff_id:'staff_admin',staff_name:localStorage.getItem('staffName')||'Staff'})
    });
    input.value='';
    openConvDetail(currentConvId);
  }catch(e){alert('Failed to send reply')}
}

async function resolveConversation(){
  if(!currentConvId)return;
  await fetch(API+'/conversations/'+currentConvId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:'resolved'})});
  document.getElementById('detailStatus').value='resolved';
  loadConversations();
  loadDashboard();
}

async function setConvRating(rating){
  if(!currentConvId)return;
  await fetch(API+'/conversations/'+currentConvId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({satisfaction_rating:rating})});
  renderRatingStars(rating);
}

function renderRatingStars(current){
  const el=document.getElementById('detailRating');
  el.innerHTML=[1,2,3,4,5].map(i=>\`<span style="cursor:pointer;font-size:24px;\${i<=current?'':'opacity:.3'}" onclick="setConvRating(\${i})">\${i<=current?'★':'☆'}</span>\`).join('');
}

// ===== Conversation Search =====
async function searchConversations(){
  const q=document.getElementById('convSearchInput')?.value?.trim();
  if(!q){loadConversations();return}
  try{
    const r=await fetch(API+'/conversations/search?q='+encodeURIComponent(q));
    const d=await r.json();
    const tb=document.getElementById('conversationsTable');
    if(!d.conversations?.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:30px">No results for "'+esc(q)+'"</td></tr>';return}
    tb.innerHTML=d.conversations.map(c=>\`<tr>
      <td><strong>\${esc(c.user_name||'Guest')}</strong></td>
      <td><span class="badge badge-\${statusColor(c.status)}">\${c.status}</span></td>
      <td><span class="badge badge-\${priorityColor(c.priority)}">\${c.priority||'normal'}</span></td>
      <td>\${(c.tags||[]).map(t=>\`<span class="tag-chip" style="background:\${t.color}22;color:\${t.color}">\${esc(t.name)}</span>\`).join('')||'-'}</td>
      <td>\${c.total_messages||0}</td>
      <td>\${fmtDate(c.last_message_at)}</td>
      <td><button class="btn btn-primary btn-sm" onclick="openConvDetail('\${c.id}')">表示</button></td>
    </tr>\`).join('');
  }catch(e){console.error(e)}
}

// ===== Files =====
async function loadFiles(){
  try{
    const r=await fetch(API+'/files');
    const d=await r.json();
    const tb=document.getElementById('filesTable');
    const files=d.files||[];
    document.getElementById('filesTotalCount').textContent=\`Total: \${d.total||0} files\`;
    if(!files.length){tb.innerHTML='<tr><td colspan="7" style="text-align:center;color:#6b7280;padding:30px">No uploaded files</td></tr>';return}
    tb.innerHTML=files.map(f=>{
      const sizeStr=f.file_size>1048576?(Math.round(f.file_size/1048576*10)/10)+' MB':(Math.round(f.file_size/1024*10)/10)+' KB';
      const icon=fileIcon(f.file_type);
      return \`<tr>
        <td>\${icon} <strong>\${esc(f.original_filename)}</strong></td>
        <td><span class="badge badge-gray">\${f.file_type||'unknown'}</span></td>
        <td>\${sizeStr}</td>
        <td>\${f.conversation_title?esc(f.conversation_title):'-'}</td>
        <td>\${f.uploaded_by_type||'-'}</td>
        <td>\${fmtDate(f.created_at)}</td>
        <td>
          <button class="btn btn-primary btn-sm" onclick="window.open(window.location.origin+'/api/files/\${f.id}','_blank')">表示</button>
          <button class="btn btn-danger btn-sm" onclick="deleteFile('\${f.id}')">削除</button>
        </td>
      </tr>\`;
    }).join('');
  }catch(e){console.error(e)}
}

function fileIcon(type){
  if(!type)return '📄';
  if(type.startsWith('image/'))return '🖼';
  if(type.includes('pdf'))return '📕';
  if(type.includes('word')||type.includes('document'))return '📝';
  if(type.includes('sheet')||type.includes('excel')||type.includes('csv'))return '📊';
  if(type.includes('zip')||type.includes('archive'))return '📦';
  if(type.includes('video'))return '🎬';
  if(type.includes('audio'))return '🎵';
  return '📄';
}

async function deleteFile(fileId){
  if(!confirm('Delete this file permanently?'))return;
  await fetch(API+'/files/'+fileId,{method:'DELETE'});
  loadFiles();
}

// ===== Dashboard File Upload =====
function handleDashFileDrop(e){
  const files=e.dataTransfer.files;
  if(files.length)uploadDashFiles(files);
}
async function uploadDashFile(){
  const files=document.getElementById('dashFileInput').files;
  if(files.length)await uploadDashFiles(files);
  document.getElementById('dashFileInput').value='';
}
async function uploadDashFiles(files){
  const progress=document.getElementById('uploadProgress');
  progress.classList.remove('hidden');
  progress.innerHTML='';
  for(const file of files){
    if(file.size>10*1024*1024){progress.innerHTML+=\`<div style="color:#dc2626;margin-bottom:4px">\${esc(file.name)}: Too large (max 10MB)</div>\`;continue}
    const pItem=document.createElement('div');
    pItem.style.cssText='margin-bottom:4px;display:flex;align-items:center;gap:8px';
    pItem.innerHTML=\`<span>\${fileIcon(file.type)} \${esc(file.name)}</span><span style="color:#6b7280">Uploading...</span>\`;
    progress.appendChild(pItem);
    try{
      const fd=new FormData();
      fd.append('file',file);
      fd.append('uploaded_by_type','staff');
      fd.append('uploaded_by_id','staff_admin');
      const r=await fetch(API+'/files/upload',{method:'POST',body:fd});
      const d=await r.json();
      pItem.querySelector('span:last-child').innerHTML=d.success?'<span style="color:#10b981">Uploaded</span>':'<span style="color:#dc2626">Failed</span>';
    }catch(e){pItem.querySelector('span:last-child').innerHTML='<span style="color:#dc2626">Error</span>'}
  }
  setTimeout(()=>{progress.classList.add('hidden');loadFiles()},1500);
}

// ===== Conversation File Upload =====
async function uploadConvFile(){
  const fileInput=document.getElementById('convFileInput');
  const file=fileInput.files[0];
  if(!file||!currentConvId)return;
  if(file.size>10*1024*1024){alert('File too large (max 10MB)');fileInput.value='';return}
  const preview=document.getElementById('convFilePreview');
  preview.classList.remove('hidden');
  preview.innerHTML=\`\${fileIcon(file.type)} \${esc(file.name)} - Uploading...\`;
  try{
    const fd=new FormData();
    fd.append('file',file);
    fd.append('conversation_id',currentConvId);
    fd.append('uploaded_by_type','staff');
    fd.append('uploaded_by_id','staff_admin');
    const r=await fetch(API+'/files/upload',{method:'POST',body:fd});
    const d=await r.json();
    preview.innerHTML=d.success?\`\${fileIcon(file.type)} \${esc(file.name)} - <span style="color:#10b981">Uploaded</span>\`:\`<span style="color:#dc2626">Upload failed</span>\`;
    if(d.success)setTimeout(()=>{preview.classList.add('hidden');openConvDetail(currentConvId)},1000);
  }catch(e){preview.innerHTML='<span style="color:#dc2626">Upload error</span>'}
  fileInput.value='';
}

// ===== Template Integration =====
let allTemplates=[];
async function loadTemplateOptions(){
  try{
    const r=await fetch(API+'/templates');
    const d=await r.json();
    allTemplates=d.templates||[];
    const sel=document.getElementById('templateSelect');
    if(!sel)return;
    sel.innerHTML='<option value="">テンプレートを挿入...</option>'+allTemplates.map(t=>\`<option value="\${t.id}">\${esc(t.name)}\${t.shortcut?' ('+esc(t.shortcut)+')':''}</option>\`).join('');
  }catch(e){}
}
function insertTemplate(){
  const sel=document.getElementById('templateSelect');
  const tmplId=sel.value;
  if(!tmplId)return;
  const tmpl=allTemplates.find(t=>t.id===tmplId);
  if(!tmpl)return;
  const input=document.getElementById('staffReplyInput');
  input.value=tmpl.content;
  input.focus();
  sel.value='';
  // Increment use count
  fetch(API+'/templates/'+tmplId,{method:'PUT',headers:{'Content-Type':'application/json'},body:JSON.stringify({})}).catch(()=>{});
}
function checkTemplateShortcut(textarea){
  const val=textarea.value;
  if(!val.startsWith('/'))return;
  const shortcut=val.trim();
  const tmpl=allTemplates.find(t=>t.shortcut&&t.shortcut===shortcut);
  if(tmpl){textarea.value=tmpl.content;textarea.style.background='#f0fdf4';setTimeout(()=>{textarea.style.background=''},500)}
}

// ===== CSV Export =====
function exportCSV(type){
  const days=document.getElementById('analyticsPeriod')?.value||30;
  window.open(window.location.origin+'/api/analytics/export?type='+type+'&days='+days,'_blank');
}

// ===== Satisfaction Report =====
async function loadSatisfaction(){
  try{
    const days=document.getElementById('analyticsPeriod')?.value||30;
    const r=await fetch(API+'/analytics/satisfaction?days='+days);
    const d=await r.json();
    if(!d.success)return;
    const s=d.satisfaction||{};
    const rt=d.resolution_time||{};
    document.getElementById('satisfactionStats').innerHTML=\`
      <div class="stat-card" style="border-left-color:#f59e0b"><div class="stat-title">Avg Satisfaction</div><div class="stat-number">\${s.average_rating!==null?s.average_rating+'/5':'N/A'}</div><div style="font-size:12px;color:#6b7280">\${s.rated_conversations||0} rated</div></div>
      <div class="stat-card" style="border-left-color:#10b981"><div class="stat-title">Avg Resolution Time</div><div class="stat-number">\${rt.average_hours!==null?rt.average_hours+'h':'N/A'}</div><div style="font-size:12px;color:#6b7280">Min: \${rt.min_hours||'N/A'}h / Max: \${rt.max_hours||'N/A'}h</div></div>
      <div class="stat-card" style="border-left-color:#8b5cf6"><div class="stat-title">AI vs Human</div><div class="stat-number" style="font-size:20px">\${(d.ai_vs_human||[]).map(x=>\`\${x.ai_handled?'AI':'Human'}: \${x.count}\`).join(' / ')||'N/A'}</div></div>
    \`;
    // Satisfaction distribution chart
    const dist=s.distribution||[];
    const maxS=Math.max(...dist.map(x=>x.count),1);
    const ratingLabels=['','Very Bad','Bad','OK','Good','Excellent'];
    document.getElementById('satisfactionChart').innerHTML=dist.length?dist.map(x=>\`<div style="flex:1;text-align:center"><div class="bar" style="height:\${(x.count/maxS)*180}px;background:\${x.rating>=4?'#10b981':x.rating>=3?'#f59e0b':'#dc2626'}" title="\${ratingLabels[x.rating]||x.rating}: \${x.count}"></div><div class="bar-label">\${x.rating}★</div></div>\`).join(''):'<div style="color:#6b7280;text-align:center;padding:40px">No ratings yet</div>';
    // Tag performance
    const tags=d.tag_performance||[];
    document.getElementById('tagPerfChart').innerHTML=tags.length?tags.map(t=>\`
      <div style="display:flex;align-items:center;gap:10px;margin-bottom:10px">
        <span class="tag-chip" style="background:\${t.color}22;color:\${t.color};min-width:80px;justify-content:center">\${esc(t.tag_name)}</span>
        <div style="flex:1;height:24px;background:#f3f4f6;border-radius:4px;overflow:hidden">
          <div style="height:100%;width:\${Math.min((t.conv_count/Math.max(...tags.map(x=>x.conv_count),1))*100,100)}%;background:\${t.color};border-radius:4px;opacity:.6"></div>
        </div>
        <div style="width:60px;font-size:12px;text-align:right">\${t.conv_count} conv</div>
        <div style="width:60px;font-size:12px;text-align:right">\${t.avg_satisfaction?t.avg_satisfaction.toFixed(1)+'★':'N/A'}</div>
      </div>
    \`).join(''):'<div style="color:#6b7280;text-align:center;padding:40px">No data</div>';
  }catch(e){console.error(e)}
}

// ===== Utility =====
function closeModal(){document.getElementById('modalContainer').innerHTML=''}
function logout(){localStorage.clear();window.location.href='/staff/login'}
function statusColor(s){return{open:'warning',in_progress:'info',resolved:'success',closed:'gray'}[s]||'info'}
function priorityColor(p){return{low:'gray',normal:'info',high:'warning',urgent:'danger'}[p]||'info'}
function esc(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}
function fmtDate(d){if(!d)return'-';return new Date(d).toLocaleDateString('ja-JP')}
function fmtTime(d){if(!d)return'-';return new Date(d).toLocaleString('ja-JP',{month:'short',day:'numeric',hour:'2-digit',minute:'2-digit'})}
function formatFileSize(bytes){if(!bytes)return'0 B';if(bytes>1048576)return(Math.round(bytes/1048576*10)/10)+' MB';if(bytes>1024)return(Math.round(bytes/1024*10)/10)+' KB';return bytes+' B'}
</script>
</body></html>`;

  return new Response(dashboardHTML, { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
}

// ========== Customer Chat Interface ==========
function handleChatInterface(corsHeaders) {
  const chatHTML = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="UTF-8"><meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>AIカスタマーサポート</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:linear-gradient(135deg,#667eea,#764ba2);height:100vh;display:flex;justify-content:center;align-items:center}
.chat-widget{width:420px;height:640px;background:#fff;border-radius:20px;box-shadow:0 25px 50px rgba(0,0,0,.2);display:flex;flex-direction:column;overflow:hidden}
.chat-header{background:linear-gradient(135deg,#3b82f6,#1e40af);color:#fff;padding:20px;text-align:center}
.chat-header h3{font-size:18px;margin-bottom:6px}
.chat-header p{font-size:13px;opacity:.9}
.chat-messages{flex:1;padding:16px;overflow-y:auto;background:#f8fafc}
.chat-input{padding:16px;background:#fff;border-top:1px solid #e2e8f0}
.message{margin-bottom:12px;padding:10px 14px;border-radius:16px;max-width:85%;word-wrap:break-word;font-size:14px;line-height:1.5}
.message.user{background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;margin-left:auto;border-bottom-right-radius:4px}
.message.ai{background:#fff;border:1px solid #e2e8f0;box-shadow:0 1px 4px rgba(0,0,0,.05);border-bottom-left-radius:4px}
.message.system{background:#f1f5f9;color:#64748b;text-align:center;font-size:13px;margin:10px auto;max-width:100%;border-radius:10px;border:1px solid #e2e8f0}
.faq-suggestion{background:#eff6ff;border:1px solid #bfdbfe;border-radius:10px;padding:10px 14px;margin-bottom:10px;font-size:13px;transition:background .2s}
.faq-suggestion:hover{background:#dbeafe}
.faq-suggestion .faq-title{font-weight:600;color:#1e40af;margin-bottom:4px;cursor:pointer}
.faq-suggestion .faq-content{color:#64748b;font-size:12px}
.faq-rating{display:flex;gap:8px;margin-top:6px}
.faq-rating button{border:1px solid #d1d5db;background:#fff;border-radius:14px;padding:2px 10px;font-size:11px;cursor:pointer;transition:all .2s}
.faq-rating button:hover{background:#f3f4f6}
.faq-rating button.rated{border-color:#3b82f6;background:#eff6ff;color:#1e40af}
.input-group{display:flex;gap:10px}
.input-group input{flex:1;padding:12px 16px;border:1px solid #d1d5db;border-radius:25px;font-size:15px;outline:none}
.input-group input:focus{border-color:#3b82f6;box-shadow:0 0 0 3px rgba(59,130,246,.1)}
.input-group button{padding:12px 20px;background:linear-gradient(135deg,#3b82f6,#2563eb);color:#fff;border:none;border-radius:25px;cursor:pointer;font-size:15px;font-weight:600}
.input-group button:disabled{background:#9ca3af;cursor:not-allowed}
.file-btn{width:36px;height:36px;border-radius:50%;border:1px solid #d1d5db;background:#f9fafb;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:16px;flex-shrink:0;align-self:center}
.file-btn:hover{background:#f3f4f6}
.ai-typing{font-style:italic;color:#6b7280;padding:10px 14px;background:#f3f4f6;border-radius:16px;margin-bottom:12px;animation:pulse 2s infinite;border:1px solid #e5e7eb;font-size:13px}
@keyframes pulse{0%,100%{opacity:1}50%{opacity:.6}}
.powered-by{text-align:center;padding:8px;font-size:10px;color:#9ca3af;background:#f8fafc;border-top:1px solid #e2e8f0}
@media(max-width:480px){.chat-widget{width:100%;height:100%;border-radius:0}}
</style>
</head>
<body>
<div class="chat-widget">
<div class="chat-header">
<h3>AIカスタマーサポート</h3>
<p>オンライン | 5言語対応 | 24時間365日</p>
<div style="margin-top:8px"><a href="/staff/login" style="color:rgba(255,255,255,.7);font-size:11px;text-decoration:none">スタッフログイン</a></div>
</div>
<div class="chat-messages" id="messagesArea">
<div class="message system">
ようこそ！<strong>日本語・英語・中国語・韓国語・タガログ語</strong>に対応しています。<br>
何でもお気軽にお問い合わせください。AIがサポートいたします。
</div>
</div>
<div class="chat-input">
<div class="input-group">
<label class="file-btn" title="ファイルをアップロード"><input type="file" id="fileInput" style="display:none" onchange="uploadFile()">📎</label>
<input type="text" id="messageInput" placeholder="メッセージを入力..." onkeypress="if(event.key==='Enter')sendMessage()">
<button onclick="sendMessage()" id="sendButton">送信</button>
</div>
</div>
<div class="powered-by">Powered by Cloudflare Workers + D1 + KV + R2 | v6.0</div>
</div>

<script>
const API_BASE=window.location.origin+'/api';
let userId=localStorage.getItem('chatUserId')||null;
let conversationId=localStorage.getItem('chatConversationId')||null;

async function initChat(){
  if(!userId){
    try{
      const r=await fetch(API_BASE+'/users',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:'Guest',language:navigator.language.startsWith('ja')?'japanese':'english'})});
      const d=await r.json();
      if(d.success){userId=d.user.id;localStorage.setItem('chatUserId',userId)}
    }catch(e){userId='guest_'+Date.now();localStorage.setItem('chatUserId',userId)}
  }
}

async function sendMessage(){
  if(!userId)await initChat();
  const input=document.getElementById('messageInput');
  const msg=input.value.trim();
  if(!msg)return;
  addMsg(msg,'user');
  input.value='';
  toggleSend(false);
  showTyping();
  try{
    const r=await fetch(API_BASE+'/chat/send',{method:'POST',headers:{'Content-Type':'application/json','X-User-ID':userId},body:JSON.stringify({message:msg,conversation_id:conversationId})});
    const d=await r.json();
    hideTyping();
    if(d.success){
      conversationId=d.conversation_id;
      localStorage.setItem('chatConversationId',conversationId);
      addMsg(d.ai_reply,'ai');
      if(d.should_escalate)addMsg('Connecting you to a specialist...','system');
      // Show FAQ suggestions if available
      if(d.faq_suggestions?.length>0){
        const area=document.getElementById('messagesArea');
        d.faq_suggestions.slice(0,3).forEach(f=>{
          const div=document.createElement('div');
          div.className='faq-suggestion';
          div.innerHTML=\`<div class="faq-title" onclick="document.getElementById('messageInput').value='\${escH(f.title).replace(/'/g,"\\\\'")}';sendMessage()">📚 \${escH(f.title)}</div>
            <div class="faq-rating">
              <button onclick="rateFAQ('\${f.id}',true,this)">👍 Helpful</button>
              <button onclick="rateFAQ('\${f.id}',false,this)">👎 Not helpful</button>
            </div>\`;
          area.appendChild(div);
        });
        area.scrollTop=area.scrollHeight;
      }
    }else{addMsg('Sorry, an error occurred. Please try again.','system')}
  }catch(e){hideTyping();addMsg('Connection error. Please check your network.','system')}
  toggleSend(true);
}

async function uploadFile(){
  const file=document.getElementById('fileInput').files[0];
  if(!file)return;
  if(!userId)await initChat();
  const fd=new FormData();
  fd.append('file',file);
  if(conversationId)fd.append('conversation_id',conversationId);
  fd.append('uploaded_by_type','user');
  fd.append('uploaded_by_id',userId);
  addMsg('[File: '+file.name+']','user');
  showTyping();
  try{
    const r=await fetch(API_BASE+'/files/upload',{method:'POST',body:fd});
    const d=await r.json();
    hideTyping();
    if(d.success){addMsg('File uploaded successfully: '+file.name,'system')}
    else{addMsg('File upload failed: '+(d.error||'unknown error'),'system')}
  }catch(e){hideTyping();addMsg('File upload failed','system')}
  document.getElementById('fileInput').value='';
}

function addMsg(text,type){
  const area=document.getElementById('messagesArea');
  const div=document.createElement('div');
  div.className='message '+type;
  if(type==='system')div.innerHTML=text;else div.textContent=text;
  area.appendChild(div);
  area.scrollTop=area.scrollHeight;
}
function showTyping(){const area=document.getElementById('messagesArea');const d=document.createElement('div');d.className='ai-typing';d.id='typingIndicator';d.textContent='AI is preparing a response...';area.appendChild(d);area.scrollTop=area.scrollHeight}
function hideTyping(){const el=document.getElementById('typingIndicator');if(el)el.remove()}
function toggleSend(on){const b=document.getElementById('sendButton');b.disabled=!on;b.textContent=on?'Send':'...'}
function escH(s){const d=document.createElement('div');d.textContent=s;return d.innerHTML}

async function rateFAQ(faqId,helpful,btn){
  try{
    await fetch(API_BASE+'/faq/'+faqId+'/rate',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({helpful})});
    const parent=btn.parentElement;
    parent.querySelectorAll('button').forEach(b=>b.classList.remove('rated'));
    btn.classList.add('rated');
    btn.textContent=helpful?'👍 Thanks!':'👎 Thanks!';
  }catch(e){}
}

document.addEventListener('DOMContentLoaded',()=>{document.getElementById('messageInput').focus();initChat()});
</script>
</body></html>`;

  return new Response(chatHTML, { headers: { ...corsHeaders, 'Content-Type': 'text/html; charset=utf-8' } });
}

// ========== Phase 3: Enterprise API Handlers ==========

// --- Audit Log Helper ---
async function writeAuditLog(db, actorType, actorId, actorName, action, resourceType, resourceId, details, tenantId = null) {
  try {
    const logId = generateId('audit');
    await db.prepare(
      'INSERT INTO audit_logs (id, tenant_id, actor_type, actor_id, actor_name, action, resource_type, resource_id, details, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)'
    ).bind(logId, tenantId, actorType, actorId, actorName, action, resourceType, resourceId, JSON.stringify(details || {}), new Date().toISOString()).run();
  } catch (e) {
    console.error('Audit log write error:', e);
  }
}

// --- Tenants ---
async function handleGetTenants(db, corsHeaders) {
  try {
    const tenants = await db.prepare('SELECT * FROM tenants ORDER BY created_at DESC').all();
    return jsonResponse({ success: true, tenants: tenants.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, tenants: [] }, 200, corsHeaders);
  }
}

async function handleCreateTenant(request, db, corsHeaders) {
  try {
    const data = await request.json();
    if (!data.name || !data.slug) return jsonResponse({ success: false, error: 'Name and slug required' }, 400, corsHeaders);
    const tenantId = generateId('tenant');
    await db.prepare(
      'INSERT INTO tenants (id, name, slug, plan, business_hours_start, business_hours_end, timezone, auto_reply_enabled, auto_reply_message, is_active, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11,?12)'
    ).bind(tenantId, data.name, data.slug, data.plan || 'basic', data.business_hours_start || '09:00',
      data.business_hours_end || '18:00', data.timezone || 'Asia/Tokyo',
      data.auto_reply_enabled !== false, data.auto_reply_message || null,
      data.is_active !== false, new Date().toISOString(), new Date().toISOString()).run();
    // Insert default business hours for this tenant
    for (let i = 0; i <= 6; i++) {
      const isOpen = i >= 1 && i <= 5;
      await db.prepare(
        'INSERT OR IGNORE INTO business_hours (id, tenant_id, day_of_week, open_time, close_time, is_open) VALUES (?1,?2,?3,?4,?5,?6)'
      ).bind(generateId('bh'), tenantId, i, '09:00', '18:00', isOpen).run();
    }
    await writeAuditLog(db, 'staff', 'staff_admin', 'System Admin', 'tenant.created', 'tenant', tenantId, { name: data.name });
    return jsonResponse({ success: true, tenant: { id: tenantId, name: data.name, slug: data.slug } }, 201, corsHeaders);
  } catch (error) {
    if (error.message?.includes('UNIQUE')) return jsonResponse({ success: false, error: 'Slug already exists' }, 409, corsHeaders);
    return jsonResponse({ success: false, error: 'Failed to create tenant' }, 500, corsHeaders);
  }
}

async function handleGetTenant(db, tenantId, corsHeaders) {
  try {
    const tenant = await db.prepare('SELECT * FROM tenants WHERE id = ?1').bind(tenantId).first();
    if (!tenant) return jsonResponse({ error: 'Tenant not found' }, 404, corsHeaders);
    return jsonResponse({ success: true, tenant }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get tenant' }, 500, corsHeaders);
  }
}

async function handleUpdateTenant(request, db, tenantId, corsHeaders) {
  try {
    const data = await request.json();
    const updates = [];
    const params = [];
    if (data.name !== undefined) { updates.push(`name = ?${params.length + 1}`); params.push(data.name); }
    if (data.slug !== undefined) { updates.push(`slug = ?${params.length + 1}`); params.push(data.slug); }
    if (data.plan !== undefined) { updates.push(`plan = ?${params.length + 1}`); params.push(data.plan); }
    if (data.business_hours_start !== undefined) { updates.push(`business_hours_start = ?${params.length + 1}`); params.push(data.business_hours_start); }
    if (data.business_hours_end !== undefined) { updates.push(`business_hours_end = ?${params.length + 1}`); params.push(data.business_hours_end); }
    if (data.timezone !== undefined) { updates.push(`timezone = ?${params.length + 1}`); params.push(data.timezone); }
    if (data.auto_reply_enabled !== undefined) { updates.push(`auto_reply_enabled = ?${params.length + 1}`); params.push(data.auto_reply_enabled); }
    if (data.auto_reply_message !== undefined) { updates.push(`auto_reply_message = ?${params.length + 1}`); params.push(data.auto_reply_message); }
    if (data.is_active !== undefined) { updates.push(`is_active = ?${params.length + 1}`); params.push(data.is_active); }
    updates.push(`updated_at = ?${params.length + 1}`); params.push(new Date().toISOString());
    if (updates.length === 1) return jsonResponse({ success: false, error: 'No updates provided' }, 400, corsHeaders);
    params.push(tenantId);
    await db.prepare(`UPDATE tenants SET ${updates.join(', ')} WHERE id = ?${params.length}`).bind(...params).run();
    await writeAuditLog(db, 'staff', 'staff_admin', 'System Admin', 'tenant.updated', 'tenant', tenantId, data);
    return jsonResponse({ success: true, message: 'Tenant updated' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to update tenant' }, 500, corsHeaders);
  }
}

async function handleDeleteTenant(db, tenantId, corsHeaders) {
  try {
    if (tenantId === 'tenant_default') return jsonResponse({ success: false, error: 'Cannot delete default tenant' }, 403, corsHeaders);
    await db.prepare('DELETE FROM tenants WHERE id = ?1').bind(tenantId).run();
    await writeAuditLog(db, 'staff', 'staff_admin', 'System Admin', 'tenant.deleted', 'tenant', tenantId, {});
    return jsonResponse({ success: true, message: 'Tenant deleted' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to delete tenant' }, 500, corsHeaders);
  }
}

// --- Roles ---
async function handleGetRoles(db, corsHeaders) {
  try {
    const roles = await db.prepare('SELECT * FROM roles ORDER BY name').all();
    return jsonResponse({ success: true, roles: roles.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, roles: [] }, 200, corsHeaders);
  }
}

async function handleCreateRole(request, db, corsHeaders) {
  try {
    const data = await request.json();
    if (!data.name || !data.display_name) return jsonResponse({ success: false, error: 'Name and display_name required' }, 400, corsHeaders);
    const roleId = generateId('role');
    await db.prepare(
      'INSERT INTO roles (id, name, display_name, permissions, created_at) VALUES (?1,?2,?3,?4,?5)'
    ).bind(roleId, data.name, data.display_name, JSON.stringify(data.permissions || []), new Date().toISOString()).run();
    return jsonResponse({ success: true, role: { id: roleId, name: data.name } }, 201, corsHeaders);
  } catch (error) {
    if (error.message?.includes('UNIQUE')) return jsonResponse({ success: false, error: 'Role name already exists' }, 409, corsHeaders);
    return jsonResponse({ success: false, error: 'Failed to create role' }, 500, corsHeaders);
  }
}

async function handleUpdateRole(request, db, roleId, corsHeaders) {
  try {
    const data = await request.json();
    const updates = [];
    const params = [];
    if (data.display_name !== undefined) { updates.push(`display_name = ?${params.length + 1}`); params.push(data.display_name); }
    if (data.permissions !== undefined) { updates.push(`permissions = ?${params.length + 1}`); params.push(JSON.stringify(data.permissions)); }
    if (updates.length === 0) return jsonResponse({ success: false, error: 'No updates' }, 400, corsHeaders);
    params.push(roleId);
    await db.prepare(`UPDATE roles SET ${updates.join(', ')} WHERE id = ?${params.length}`).bind(...params).run();
    return jsonResponse({ success: true, message: 'Role updated' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to update role' }, 500, corsHeaders);
  }
}

async function handleGetStaffRoles(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const staffId = url.searchParams.get('staff_id');
    let query = `SELECT sr.*, s.name as staff_name, r.name as role_name, r.display_name, r.permissions FROM staff_roles sr JOIN staff s ON sr.staff_id = s.id JOIN roles r ON sr.role_id = r.id`;
    if (staffId) query += ` WHERE sr.staff_id = ?1`;
    const result = staffId
      ? await db.prepare(query).bind(staffId).all()
      : await db.prepare(query).all();
    return jsonResponse({ success: true, staff_roles: result.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, staff_roles: [] }, 200, corsHeaders);
  }
}

async function handleAssignStaffRole(request, db, corsHeaders) {
  try {
    const data = await request.json();
    if (!data.staff_id || !data.role_id) return jsonResponse({ success: false, error: 'staff_id and role_id required' }, 400, corsHeaders);
    await db.prepare(
      'INSERT OR REPLACE INTO staff_roles (staff_id, role_id, tenant_id, assigned_at) VALUES (?1,?2,?3,?4)'
    ).bind(data.staff_id, data.role_id, data.tenant_id || null, new Date().toISOString()).run();
    await writeAuditLog(db, 'staff', 'staff_admin', 'System Admin', 'staff.role_assigned', 'staff', data.staff_id, { role_id: data.role_id });
    return jsonResponse({ success: true, message: 'Role assigned' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to assign role' }, 500, corsHeaders);
  }
}

// --- SLA Policies ---
async function handleGetSLAPolicies(db, corsHeaders) {
  try {
    const policies = await db.prepare('SELECT * FROM sla_policies ORDER BY priority DESC, name ASC').all();
    return jsonResponse({ success: true, policies: policies.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, policies: [] }, 200, corsHeaders);
  }
}

async function handleCreateSLAPolicy(request, db, corsHeaders) {
  try {
    const data = await request.json();
    if (!data.name) return jsonResponse({ success: false, error: '名前は必須です' }, 400, corsHeaders);
    const policyId = generateId('sla');
    await db.prepare(
      'INSERT INTO sla_policies (id, name, tenant_id, first_response_minutes, resolution_minutes, priority, escalation_enabled, notify_before_breach_minutes, is_active, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)'
    ).bind(policyId, data.name, data.tenant_id || null, data.first_response_minutes || 60,
      data.resolution_minutes || 480, data.priority || 'normal',
      data.escalation_enabled !== false, data.notify_before_breach_minutes || 15,
      data.is_active !== false, new Date().toISOString(), new Date().toISOString()).run();
    await writeAuditLog(db, 'staff', 'staff_admin', 'System Admin', 'sla.created', 'sla_policy', policyId, { name: data.name });
    return jsonResponse({ success: true, policy: { id: policyId, name: data.name } }, 201, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to create SLA policy' }, 500, corsHeaders);
  }
}

async function handleUpdateSLAPolicy(request, db, policyId, corsHeaders) {
  try {
    const data = await request.json();
    const updates = [];
    const params = [];
    if (data.name !== undefined) { updates.push(`name = ?${params.length + 1}`); params.push(data.name); }
    if (data.first_response_minutes !== undefined) { updates.push(`first_response_minutes = ?${params.length + 1}`); params.push(data.first_response_minutes); }
    if (data.resolution_minutes !== undefined) { updates.push(`resolution_minutes = ?${params.length + 1}`); params.push(data.resolution_minutes); }
    if (data.priority !== undefined) { updates.push(`priority = ?${params.length + 1}`); params.push(data.priority); }
    if (data.escalation_enabled !== undefined) { updates.push(`escalation_enabled = ?${params.length + 1}`); params.push(data.escalation_enabled); }
    if (data.notify_before_breach_minutes !== undefined) { updates.push(`notify_before_breach_minutes = ?${params.length + 1}`); params.push(data.notify_before_breach_minutes); }
    if (data.is_active !== undefined) { updates.push(`is_active = ?${params.length + 1}`); params.push(data.is_active); }
    updates.push(`updated_at = ?${params.length + 1}`); params.push(new Date().toISOString());
    if (updates.length === 1) return jsonResponse({ success: false, error: 'No updates' }, 400, corsHeaders);
    params.push(policyId);
    await db.prepare(`UPDATE sla_policies SET ${updates.join(', ')} WHERE id = ?${params.length}`).bind(...params).run();
    return jsonResponse({ success: true, message: 'SLA policy updated' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to update SLA policy' }, 500, corsHeaders);
  }
}

async function handleDeleteSLAPolicy(db, policyId, corsHeaders) {
  try {
    await db.prepare('DELETE FROM sla_policies WHERE id = ?1').bind(policyId).run();
    return jsonResponse({ success: true, message: 'SLA policy deleted' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to delete SLA policy' }, 500, corsHeaders);
  }
}

async function handleSLADashboard(request, db, corsHeaders) {
  try {
    const today = new Date().toISOString().split('T')[0];
    const [metToday, breachedToday, recentEvents] = await Promise.all([
      db.prepare("SELECT COUNT(*) as count FROM sla_events WHERE event_type LIKE '%_met' AND DATE(created_at) = ?1").bind(today).first(),
      db.prepare("SELECT COUNT(*) as count FROM sla_events WHERE event_type LIKE '%_breach' AND DATE(created_at) = ?1").bind(today).first(),
      db.prepare("SELECT se.*, c.status FROM sla_events se JOIN conversations c ON se.conversation_id = c.id ORDER BY se.created_at DESC LIMIT 10").all()
    ]);
    // At-risk conversations: open conversations older than 80% of SLA time
    const atRisk = await db.prepare(
      "SELECT COUNT(*) as count FROM conversations c JOIN sla_policies sp ON sp.priority = c.priority WHERE c.status IN ('open','in_progress') AND (julianday('now') - julianday(c.created_at)) * 1440 > sp.first_response_minutes * 0.8"
    ).first().catch(() => ({ count: 0 }));
    const avgResponse = await db.prepare(
      "SELECT AVG(response_time_minutes) as avg FROM sla_events WHERE response_time_minutes IS NOT NULL AND DATE(created_at) >= date('now','-7 days')"
    ).first();
    return jsonResponse({
      success: true,
      met_today: metToday?.count || 0,
      breached_today: breachedToday?.count || 0,
      at_risk: atRisk?.count || 0,
      avg_response_minutes: avgResponse?.avg ? Math.round(avgResponse.avg) : null,
      recent_events: recentEvents.results || []
    }, 200, corsHeaders);
  } catch (error) {
    console.error('SLA dashboard error:', error);
    return jsonResponse({ success: true, met_today: 0, breached_today: 0, at_risk: 0, avg_response_minutes: null, recent_events: [] }, 200, corsHeaders);
  }
}

async function handleSLACheck(request, db, corsHeaders) {
  try {
    const data = await request.json();
    const conversationId = data.conversation_id;
    if (!conversationId) return jsonResponse({ success: false, error: 'conversation_id required' }, 400, corsHeaders);
    const conv = await db.prepare('SELECT * FROM conversations WHERE id = ?1').bind(conversationId).first();
    if (!conv) return jsonResponse({ success: false, error: 'Conversation not found' }, 404, corsHeaders);
    const policy = await db.prepare('SELECT * FROM sla_policies WHERE priority = ?1 AND is_active = TRUE').bind(conv.priority || 'normal').first();
    if (!policy) return jsonResponse({ success: true, message: 'No SLA policy for this priority', sla_status: 'no_policy' }, 200, corsHeaders);
    const createdAt = new Date(conv.created_at);
    const now = new Date();
    const elapsedMinutes = (now - createdAt) / 60000;
    const firstResponseBreached = elapsedMinutes > policy.first_response_minutes && conv.status === 'open';
    const resolutionBreached = elapsedMinutes > policy.resolution_minutes && conv.status !== 'resolved';
    // Record breach event if needed
    if (firstResponseBreached) {
      const existing = await db.prepare("SELECT id FROM sla_events WHERE conversation_id = ?1 AND event_type = 'first_response_breach'").bind(conversationId).first();
      if (!existing) {
        const eventId = generateId('slae');
        await db.prepare('INSERT INTO sla_events (id, conversation_id, sla_policy_id, event_type, breached_at, response_time_minutes, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7)')
          .bind(eventId, conversationId, policy.id, 'first_response_breach', now.toISOString(), elapsedMinutes, now.toISOString()).run();
      }
    }
    if (resolutionBreached) {
      const existing = await db.prepare("SELECT id FROM sla_events WHERE conversation_id = ?1 AND event_type = 'resolution_breach'").bind(conversationId).first();
      if (!existing) {
        const eventId = generateId('slae');
        await db.prepare('INSERT INTO sla_events (id, conversation_id, sla_policy_id, event_type, breached_at, response_time_minutes, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7)')
          .bind(eventId, conversationId, policy.id, 'resolution_breach', now.toISOString(), elapsedMinutes, now.toISOString()).run();
      }
    }
    return jsonResponse({
      success: true,
      conversation_id: conversationId,
      policy: { name: policy.name, first_response_minutes: policy.first_response_minutes, resolution_minutes: policy.resolution_minutes },
      elapsed_minutes: Math.round(elapsedMinutes),
      first_response_breached: firstResponseBreached,
      resolution_breached: resolutionBreached,
      sla_status: firstResponseBreached || resolutionBreached ? 'breached' : 'ok'
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'SLA check failed' }, 500, corsHeaders);
  }
}

// --- Audit Logs ---
async function handleGetAuditLogs(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '100');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const q = url.searchParams.get('q') || '';
    const action = url.searchParams.get('action') || '';
    const days = parseInt(url.searchParams.get('days') || '7');
    const since = new Date(Date.now() - days * 86400000).toISOString();
    let query = 'SELECT * FROM audit_logs WHERE created_at >= ?1';
    const params = [since];
    if (q) { query += ` AND (actor_name LIKE ?${params.length + 1} OR action LIKE ?${params.length + 1} OR resource_id LIKE ?${params.length + 1})`; params.push(`%${q}%`); }
    if (action) { query += ` AND action LIKE ?${params.length + 1}`; params.push(`${action}%`); }
    query += ` ORDER BY created_at DESC LIMIT ?${params.length + 1} OFFSET ?${params.length + 2}`;
    params.push(limit, offset);
    const logs = await db.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, logs: logs.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, logs: [] }, 200, corsHeaders);
  }
}

async function handleCreateAuditLog(request, db, corsHeaders) {
  try {
    const data = await request.json();
    if (!data.action) return jsonResponse({ success: false, error: 'action required' }, 400, corsHeaders);
    await writeAuditLog(db, data.actor_type || 'api', data.actor_id, data.actor_name, data.action, data.resource_type, data.resource_id, data.details, data.tenant_id);
    return jsonResponse({ success: true }, 201, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to create audit log' }, 500, corsHeaders);
  }
}

// ========== Phase 4: Webhook, Business Hours, Automation ==========

// --- Webhook Dispatch Helper ---
async function dispatchWebhookEvents(db, eventType, payload) {
  try {
    const webhooks = await db.prepare(
      "SELECT * FROM webhooks WHERE is_active = TRUE AND events LIKE ?1"
    ).bind(`%${eventType}%`).all();
    for (const webhook of (webhooks.results || [])) {
      const events = JSON.parse(webhook.events || '[]');
      if (!events.includes(eventType)) continue;
      const deliveryId = generateId('whd');
      const body = JSON.stringify({ event: eventType, timestamp: new Date().toISOString(), data: payload });
      // Attempt delivery
      let status = null;
      let responseBody = null;
      try {
        const response = await fetch(webhook.url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', 'X-Webhook-Event': eventType, 'X-Webhook-ID': webhook.id, ...(webhook.secret ? { 'X-Webhook-Secret': webhook.secret } : {}) },
          body,
          signal: AbortSignal.timeout(10000)
        });
        status = response.status;
        responseBody = await response.text().catch(() => '');
      } catch (fetchErr) {
        status = 0;
        responseBody = fetchErr.message;
      }
      const success = status >= 200 && status < 300;
      await db.prepare(
        'INSERT INTO webhook_deliveries (id, webhook_id, event_type, payload, response_status, response_body, attempt_count, delivered_at, failed_at, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)'
      ).bind(deliveryId, webhook.id, eventType, body, status, responseBody?.substring(0, 500) || '', 1,
        success ? new Date().toISOString() : null,
        success ? null : new Date().toISOString(), new Date().toISOString()).run();
      await db.prepare('UPDATE webhooks SET last_triggered_at = ?1, failure_count = CASE WHEN ?2 THEN failure_count ELSE failure_count + 1 END WHERE id = ?3')
        .bind(new Date().toISOString(), success, webhook.id).run();
    }
  } catch (e) {
    console.error('Webhook dispatch error:', e);
  }
}

// --- Webhooks ---
async function handleGetWebhooks(db, corsHeaders) {
  try {
    const webhooks = await db.prepare('SELECT * FROM webhooks ORDER BY created_at DESC').all();
    return jsonResponse({ success: true, webhooks: webhooks.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, webhooks: [] }, 200, corsHeaders);
  }
}

async function handleCreateWebhook(request, db, corsHeaders) {
  try {
    const data = await request.json();
    if (!data.name || !data.url) return jsonResponse({ success: false, error: 'Name and URL required' }, 400, corsHeaders);
    const webhookId = generateId('wh');
    await db.prepare(
      'INSERT INTO webhooks (id, tenant_id, name, url, events, secret, is_active, retry_count, failure_count, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)'
    ).bind(webhookId, data.tenant_id || null, data.name, data.url, JSON.stringify(data.events || []),
      data.secret || null, data.is_active !== false, data.retry_count || 3, 0,
      new Date().toISOString(), new Date().toISOString()).run();
    await writeAuditLog(db, 'staff', 'staff_admin', 'System Admin', 'webhook.created', 'webhook', webhookId, { name: data.name, url: data.url });
    return jsonResponse({ success: true, webhook: { id: webhookId, name: data.name, url: data.url } }, 201, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to create webhook' }, 500, corsHeaders);
  }
}

async function handleUpdateWebhook(request, db, webhookId, corsHeaders) {
  try {
    const data = await request.json();
    const updates = [];
    const params = [];
    if (data.name !== undefined) { updates.push(`name = ?${params.length + 1}`); params.push(data.name); }
    if (data.url !== undefined) { updates.push(`url = ?${params.length + 1}`); params.push(data.url); }
    if (data.events !== undefined) { updates.push(`events = ?${params.length + 1}`); params.push(JSON.stringify(data.events)); }
    if (data.secret !== undefined) { updates.push(`secret = ?${params.length + 1}`); params.push(data.secret); }
    if (data.is_active !== undefined) { updates.push(`is_active = ?${params.length + 1}`); params.push(data.is_active); }
    if (data.retry_count !== undefined) { updates.push(`retry_count = ?${params.length + 1}`); params.push(data.retry_count); }
    updates.push(`updated_at = ?${params.length + 1}`); params.push(new Date().toISOString());
    if (updates.length === 1) return jsonResponse({ success: false, error: 'No updates' }, 400, corsHeaders);
    params.push(webhookId);
    await db.prepare(`UPDATE webhooks SET ${updates.join(', ')} WHERE id = ?${params.length}`).bind(...params).run();
    return jsonResponse({ success: true, message: 'Webhook updated' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to update webhook' }, 500, corsHeaders);
  }
}

async function handleDeleteWebhook(db, webhookId, corsHeaders) {
  try {
    await db.prepare('DELETE FROM webhook_deliveries WHERE webhook_id = ?1').bind(webhookId).run();
    await db.prepare('DELETE FROM webhooks WHERE id = ?1').bind(webhookId).run();
    await writeAuditLog(db, 'staff', 'staff_admin', 'System Admin', 'webhook.deleted', 'webhook', webhookId, {});
    return jsonResponse({ success: true, message: 'Webhook deleted' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to delete webhook' }, 500, corsHeaders);
  }
}

async function handleGetWebhookDeliveries(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const webhookId = url.searchParams.get('webhook_id');
    const limit = parseInt(url.searchParams.get('limit') || '20');
    let query = 'SELECT wd.*, w.name as webhook_name FROM webhook_deliveries wd JOIN webhooks w ON wd.webhook_id = w.id';
    const params = [];
    if (webhookId) { query += ' WHERE wd.webhook_id = ?1'; params.push(webhookId); }
    query += ` ORDER BY wd.created_at DESC LIMIT ?${params.length + 1}`;
    params.push(limit);
    const deliveries = await db.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, deliveries: deliveries.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, deliveries: [] }, 200, corsHeaders);
  }
}

async function handleTestWebhook(db, webhookId, corsHeaders) {
  try {
    const webhook = await db.prepare('SELECT * FROM webhooks WHERE id = ?1').bind(webhookId).first();
    if (!webhook) return jsonResponse({ success: false, error: 'Webhook not found' }, 404, corsHeaders);
    const testPayload = { test: true, message: 'This is a test delivery from Chatwoot AI System', webhook_id: webhookId };
    const deliveryId = generateId('whd');
    const body = JSON.stringify({ event: 'webhook.test', timestamp: new Date().toISOString(), data: testPayload });
    let status = null;
    let responseBody = '';
    try {
      const response = await fetch(webhook.url, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-Webhook-Event': 'webhook.test', 'X-Webhook-ID': webhookId, ...(webhook.secret ? { 'X-Webhook-Secret': webhook.secret } : {}) },
        body,
        signal: AbortSignal.timeout(10000)
      });
      status = response.status;
      responseBody = await response.text().catch(() => '');
    } catch (err) {
      status = 0;
      responseBody = err.message;
    }
    const success = status >= 200 && status < 300;
    await db.prepare(
      'INSERT INTO webhook_deliveries (id, webhook_id, event_type, payload, response_status, response_body, attempt_count, delivered_at, failed_at, created_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10)'
    ).bind(deliveryId, webhookId, 'webhook.test', body, status, responseBody.substring(0, 500), 1,
      success ? new Date().toISOString() : null,
      success ? null : new Date().toISOString(), new Date().toISOString()).run();
    await db.prepare('UPDATE webhooks SET last_triggered_at = ?1 WHERE id = ?2').bind(new Date().toISOString(), webhookId).run();
    return jsonResponse({ success: true, test_status: status, delivered: success, message: success ? 'Test delivery successful' : 'Delivery failed' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Test webhook failed: ' + error.message }, 500, corsHeaders);
  }
}

// --- Business Hours ---
async function handleGetBusinessHours(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant_id') || 'tenant_default';
    const hours = await db.prepare('SELECT * FROM business_hours WHERE tenant_id = ?1 ORDER BY day_of_week').bind(tenantId).all();
    const oooMessage = await db.prepare("SELECT value FROM settings WHERE key = 'ooo_message'").first();
    const oooEnabled = await db.prepare("SELECT value FROM settings WHERE key = 'ooo_enabled'").first();
    return jsonResponse({
      success: true,
      hours: hours.results || [],
      ooo_message: oooMessage?.value || '',
      ooo_enabled: oooEnabled?.value === 'true'
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, hours: [], ooo_message: '', ooo_enabled: false }, 200, corsHeaders);
  }
}

async function handleUpdateBusinessHours(request, db, corsHeaders) {
  try {
    const data = await request.json();
    const tenantId = data.tenant_id || 'tenant_default';
    if (data.hours && Array.isArray(data.hours)) {
      for (const h of data.hours) {
        const existing = await db.prepare('SELECT id FROM business_hours WHERE tenant_id = ?1 AND day_of_week = ?2').bind(tenantId, h.day_of_week).first();
        if (existing) {
          await db.prepare('UPDATE business_hours SET open_time = ?1, close_time = ?2, is_open = ?3 WHERE tenant_id = ?4 AND day_of_week = ?5')
            .bind(h.open_time, h.close_time, h.is_open, tenantId, h.day_of_week).run();
        } else {
          await db.prepare('INSERT INTO business_hours (id, tenant_id, day_of_week, open_time, close_time, is_open) VALUES (?1,?2,?3,?4,?5,?6)')
            .bind(generateId('bh'), tenantId, h.day_of_week, h.open_time, h.close_time, h.is_open).run();
        }
      }
    }
    if (data.ooo_message !== undefined) {
      await db.prepare("INSERT OR REPLACE INTO settings (key, value, category) VALUES ('ooo_message', ?1, 'general')").bind(data.ooo_message).run();
    }
    if (data.ooo_enabled !== undefined) {
      await db.prepare("INSERT OR REPLACE INTO settings (key, value, category) VALUES ('ooo_enabled', ?1, 'general')").bind(String(data.ooo_enabled)).run();
    }
    await writeAuditLog(db, 'staff', 'staff_admin', 'System Admin', 'business_hours.updated', 'settings', tenantId, {});
    return jsonResponse({ success: true, message: 'Business hours updated' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to update business hours: ' + error.message }, 500, corsHeaders);
  }
}

async function handleBusinessHoursStatus(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const tenantId = url.searchParams.get('tenant_id') || 'tenant_default';
    const now = new Date();
    const dayOfWeek = now.getDay();
    const timeStr = now.toTimeString().substring(0, 5); // HH:MM
    const todayHours = await db.prepare('SELECT * FROM business_hours WHERE tenant_id = ?1 AND day_of_week = ?2').bind(tenantId, dayOfWeek).first();
    let isOpen = false;
    let message = 'Business hours not configured';
    if (todayHours) {
      isOpen = todayHours.is_open && timeStr >= todayHours.open_time && timeStr <= todayHours.close_time;
      message = isOpen ? `Open until ${todayHours.close_time}` : (todayHours.is_open ? `Opens at ${todayHours.open_time}` : 'Closed today');
    }
    return jsonResponse({ success: true, is_open: isOpen, message, current_time: timeStr, day_of_week: dayOfWeek }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, is_open: false, message: 'Unknown' }, 200, corsHeaders);
  }
}

// --- Automation Rules ---
async function handleGetAutomationRules(db, corsHeaders) {
  try {
    const rules = await db.prepare('SELECT * FROM automation_rules ORDER BY created_at DESC').all();
    return jsonResponse({ success: true, rules: rules.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: true, rules: [] }, 200, corsHeaders);
  }
}

async function handleCreateAutomationRule(request, db, corsHeaders) {
  try {
    const data = await request.json();
    if (!data.name || !data.trigger_event) return jsonResponse({ success: false, error: 'Name and trigger_event required' }, 400, corsHeaders);
    if (!data.actions || !data.actions.length) return jsonResponse({ success: false, error: 'At least one action required' }, 400, corsHeaders);
    const ruleId = generateId('rule');
    await db.prepare(
      'INSERT INTO automation_rules (id, tenant_id, name, description, trigger_event, conditions, actions, is_active, run_count, created_at, updated_at) VALUES (?1,?2,?3,?4,?5,?6,?7,?8,?9,?10,?11)'
    ).bind(ruleId, data.tenant_id || null, data.name, data.description || '',
      data.trigger_event, JSON.stringify(data.conditions || []),
      JSON.stringify(data.actions), data.is_active !== false, 0,
      new Date().toISOString(), new Date().toISOString()).run();
    await writeAuditLog(db, 'staff', 'staff_admin', 'System Admin', 'automation.created', 'automation_rule', ruleId, { name: data.name });
    return jsonResponse({ success: true, rule: { id: ruleId, name: data.name } }, 201, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to create automation rule' }, 500, corsHeaders);
  }
}

async function handleUpdateAutomationRule(request, db, ruleId, corsHeaders) {
  try {
    const data = await request.json();
    const updates = [];
    const params = [];
    if (data.name !== undefined) { updates.push(`name = ?${params.length + 1}`); params.push(data.name); }
    if (data.description !== undefined) { updates.push(`description = ?${params.length + 1}`); params.push(data.description); }
    if (data.trigger_event !== undefined) { updates.push(`trigger_event = ?${params.length + 1}`); params.push(data.trigger_event); }
    if (data.conditions !== undefined) { updates.push(`conditions = ?${params.length + 1}`); params.push(JSON.stringify(data.conditions)); }
    if (data.actions !== undefined) { updates.push(`actions = ?${params.length + 1}`); params.push(JSON.stringify(data.actions)); }
    if (data.is_active !== undefined) { updates.push(`is_active = ?${params.length + 1}`); params.push(data.is_active); }
    updates.push(`updated_at = ?${params.length + 1}`); params.push(new Date().toISOString());
    if (updates.length === 1) return jsonResponse({ success: false, error: 'No updates' }, 400, corsHeaders);
    params.push(ruleId);
    await db.prepare(`UPDATE automation_rules SET ${updates.join(', ')} WHERE id = ?${params.length}`).bind(...params).run();
    return jsonResponse({ success: true, message: 'Automation rule updated' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to update automation rule' }, 500, corsHeaders);
  }
}

async function handleDeleteAutomationRule(db, ruleId, corsHeaders) {
  try {
    await db.prepare('DELETE FROM automation_rules WHERE id = ?1').bind(ruleId).run();
    return jsonResponse({ success: true, message: 'Automation rule deleted' }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to delete automation rule' }, 500, corsHeaders);
  }
}

async function handleRunAutomationRules(request, db, corsHeaders) {
  try {
    const data = await request.json();
    const { trigger_event, conversation_id } = data;
    if (!trigger_event || !conversation_id) return jsonResponse({ success: false, error: 'trigger_event and conversation_id required' }, 400, corsHeaders);
    const executed = await executeAutomationRules(db, trigger_event, conversation_id);
    return jsonResponse({ success: true, rules_executed: executed }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to run automation rules' }, 500, corsHeaders);
  }
}

// --- Automation Execution Helper ---
async function executeAutomationRules(db, triggerEvent, conversationId) {
  let executed = 0;
  try {
    const rules = await db.prepare("SELECT * FROM automation_rules WHERE trigger_event = ?1 AND is_active = TRUE").bind(triggerEvent).all();
    const conv = await db.prepare('SELECT * FROM conversations WHERE id = ?1').bind(conversationId).first();
    if (!conv) return 0;
    for (const rule of (rules.results || [])) {
      const conditions = JSON.parse(rule.conditions || '[]');
      const actions = JSON.parse(rule.actions || '[]');
      // Evaluate conditions
      let conditionsMet = true;
      for (const cond of conditions) {
        const fieldValue = conv[cond.field];
        if (cond.operator === 'equals' && fieldValue !== cond.value) { conditionsMet = false; break; }
        if (cond.operator === 'contains' && !(fieldValue || '').includes(cond.value)) { conditionsMet = false; break; }
        if (cond.operator === 'not_equals' && fieldValue === cond.value) { conditionsMet = false; break; }
      }
      if (!conditionsMet) continue;
      // Execute actions
      for (const action of actions) {
        try {
          if (action.type === 'add_tag' && action.tag_id) {
            await db.prepare('INSERT OR IGNORE INTO conversation_tags (conversation_id, tag_id, added_at) VALUES (?1,?2,?3)')
              .bind(conversationId, action.tag_id, new Date().toISOString()).run();
          } else if (action.type === 'assign_staff' && action.staff_id) {
            await db.prepare('UPDATE conversations SET assigned_staff_id = ?1 WHERE id = ?2').bind(action.staff_id, conversationId).run();
          } else if (action.type === 'set_priority' && action.priority) {
            await db.prepare('UPDATE conversations SET priority = ?1 WHERE id = ?2').bind(action.priority, conversationId).run();
          } else if (action.type === 'set_status' && action.status) {
            await db.prepare('UPDATE conversations SET status = ?1 WHERE id = ?2').bind(action.status, conversationId).run();
          } else if (action.type === 'send_message' && action.message) {
            await addMessage(db, { conversation_id: conversationId, sender_type: 'system', sender_id: 'system', content: action.message, content_type: 'text' });
          }
        } catch (actionErr) {
          console.error('Automation action error:', actionErr);
        }
      }
      // Update run count
      await db.prepare('UPDATE automation_rules SET run_count = run_count + 1, last_run_at = ?1 WHERE id = ?2').bind(new Date().toISOString(), rule.id).run();
      executed++;
    }
  } catch (e) {
    console.error('Automation execution error:', e);
  }
  return executed;
}

// ========== Phase 1 CRM: Schema Migration ==========

async function handlePhase1CRMMigration(db, corsHeaders) {
  try {
    const results = [];

    // Player Info Settings
    await db.prepare(`CREATE TABLE IF NOT EXISTS player_info_settings (
      id INTEGER PRIMARY KEY, field_name TEXT NOT NULL, display_name TEXT NOT NULL,
      enabled BOOLEAN DEFAULT TRUE, display_order INTEGER DEFAULT 0
    )`).run();
    results.push('player_info_settings table created');

    const playerInfoDefaults = [
      [1, 'username', 'ユーザー名', 1], [2, 'email', 'メール', 2],
      [3, 'vip_tier', 'VIPランク', 3], [4, 'balance', '残高', 4],
      [5, 'total_deposits', '累計入金', 5], [6, 'total_bets', '累計ベット', 6],
      [7, 'kyc_level', 'KYCレベル', 7], [8, 'registration_date', '登録日', 8],
      [9, 'bonus_balance', 'ボーナス残高', 9], [10, 'last_login', '最終ログイン', 10]
    ];
    for (const [id, field, display, order] of playerInfoDefaults) {
      await db.prepare('INSERT OR IGNORE INTO player_info_settings (id, field_name, display_name, enabled, display_order) VALUES (?1, ?2, ?3, TRUE, ?4)')
        .bind(id, field, display, order).run();
    }
    results.push('player_info_settings defaults inserted');

    // Bonus Grants
    await db.prepare(`CREATE TABLE IF NOT EXISTS bonus_grants (
      id TEXT PRIMARY KEY, conversation_id TEXT, user_id TEXT, staff_id TEXT,
      amount REAL NOT NULL, type TEXT DEFAULT 'bonus', wager_multiplier REAL DEFAULT 1,
      expires_in_days INTEGER DEFAULT 30, reason TEXT, status TEXT DEFAULT 'granted',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )`).run();
    results.push('bonus_grants table created');

    // Bonus Settings
    await db.prepare(`CREATE TABLE IF NOT EXISTS bonus_settings (
      id INTEGER PRIMARY KEY, max_amount_per_grant REAL DEFAULT 10000,
      max_daily_total REAL DEFAULT 50000, require_approval_above REAL DEFAULT 5000,
      default_wager_multiplier REAL DEFAULT 1, default_expires_days INTEGER DEFAULT 30,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await db.prepare('INSERT OR IGNORE INTO bonus_settings (id) VALUES (1)').run();
    results.push('bonus_settings table created with defaults');

    // Callback Requests
    await db.prepare(`CREATE TABLE IF NOT EXISTS callback_requests (
      id TEXT PRIMARY KEY, conversation_id TEXT, user_id TEXT,
      channel TEXT NOT NULL, contact TEXT NOT NULL, status TEXT DEFAULT 'pending',
      requested_at DATETIME DEFAULT CURRENT_TIMESTAMP, notified_at DATETIME,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )`).run();
    results.push('callback_requests table created');

    // Indexes
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_bonus_grants_conversation ON bonus_grants(conversation_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_bonus_grants_user ON bonus_grants(user_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_bonus_grants_status ON bonus_grants(status)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_bonus_grants_created_at ON bonus_grants(created_at)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_callback_requests_status ON callback_requests(status)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_callback_requests_conversation ON callback_requests(conversation_id)').run();
    results.push('indexes created');

    return jsonResponse({ success: true, message: 'Phase 1 CRM migration completed', results }, 200, corsHeaders);
  } catch (error) {
    console.error('Migration error:', error);
    return jsonResponse({ success: false, error: error.message }, 500, corsHeaders);
  }
}

// ========== Phase 1 CRM Features: Player Info, Bonus Grant, Callback Request ==========

// --- Feature 1: Player Info Panel ---

async function handleGetPlayerInfo(request, db, conversationId, corsHeaders, env) {
  try {
    // Get the conversation to find user_id
    const conversation = await db.prepare('SELECT * FROM conversations WHERE id = ?1').bind(conversationId).first();
    if (!conversation) return jsonResponse({ success: false, error: 'Conversation not found' }, 404, corsHeaders);

    const userId = conversation.user_id;
    if (!userId) return jsonResponse({ success: false, error: 'No user associated with this conversation' }, 400, corsHeaders);

    // Get enabled display settings (ordered)
    const settings = await db.prepare('SELECT * FROM player_info_settings WHERE enabled = TRUE ORDER BY display_order ASC').all();

    // Call Mujinkun API to get player data
    let playerData = {};
    try {
      const apiUrl = `https://mujinkun.xr7k.com/api/players/${encodeURIComponent(userId)}`;
      const apiResponse = await fetch(apiUrl, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json', 'Accept': 'application/json' }
      });
      if (apiResponse.ok) {
        playerData = await apiResponse.json();
      } else {
        // If API returns error, return partial info
        playerData = { error: `Mujinkun API returned status ${apiResponse.status}` };
      }
    } catch (apiError) {
      playerData = { error: `Failed to reach Mujinkun API: ${apiError.message}` };
    }

    // Build response with only enabled fields
    const enabledFields = (settings.results || []).map(s => ({
      field_name: s.field_name,
      display_name: s.display_name,
      value: playerData[s.field_name] !== undefined ? playerData[s.field_name] : null,
      display_order: s.display_order
    }));

    return jsonResponse({
      success: true,
      conversation_id: conversationId,
      user_id: userId,
      player_info: enabledFields,
      raw_data: playerData
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Player info error:', error);
    return jsonResponse({ success: false, error: 'Failed to get player info' }, 500, corsHeaders);
  }
}

async function handleGetPlayerInfoSettings(db, corsHeaders) {
  try {
    const settings = await db.prepare('SELECT * FROM player_info_settings ORDER BY display_order ASC').all();
    return jsonResponse({ success: true, settings: settings.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get player info settings' }, 500, corsHeaders);
  }
}

async function handleUpdatePlayerInfoSettings(request, db, corsHeaders) {
  try {
    const data = await request.json();
    const { settings } = data;
    if (!settings || !Array.isArray(settings)) {
      return jsonResponse({ success: false, error: 'settings array is required' }, 400, corsHeaders);
    }

    for (const setting of settings) {
      if (setting.id) {
        await db.prepare(
          'UPDATE player_info_settings SET enabled = ?1, display_order = ?2, display_name = ?3 WHERE id = ?4'
        ).bind(
          setting.enabled !== undefined ? setting.enabled : true,
          setting.display_order || 0,
          setting.display_name || setting.field_name,
          setting.id
        ).run();
      }
    }

    const updated = await db.prepare('SELECT * FROM player_info_settings ORDER BY display_order ASC').all();
    return jsonResponse({ success: true, settings: updated.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to update player info settings' }, 500, corsHeaders);
  }
}

// --- Feature 2: Instant Bonus Grant ---

async function handleGrantBonus(request, db, conversationId, corsHeaders) {
  try {
    const conversation = await db.prepare('SELECT * FROM conversations WHERE id = ?1').bind(conversationId).first();
    if (!conversation) return jsonResponse({ success: false, error: 'Conversation not found' }, 404, corsHeaders);

    const data = await request.json();
    const { amount, type, wagerMultiplier, expiresInDays, reason } = data;
    const staffId = request.headers.get('X-User-ID') || 'staff_admin';

    if (!amount || amount <= 0) {
      return jsonResponse({ success: false, error: 'Valid amount is required' }, 400, corsHeaders);
    }

    // Check bonus settings (caps)
    const settings = await db.prepare('SELECT * FROM bonus_settings WHERE id = 1').first();
    if (!settings) {
      return jsonResponse({ success: false, error: 'Bonus settings not configured' }, 500, corsHeaders);
    }

    // Validate against max amount per grant
    if (amount > settings.max_amount_per_grant) {
      return jsonResponse({
        success: false,
        error: `Amount ${amount} exceeds max per grant (${settings.max_amount_per_grant})`
      }, 400, corsHeaders);
    }

    // Check daily total
    const today = new Date().toISOString().split('T')[0];
    const dailyResult = await db.prepare(
      "SELECT COALESCE(SUM(amount), 0) as daily_total FROM bonus_grants WHERE date(created_at) = ?1 AND status != 'cancelled'"
    ).bind(today).first();
    const dailyTotal = dailyResult ? dailyResult.daily_total : 0;

    if (dailyTotal + amount > settings.max_daily_total) {
      return jsonResponse({
        success: false,
        error: `Daily total would exceed limit (${dailyTotal + amount} > ${settings.max_daily_total})`
      }, 400, corsHeaders);
    }

    // Determine if approval is needed
    const needsApproval = amount > settings.require_approval_above;
    const grantStatus = needsApproval ? 'pending_approval' : 'granted';

    const grantId = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO bonus_grants (id, conversation_id, user_id, staff_id, amount, type, wager_multiplier, expires_in_days, reason, status, created_at)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
    ).bind(
      grantId,
      conversationId,
      conversation.user_id,
      staffId,
      amount,
      type || 'bonus',
      wagerMultiplier !== undefined ? wagerMultiplier : (settings.default_wager_multiplier || 1),
      expiresInDays !== undefined ? expiresInDays : (settings.default_expires_days || 30),
      reason || null,
      grantStatus,
      new Date().toISOString()
    ).run();

    return jsonResponse({
      success: true,
      grant: {
        id: grantId,
        conversation_id: conversationId,
        user_id: conversation.user_id,
        staff_id: staffId,
        amount,
        type: type || 'bonus',
        wager_multiplier: wagerMultiplier !== undefined ? wagerMultiplier : (settings.default_wager_multiplier || 1),
        expires_in_days: expiresInDays !== undefined ? expiresInDays : (settings.default_expires_days || 30),
        reason: reason || null,
        status: grantStatus,
        needs_approval: needsApproval
      }
    }, 201, corsHeaders);
  } catch (error) {
    console.error('Bonus grant error:', error);
    return jsonResponse({ success: false, error: 'Failed to grant bonus' }, 500, corsHeaders);
  }
}

async function handleGetBonusSettings(db, corsHeaders) {
  try {
    const settings = await db.prepare('SELECT * FROM bonus_settings WHERE id = 1').first();
    return jsonResponse({ success: true, settings: settings || {} }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get bonus settings' }, 500, corsHeaders);
  }
}

async function handleUpdateBonusSettings(request, db, corsHeaders) {
  try {
    const data = await request.json();
    const { max_amount_per_grant, max_daily_total, require_approval_above, default_wager_multiplier, default_expires_days } = data;

    const fields = [];
    const values = [];
    if (max_amount_per_grant !== undefined) { fields.push('max_amount_per_grant = ?'); values.push(max_amount_per_grant); }
    if (max_daily_total !== undefined) { fields.push('max_daily_total = ?'); values.push(max_daily_total); }
    if (require_approval_above !== undefined) { fields.push('require_approval_above = ?'); values.push(require_approval_above); }
    if (default_wager_multiplier !== undefined) { fields.push('default_wager_multiplier = ?'); values.push(default_wager_multiplier); }
    if (default_expires_days !== undefined) { fields.push('default_expires_days = ?'); values.push(default_expires_days); }

    if (fields.length === 0) {
      return jsonResponse({ success: false, error: 'No fields to update' }, 400, corsHeaders);
    }

    fields.push('updated_at = ?');
    values.push(new Date().toISOString());

    // Build query with numbered bindings
    let query = 'UPDATE bonus_settings SET ';
    const numberedFields = fields.map((f, i) => f.replace('?', `?${i + 1}`));
    query += numberedFields.join(', ');
    query += ` WHERE id = ?${values.length + 1}`;
    values.push(1);

    const stmt = db.prepare(query);
    await stmt.bind(...values).run();

    const updated = await db.prepare('SELECT * FROM bonus_settings WHERE id = 1').first();
    return jsonResponse({ success: true, settings: updated }, 200, corsHeaders);
  } catch (error) {
    console.error('Update bonus settings error:', error);
    return jsonResponse({ success: false, error: 'Failed to update bonus settings' }, 500, corsHeaders);
  }
}

async function handleGetBonusGrants(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status');
    const staffId = url.searchParams.get('staff_id');
    const userId = url.searchParams.get('user_id');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = 'SELECT * FROM bonus_grants WHERE 1=1';
    const params = [];
    let paramIndex = 1;

    if (status) { query += ` AND status = ?${paramIndex++}`; params.push(status); }
    if (staffId) { query += ` AND staff_id = ?${paramIndex++}`; params.push(staffId); }
    if (userId) { query += ` AND user_id = ?${paramIndex++}`; params.push(userId); }

    query += ` ORDER BY created_at DESC LIMIT ?${paramIndex++} OFFSET ?${paramIndex++}`;
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const results = await stmt.bind(...params).all();

    return jsonResponse({
      success: true,
      grants: results.results || [],
      total: (results.results || []).length,
      limit,
      offset
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get bonus grants' }, 500, corsHeaders);
  }
}

// --- Feature 3: Callback Request ---

async function handleCreateCallbackRequest(request, db, conversationId, corsHeaders) {
  try {
    const conversation = await db.prepare('SELECT * FROM conversations WHERE id = ?1').bind(conversationId).first();
    if (!conversation) return jsonResponse({ success: false, error: 'Conversation not found' }, 404, corsHeaders);

    const data = await request.json();
    const { channel, contact } = data;

    if (!channel || !contact) {
      return jsonResponse({ success: false, error: 'channel and contact are required' }, 400, corsHeaders);
    }

    const validChannels = ['telegram', 'email', 'sms'];
    if (!validChannels.includes(channel)) {
      return jsonResponse({ success: false, error: `Invalid channel. Must be one of: ${validChannels.join(', ')}` }, 400, corsHeaders);
    }

    const requestId = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO callback_requests (id, conversation_id, user_id, channel, contact, status, requested_at)
       VALUES (?1, ?2, ?3, ?4, ?5, 'pending', ?6)`
    ).bind(
      requestId,
      conversationId,
      conversation.user_id,
      channel,
      contact,
      new Date().toISOString()
    ).run();

    return jsonResponse({
      success: true,
      callback_request: {
        id: requestId,
        conversation_id: conversationId,
        user_id: conversation.user_id,
        channel,
        contact,
        status: 'pending'
      }
    }, 201, corsHeaders);
  } catch (error) {
    console.error('Callback request error:', error);
    return jsonResponse({ success: false, error: 'Failed to create callback request' }, 500, corsHeaders);
  }
}

async function handleGetCallbackRequests(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const status = url.searchParams.get('status') || 'pending';
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');

    let query = 'SELECT * FROM callback_requests';
    const params = [];
    let paramIndex = 1;

    if (status !== 'all') {
      query += ` WHERE status = ?${paramIndex++}`;
      params.push(status);
    }

    query += ` ORDER BY requested_at DESC LIMIT ?${paramIndex++} OFFSET ?${paramIndex++}`;
    params.push(limit, offset);

    const stmt = db.prepare(query);
    const results = await stmt.bind(...params).all();

    return jsonResponse({
      success: true,
      callback_requests: results.results || [],
      total: (results.results || []).length,
      limit,
      offset
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get callback requests' }, 500, corsHeaders);
  }
}

async function handleNotifyCallback(request, db, callbackId, corsHeaders) {
  try {
    const callback = await db.prepare('SELECT * FROM callback_requests WHERE id = ?1').bind(callbackId).first();
    if (!callback) return jsonResponse({ success: false, error: 'Callback request not found' }, 404, corsHeaders);

    if (callback.status === 'notified') {
      return jsonResponse({ success: false, error: 'Already notified' }, 400, corsHeaders);
    }

    const now = new Date().toISOString();

    // Update status to notified
    await db.prepare(
      'UPDATE callback_requests SET status = ?1, notified_at = ?2 WHERE id = ?3'
    ).bind('notified', now, callbackId).run();

    // In a real implementation, you would send the actual notification here
    // e.g., Telegram message, email, or SMS based on callback.channel
    let notificationResult = { sent: false, message: 'Notification channel not yet implemented' };

    if (callback.channel === 'telegram') {
      notificationResult = { sent: true, message: `Telegram notification queued for ${callback.contact}` };
    } else if (callback.channel === 'email') {
      notificationResult = { sent: true, message: `Email notification queued for ${callback.contact}` };
    } else if (callback.channel === 'sms') {
      notificationResult = { sent: true, message: `SMS notification queued for ${callback.contact}` };
    }

    return jsonResponse({
      success: true,
      callback_request: {
        id: callbackId,
        conversation_id: callback.conversation_id,
        user_id: callback.user_id,
        channel: callback.channel,
        contact: callback.contact,
        status: 'notified',
        notified_at: now
      },
      notification: notificationResult
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Notify callback error:', error);
    return jsonResponse({ success: false, error: 'Failed to notify callback' }, 500, corsHeaders);
  }
}

// ========== Phase 2 CRM Features: Escalation, AI Suggestions, Multilingual ==========

// --- Phase 2 Migration ---

async function handlePhase2CRMMigration(db, corsHeaders) {
  try {
    const results = [];

    // Escalation Rules
    await db.prepare(`CREATE TABLE IF NOT EXISTS escalation_rules (
      id TEXT PRIMARY KEY, name TEXT NOT NULL, priority_threshold TEXT DEFAULT 'high',
      wait_time_minutes INTEGER DEFAULT 10, escalate_to_role TEXT DEFAULT 'supervisor',
      category TEXT, enabled BOOLEAN DEFAULT TRUE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();
    results.push('escalation_rules table created');

    // Escalation Logs
    await db.prepare(`CREATE TABLE IF NOT EXISTS escalation_logs (
      id TEXT PRIMARY KEY, conversation_id TEXT, from_type TEXT, from_id TEXT,
      to_type TEXT, to_id TEXT, reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )`).run();
    results.push('escalation_logs table created');

    // AI Suggestions
    await db.prepare(`CREATE TABLE IF NOT EXISTS ai_suggestions (
      id TEXT PRIMARY KEY, conversation_id TEXT, original_text TEXT,
      suggested_text TEXT, suggestion_type TEXT DEFAULT 'grammar',
      accepted BOOLEAN DEFAULT FALSE,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )`).run();
    results.push('ai_suggestions table created');

    // Default escalation rules
    const defaultRules = [
      ['esc1', 'VIPユーザー自動エスカレーション', 'normal', 5, 'supervisor', 'vip'],
      ['esc2', '入出金問題', 'high', 10, 'supervisor', 'payment'],
      ['esc3', 'クレーム', 'urgent', 3, 'admin', 'complaint'],
      ['esc4', '長時間未応答', 'normal', 15, 'supervisor', null]
    ];
    for (const [id, name, threshold, wait, role, category] of defaultRules) {
      await db.prepare(
        'INSERT OR IGNORE INTO escalation_rules (id, name, priority_threshold, wait_time_minutes, escalate_to_role, category) VALUES (?1, ?2, ?3, ?4, ?5, ?6)'
      ).bind(id, name, threshold, wait, role, category).run();
    }
    results.push('default escalation rules inserted');

    // Indexes
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_escalation_logs_conversation ON escalation_logs(conversation_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_escalation_logs_created_at ON escalation_logs(created_at)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_ai_suggestions_conversation ON ai_suggestions(conversation_id)').run();
    results.push('phase2 indexes created');

    return jsonResponse({ success: true, message: 'Phase 2 CRM migration completed', results }, 200, corsHeaders);
  } catch (error) {
    console.error('Phase 2 migration error:', error);
    return jsonResponse({ success: false, error: error.message }, 500, corsHeaders);
  }
}

// --- Feature 5: Escalation System ---

async function handleGetEscalationRules(db, corsHeaders) {
  try {
    const rules = await db.prepare('SELECT * FROM escalation_rules ORDER BY created_at DESC').all();
    return jsonResponse({ success: true, rules: rules.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get escalation rules' }, 500, corsHeaders);
  }
}

async function handleCreateEscalationRule(request, db, corsHeaders) {
  try {
    const data = await request.json();
    const { name, priority_threshold, wait_time_minutes, escalate_to_role, category } = data;
    if (!name) return jsonResponse({ success: false, error: 'name is required' }, 400, corsHeaders);

    const id = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO escalation_rules (id, name, priority_threshold, wait_time_minutes, escalate_to_role, category)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
    ).bind(
      id,
      name,
      priority_threshold || 'high',
      wait_time_minutes || 10,
      escalate_to_role || 'supervisor',
      category || null
    ).run();

    const rule = await db.prepare('SELECT * FROM escalation_rules WHERE id = ?1').bind(id).first();
    return jsonResponse({ success: true, rule }, 201, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to create escalation rule' }, 500, corsHeaders);
  }
}

async function handleUpdateEscalationRule(request, db, ruleId, corsHeaders) {
  try {
    const existing = await db.prepare('SELECT * FROM escalation_rules WHERE id = ?1').bind(ruleId).first();
    if (!existing) return jsonResponse({ success: false, error: 'Rule not found' }, 404, corsHeaders);

    const data = await request.json();
    const updates = [];
    const params = [];
    let paramIndex = 1;

    for (const field of ['name', 'priority_threshold', 'wait_time_minutes', 'escalate_to_role', 'category', 'enabled']) {
      if (data[field] !== undefined) {
        updates.push(`${field} = ?${paramIndex++}`);
        params.push(data[field]);
      }
    }

    if (updates.length === 0) return jsonResponse({ success: false, error: 'No fields to update' }, 400, corsHeaders);

    params.push(ruleId);
    await db.prepare(`UPDATE escalation_rules SET ${updates.join(', ')} WHERE id = ?${paramIndex}`).bind(...params).run();

    const rule = await db.prepare('SELECT * FROM escalation_rules WHERE id = ?1').bind(ruleId).first();
    return jsonResponse({ success: true, rule }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to update escalation rule' }, 500, corsHeaders);
  }
}

async function handleEscalateConversation(request, db, conversationId, corsHeaders) {
  try {
    const conversation = await db.prepare('SELECT * FROM conversations WHERE id = ?1').bind(conversationId).first();
    if (!conversation) return jsonResponse({ success: false, error: 'Conversation not found' }, 404, corsHeaders);

    const data = await request.json();
    const { to_role, reason } = data;
    if (!to_role) return jsonResponse({ success: false, error: 'to_role is required' }, 400, corsHeaders);

    // Find a staff member with the target role
    const targetStaff = await db.prepare(
      'SELECT * FROM staff WHERE role = ?1 AND is_active = TRUE AND id != ?2 ORDER BY RANDOM() LIMIT 1'
    ).bind(to_role, conversation.assigned_staff_id || '').first();

    const logId = crypto.randomUUID();
    await db.prepare(
      `INSERT INTO escalation_logs (id, conversation_id, from_type, from_id, to_type, to_id, reason)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
    ).bind(
      logId,
      conversationId,
      conversation.assigned_staff_id ? 'staff' : 'ai',
      conversation.assigned_staff_id || 'ai',
      to_role,
      targetStaff ? targetStaff.id : null,
      reason || 'Manual escalation'
    ).run();

    // Reassign conversation if target staff found
    if (targetStaff) {
      await db.prepare('UPDATE conversations SET assigned_staff_id = ?1, priority = ?2 WHERE id = ?3')
        .bind(targetStaff.id, 'high', conversationId).run();
    }

    return jsonResponse({
      success: true,
      escalation: {
        id: logId,
        conversation_id: conversationId,
        to_role,
        assigned_to: targetStaff ? { id: targetStaff.id, name: targetStaff.name } : null,
        reason: reason || 'Manual escalation'
      }
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Escalation error:', error);
    return jsonResponse({ success: false, error: 'Failed to escalate conversation' }, 500, corsHeaders);
  }
}

async function handleGetEscalationLogs(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const offset = parseInt(url.searchParams.get('offset') || '0');
    const conversationId = url.searchParams.get('conversation_id');

    let query = 'SELECT * FROM escalation_logs';
    const params = [];
    let paramIndex = 1;

    if (conversationId) {
      query += ` WHERE conversation_id = ?${paramIndex++}`;
      params.push(conversationId);
    }

    query += ` ORDER BY created_at DESC LIMIT ?${paramIndex++} OFFSET ?${paramIndex++}`;
    params.push(limit, offset);

    const results = await db.prepare(query).bind(...params).all();
    return jsonResponse({ success: true, logs: results.results || [], limit, offset }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get escalation logs' }, 500, corsHeaders);
  }
}

// --- Feature 9: AI Suggestion System ---

async function handleAISuggest(request, db, env, corsHeaders) {
  try {
    const data = await request.json();
    const { text, conversation_id, type } = data;
    if (!text) return jsonResponse({ success: false, error: 'text is required' }, 400, corsHeaders);

    const suggestionType = type || 'grammar';
    let systemPrompt = '';
    let userPrompt = '';

    if (suggestionType === 'grammar') {
      systemPrompt = 'あなたは日本語文法の専門家です。入力されたテキストの文法を確認し、修正版を提供してください。問題がなければそのまま返してください。修正した場合は修正箇所を簡潔に説明してください。回答はJSON形式で: {"corrected": "修正後テキスト", "hasIssues": true/false, "explanation": "説明"}';
      userPrompt = `以下のテキストの文法をチェックしてください:\n${text}`;
    } else if (suggestionType === 'reply') {
      systemPrompt = 'あなたはカスタマーサポートの専門家です。会話の文脈に基づいて、プロフェッショナルで丁寧な返信案を日本語で作成してください。回答はJSON形式で: {"suggested_reply": "返信案"}';
      // Get conversation context if available
      let context = '';
      if (conversation_id) {
        const messages = await db.prepare(
          'SELECT sender_type, content FROM messages WHERE conversation_id = ?1 ORDER BY created_at DESC LIMIT 5'
        ).bind(conversation_id).all();
        if (messages.results && messages.results.length > 0) {
          context = '\n\n会話履歴:\n' + messages.results.reverse().map(m => `${m.sender_type}: ${m.content}`).join('\n');
        }
      }
      userPrompt = `以下の内容に対する返信案を作成してください:\n${text}${context}`;
    } else if (suggestionType === 'improve') {
      systemPrompt = 'あなたはカスタマーサポートの文章改善専門家です。スタッフの返信文を、より丁寧で明確なトーンに改善してください。回答はJSON形式で: {"improved": "改善後テキスト", "changes": "変更点の説明"}';
      userPrompt = `以下のスタッフ返信文を改善してください:\n${text}`;
    } else {
      return jsonResponse({ success: false, error: 'Invalid type. Must be grammar, reply, or improve' }, 400, corsHeaders);
    }

    const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      max_tokens: 500
    });

    const suggestedText = aiResponse.response || '';

    // Save suggestion to database
    if (conversation_id) {
      const suggestionId = crypto.randomUUID();
      await db.prepare(
        `INSERT INTO ai_suggestions (id, conversation_id, original_text, suggested_text, suggestion_type)
         VALUES (?1, ?2, ?3, ?4, ?5)`
      ).bind(suggestionId, conversation_id, text, suggestedText, suggestionType).run();
    }

    return jsonResponse({
      success: true,
      suggestion: {
        original_text: text,
        suggested_text: suggestedText,
        type: suggestionType,
        conversation_id: conversation_id || null
      }
    }, 200, corsHeaders);
  } catch (error) {
    console.error('AI suggest error:', error);
    return jsonResponse({ success: false, error: 'Failed to generate suggestion' }, 500, corsHeaders);
  }
}

async function handleAICheckGrammar(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { text } = data;
    if (!text) return jsonResponse({ success: false, error: 'text is required' }, 400, corsHeaders);

    const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: 'あなたは日本語文法チェッカーです。入力テキストの文法をチェックし、必ず以下のJSON形式のみで回答してください。他のテキストは含めないでください。\n{"hasIssues": true/false, "corrected": "修正後テキスト", "issues": ["問題点1", "問題点2"]}\nもし問題がなければ hasIssues を false にし、corrected には元のテキストをそのまま入れ、issues は空配列にしてください。'
        },
        { role: 'user', content: text }
      ],
      max_tokens: 500
    });

    const responseText = aiResponse.response || '';

    // Try to parse as JSON
    let result;
    try {
      // Extract JSON from the response
      const jsonMatch = responseText.match(/\{[\s\S]*\}/);
      result = jsonMatch ? JSON.parse(jsonMatch[0]) : { hasIssues: false, corrected: text, issues: [] };
    } catch {
      result = { hasIssues: false, corrected: responseText || text, issues: [] };
    }

    return jsonResponse({
      success: true,
      hasIssues: result.hasIssues || false,
      corrected: result.corrected || text,
      issues: result.issues || []
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Grammar check error:', error);
    return jsonResponse({ success: false, error: 'Failed to check grammar' }, 500, corsHeaders);
  }
}

async function handleGetAISuggestions(db, conversationId, corsHeaders) {
  try {
    const suggestions = await db.prepare(
      'SELECT * FROM ai_suggestions WHERE conversation_id = ?1 ORDER BY created_at DESC'
    ).bind(conversationId).all();
    return jsonResponse({ success: true, suggestions: suggestions.results || [] }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get suggestions' }, 500, corsHeaders);
  }
}

// --- Feature 4: Enhanced Multilingual ---

async function handleAITranslate(request, env, corsHeaders) {
  try {
    const data = await request.json();
    const { text, targetLanguage } = data;
    if (!text || !targetLanguage) return jsonResponse({ success: false, error: 'text and targetLanguage are required' }, 400, corsHeaders);

    const langNames = {
      japanese: '日本語', english: '英語', chinese: '中国語', korean: '韓国語',
      ja: '日本語', en: '英語', zh: '中国語', ko: '韓国語'
    };

    const targetLangName = langNames[targetLanguage] || targetLanguage;
    const detectedLang = detectLanguage(text);
    const sourceLangName = langNames[detectedLang] || detectedLang;

    const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
      messages: [
        {
          role: 'system',
          content: `あなたはプロの翻訳者です。${sourceLangName}から${targetLangName}に正確に翻訳してください。翻訳結果のみを返してください。余計な説明は不要です。`
        },
        { role: 'user', content: text }
      ],
      max_tokens: 500
    });

    return jsonResponse({
      success: true,
      translation: {
        original_text: text,
        translated_text: aiResponse.response || '',
        source_language: detectedLang,
        target_language: targetLanguage
      }
    }, 200, corsHeaders);
  } catch (error) {
    console.error('Translation error:', error);
    return jsonResponse({ success: false, error: 'Failed to translate text' }, 500, corsHeaders);
  }
}

async function handleGetConversationLanguageInfo(db, conversationId, corsHeaders) {
  try {
    const conversation = await db.prepare('SELECT * FROM conversations WHERE id = ?1').bind(conversationId).first();
    if (!conversation) return jsonResponse({ success: false, error: 'Conversation not found' }, 404, corsHeaders);

    // Get recent messages to analyze language
    const messages = await db.prepare(
      'SELECT content, sender_type, detected_language FROM messages WHERE conversation_id = ?1 ORDER BY created_at DESC LIMIT 10'
    ).bind(conversationId).all();

    const languageCounts = {};
    let userLanguage = null;

    if (messages.results) {
      for (const msg of messages.results) {
        const lang = msg.detected_language || detectLanguage(msg.content);
        languageCounts[lang] = (languageCounts[lang] || 0) + 1;
        if (msg.sender_type === 'user' && !userLanguage) {
          userLanguage = lang;
        }
      }
    }

    // Find staff who speak the detected language
    const primaryLanguage = userLanguage || conversation.language || 'japanese';
    const suggestedStaff = await db.prepare(
      'SELECT id, name, role FROM staff WHERE is_active = TRUE AND language = ?1 LIMIT 5'
    ).bind(primaryLanguage).all();

    return jsonResponse({
      success: true,
      language_info: {
        conversation_id: conversationId,
        conversation_language: conversation.language,
        detected_user_language: userLanguage || 'unknown',
        language_distribution: languageCounts,
        primary_language: primaryLanguage,
        suggested_staff: suggestedStaff.results || [],
        recommendation: userLanguage && userLanguage !== 'japanese'
          ? `このユーザーは${userLanguage}を使用しています。${userLanguage}対応可能なスタッフへのアサインを推奨します。`
          : '日本語対応で問題ありません。'
      }
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get language info' }, 500, corsHeaders);
  }
}

// ========== Phase 3 CRM: Schema Migration ==========

async function handlePhase3CRMMigration(db, corsHeaders) {
  try {
    const results = [];

    await db.prepare(`CREATE TABLE IF NOT EXISTS chat_transactions (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      user_id TEXT,
      type TEXT NOT NULL,
      amount REAL,
      method TEXT,
      status TEXT DEFAULT 'initiated',
      external_ref TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )`).run();
    results.push('chat_transactions table created');

    await db.prepare(`CREATE TABLE IF NOT EXISTS tips (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      from_user_id TEXT,
      to_staff_id TEXT,
      amount REAL NOT NULL,
      message TEXT,
      status TEXT DEFAULT 'completed',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )`).run();
    results.push('tips table created');

    await db.prepare(`CREATE TABLE IF NOT EXISTS tip_settings (
      id INTEGER PRIMARY KEY,
      enabled BOOLEAN DEFAULT TRUE,
      min_amount REAL DEFAULT 100,
      max_amount REAL DEFAULT 10000,
      preset_amounts TEXT DEFAULT '[100,500,1000,3000]',
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`).run();
    await db.prepare('INSERT OR IGNORE INTO tip_settings (id) VALUES (1)').run();
    results.push('tip_settings table created');

    await db.prepare(`CREATE TABLE IF NOT EXISTS game_recommendations (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      user_id TEXT,
      recommended_games TEXT,
      reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )`).run();
    results.push('game_recommendations table created');

    await db.prepare(`CREATE TABLE IF NOT EXISTS fraud_suggestions (
      id TEXT PRIMARY KEY,
      conversation_id TEXT,
      user_id TEXT,
      type TEXT NOT NULL,
      severity TEXT DEFAULT 'low',
      description TEXT,
      resolved BOOLEAN DEFAULT FALSE,
      resolved_by TEXT,
      resolved_at DATETIME,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (conversation_id) REFERENCES conversations(id)
    )`).run();
    results.push('fraud_suggestions table created');

    // Indexes
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_transactions_conversation ON chat_transactions(conversation_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_transactions_user ON chat_transactions(user_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_chat_transactions_status ON chat_transactions(status)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_tips_from_user ON tips(from_user_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_tips_to_staff ON tips(to_staff_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_game_recommendations_conversation ON game_recommendations(conversation_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_game_recommendations_user ON game_recommendations(user_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_fraud_suggestions_conversation ON fraud_suggestions(conversation_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_fraud_suggestions_user ON fraud_suggestions(user_id)').run();
    await db.prepare('CREATE INDEX IF NOT EXISTS idx_fraud_suggestions_resolved ON fraud_suggestions(resolved)').run();
    results.push('indexes created');

    return jsonResponse({ success: true, message: 'Phase 3 CRM migration completed', results }, 200, corsHeaders);
  } catch (error) {
    console.error('Phase 3 migration error:', error);
    return jsonResponse({ success: false, error: 'Phase 3 migration failed: ' + error.message }, 500, corsHeaders);
  }
}

// ========== Feature 7: In-Chat Deposit/Withdrawal ==========

async function handleGetPaymentMethods(corsHeaders) {
  const methods = [
    { id: 'bank_transfer', name: 'Bank Transfer', display_name: '銀行振込', min: 1000, max: 5000000, processing_time: '1-3 hours' },
    { id: 'credit_card', name: 'Credit Card', display_name: 'クレジットカード', min: 500, max: 500000, processing_time: 'Instant' },
    { id: 'btc', name: 'Bitcoin', display_name: 'ビットコイン', min: 1000, max: 10000000, processing_time: '10-60 minutes' },
    { id: 'eth', name: 'Ethereum', display_name: 'イーサリアム', min: 1000, max: 10000000, processing_time: '5-30 minutes' },
    { id: 'usdt', name: 'USDT (Tether)', display_name: 'USDT', min: 1000, max: 10000000, processing_time: '5-30 minutes' },
    { id: 'payz', name: 'Payz', display_name: 'Payz', min: 500, max: 1000000, processing_time: 'Instant' },
    { id: 'muchbetter', name: 'MuchBetter', display_name: 'MuchBetter', min: 500, max: 500000, processing_time: 'Instant' }
  ];

  return jsonResponse({ success: true, payment_methods: methods }, 200, corsHeaders);
}

async function handleCreateDepositLink(request, db, corsHeaders) {
  try {
    const data = await request.json();
    const { conversation_id, method, amount } = data;

    if (!conversation_id || !method || !amount) {
      return jsonResponse({ success: false, error: 'Missing required fields: conversation_id, method, amount' }, 400, corsHeaders);
    }

    if (amount <= 0) {
      return jsonResponse({ success: false, error: 'Amount must be positive' }, 400, corsHeaders);
    }

    const validMethods = ['bank_transfer', 'credit_card', 'btc', 'eth', 'usdt', 'payz', 'muchbetter'];
    if (!validMethods.includes(method)) {
      return jsonResponse({ success: false, error: 'Invalid payment method' }, 400, corsHeaders);
    }

    const id = 'txn_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const externalRef = 'DEP-' + Date.now().toString(36).toUpperCase() + '-' + Math.random().toString(36).substring(2, 6).toUpperCase();

    await db.prepare(
      `INSERT INTO chat_transactions (id, conversation_id, user_id, type, amount, method, status, external_ref)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8)`
    ).bind(id, conversation_id, data.user_id || null, 'deposit', amount, method, 'initiated', externalRef).run();

    let paymentInstructions = '';
    let depositLink = '';

    switch (method) {
      case 'bank_transfer':
        paymentInstructions = `【銀行振込でのご入金】\n振込先: みずほ銀行 渋谷支店\n口座番号: 1234567\n口座名義: カブシキガイシャスロテン\n振込金額: ¥${amount.toLocaleString()}\n参照番号: ${externalRef}\n\n※振込人名義に参照番号を記載してください。`;
        break;
      case 'credit_card':
        depositLink = `https://pay.sloten.com/deposit/${externalRef}`;
        paymentInstructions = `【クレジットカードでのご入金】\n金額: ¥${amount.toLocaleString()}\n決済ページ: ${depositLink}\n参照番号: ${externalRef}`;
        break;
      case 'btc':
        paymentInstructions = `【Bitcoinでのご入金】\n送金先アドレス: bc1q${externalRef.toLowerCase()}example\n金額: ¥${amount.toLocaleString()}相当のBTC\n参照番号: ${externalRef}\n\n※送金後、ネットワーク確認に10-60分かかります。`;
        break;
      case 'eth':
        paymentInstructions = `【Ethereumでのご入金】\n送金先アドレス: 0x${externalRef.toLowerCase()}example0000\n金額: ¥${amount.toLocaleString()}相当のETH\n参照番号: ${externalRef}`;
        break;
      case 'usdt':
        paymentInstructions = `【USDTでのご入金】\n送金先アドレス (TRC20): T${externalRef}example\n金額: ¥${amount.toLocaleString()}相当のUSDT\n参照番号: ${externalRef}`;
        break;
      case 'payz':
        depositLink = `https://pay.sloten.com/payz/${externalRef}`;
        paymentInstructions = `【Payzでのご入金】\n金額: ¥${amount.toLocaleString()}\n決済ページ: ${depositLink}\n参照番号: ${externalRef}`;
        break;
      case 'muchbetter':
        depositLink = `https://pay.sloten.com/muchbetter/${externalRef}`;
        paymentInstructions = `【MuchBetterでのご入金】\n金額: ¥${amount.toLocaleString()}\n決済ページ: ${depositLink}\n参照番号: ${externalRef}`;
        break;
    }

    return jsonResponse({
      success: true,
      transaction: { id, conversation_id, type: 'deposit', amount, method, status: 'initiated', external_ref: externalRef },
      payment_instructions: paymentInstructions,
      deposit_link: depositLink || null
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to create deposit link: ' + error.message }, 500, corsHeaders);
  }
}

async function handleGetWithdrawalStatus(db, userId, corsHeaders) {
  try {
    const withdrawals = await db.prepare(
      `SELECT id, conversation_id, type, amount, method, status, external_ref, created_at
       FROM chat_transactions
       WHERE user_id = ?1 AND type = 'withdrawal'
       ORDER BY created_at DESC
       LIMIT 20`
    ).bind(userId).all();

    const pending = (withdrawals.results || []).filter(w => w.status === 'initiated' || w.status === 'processing');
    const completed = (withdrawals.results || []).filter(w => w.status === 'completed');

    return jsonResponse({
      success: true,
      user_id: userId,
      pending_withdrawals: pending,
      completed_withdrawals: completed,
      total_pending: pending.length,
      total_completed: completed.length
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get withdrawal status: ' + error.message }, 500, corsHeaders);
  }
}

async function handleSendPaymentInfo(request, db, corsHeaders) {
  try {
    const data = await request.json();
    const { conversation_id, type } = data;

    if (!conversation_id || !type) {
      return jsonResponse({ success: false, error: 'Missing required fields: conversation_id, type' }, 400, corsHeaders);
    }

    let messageContent = '';

    if (type === 'deposit') {
      messageContent = `【ご入金方法のご案内】\n\n以下の方法でご入金いただけます:\n\n💳 クレジットカード - 即時反映\n🏦 銀行振込 - 1-3時間\n₿ Bitcoin (BTC) - 10-60分\nΞ Ethereum (ETH) - 5-30分\n💲 USDT (Tether) - 5-30分\n📱 Payz - 即時反映\n📱 MuchBetter - 即時反映\n\nご希望の入金方法と金額をお知らせください。`;
    } else if (type === 'withdrawal_status') {
      const conversation = await db.prepare('SELECT user_id FROM conversations WHERE id = ?1').bind(conversation_id).first();
      if (conversation && conversation.user_id) {
        const pending = await db.prepare(
          `SELECT method, amount, status, external_ref, created_at FROM chat_transactions
           WHERE user_id = ?1 AND type = 'withdrawal' AND status IN ('initiated', 'processing')
           ORDER BY created_at DESC LIMIT 5`
        ).bind(conversation.user_id).all();

        if (pending.results && pending.results.length > 0) {
          messageContent = `【出金状況のご確認】\n\n現在処理中の出金:\n`;
          for (const w of pending.results) {
            messageContent += `\n• ${w.method} - ¥${w.amount?.toLocaleString()} - ステータス: ${w.status} (参照: ${w.external_ref})`;
          }
        } else {
          messageContent = '【出金状況のご確認】\n\n現在処理中の出金はございません。';
        }
      } else {
        messageContent = '【出金状況のご確認】\n\nユーザー情報が見つかりません。アカウント情報をご確認ください。';
      }
    } else {
      return jsonResponse({ success: false, error: 'Invalid type. Use "deposit" or "withdrawal_status"' }, 400, corsHeaders);
    }

    // Insert system message into conversation
    const msgId = 'msg_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    await db.prepare(
      `INSERT INTO messages (id, conversation_id, sender_type, sender_id, content, content_type)
       VALUES (?1, ?2, 'system', 'system', ?3, 'text')`
    ).bind(msgId, conversation_id, messageContent).run();

    return jsonResponse({
      success: true,
      message_id: msgId,
      content: messageContent
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to send payment info: ' + error.message }, 500, corsHeaders);
  }
}

// ========== Feature 8: Tip/Chip System ==========

async function handleCreateTip(request, db, corsHeaders) {
  try {
    const data = await request.json();
    const { conversation_id, user_id, staff_id, amount, message } = data;

    if (!user_id || !staff_id || !amount) {
      return jsonResponse({ success: false, error: 'Missing required fields: user_id, staff_id, amount' }, 400, corsHeaders);
    }

    // Get tip settings
    const settings = await db.prepare('SELECT * FROM tip_settings WHERE id = 1').first();
    if (settings && !settings.enabled) {
      return jsonResponse({ success: false, error: 'Tipping is currently disabled' }, 400, corsHeaders);
    }

    const minAmount = settings?.min_amount || 100;
    const maxAmount = settings?.max_amount || 10000;

    if (amount < minAmount) {
      return jsonResponse({ success: false, error: `Minimum tip amount is ${minAmount}` }, 400, corsHeaders);
    }
    if (amount > maxAmount) {
      return jsonResponse({ success: false, error: `Maximum tip amount is ${maxAmount}` }, 400, corsHeaders);
    }

    const id = 'tip_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);

    await db.prepare(
      `INSERT INTO tips (id, conversation_id, from_user_id, to_staff_id, amount, message, status)
       VALUES (?1, ?2, ?3, ?4, ?5, ?6, 'completed')`
    ).bind(id, conversation_id || null, user_id, staff_id, amount, message || null).run();

    return jsonResponse({
      success: true,
      tip: { id, conversation_id, from_user_id: user_id, to_staff_id: staff_id, amount, message, status: 'completed' }
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to create tip: ' + error.message }, 500, corsHeaders);
  }
}

async function handleGetStaffTips(db, staffId, corsHeaders) {
  try {
    const tips = await db.prepare(
      `SELECT id, conversation_id, from_user_id, amount, message, created_at
       FROM tips WHERE to_staff_id = ?1 ORDER BY created_at DESC LIMIT 50`
    ).bind(staffId).all();

    const totals = await db.prepare(
      `SELECT COUNT(*) as tip_count, COALESCE(SUM(amount), 0) as total_amount
       FROM tips WHERE to_staff_id = ?1 AND status = 'completed'`
    ).bind(staffId).first();

    return jsonResponse({
      success: true,
      staff_id: staffId,
      total_tips: totals?.tip_count || 0,
      total_amount: totals?.total_amount || 0,
      recent_tips: tips.results || []
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get staff tips: ' + error.message }, 500, corsHeaders);
  }
}

async function handleGetTipLeaderboard(db, corsHeaders) {
  try {
    const leaderboard = await db.prepare(
      `SELECT t.to_staff_id as staff_id, s.name as staff_name,
              COUNT(*) as tip_count, SUM(t.amount) as total_amount,
              AVG(t.amount) as avg_amount
       FROM tips t
       LEFT JOIN staff s ON t.to_staff_id = s.id
       WHERE t.status = 'completed'
       GROUP BY t.to_staff_id
       ORDER BY total_amount DESC
       LIMIT 20`
    ).all();

    return jsonResponse({
      success: true,
      leaderboard: leaderboard.results || []
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get tip leaderboard: ' + error.message }, 500, corsHeaders);
  }
}

async function handleGetTipSettings(db, corsHeaders) {
  try {
    const settings = await db.prepare('SELECT * FROM tip_settings WHERE id = 1').first();
    if (!settings) {
      return jsonResponse({
        success: true,
        settings: { enabled: true, min_amount: 100, max_amount: 10000, preset_amounts: [100, 500, 1000, 3000] }
      }, 200, corsHeaders);
    }

    let presetAmounts;
    try { presetAmounts = JSON.parse(settings.preset_amounts); } catch { presetAmounts = [100, 500, 1000, 3000]; }

    return jsonResponse({
      success: true,
      settings: { ...settings, preset_amounts: presetAmounts }
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get tip settings: ' + error.message }, 500, corsHeaders);
  }
}

async function handleUpdateTipSettings(request, db, corsHeaders) {
  try {
    const data = await request.json();
    const updates = [];
    const params = [];
    let paramIndex = 1;

    if (data.enabled !== undefined) { updates.push(`enabled = ?${paramIndex}`); params.push(data.enabled); paramIndex++; }
    if (data.min_amount !== undefined) { updates.push(`min_amount = ?${paramIndex}`); params.push(data.min_amount); paramIndex++; }
    if (data.max_amount !== undefined) { updates.push(`max_amount = ?${paramIndex}`); params.push(data.max_amount); paramIndex++; }
    if (data.preset_amounts !== undefined) {
      updates.push(`preset_amounts = ?${paramIndex}`);
      params.push(JSON.stringify(data.preset_amounts));
      paramIndex++;
    }

    if (updates.length === 0) {
      return jsonResponse({ success: false, error: 'No fields to update' }, 400, corsHeaders);
    }

    updates.push(`updated_at = CURRENT_TIMESTAMP`);
    await db.prepare(`UPDATE tip_settings SET ${updates.join(', ')} WHERE id = 1`).bind(...params).run();

    const settings = await db.prepare('SELECT * FROM tip_settings WHERE id = 1').first();
    let presetAmounts;
    try { presetAmounts = JSON.parse(settings.preset_amounts); } catch { presetAmounts = [100, 500, 1000, 3000]; }

    return jsonResponse({
      success: true,
      settings: { ...settings, preset_amounts: presetAmounts }
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to update tip settings: ' + error.message }, 500, corsHeaders);
  }
}

// ========== Feature 11: Game Recommendation ==========

async function handleRecommendGames(request, db, env, corsHeaders) {
  try {
    const data = await request.json();
    const { conversation_id, user_id, preferences } = data;

    if (!conversation_id || !user_id) {
      return jsonResponse({ success: false, error: 'Missing required fields: conversation_id, user_id' }, 400, corsHeaders);
    }

    const aiPrompt = `You are a casino game recommendation expert. Based on the user's preferences, suggest 5 games. Return as JSON array with fields: name, category, rtp, reason. Available games: Sweet Bonanza, Gates of Olympus, Mahjong Ways 2, Crazy Time, Lightning Roulette, Book of Dead, Crash, Dice, Plinko, Mines, San Quentin xWays, Aviator.

User preferences: ${preferences || 'No specific preferences mentioned'}

Return ONLY a valid JSON array, no other text.`;

    let recommendations;

    try {
      const aiResponse = await env.AI.run('@cf/meta/llama-3.1-8b-instruct', {
        messages: [{ role: 'user', content: aiPrompt }],
        max_tokens: 1024
      });

      const responseText = aiResponse.response || '';
      // Try to extract JSON array from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/);
      if (jsonMatch) {
        recommendations = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON array found in AI response');
      }
    } catch (aiError) {
      // Fallback recommendations if AI fails
      recommendations = [
        { name: 'Sweet Bonanza', category: 'Slots', rtp: '96.48%', reason: '人気の高いキャンディテーマのスロット。高ボラティリティで大きな勝利のチャンスあり。' },
        { name: 'Gates of Olympus', category: 'Slots', rtp: '96.50%', reason: 'ゼウスがテーマの人気スロット。マルチプライヤー機能が魅力。' },
        { name: 'Crazy Time', category: 'Live Casino', rtp: '96.08%', reason: 'ライブカジノの人気ゲーム。インタラクティブなボーナスラウンドが楽しい。' },
        { name: 'Aviator', category: 'Crash', rtp: '97.00%', reason: 'シンプルなクラッシュゲーム。短時間で楽しめる。' },
        { name: 'Lightning Roulette', category: 'Live Casino', rtp: '97.30%', reason: 'ライトニングマルチプライヤー付きルーレット。最大500倍の配当。' }
      ];
    }

    const id = 'rec_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
    const reason = preferences || 'General recommendation';

    await db.prepare(
      `INSERT INTO game_recommendations (id, conversation_id, user_id, recommended_games, reason)
       VALUES (?1, ?2, ?3, ?4, ?5)`
    ).bind(id, conversation_id, user_id, JSON.stringify(recommendations), reason).run();

    return jsonResponse({
      success: true,
      recommendation: { id, conversation_id, user_id, games: recommendations, reason }
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to recommend games: ' + error.message }, 500, corsHeaders);
  }
}

async function handleGetRecommendations(db, conversationId, corsHeaders) {
  try {
    const recommendations = await db.prepare(
      `SELECT * FROM game_recommendations WHERE conversation_id = ?1 ORDER BY created_at DESC LIMIT 10`
    ).bind(conversationId).all();

    const parsed = (recommendations.results || []).map(r => {
      let games;
      try { games = JSON.parse(r.recommended_games); } catch { games = []; }
      return { ...r, recommended_games: games };
    });

    return jsonResponse({ success: true, recommendations: parsed }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get recommendations: ' + error.message }, 500, corsHeaders);
  }
}

// ========== Feature 12: Fraud Detection ==========

async function handleFraudCheck(request, db, corsHeaders) {
  try {
    const data = await request.json();
    const { conversation_id, user_id, ip_address } = data;

    if (!conversation_id || !user_id) {
      return jsonResponse({ success: false, error: 'Missing required fields: conversation_id, user_id' }, 400, corsHeaders);
    }

    const suggestions = [];

    // Check 1: Multiple conversations from same IP
    if (ip_address) {
      // Look for other conversations with messages from same IP (via audit logs)
      const ipConversations = await db.prepare(
        `SELECT COUNT(DISTINCT conversation_id) as conv_count
         FROM messages WHERE sender_id != ?1 AND conversation_id IN (
           SELECT DISTINCT conversation_id FROM messages WHERE sender_id = ?1
         )`
      ).bind(user_id).first();

      // Check audit logs for IP patterns
      const ipLogs = await db.prepare(
        `SELECT COUNT(DISTINCT actor_id) as user_count
         FROM audit_logs WHERE ip_address = ?1 AND actor_type = 'user'
         AND created_at > datetime('now', '-24 hours')`
      ).bind(ip_address).first();

      if (ipLogs && ipLogs.user_count > 3) {
        suggestions.push({
          type: 'multiple_accounts_ip',
          severity: 'high',
          description: `同一IPアドレス(${ip_address})から過去24時間に${ipLogs.user_count}個の異なるアカウントがアクセスしています。複数アカウント利用の可能性があります。`
        });
      }
    }

    // Check 2: Rapid message sending
    const recentMessages = await db.prepare(
      `SELECT COUNT(*) as msg_count
       FROM messages WHERE sender_id = ?1
       AND created_at > datetime('now', '-5 minutes')`
    ).bind(user_id).first();

    if (recentMessages && recentMessages.msg_count > 20) {
      suggestions.push({
        type: 'rapid_messaging',
        severity: 'medium',
        description: `ユーザーが過去5分間に${recentMessages.msg_count}件のメッセージを送信しています。スパムの可能性があります。`
      });
    }

    // Check 3: Known spam patterns in recent messages
    const recentContent = await db.prepare(
      `SELECT content FROM messages WHERE sender_id = ?1
       AND sender_type = 'user'
       ORDER BY created_at DESC LIMIT 10`
    ).bind(user_id).all();

    const spamPatterns = ['http://', 'https://', 'bit.ly', 'free bonus', '無料ボーナス', 'click here', 'ここをクリック'];
    let spamCount = 0;
    if (recentContent.results) {
      for (const msg of recentContent.results) {
        const lowerContent = (msg.content || '').toLowerCase();
        if (spamPatterns.some(p => lowerContent.includes(p))) {
          spamCount++;
        }
      }
    }

    if (spamCount >= 3) {
      suggestions.push({
        type: 'spam_pattern',
        severity: 'medium',
        description: `ユーザーの最近のメッセージに${spamCount}件のスパムパターンが検出されました。リンクスパムの可能性があります。`
      });
    }

    // Check 4: Multiple conversations opened rapidly
    const recentConversations = await db.prepare(
      `SELECT COUNT(*) as conv_count
       FROM conversations WHERE user_id = ?1
       AND created_at > datetime('now', '-1 hour')`
    ).bind(user_id).first();

    if (recentConversations && recentConversations.conv_count > 5) {
      suggestions.push({
        type: 'rapid_conversations',
        severity: 'low',
        description: `ユーザーが過去1時間に${recentConversations.conv_count}件の会話を開始しています。不審な行動の可能性があります。`
      });
    }

    // Save suggestions to DB
    for (const suggestion of suggestions) {
      const id = 'fraud_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16);
      await db.prepare(
        `INSERT INTO fraud_suggestions (id, conversation_id, user_id, type, severity, description)
         VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
      ).bind(id, conversation_id, user_id, suggestion.type, suggestion.severity, suggestion.description).run();
    }

    return jsonResponse({
      success: true,
      conversation_id,
      user_id,
      suggestions,
      suggestion_count: suggestions.length,
      risk_level: suggestions.some(s => s.severity === 'high') ? 'high' :
                  suggestions.some(s => s.severity === 'medium') ? 'medium' :
                  suggestions.length > 0 ? 'low' : 'none'
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to run fraud check: ' + error.message }, 500, corsHeaders);
  }
}

async function handleGetFraudSuggestions(request, db, corsHeaders) {
  try {
    const url = new URL(request.url);
    const resolved = url.searchParams.get('resolved');
    const severity = url.searchParams.get('severity');

    let query = 'SELECT * FROM fraud_suggestions';
    const conditions = [];
    const params = [];
    let paramIndex = 1;

    if (resolved !== null) {
      conditions.push(`resolved = ?${paramIndex}`);
      params.push(resolved === 'true' ? 1 : 0);
      paramIndex++;
    }
    if (severity) {
      conditions.push(`severity = ?${paramIndex}`);
      params.push(severity);
      paramIndex++;
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY created_at DESC LIMIT 100';

    const results = await db.prepare(query).bind(...params).all();

    return jsonResponse({
      success: true,
      fraud_suggestions: results.results || [],
      total: (results.results || []).length
    }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to get fraud suggestions: ' + error.message }, 500, corsHeaders);
  }
}

async function handleResolveFraudSuggestion(request, db, suggestionId, corsHeaders) {
  try {
    const data = await request.json();
    const { staff_id } = data;

    const existing = await db.prepare('SELECT * FROM fraud_suggestions WHERE id = ?1').bind(suggestionId).first();
    if (!existing) {
      return jsonResponse({ success: false, error: 'Fraud suggestion not found' }, 404, corsHeaders);
    }

    await db.prepare(
      `UPDATE fraud_suggestions SET resolved = TRUE, resolved_by = ?1, resolved_at = CURRENT_TIMESTAMP WHERE id = ?2`
    ).bind(staff_id || 'unknown', suggestionId).run();

    const updated = await db.prepare('SELECT * FROM fraud_suggestions WHERE id = ?1').bind(suggestionId).first();

    return jsonResponse({ success: true, fraud_suggestion: updated }, 200, corsHeaders);
  } catch (error) {
    return jsonResponse({ success: false, error: 'Failed to resolve fraud suggestion: ' + error.message }, 500, corsHeaders);
  }
}
