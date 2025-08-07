import MailerLite from '@mailerlite/mailerlite-nodejs'

// Initialize MailerLite client
let mailerLite: MailerLite | null = null

if (process.env.MAILERLITE_API_KEY) {
  mailerLite = new MailerLite({
    api_key: process.env.MAILERLITE_API_KEY,
  })
}

export interface SubscriberData {
  email: string
  name?: string
  fields?: {
    [key: string]: string | number | null
  }
}

export interface SubscriberUpdate extends SubscriberData {
  plan?: 'FREE' | 'PRO' | 'ANONYMOUS'
  signupDate?: Date
  lastActive?: Date
  totalSummaries?: number
  preferredTopics?: string[]
}

// Email list/group IDs - these will need to be configured in MailerLite
export const EMAIL_GROUPS = {
  ALL_USERS: 'all_users', // Main list for all users
  FREE_USERS: 'free_users', // Free plan users
  PRO_USERS: 'pro_users', // Pro plan users
  ANONYMOUS_CONVERTED: 'anonymous_converted', // Anonymous users who signed up
  INACTIVE_USERS: 'inactive_users', // Users who haven't been active
  HIGH_USAGE: 'high_usage', // Users approaching limits
} as const

export type EmailGroup = typeof EMAIL_GROUPS[keyof typeof EMAIL_GROUPS]

class EmailService {
  private client: MailerLite | null

  constructor() {
    this.client = mailerLite
  }

  private ensureClient(): MailerLite {
    if (!this.client) {
      throw new Error('MailerLite client not initialized. Please check MAILERLITE_API_KEY environment variable.')
    }
    return this.client
  }

  /**
   * Add a new subscriber to MailerLite
   */
  async addSubscriber(data: SubscriberUpdate, groups: EmailGroup[] = [EMAIL_GROUPS.ALL_USERS]): Promise<void> {
    if (!this.client) {
      console.log('MailerLite not configured, skipping subscriber addition')
      return
    }

    try {
      const client = this.ensureClient()
      
      const subscriberData = {
        email: data.email,
        name: data.name || '',
        fields: {
          plan: data.plan || 'FREE',
          signup_date: data.signupDate?.toISOString() || new Date().toISOString(),
          last_active: data.lastActive?.toISOString() || new Date().toISOString(),
          total_summaries: data.totalSummaries || 0,
          preferred_topics: data.preferredTopics?.join(',') || '',
          ...data.fields,
        },
        groups: groups,
      }

      await client.subscribers.createOrUpdate(subscriberData)
      
      console.log(`✅ Added subscriber ${data.email} to MailerLite groups:`, groups)
    } catch (error) {
      console.error('❌ Failed to add subscriber to MailerLite:', error)
      // Don't throw error - email signup failure shouldn't break main functionality
    }
  }

  /**
   * Update subscriber information
   */
  async updateSubscriber(email: string, data: Partial<SubscriberUpdate>): Promise<void> {
    if (!this.client) {
      console.log('MailerLite not configured, skipping subscriber update')
      return
    }

    try {
      const client = this.ensureClient()
      
      const updateData = {
        fields: {
          plan: data.plan,
          last_active: data.lastActive?.toISOString() || new Date().toISOString(),
          total_summaries: data.totalSummaries,
          preferred_topics: data.preferredTopics?.join(','),
          ...data.fields,
        },
      }

      await client.subscribers.update(email, updateData)
      
      console.log(`✅ Updated subscriber ${email} in MailerLite`)
    } catch (error) {
      console.error('❌ Failed to update subscriber in MailerLite:', error)
    }
  }

  /**
   * Move subscriber to different groups (e.g., FREE -> PRO)
   */
  async updateSubscriberGroups(email: string, addGroups: EmailGroup[] = [], removeGroups: EmailGroup[] = []): Promise<void> {
    if (!this.client) {
      console.log('MailerLite not configured, skipping group update')
      return
    }

    try {
      const client = this.ensureClient()

      // Add to new groups
      if (addGroups.length > 0) {
        for (const group of addGroups) {
          await client.subscribers.assignToGroup(email, group)
        }
      }

      // Remove from old groups
      if (removeGroups.length > 0) {
        for (const group of removeGroups) {
          await client.subscribers.unassignFromGroup(email, group)
        }
      }

      console.log(`✅ Updated groups for ${email}: +${addGroups.join(',')} -${removeGroups.join(',')}`)
    } catch (error) {
      console.error('❌ Failed to update subscriber groups in MailerLite:', error)
    }
  }

