'use client'

import { useState } from 'react'
import { 
  User, 
  Bell, 
  Trash2, 
  Download, 
  Save, 
  AlertTriangle,
  CheckCircle,
  Loader2
} from 'lucide-react'
import { api } from '@/lib/api/trpc'
import { cn } from '@/lib/utils'

export default function SettingsPage() {
  const [activeTab, setActiveTab] = useState<'profile' | 'notifications' | 'account'>('profile')
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [showSuccess, setShowSuccess] = useState(false)
  const [successMessage, setSuccessMessage] = useState('')

  // Queries
  const { data: user, isLoading: userLoading } = api.auth.getCurrentUser.useQuery()
  const { data: preferences, isLoading: preferencesLoading } = api.auth.getNotificationPreferences.useQuery()

  // Mutations
  const updateProfile = api.auth.updateProfile.useMutation({
    onSuccess: () => {
      showSuccessMessage('Profile updated successfully!')
    },
    onError: (error) => {
      console.error('Failed to update profile:', error)
    }
  })

  const updatePreferences = api.auth.updateNotificationPreferences.useMutation({
    onSuccess: () => {
      showSuccessMessage('Notification preferences updated!')
    },
    onError: (error) => {
      console.error('Failed to update preferences:', error)
    }
  })

  const exportData = api.auth.exportUserData.useQuery(undefined, { enabled: false })
  
  const deleteAccount = api.auth.deleteAccount.useMutation({
    onSuccess: () => {
      // In a real app, you'd redirect to a goodbye page or logout
      showSuccessMessage('Account deleted successfully. You will be logged out shortly.')
      setTimeout(() => {
        window.location.href = '/auth/signin'
      }, 2000)
    },
    onError: (error) => {
      console.error('Failed to delete account:', error)
    }
  })

  const showSuccessMessage = (message: string) => {
    setSuccessMessage(message)
    setShowSuccess(true)
    setTimeout(() => setShowSuccess(false), 3000)
  }

  const handleProfileSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const formData = new FormData(e.currentTarget)
    const name = formData.get('name') as string
    
    updateProfile.mutate({ name })
  }

  const handlePreferenceChange = (key: string, value: boolean) => {
    updatePreferences.mutate({ [key]: value })
  }

  const handleExportData = async () => {
    try {
      const data = await exportData.refetch()
      if (data.data) {
        const blob = new Blob([JSON.stringify(data.data, null, 2)], { type: 'application/json' })
        const url = URL.createObjectURL(blob)
        const link = document.createElement('a')
        link.href = url
        link.download = `sightline-data-export-${new Date().toISOString().split('T')[0]}.json`
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
        URL.revokeObjectURL(url)
        showSuccessMessage('Data exported successfully!')
      }
    } catch (error) {
      console.error('Failed to export data:', error)
    }
  }

  const handleDeleteAccount = () => {
    deleteAccount.mutate({ confirmationText: deleteConfirmation })
  }

  const tabs = [
    { id: 'profile', label: 'Profile', icon: User },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'account', label: 'Account', icon: Trash2 },
  ] as const

  if (userLoading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary-600" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900">Settings</h1>
        <p className="mt-2 text-gray-600">Manage your account preferences and settings</p>
      </div>

      {/* Success Alert */}
      {showSuccess && (
        <div className="mb-6 rounded-lg border border-green-200 bg-green-50 p-4">
          <div className="flex items-center gap-3">
            <CheckCircle className="h-5 w-5 text-green-600" />
            <p className="text-sm text-green-800">{successMessage}</p>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="border-b border-gray-200 mb-8">
        <nav className="-mb-px flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={cn(
                  'flex items-center gap-2 py-2 px-1 border-b-2 font-medium text-sm',
                  activeTab === tab.id
                    ? 'border-primary-500 text-primary-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                )}
              >
                <Icon className="h-4 w-4" />
                {tab.label}
              </button>
            )
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
        {/* Profile Tab */}
        {activeTab === 'profile' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Profile Information</h2>
              <p className="text-sm text-gray-600">Update your personal information</p>
            </div>

            <form onSubmit={handleProfileSubmit} className="space-y-4">
              <div>
                <label htmlFor="name" className="block text-sm font-medium text-gray-700">
                  Full Name
                </label>
                <input
                  type="text"
                  name="name"
                  id="name"
                  defaultValue={user?.name || ''}
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 shadow-sm focus:border-primary-500 focus:outline-none focus:ring-primary-500"
                />
              </div>

              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700">
                  Email Address
                </label>
                <input
                  type="email"
                  name="email"
                  id="email"
                  value={user?.email || ''}
                  disabled
                  className="mt-1 block w-full rounded-md border border-gray-300 px-3 py-2 bg-gray-50 text-gray-500 cursor-not-allowed"
                />
                <p className="mt-1 text-xs text-gray-500">Email cannot be changed as it&apos;s linked to your Google account</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">
                  Current Plan
                </label>
                <div className="mt-1 px-3 py-2 bg-gray-50 rounded-md">
                  <span className="text-sm font-medium text-gray-900">{user?.plan || 'FREE'}</span>
                </div>
              </div>

              <div className="flex justify-end">
                <button
                  type="submit"
                  disabled={updateProfile.isPending}
                  className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-md hover:bg-primary-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {updateProfile.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Save className="h-4 w-4" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        )}

        {/* Notifications Tab */}
        {activeTab === 'notifications' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Notification Preferences</h2>
              <p className="text-sm text-gray-600">Choose what notifications you&apos;d like to receive</p>
            </div>

            {preferencesLoading ? (
              <div className="flex items-center justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary-600" />
              </div>
            ) : (
              <div className="space-y-4">
                {[
                  {
                    key: 'emailNotifications',
                    label: 'Summary Completion',
                    description: 'Get notified when your video summaries are ready'
                  },
                  {
                    key: 'weeklyDigest',
                    label: 'Weekly Digest',
                    description: 'Receive a weekly summary of your activity'
                  },
                  {
                    key: 'accountNotifications',
                    label: 'Account & Billing',
                    description: 'Important updates about your account and subscription'
                  },
                  {
                    key: 'usageLimitWarnings',
                    label: 'Usage Limit Warnings',
                    description: 'Get warned when approaching your monthly summary limit'
                  }
                ].map((item) => (
                  <div key={item.key} className="flex items-start justify-between py-3">
                    <div className="flex-1">
                      <h3 className="text-sm font-medium text-gray-900">{item.label}</h3>
                      <p className="text-sm text-gray-500">{item.description}</p>
                    </div>
                    <button
                      onClick={() => handlePreferenceChange(item.key, !(preferences as any)?.[item.key])}
                      className={cn(
                        'relative inline-flex h-6 w-11 items-center rounded-full transition-colors',
                        (preferences as any)?.[item.key] ? 'bg-primary-600' : 'bg-gray-200'
                      )}
                    >
                      <span
                        className={cn(
                          'inline-block h-4 w-4 transform rounded-full bg-white transition-transform',
                          (preferences as any)?.[item.key] ? 'translate-x-6' : 'translate-x-1'
                        )}
                      />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Account Tab */}
        {activeTab === 'account' && (
          <div className="space-y-6">
            <div>
              <h2 className="text-lg font-semibold text-gray-900">Account Management</h2>
              <p className="text-sm text-gray-600">Export your data or delete your account</p>
            </div>

            {/* Export Data */}
            <div className="border rounded-lg p-4">
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-gray-900">Export Your Data</h3>
                  <p className="text-sm text-gray-500 mt-1">
                    Download all your summaries, shared links, and account data
                  </p>
                </div>
                <button
                  onClick={handleExportData}
                  disabled={exportData.isFetching}
                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 text-gray-700 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  {exportData.isFetching ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Download className="h-4 w-4" />
                  )}
                  Export Data
                </button>
              </div>
            </div>

            {/* Delete Account */}
            <div className="border border-red-200 rounded-lg p-4 bg-red-50">
              <div className="flex items-start gap-3">
                <AlertTriangle className="h-5 w-5 text-red-600 mt-0.5" />
                <div className="flex-1">
                  <h3 className="text-sm font-medium text-red-900">Delete Account</h3>
                  <p className="text-sm text-red-700 mt-1">
                    Permanently delete your account and all associated data. This action cannot be undone.
                  </p>
                  <button
                    onClick={() => setShowDeleteModal(true)}
                    className="mt-3 px-3 py-2 bg-red-600 text-white text-sm rounded-md hover:bg-red-700"
                  >
                    Delete Account
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Delete Account Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="max-w-md w-full mx-4 bg-white rounded-lg shadow-xl p-6">
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-red-100">
                <AlertTriangle className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Delete Account</h3>
                <p className="text-sm text-gray-500">This action cannot be undone</p>
              </div>
            </div>

            <div className="mb-4">
              <p className="text-sm text-gray-700 mb-3">
                To confirm account deletion, please type <strong>DELETE</strong> in the field below:
              </p>
              <input
                type="text"
                value={deleteConfirmation}
                onChange={(e) => setDeleteConfirmation(e.target.value)}
                placeholder="Type DELETE to confirm"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:border-red-500 focus:outline-none focus:ring-red-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteModal(false)
                  setDeleteConfirmation('')
                }}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteConfirmation !== 'DELETE' || deleteAccount.isPending}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteAccount.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mx-auto" />
                ) : (
                  'Delete Account'
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}