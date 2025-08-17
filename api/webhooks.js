import { AuthUtils } from '../utils/auth.js';
import database from '../database/database.js';
import memoryDatabase from '../database/memoryDatabase.js';
import { v4 as uuidv4 } from 'uuid';
import crypto from 'crypto';
import fetch from 'node-fetch';

// Use memory database in serverless environment
const getDatabase = () => {
  const isServerless = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
  return isServerless ? memoryDatabase : database;
};

export default async function handler(req, res) {
  // Set CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, PUT, DELETE, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');
  
  // Handle OPTIONS request
  if (req.method === 'OPTIONS') {
    res.status(200).end();
    return;
  }

  // Check if webhooks are enabled
  if (process.env.ENABLE_WEBHOOKS !== 'true') {
    return res.status(404).json({
      success: false,
      message: 'Webhooks are not enabled'
    });
  }

  // Authentication required for webhook management
  const authHeader = req.headers['authorization'];
  const token = AuthUtils.extractTokenFromHeader(authHeader);

  if (!token) {
    return res.status(401).json({
      success: false,
      message: 'Access denied. No token provided.'
    });
  }

  const user = AuthUtils.verifyToken(token);
  if (!user) {
    return res.status(401).json({
      success: false,
      message: 'Invalid token.'
    });
  }

  const { method } = req;
  const pathSegments = req.url.split('/').filter(Boolean);
  const action = pathSegments[2]; // /api/webhooks/[action]

  switch (method) {
    case 'GET':
      if (action === 'list') {
        return listWebhooks(req, res, user);
      } else if (action) {
        return getWebhook(req, res, user, action);
      }
      return listWebhooks(req, res, user);

    case 'POST':
      if (action === 'create') {
        return createWebhook(req, res, user);
      } else if (action === 'test') {
        return testWebhook(req, res, user);
      } else if (action === 'trigger') {
        return triggerWebhook(req, res, user);
      }
      break;

    case 'PUT':
      if (action) {
        return updateWebhook(req, res, user, action);
      }
      break;

    case 'DELETE':
      if (action) {
        return deleteWebhook(req, res, user, action);
      }
      break;

    default:
      res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
      return res.status(405).json({
        success: false,
        message: `Method ${method} not allowed`
      });
  }
}

// List all webhooks for user
async function listWebhooks(req, res, user) {
  try {
    const db = getDatabase();
    await db.initialize();

    // Create webhooks table if it doesn't exist
    await db.run(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        secret TEXT,
        events TEXT NOT NULL,
        active BOOLEAN DEFAULT 1,
        headers TEXT,
        retry_count INTEGER DEFAULT 3,
        timeout INTEGER DEFAULT 30000,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const webhooks = await db.query(
      `SELECT * FROM webhooks WHERE user_id = ? ORDER BY created_at DESC`,
      [user.id]
    );

    res.status(200).json({
      success: true,
      data: webhooks.map(w => ({
        ...w,
        events: JSON.parse(w.events || '[]'),
        headers: JSON.parse(w.headers || '{}')
      }))
    });

  } catch (error) {
    console.error('List webhooks error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to list webhooks'
    });
  }
}

// Get single webhook
async function getWebhook(req, res, user, webhookId) {
  try {
    const db = getDatabase();
    await db.initialize();

    const result = await db.query(
      `SELECT * FROM webhooks WHERE id = ? AND user_id = ?`,
      [webhookId, user.id]
    );
    const webhook = result[0];

    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    res.status(200).json({
      success: true,
      data: {
        ...webhook,
        events: JSON.parse(webhook.events || '[]'),
        headers: JSON.parse(webhook.headers || '{}')
      }
    });

  } catch (error) {
    console.error('Get webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to get webhook'
    });
  }
}

