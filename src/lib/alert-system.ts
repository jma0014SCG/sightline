import { monitoring } from './monitoring'
import { PERFORMANCE_BUDGETS } from './performance-budgets'

export type AlertSeverity = 'info' | 'warning' | 'critical'

export interface Alert {
  id: string
  title: string
  message: string
  severity: AlertSeverity
  timestamp: Date
  category: 'performance' | 'business' | 'error' | 'security'
  metadata?: Record<string, any>
}

export interface AlertRule {
  id: string
  name: string
  description: string
  category: 'performance' | 'business' | 'error' | 'security'
  condition: (value: number, threshold: number) => boolean
  threshold: number
  severity: AlertSeverity
  cooldownMinutes: number
  enabled: boolean
}

class AlertSystem {
  private static instance: AlertSystem
  private alerts: Alert[] = []
  private alertHistory: Map<string, Date> = new Map()
  
  // Default alert rules
  private readonly alertRules: AlertRule[] = [
    // Performance Alerts
    {
      id: 'api_slow_response',
      name: 'Slow API Response',
      description: 'API response time exceeds threshold',
      category: 'performance',
      condition: (value, threshold) => value > threshold,
      threshold: PERFORMANCE_BUDGETS.API_RESPONSE.NORMAL * 2, // 4 seconds
      severity: 'warning',
      cooldownMinutes: 10,
      enabled: true,
    },
    {
      id: 'api_critical_response',
      name: 'Critical API Response Time',
      description: 'API response time critically slow',
      category: 'performance',
      condition: (value, threshold) => value > threshold,
      threshold: PERFORMANCE_BUDGETS.API_RESPONSE.SLOW * 2, // 10 seconds
      severity: 'critical',
      cooldownMinutes: 5,
      enabled: true,
    },
    {
      id: 'web_vitals_poor',
      name: 'Poor Core Web Vitals',
      description: 'Core Web Vitals performance is poor',
      category: 'performance',
      condition: (value, threshold) => value > threshold,
      threshold: PERFORMANCE_BUDGETS.CORE_WEB_VITALS.LCP.needs_improvement,
      severity: 'warning',
      cooldownMinutes: 30,
      enabled: true,
    },
    
    // Business Alerts
    {
      id: 'summary_creation_slow',
      name: 'Slow Summary Creation',
      description: 'Summary creation time exceeds target',
      category: 'business',
      condition: (value, threshold) => value > threshold,
      threshold: PERFORMANCE_BUDGETS.BUSINESS.SUMMARY_CREATION.WARNING,
      severity: 'warning',
      cooldownMinutes: 15,
      enabled: true,
    },
    {
      id: 'summary_creation_critical',
      name: 'Critical Summary Creation Time',
      description: 'Summary creation time critically slow',
      category: 'business',
      condition: (value, threshold) => value > threshold,
      threshold: PERFORMANCE_BUDGETS.BUSINESS.SUMMARY_CREATION.CRITICAL,
      severity: 'critical',
      cooldownMinutes: 5,
      enabled: true,
    },
    
    // Error Rate Alerts
    {
      id: 'high_error_rate',
      name: 'High Error Rate',
      description: 'API error rate exceeds acceptable threshold',
      category: 'error',
      condition: (value, threshold) => value > threshold,
      threshold: 5, // 5% error rate
      severity: 'warning',
      cooldownMinutes: 10,
      enabled: true,
    },
    {
      id: 'critical_error_rate',
      name: 'Critical Error Rate',
      description: 'API error rate critically high',
      category: 'error',
      condition: (value, threshold) => value > threshold,
      threshold: 10, // 10% error rate
      severity: 'critical',
      cooldownMinutes: 5,
      enabled: true,
    },
    
    // Security Alerts
    {
      id: 'suspicious_activity',
      name: 'Suspicious Activity Detected',
      description: 'Unusual patterns detected that may indicate security issues',
      category: 'security',
      condition: (value, threshold) => value > threshold,
      threshold: 10, // 10 suspicious requests per minute
      severity: 'warning',
      cooldownMinutes: 5,
      enabled: true,
    },
  ]
  
  static getInstance(): AlertSystem {
    if (!AlertSystem.instance) {
      AlertSystem.instance = new AlertSystem()
    }
    return AlertSystem.instance
  }
  
  /**
   * Check if an alert should be triggered
   */
  checkAlert(ruleId: string, value: number, metadata?: Record<string, any>): boolean {
    const rule = this.alertRules.find(r => r.id === ruleId)
    if (!rule || !rule.enabled) {
      return false
    }
    
    // Check cooldown period
    const lastAlert = this.alertHistory.get(ruleId)
    if (lastAlert) {
      const cooldownEnd = new Date(lastAlert.getTime() + rule.cooldownMinutes * 60 * 1000)
      if (new Date() < cooldownEnd) {
        return false // Still in cooldown
      }
    }
    
    // Check condition
    if (rule.condition(value, rule.threshold)) {
      this.triggerAlert(rule, value, metadata)
      return true
    }
    
    return false
  }
  
