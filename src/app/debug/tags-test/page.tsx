'use client'

import { api } from '@/components/providers/TRPCProvider'
import { useEffect } from 'react'

export default function TagsTestPage() {
  const { data: summaries, isLoading: summariesLoading } = api.library.getAll.useQuery({
    limit: 5,
    sortBy: 'date',
    sortOrder: 'desc'
  })

  const { data: tags, isLoading: tagsLoading } = api.library.getTags.useQuery()
  const { data: categories, isLoading: categoriesLoading } = api.library.getCategories.useQuery()

  useEffect(() => {
    if (summaries) {
      console.log('📚 Summaries from API:', summaries)
      summaries.items.forEach((summary, index) => {
        console.log(`📖 Summary ${index + 1}: ${summary.videoTitle}`)
        console.log('   Categories:', summary.categories)
        console.log('   Tags:', summary.tags)
      })
    }
  }, [summaries])

  useEffect(() => {
    if (tags) {
      console.log('🏷️ Available tags:', tags)
    }
  }, [tags])

  useEffect(() => {
    if (categories) {
      console.log('📁 Available categories:', categories)
    }
  }, [categories])

  if (summariesLoading || tagsLoading || categoriesLoading) {
    return <div className="p-8">Loading...</div>
  }

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-6">Tags & Categories Debug</h1>
      
      <div className="mb-8">
        <h2 className="text-xl font-semibold mb-4">Recent Summaries</h2>
        {summaries?.items.map((summary) => (
          <div key={summary.id} className="mb-4 p-4 border rounded">
            <h3 className="font-semibold">{summary.videoTitle}</h3>
            <p className="text-sm text-gray-600">ID: {summary.id}</p>
            
            <div className="mt-2">
              <strong>Categories ({summary.categories?.length || 0}):</strong>
              {summary.categories && summary.categories.length > 0 ? (
                <ul className="ml-4">
                  {summary.categories.map(cat => (
                    <li key={cat.id}>
                      {cat.name} (ID: {cat.id})
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-gray-400 ml-2">None</span>
              )}
            </div>
            
            <div className="mt-2">
              <strong>Tags ({summary.tags?.length || 0}):</strong>
              {summary.tags && summary.tags.length > 0 ? (
                <ul className="ml-4">
                  {summary.tags.map(tag => (
                    <li key={tag.id}>
                      {tag.name} ({tag.type}) - ID: {tag.id}
                    </li>
                  ))}
                </ul>
              ) : (
                <span className="text-gray-400 ml-2">None</span>
              )}
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div>
          <h2 className="text-xl font-semibold mb-4">All User Tags ({tags?.length || 0})</h2>
          {tags && tags.length > 0 ? (
            <ul>
              {tags.map(tag => (
                <li key={tag.id}>
                  {tag.name} ({tag.type}) - Count: {tag.count}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No tags found</p>
          )}
        </div>

        <div>
          <h2 className="text-xl font-semibold mb-4">All User Categories ({categories?.length || 0})</h2>
          {categories && categories.length > 0 ? (
            <ul>
              {categories.map(cat => (
                <li key={cat.id}>
                  {cat.name} - Count: {cat.count}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-400">No categories found</p>
          )}
        </div>
      </div>
    </div>
  )
}