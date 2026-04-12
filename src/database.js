/**
 * Database utility functions for Chatwoot replacement system
 */

// User Management
export async function createUser(db, userData) {
  const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  
  const user = {
    id: userId,
    email: userData.email || null,
    name: userData.name || 'ゲスト',
    language: userData.language || 'japanese',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    is_active: true
  };

  await db.prepare(
    `INSERT INTO users (id, email, name, language, created_at, updated_at, is_active)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)`
  ).bind(
    user.id, user.email, user.name, user.language, 
    user.created_at, user.updated_at, user.is_active
  ).run();

  return user;
}

export async function getUserById(db, userId) {
  const result = await db.prepare("SELECT * FROM users WHERE id = ?1").bind(userId).first();
  return result;
}

// Conversation Management
export async function createConversation(db, userId, title = null) {
  const conversationId = `conv_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  
  const conversation = {
    id: conversationId,
    user_id: userId,
    status: 'open',
    priority: 'normal',
    title: title || 'New Conversation',
    language: 'japanese',
    last_message_at: new Date().toISOString(),
    created_at: new Date().toISOString(),
    ai_handled: false,
    total_messages: 0
  };

  await db.prepare(
    `INSERT INTO conversations (id, user_id, status, priority, title, language, 
     last_message_at, created_at, ai_handled, total_messages)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10)`
  ).bind(
    conversation.id, conversation.user_id, conversation.status, conversation.priority,
    conversation.title, conversation.language, conversation.last_message_at,
    conversation.created_at, conversation.ai_handled, conversation.total_messages
  ).run();

  return conversation;
}

export async function getConversationById(db, conversationId) {
  const result = await db.prepare(`
    SELECT c.*, u.name as user_name, u.email as user_email,
           s.name as staff_name, s.email as staff_email
    FROM conversations c
    LEFT JOIN users u ON c.user_id = u.id
    LEFT JOIN staff s ON c.assigned_staff_id = s.id
    WHERE c.id = ?1
  `).bind(conversationId).first();
  
  return result;
}

export async function updateConversation(db, conversationId, updates) {
  const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
  const values = Object.values(updates);
  values.push(conversationId);
  
  await db.prepare(
    `UPDATE conversations SET ${setClause}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`
  ).bind(...values).run();
}

// Message Management
export async function addMessage(db, messageData) {
  const messageId = `msg_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;
  
  const message = {
    id: messageId,
    conversation_id: messageData.conversation_id,
    sender_type: messageData.sender_type || 'user',
    sender_id: messageData.sender_id || null,
    content: messageData.content,
    content_type: messageData.content_type || 'text',
    ai_processed: messageData.ai_processed || false,
    ai_confidence: messageData.ai_confidence || null,
    detected_language: messageData.detected_language || null,
    detected_intent: messageData.detected_intent || null,
    created_at: new Date().toISOString()
  };

  await db.prepare(
    `INSERT INTO messages (id, conversation_id, sender_type, sender_id, content, 
     content_type, ai_processed, ai_confidence, detected_language, detected_intent, created_at)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9, ?10, ?11)`
  ).bind(
    message.id, message.conversation_id, message.sender_type, message.sender_id,
    message.content, message.content_type, message.ai_processed, message.ai_confidence,
    message.detected_language, message.detected_intent, message.created_at
  ).run();

  // Update conversation
  await db.prepare(
    `UPDATE conversations 
     SET total_messages = total_messages + 1, last_message_at = CURRENT_TIMESTAMP 
     WHERE id = ?1`
  ).bind(messageData.conversation_id).run();

  return message;
}

export async function getConversationMessages(db, conversationId, limit = 50, offset = 0) {
  const results = await db.prepare(`
    SELECT m.*, 
           CASE 
             WHEN m.sender_type = 'user' THEN u.name
             WHEN m.sender_type = 'staff' THEN s.name
             WHEN m.sender_type = 'ai' THEN 'AI Assistant'
             ELSE 'System'
           END as sender_name
    FROM messages m
    LEFT JOIN users u ON m.sender_type = 'user' AND m.sender_id = u.id
    LEFT JOIN staff s ON m.sender_type = 'staff' AND m.sender_id = s.id
    WHERE m.conversation_id = ?1
    ORDER BY m.created_at ASC
    LIMIT ?2 OFFSET ?3
  `).bind(conversationId, limit, offset).all();
  
  return results.results || [];
}

