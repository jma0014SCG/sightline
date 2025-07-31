'use client'

import { useState } from 'react'
import { 
  Download, 
  Share2, 
  Trash2, 
  CheckSquare, 
  Square, 
  MoreHorizontal,
  Star,
  Archive,
  Copy,
  ExternalLink,
  Plus
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuickActionsBarProps {
  selectedIds: string[]
  onSelectAll: () => void
  onDeselectAll: () => void
  onBulkDelete: (ids: string[]) => void
  onBulkShare: (ids: string[]) => void
  onBulkExport: (ids: string[]) => void
  totalCount: number
  className?: string
}

export function QuickActionsBar({
  selectedIds,
  onSelectAll,
  onDeselectAll,
  onBulkDelete,
  onBulkShare,
  onBulkExport,
  totalCount,
  className
}: QuickActionsBarProps) {
  const [showMoreActions, setShowMoreActions] = useState(false)
  const selectedCount = selectedIds.length
  const isAllSelected = selectedCount === totalCount && totalCount > 0

  const handleSelectAllToggle = () => {
    if (isAllSelected) {
      if (onDeselectAll && typeof onDeselectAll === 'function') {
        onDeselectAll()
      }
    } else {
      if (onSelectAll && typeof onSelectAll === 'function') {
        onSelectAll()
      }
    }
  }

  const quickActions = [
    {
      id: 'share',
      label: 'Share',
      icon: Share2,
      action: () => {
        if (onBulkShare && typeof onBulkShare === 'function') {
          onBulkShare(selectedIds)
        }
      },
      disabled: selectedCount === 0,
    },
    {
      id: 'export',
      label: 'Export',
      icon: Download,
      action: () => {
        if (onBulkExport && typeof onBulkExport === 'function') {
          onBulkExport(selectedIds)
        }
      },
      disabled: selectedCount === 0,
    },
    {
      id: 'delete',
      label: 'Delete',
      icon: Trash2,
      action: () => {
        if (onBulkDelete && typeof onBulkDelete === 'function') {
          onBulkDelete(selectedIds)
        }
      },
      disabled: selectedCount === 0,
      variant: 'danger' as const,
    },
  ]

  const moreActions = [
    {
      id: 'duplicate',
      label: 'Duplicate',
      icon: Copy,
      action: () => {
        // TODO: Implement duplicate functionality
        alert('Duplicate feature coming soon!')
      },
      disabled: selectedCount === 0,
    },
    {
      id: 'favorite',
      label: 'Add to Favorites',
      icon: Star,
      action: () => {
        // TODO: Implement favorites functionality
        alert('Favorites feature coming soon!')
      },
      disabled: selectedCount === 0,
    },
    {
      id: 'archive',
      label: 'Archive',
      icon: Archive,
      action: () => {
        // TODO: Implement archive functionality
        alert('Archive feature coming soon!')
      },
      disabled: selectedCount === 0,
    },
  ]

  if (selectedCount === 0 && totalCount === 0) {
    return null
  }

  return (
    <div className={cn(
      "flex items-center justify-between bg-white border border-gray-200 rounded-lg p-3 shadow-sm",
      className
    )}>
      {/* Selection Controls */}
      <div className="flex items-center gap-4">
        <button
          onClick={handleSelectAllToggle}
          className="flex items-center gap-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
        >
          {isAllSelected ? (
            <CheckSquare className="h-4 w-4 text-blue-600" />
          ) : (
            <Square className="h-4 w-4" />
          )}
          <span>
            {selectedCount > 0 
              ? `${selectedCount} selected`
              : `Select all (${totalCount})`
            }
          </span>
        </button>

        {selectedCount > 0 && (
          <button
            onClick={onDeselectAll}
            className="text-sm text-gray-500 hover:text-gray-700 transition-colors"
          >
            Clear selection
          </button>
        )}
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-2">
        {/* Quick Add Button */}
        {selectedCount === 0 && (
          <button
            className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 text-white text-sm font-medium rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => {
              const urlInput = document.querySelector('input[placeholder*="YouTube"]') as HTMLInputElement
              urlInput?.focus()
            }}
          >
            <Plus className="h-4 w-4" />
            Quick Add
          </button>
        )}

        {/* Bulk Action Buttons */}
        {selectedCount > 0 && (
          <>
            {quickActions.map((action) => {
              const Icon = action.icon
              return (
                <button
                  key={action.id}
                  onClick={action.action}
                  disabled={action.disabled}
                  className={cn(
                    "flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium rounded-lg transition-colors",
                    action.variant === 'danger'
                      ? "bg-red-50 text-red-700 hover:bg-red-100 disabled:opacity-50"
                      : "bg-gray-100 text-gray-700 hover:bg-gray-200 disabled:opacity-50",
                    action.disabled && "cursor-not-allowed"
                  )}
                >
                  <Icon className="h-4 w-4" />
                  {action.label}
                </button>
              )
            })}

            {/* More Actions Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowMoreActions(!showMoreActions)}
                className="flex items-center gap-1 px-2 py-1.5 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              >
                <MoreHorizontal className="h-4 w-4" />
              </button>

              {showMoreActions && (
                <>
                  {/* Backdrop */}
                  <div 
                    className="fixed inset-0 z-10" 
                    onClick={() => setShowMoreActions(false)}
                  />
                  
                  {/* Dropdown */}
                  <div className="absolute right-0 top-full mt-1 w-48 bg-white border border-gray-200 rounded-lg shadow-lg z-20">
                    <div className="p-1">
                      {moreActions.map((action) => {
                        const Icon = action.icon
                        return (
                          <button
                            key={action.id}
                            onClick={() => {
                              action.action()
                              setShowMoreActions(false)
                            }}
                            disabled={action.disabled}
                            className={cn(
                              "w-full flex items-center gap-3 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 rounded transition-colors text-left",
                              action.disabled && "opacity-50 cursor-not-allowed"
                            )}
                          >
                            <Icon className="h-4 w-4" />
                            {action.label}
                          </button>
                        )
                      })}
                    </div>
                  </div>
                </>
              )}
            </div>
          </>
        )}
      </div>
    </div>
  )
}