// Create new webhook
async function createWebhook(req, res, user) {
  try {
    const { name, url, events, secret, headers, active = true } = req.body;

    if (!name || !url || !events || events.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Name, URL, and events are required'
      });
    }

    // Validate URL
    try {
      new URL(url);
    } catch (err) {
      return res.status(400).json({
        success: false,
        message: 'Invalid webhook URL'
      });
    }

    const db = getDatabase();
    await db.initialize();

    // Create webhooks table if it doesn't exist
    await db.run(`
      CREATE TABLE IF NOT EXISTS webhooks (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        secret TEXT,
        events TEXT NOT NULL,
        active BOOLEAN DEFAULT 1,
        headers TEXT,
        retry_count INTEGER DEFAULT 3,
        timeout INTEGER DEFAULT 30000,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    const webhookId = uuidv4();
    const webhookSecret = secret || crypto.randomBytes(32).toString('hex');

    await db.run(
      `INSERT INTO webhooks (id, user_id, name, url, secret, events, active, headers)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        webhookId,
        user.id,
        name,
        url,
        webhookSecret,
        JSON.stringify(events),
        active ? 1 : 0,
        JSON.stringify(headers || {})
      ]
    );

    res.status(201).json({
      success: true,
      data: {
        id: webhookId,
        secret: webhookSecret
      }
    });

  } catch (error) {
    console.error('Create webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to create webhook'
    });
  }
}

// Update webhook
async function updateWebhook(req, res, user, webhookId) {
  try {
    const { name, url, events, active, headers } = req.body;

    const db = getDatabase();
    await db.initialize();

    // Check if webhook exists and belongs to user
    const result = await db.query(
      `SELECT * FROM webhooks WHERE id = ? AND user_id = ?`,
      [webhookId, user.id]
    );
    const webhook = result[0];

    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    // Build update query
    const updates = [];
    const values = [];

    if (name !== undefined) {
      updates.push('name = ?');
      values.push(name);
    }
    if (url !== undefined) {
      updates.push('url = ?');
      values.push(url);
    }
    if (events !== undefined) {
      updates.push('events = ?');
      values.push(JSON.stringify(events));
    }
    if (active !== undefined) {
      updates.push('active = ?');
      values.push(active ? 1 : 0);
    }
    if (headers !== undefined) {
      updates.push('headers = ?');
      values.push(JSON.stringify(headers));
    }

    if (updates.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No fields to update'
      });
    }

    values.push(webhookId);
    await db.run(
      `UPDATE webhooks SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP WHERE id = ?`,
      values
    );

    res.status(200).json({
      success: true,
      message: 'Webhook updated successfully'
    });

  } catch (error) {
    console.error('Update webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to update webhook'
    });
  }
}

// Delete webhook
async function deleteWebhook(req, res, user, webhookId) {
  try {
    const db = getDatabase();
    await db.initialize();

    // Check if webhook exists and belongs to user
    const result = await db.query(
      `SELECT * FROM webhooks WHERE id = ? AND user_id = ?`,
      [webhookId, user.id]
    );
    const webhook = result[0];

    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    await db.run('DELETE FROM webhooks WHERE id = ?', [webhookId]);

    res.status(200).json({
      success: true,
      message: 'Webhook deleted successfully'
    });

  } catch (error) {
    console.error('Delete webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to delete webhook'
    });
  }
}

// Test webhook
async function testWebhook(req, res, user) {
  try {
    const { webhookId } = req.body;

    const db = getDatabase();
    await db.initialize();

    const result = await db.query(
      `SELECT * FROM webhooks WHERE id = ? AND user_id = ?`,
      [webhookId, user.id]
    );
    const webhook = result[0];

    if (!webhook) {
      return res.status(404).json({
        success: false,
        message: 'Webhook not found'
      });
    }

    // Send test payload
    const testPayload = {
      event: 'webhook.test',
      timestamp: new Date().toISOString(),
      data: {
        message: 'This is a test webhook payload',
        webhook_id: webhookId,
        webhook_name: webhook.name
      }
    };

    const success = await sendWebhook(webhook, testPayload);

    res.status(200).json({
      success,
      message: success ? 'Test webhook sent successfully' : 'Failed to send test webhook'
    });

  } catch (error) {
    console.error('Test webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to test webhook'
    });
  }
}