  /**
   * Trigger an alert
   */
  private triggerAlert(rule: AlertRule, value: number, metadata?: Record<string, any>): void {
    const alert: Alert = {
      id: `${rule.id}_${Date.now()}`,
      title: rule.name,
      message: `${rule.description}. Current value: ${value}, Threshold: ${rule.threshold}`,
      severity: rule.severity,
      timestamp: new Date(),
      category: rule.category,
      metadata: {
        ruleId: rule.id,
        value,
        threshold: rule.threshold,
        ...metadata,
      },
    }
    
    // Add to alerts list
    this.alerts.unshift(alert)
    
    // Keep only last 100 alerts
    if (this.alerts.length > 100) {
      this.alerts = this.alerts.slice(0, 100)
    }
    
    // Update alert history
    this.alertHistory.set(rule.id, new Date())
    
    // Log the alert
    monitoring.logError({
      error: new Error(`ALERT: ${alert.title}`),
      context: {
        type: 'performance_alert',
        severity: alert.severity,
        category: alert.category,
        value,
        threshold: rule.threshold,
        ...metadata,
      },
    })
    
    // Send alert notification
    this.sendAlertNotification(alert)
  }
  
  /**
   * Send alert notification (implement your notification system here)
   */
  private async sendAlertNotification(alert: Alert): Promise<void> {
    try {
      // In production, you'd integrate with:
      // - Email service (SendGrid, AWS SES)
      // - Slack webhook
      // - Discord webhook
      // - SMS service (Twilio)
      // - PagerDuty
      
      console.log(`🚨 ALERT [${alert.severity.toUpperCase()}]: ${alert.title}`)
      console.log(`   ${alert.message}`)
      console.log(`   Time: ${alert.timestamp.toISOString()}`)
      console.log(`   Category: ${alert.category}`)
      
      // Example Slack webhook integration (commented out)
      /*
      if (process.env.SLACK_WEBHOOK_URL && alert.severity !== 'info') {
        await fetch(process.env.SLACK_WEBHOOK_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            text: `🚨 ${alert.severity.toUpperCase()} Alert: ${alert.title}`,
            blocks: [
              {
                type: 'section',
                text: {
                  type: 'mrkdwn',
                  text: `*${alert.title}*\n${alert.message}\n\n*Time:* ${alert.timestamp.toISOString()}\n*Category:* ${alert.category}`
                }
              }
            ]
          })
        })
      }
      */
      
    } catch (error) {
      console.error('Failed to send alert notification:', error)
    }
  }
  
  /**
   * Get recent alerts
   */
  getRecentAlerts(limit: number = 10): Alert[] {
    return this.alerts.slice(0, limit)
  }
  
  /**
   * Get alerts by category
   */
  getAlertsByCategory(category: Alert['category'], limit: number = 10): Alert[] {
    return this.alerts.filter(alert => alert.category === category).slice(0, limit)
  }
  
  /**
   * Get alerts by severity
   */
  getAlertsBySeverity(severity: AlertSeverity, limit: number = 10): Alert[] {
    return this.alerts.filter(alert => alert.severity === severity).slice(0, limit)
  }
  
  /**
   * Clear old alerts
   */
  clearOldAlerts(olderThanHours: number = 24): void {
    const cutoff = new Date(Date.now() - olderThanHours * 60 * 60 * 1000)
    this.alerts = this.alerts.filter(alert => alert.timestamp > cutoff)
  }
  
  /**
   * Enable/disable alert rule
   */
  setRuleEnabled(ruleId: string, enabled: boolean): boolean {
    const rule = this.alertRules.find(r => r.id === ruleId)
    if (rule) {
      rule.enabled = enabled
      return true
    }
    return false
  }
  
  /**
   * Update alert rule threshold
   */
  updateRuleThreshold(ruleId: string, threshold: number): boolean {
    const rule = this.alertRules.find(r => r.id === ruleId)
    if (rule) {
      rule.threshold = threshold
      return true
    }
    return false
  }
  
  /**
   * Get all alert rules
   */
  getAllRules(): AlertRule[] {
    return [...this.alertRules]
  }
}

// Export singleton instance
export const alertSystem = AlertSystem.getInstance()

// Helper functions for common alerts
export const checkApiResponseAlert = (endpoint: string, duration: number) => {
  alertSystem.checkAlert('api_slow_response', duration, { endpoint })
  alertSystem.checkAlert('api_critical_response', duration, { endpoint })
}

export const checkWebVitalsAlert = (metric: string, value: number) => {
  alertSystem.checkAlert('web_vitals_poor', value, { metric })
}

export const checkBusinessMetricAlert = (metric: string, duration: number) => {
  if (metric.includes('summary_creation')) {
    alertSystem.checkAlert('summary_creation_slow', duration, { metric })
    alertSystem.checkAlert('summary_creation_critical', duration, { metric })
  }
}

export const checkErrorRateAlert = (errorRate: number, timeWindow: string = '5min') => {
  alertSystem.checkAlert('high_error_rate', errorRate, { timeWindow })
  alertSystem.checkAlert('critical_error_rate', errorRate, { timeWindow })
}

export const checkSecurityAlert = (suspiciousRequests: number, timeWindow: string = '1min') => {
  alertSystem.checkAlert('suspicious_activity', suspiciousRequests, { timeWindow })
}