  /**
   * Handle user signup - add to email list
   */
  async onUserSignup(userData: {
    email: string
    name?: string
    plan: 'FREE' | 'PRO'
    fromAnonymous: boolean
    signupMethod: 'google' | 'email'
  }): Promise<void> {
    const groups = [EMAIL_GROUPS.ALL_USERS]
    
    if (userData.plan === 'FREE') {
      groups.push(EMAIL_GROUPS.FREE_USERS)
    } else if (userData.plan === 'PRO') {
      groups.push(EMAIL_GROUPS.PRO_USERS)
    }

    if (userData.fromAnonymous) {
      groups.push(EMAIL_GROUPS.ANONYMOUS_CONVERTED)
    }

    await this.addSubscriber({
      email: userData.email,
      name: userData.name,
      plan: userData.plan,
      signupDate: new Date(),
      lastActive: new Date(),
      totalSummaries: userData.fromAnonymous ? 1 : 0, // If they converted from anonymous, they already have 1 summary
      fields: {
        signup_method: userData.signupMethod,
        from_anonymous: userData.fromAnonymous ? 'yes' : 'no',
      }
    }, groups)
  }

  /**
   * Handle subscription upgrade
   */
  async onSubscriptionUpgrade(email: string, fromPlan: 'FREE', toPlan: 'PRO', totalSummaries: number): Promise<void> {
    await this.updateSubscriber(email, {
      plan: toPlan,
      totalSummaries,
      lastActive: new Date(),
      fields: {
        upgrade_date: new Date().toISOString(),
        previous_plan: fromPlan,
      }
    })

    // Move to PRO users group
    await this.updateSubscriberGroups(
      email,
      [EMAIL_GROUPS.PRO_USERS],
      [EMAIL_GROUPS.FREE_USERS]
    )
  }

  /**
   * Handle summary creation - update usage stats
   */
  async onSummaryCreated(email: string, totalSummaries: number, plan: 'FREE' | 'PRO', videoData?: {
    title: string
    channel: string
    category?: string
  }): Promise<void> {
    await this.updateSubscriber(email, {
      totalSummaries,
      lastActive: new Date(),
      fields: {
        last_video_title: videoData?.title,
        last_channel: videoData?.channel,
        last_category: videoData?.category,
      }
    })

    // If user is approaching limits, add to high usage group
    if (plan === 'FREE' && totalSummaries >= 2) {
      await this.updateSubscriberGroups(email, [EMAIL_GROUPS.HIGH_USAGE])
    } else if (plan === 'PRO' && totalSummaries >= 20) {
      await this.updateSubscriberGroups(email, [EMAIL_GROUPS.HIGH_USAGE])
    }
  }

  /**
   * Handle user inactivity - move to inactive group
   */
  async markUserInactive(email: string): Promise<void> {
    await this.updateSubscriberGroups(email, [EMAIL_GROUPS.INACTIVE_USERS])
  }

  /**
   * Send transactional email (for important notifications)
   */
  async sendTransactionalEmail(templateId: string, email: string, variables: Record<string, any> = {}): Promise<void> {
    if (!this.client) {
      console.log('MailerLite not configured, skipping transactional email')
      return
    }

    try {
      const client = this.ensureClient()
      
      // Note: This would need to be implemented based on MailerLite's transactional email API
      // For now, just log the intent
      console.log(`📧 Would send template ${templateId} to ${email} with variables:`, variables)
      
      // TODO: Implement actual transactional email sending when MailerLite supports it
      
    } catch (error) {
      console.error('❌ Failed to send transactional email:', error)
    }
  }

  /**
   * Remove subscriber (for GDPR compliance)
   */
  async removeSubscriber(email: string): Promise<void> {
    if (!this.client) {
      console.log('MailerLite not configured, skipping subscriber removal')
      return
    }

    try {
      const client = this.ensureClient()
      await client.subscribers.delete(email)
      console.log(`✅ Removed subscriber ${email} from MailerLite`)
    } catch (error) {
      console.error('❌ Failed to remove subscriber from MailerLite:', error)
    }
  }

  /**
   * Check if MailerLite is properly configured
   */
  isConfigured(): boolean {
    return this.client !== null
  }
}

// Export singleton instance
export const emailService = new EmailService()

// Helper function to safely use email service
export function withEmailService<T>(
  operation: (service: EmailService) => Promise<T>,
  fallback?: T
): Promise<T | undefined> {
  if (!emailService.isConfigured()) {
    console.log('📧 MailerLite not configured, skipping email operation')
    return Promise.resolve(fallback)
  }
  
  return operation(emailService).catch((error) => {
    console.error('📧 Email service operation failed:', error)
    return fallback
  })
}