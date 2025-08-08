// Audit Logging Service
// Handles all audit logging for compliance and security tracking

import db from '../../database/database.js';

class AuditLogger {
  constructor() {
    this.severityLevels = {
      info: 'info',
      warning: 'warning',
      error: 'error',
      critical: 'critical'
    };
    
    this.eventCategories = {
      authentication: 'authentication',
      data: 'data',
      admin: 'admin',
      security: 'security',
      compliance: 'compliance',
      api: 'api'
    };
  }
  
  async logAuditEvent(eventData) {
    try {
      const {
        organization_id,
        user_id,
        event_type,
        event_category,
        event_severity = 'info',
        resource_type,
        resource_id,
        resource_name,
        event_data = {},
        ip_address,
        user_agent,
        data_classification,
        compliance_tags = [],
        status = 'success',
        error_message
      } = eventData;
      
      const now = new Date().toISOString();
      
      await db.run(
        `INSERT INTO audit_logs (
          organization_id, user_id, event_type, event_category, event_severity,
          resource_type, resource_id, resource_name, event_data,
          ip_address, user_agent, data_classification, compliance_tags,
          status, error_message, created_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          organization_id,
          user_id,
          event_type,
          event_category,
          event_severity,
          resource_type,
          resource_id,
          resource_name,
          JSON.stringify(event_data),
          ip_address,
          user_agent,
          data_classification,
          JSON.stringify(compliance_tags),
          status,
          error_message,
          now
        ]
      );
      
      // Check for critical events that need immediate attention
      if (event_severity === 'critical') {
        await this.handleCriticalEvent(eventData);
      }
      
      return true;
    } catch (error) {
      console.error('Audit logging error:', error);
      // Don't throw - audit logging failures shouldn't break the application
      return false;
    }
  }
  
  async handleCriticalEvent(eventData) {
    // In a production system, this would:
    // - Send alerts to security team
    // - Trigger automated responses
    // - Create incident tickets
    console.error('CRITICAL SECURITY EVENT:', eventData);
  }
  
  // Log authentication events
  async logAuthEvent(user_id, event_type, success, metadata = {}) {
    return this.logAuditEvent({
      user_id,
      event_type: `auth.${event_type}`,
      event_category: this.eventCategories.authentication,
      event_severity: success ? 'info' : 'warning',
      status: success ? 'success' : 'failed',
      event_data: metadata,
      ip_address: metadata.ip_address,
      user_agent: metadata.user_agent
    });
  }
  
  // Log data access events
  async logDataAccess(user_id, organization_id, resource_type, resource_id, action, data_classification = 'internal') {
    return this.logAuditEvent({
      organization_id,
      user_id,
      event_type: `data.${action}`,
      event_category: this.eventCategories.data,
      resource_type,
      resource_id,
      data_classification,
      compliance_tags: this.getComplianceTags(data_classification)
    });
  }
  
  // Log API access
  async logAPIAccess(api_key_id, endpoint, method, status_code, response_time_ms) {
    const apiKey = await db.get(
      `SELECT organization_id, user_id FROM api_keys WHERE id = ?`,
      [api_key_id]
    );
    
    if (!apiKey) return false;
    
    return this.logAuditEvent({
      organization_id: apiKey.organization_id,
      user_id: apiKey.user_id,
      event_type: 'api.request',
      event_category: this.eventCategories.api,
      event_data: {
        endpoint,
        method,
        status_code,
        response_time_ms
      },
      status: status_code < 400 ? 'success' : 'failed'
    });
  }
  
  // Log security events
  async logSecurityEvent(user_id, organization_id, event_type, severity, details) {
    return this.logAuditEvent({
      organization_id,
      user_id,
      event_type: `security.${event_type}`,
      event_category: this.eventCategories.security,
      event_severity: severity,
      event_data: details,
      compliance_tags: ['security_audit']
    });
  }
  
  // Get compliance tags based on data classification
  getComplianceTags(classification) {
    const tags = [];
    
    switch (classification) {
      case 'restricted':
        tags.push('GDPR', 'HIPAA', 'SOC2');
        break;
      case 'confidential':
        tags.push('GDPR', 'SOC2');
        break;
      case 'internal':
        tags.push('SOC2');
        break;
      default:
        break;
    }
    
    return tags;
  }
  
  // Generate compliance report
  async generateComplianceReport(organization_id, start_date, end_date, report_type) {
    const logs = await db.all(
      `SELECT * FROM audit_logs 
       WHERE organization_id = ? 
       AND created_at BETWEEN ? AND ?
       ORDER BY created_at DESC`,
      [organization_id, start_date, end_date]
    );
    
    const report = {
      organization_id,
      report_type,
      period: { start_date, end_date },
      summary: {
        total_events: logs.length,
        by_category: {},
        by_severity: {},
        by_user: {},
        failed_events: 0,
        critical_events: 0
      },
      details: []
    };
    
    // Analyze logs
    logs.forEach(log => {
      // Count by category
      report.summary.by_category[log.event_category] = 
        (report.summary.by_category[log.event_category] || 0) + 1;
      
      // Count by severity
      report.summary.by_severity[log.event_severity] = 
        (report.summary.by_severity[log.event_severity] || 0) + 1;
      
      // Count by user
      report.summary.by_user[log.user_id] = 
        (report.summary.by_user[log.user_id] || 0) + 1;
      
      // Count failures
      if (log.status === 'failed') {
        report.summary.failed_events++;
      }
      
      // Count critical events
      if (log.event_severity === 'critical') {
        report.summary.critical_events++;
      }
      
      // Add to details based on report type
      if (this.shouldIncludeInReport(log, report_type)) {
        report.details.push({
          timestamp: log.created_at,
          event_type: log.event_type,
          user_id: log.user_id,
          resource: `${log.resource_type}:${log.resource_id}`,
          status: log.status,
          severity: log.event_severity
        });
      }
    });
    
    return report;
  }
  
  shouldIncludeInReport(log, report_type) {
    switch (report_type) {
      case 'security':
        return log.event_category === 'security' || 
               log.event_category === 'authentication' ||
               log.event_severity === 'critical';
      case 'gdpr':
        return log.data_classification === 'restricted' ||
               log.event_type.includes('data.export') ||
               log.event_type.includes('data.delete');
      case 'soc2':
        return true; // Include all events for SOC2
      case 'audit':
        return log.event_category === 'admin' ||
               log.event_severity !== 'info';
      default:
        return true;
    }
  }
  
  // Cleanup old audit logs based on retention policy
  async cleanupOldLogs(organization_id) {
    const org = await db.get(
      `SELECT data_retention_days FROM organizations WHERE id = ?`,
      [organization_id]
    );
    
    if (!org || !org.data_retention_days) {
      return false;
    }
    
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - org.data_retention_days);
    
    const result = await db.run(
      `DELETE FROM audit_logs 
       WHERE organization_id = ? 
       AND created_at < ?
       AND event_severity != 'critical'`, // Keep critical events longer
      [organization_id, cutoffDate.toISOString()]
    );
    
    console.log(`Cleaned up ${result.changes} audit log entries for org ${organization_id}`);
    return true;
  }
}

// Export singleton instance
const auditLogger = new AuditLogger();

export {
  auditLogger as default
};

export const logAuditEvent = auditLogger.logAuditEvent.bind(auditLogger);
export const logAuthEvent = auditLogger.logAuthEvent.bind(auditLogger);
export const logDataAccess = auditLogger.logDataAccess.bind(auditLogger);
export const logAPIAccess = auditLogger.logAPIAccess.bind(auditLogger);
export const logSecurityEvent = auditLogger.logSecurityEvent.bind(auditLogger);
export const generateComplianceReport = auditLogger.generateComplianceReport.bind(auditLogger);
export const cleanupOldLogs = auditLogger.cleanupOldLogs.bind(auditLogger);