// Trigger webhook for specific event
async function triggerWebhook(req, res, user) {
  try {
    const { event, data } = req.body;

    if (!event) {
      return res.status(400).json({
        success: false,
        message: 'Event type is required'
      });
    }

    const db = getDatabase();
    await db.initialize();

    // Find all active webhooks for this user that subscribe to this event
    const webhooks = await db.query(
      `SELECT * FROM webhooks 
       WHERE user_id = ? AND active = 1 AND events LIKE ?`,
      [user.id, `%"${event}"%`]
    );

    const results = [];
    for (const webhook of webhooks) {
      const payload = {
        event,
        timestamp: new Date().toISOString(),
        data,
        user_id: user.id
      };

      const success = await sendWebhook(webhook, payload);
      results.push({
        webhook_id: webhook.id,
        webhook_name: webhook.name,
        success
      });
    }

    res.status(200).json({
      success: true,
      message: `Triggered ${results.length} webhooks`,
      results
    });

  } catch (error) {
    console.error('Trigger webhook error:', error);
    res.status(500).json({
      success: false,
      message: 'Failed to trigger webhooks'
    });
  }
}

// Send webhook payload
async function sendWebhook(webhook, payload, attempt = 1) {
  try {
    // Generate signature if secret is set
    let signature = null;
    if (webhook.secret) {
      const hmac = crypto.createHmac('sha256', webhook.secret);
      hmac.update(JSON.stringify(payload));
      signature = hmac.digest('hex');
    }

    // Parse custom headers
    const customHeaders = JSON.parse(webhook.headers || '{}');

    // Prepare headers
    const headers = {
      'Content-Type': 'application/json',
      'X-Webhook-Event': payload.event,
      'X-Webhook-Timestamp': payload.timestamp,
      'X-Webhook-Attempt': attempt.toString(),
      ...customHeaders
    };

    if (signature) {
      headers['X-Webhook-Signature'] = signature;
    }

    // Send webhook
    const response = await fetch(webhook.url, {
      method: 'POST',
      headers,
      body: JSON.stringify(payload),
      timeout: webhook.timeout || 30000
    });

    if (response.ok) {
      console.log(`Webhook sent successfully to ${webhook.url}`);
      await logWebhookDelivery(webhook.id, payload.event, 'success', response.status);
      return true;
    }

    // Retry logic
    if (attempt < (webhook.retry_count || 3)) {
      console.log(`Retrying webhook ${webhook.id}, attempt ${attempt + 1}`);
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt)); // Exponential backoff
      return sendWebhook(webhook, payload, attempt + 1);
    }

    console.error(`Webhook failed after ${attempt} attempts: ${response.status}`);
    await logWebhookDelivery(webhook.id, payload.event, 'failed', response.status);
    return false;

  } catch (error) {
    console.error('Send webhook error:', error);
    
    // Retry on network errors
    if (attempt < (webhook.retry_count || 3)) {
      await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
      return sendWebhook(webhook, payload, attempt + 1);
    }

    await logWebhookDelivery(webhook.id, payload.event, 'error', 0, error.message);
    return false;
  }
}

// Log webhook delivery
async function logWebhookDelivery(webhookId, event, status, httpStatus, error = null) {
  try {
    const db = getDatabase();
    await db.initialize();

    // Create webhook logs table if it doesn't exist
    await db.run(`
      CREATE TABLE IF NOT EXISTS webhook_logs (
        id TEXT PRIMARY KEY,
        webhook_id TEXT NOT NULL,
        event TEXT NOT NULL,
        status TEXT NOT NULL,
        http_status INTEGER,
        error TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);

    await db.run(
      `INSERT INTO webhook_logs (id, webhook_id, event, status, http_status, error)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [uuidv4(), webhookId, event, status, httpStatus, error]
    );

  } catch (error) {
    console.error('Log webhook delivery error:', error);
  }
}

// Export webhook trigger function for use in other modules
export async function triggerWebhookEvent(userId, event, data) {
  if (process.env.ENABLE_WEBHOOKS !== 'true') {
    return;
  }

  try {
    const db = getDatabase();
    await db.initialize();

    // Find all active webhooks for this user that subscribe to this event
    const webhooks = await db.query(
      `SELECT * FROM webhooks 
       WHERE user_id = ? AND active = 1 AND events LIKE ?`,
      [userId, `%"${event}"%`]
    );

    for (const webhook of webhooks) {
      const payload = {
        event,
        timestamp: new Date().toISOString(),
        data,
        user_id: userId
      };

      // Send webhook asynchronously
      setImmediate(() => sendWebhook(webhook, payload));
    }

  } catch (error) {
    console.error('Trigger webhook event error:', error);
  }
}