// Tag Management
export async function addTagToConversation(db, conversationId, tagId, staffId) {
  await db.prepare(
    `INSERT OR IGNORE INTO conversation_tags (conversation_id, tag_id, added_by_staff_id)
     VALUES (?1, ?2, ?3)`
  ).bind(conversationId, tagId, staffId).run();
}

export async function getConversationTags(db, conversationId) {
  const results = await db.prepare(`
    SELECT t.* FROM tags t
    JOIN conversation_tags ct ON t.id = ct.tag_id
    WHERE ct.conversation_id = ?1 AND t.is_active = TRUE
  `).bind(conversationId).all();
  
  return results.results || [];
}

export async function getAllTags(db) {
  const results = await db.prepare(
    "SELECT * FROM tags WHERE is_active = TRUE ORDER BY name"
  ).all();
  
  return results.results || [];
}

// Staff Management
export async function getOnlineStaff(db) {
  const results = await db.prepare(
    "SELECT * FROM staff WHERE is_online = TRUE AND is_active = TRUE"
  ).all();
  
  return results.results || [];
}

export async function assignConversation(db, conversationId, staffId) {
  await db.prepare(
    `UPDATE conversations 
     SET assigned_staff_id = ?1, status = 'in_progress', updated_at = CURRENT_TIMESTAMP
     WHERE id = ?2`
  ).bind(staffId, conversationId).run();
}

// Analytics
export async function recordAnalyticsMetric(db, metricType, value, dimension1 = null, dimension2 = null) {
  const today = new Date().toISOString().split('T')[0];
  const metricId = `analytics_${Date.now()}_${Math.random().toString(36).substr(2, 8)}`;

  await db.prepare(
    `INSERT INTO analytics (id, date, metric_type, metric_value, dimension_1, dimension_2)
     VALUES (?1, ?2, ?3, ?4, ?5, ?6)`
  ).bind(metricId, today, metricType, value, dimension1, dimension2).run();
}

export async function getAnalyticsData(db, startDate, endDate, metricType = null) {
  let query = `
    SELECT date, metric_type, SUM(metric_value) as total_value, dimension_1, dimension_2
    FROM analytics 
    WHERE date BETWEEN ?1 AND ?2
  `;
  
  const params = [startDate, endDate];
  
  if (metricType) {
    query += ` AND metric_type = ?3`;
    params.push(metricType);
  }
  
  query += ` GROUP BY date, metric_type, dimension_1, dimension_2 ORDER BY date DESC`;
  
  const results = await db.prepare(query).bind(...params).all();
  return results.results || [];
}

// Dashboard queries
export async function getDashboardStats(db) {
  const today = new Date().toISOString().split('T')[0];
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  // Total conversations
  const totalConversations = await db.prepare("SELECT COUNT(*) as count FROM conversations").first();
  
  // Open conversations
  const openConversations = await db.prepare("SELECT COUNT(*) as count FROM conversations WHERE status = 'open'").first();
  
  // Today's conversations
  const todayConversations = await db.prepare(
    "SELECT COUNT(*) as count FROM conversations WHERE DATE(created_at) = ?1"
  ).bind(today).first();
  
  // Weekly conversations
  const weeklyConversations = await db.prepare(
    "SELECT COUNT(*) as count FROM conversations WHERE DATE(created_at) >= ?1"
  ).bind(sevenDaysAgo).first();
  
  // AI resolution rate
  const aiResolutionRate = await db.prepare(`
    SELECT 
      (COUNT(CASE WHEN ai_handled = TRUE THEN 1 END) * 100.0 / COUNT(*)) as rate
    FROM conversations 
    WHERE status = 'resolved'
  `).first();

  return {
    total_conversations: totalConversations?.count || 0,
    open_conversations: openConversations?.count || 0,
    today_conversations: todayConversations?.count || 0,
    weekly_conversations: weeklyConversations?.count || 0,
    ai_resolution_rate: Math.round(aiResolutionRate?.rate || 0)
  };
}

// Settings
export async function getSetting(db, key) {
  const result = await db.prepare("SELECT value FROM settings WHERE key = ?1").bind(key).first();
  return result?.value || null;
}

export async function setSetting(db, key, value, staffId = null) {
  await db.prepare(
    `INSERT OR REPLACE INTO settings (key, value, updated_at, updated_by_staff_id)
     VALUES (?1, ?2, CURRENT_TIMESTAMP, ?3)`
  ).bind(key, value, staffId).run();
}