'use client'

import { useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import { cn } from '@/lib/utils'
import type { 
  BackendFramework, 
  BackendPlaybook, 
  BackendFlashcard,
  BackendQuizQuestion
} from '@/components/organisms/SummaryViewer/SummaryViewer.types'

interface LearningHubTabsProps {
  frameworks: BackendFramework[]
  playbooks: BackendPlaybook[]
  flashcards: BackendFlashcard[]
  quizQuestions: BackendQuizQuestion[]
  glossary: Array<{ term: string; definition: string }>
  frameworksContent?: string
  playbooksContent?: string
  flashcardsContent?: string
  quickQuizContent?: string
  className?: string
}

type TabType = 'frameworks' | 'playbooks' | 'flashcards' | 'glossary' | 'quiz'

export function LearningHubTabs({ 
  frameworks = [],
  playbooks = [],
  flashcards = [],
  quizQuestions = [],
  glossary = [],
  frameworksContent = '',
  playbooksContent = '',
  flashcardsContent = '',
  quickQuizContent = '',
  className 
}: LearningHubTabsProps) {
  const [activeTab, setActiveTab] = useState<TabType>('frameworks')

  // Calculate content availability and counts
  const tabs = [
    {
      id: 'frameworks' as TabType,
      label: 'Frameworks',
      icon: '🧠',
      count: frameworks.length || (frameworksContent ? 1 : 0),
      hasContent: frameworks.length > 0 || frameworksContent
    },
    {
      id: 'playbooks' as TabType,
      label: 'Playbooks',
      icon: '📋',
      count: playbooks.length || (playbooksContent ? 1 : 0),
      hasContent: playbooks.length > 0 || playbooksContent
    },
    {
      id: 'flashcards' as TabType,
      label: 'Flashcards',
      icon: '🗂️',
      count: flashcards.length || (flashcardsContent ? 1 : 0),
      hasContent: flashcards.length > 0 || flashcardsContent
    },
    {
      id: 'glossary' as TabType,
      label: 'Glossary',
      icon: '📖',
      count: glossary.length,
      hasContent: glossary.length > 0
    },
    {
      id: 'quiz' as TabType,
      label: 'Quiz',
      icon: '🎯',
      count: quizQuestions.length || (quickQuizContent ? 1 : 0),
      hasContent: quizQuestions.length > 0 || quickQuizContent
    }
  ]

  const availableTabs = tabs.filter(tab => tab.hasContent)

  // Set the first available tab as active if current active tab has no content
  const currentTab = tabs.find(tab => tab.id === activeTab)
  if (!currentTab?.hasContent && availableTabs.length > 0) {
    setActiveTab(availableTabs[0].id)
  }

  if (availableTabs.length === 0) {
    return null
  }

  const renderContent = () => {
    switch (activeTab) {
      case 'frameworks':
        return (
          <div className="space-y-4">
            {frameworks.length > 0 ? (
              frameworks.map((framework, index) => (
                <div key={index} className="p-4 bg-white border border-blue-100 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-blue-900 mb-2">{framework.name}</h4>
                  <p className="text-sm text-gray-700">{framework.description}</p>
                </div>
              ))
            ) : frameworksContent ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {frameworksContent}
                </ReactMarkdown>
              </div>
            ) : null}
          </div>
        )
      
      case 'playbooks':
        return (
          <div className="space-y-4">
            {playbooks.length > 0 ? (
              playbooks.map((playbook, index) => (
                <div key={index} className="p-4 bg-white border border-green-100 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-green-900 mb-2">
                    <span className="text-green-600">Trigger:</span> {playbook.trigger}
                  </h4>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium text-green-700">Action:</span> {playbook.action}
                  </p>
                </div>
              ))
            ) : playbooksContent ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {playbooksContent}
                </ReactMarkdown>
              </div>
            ) : null}
          </div>
        )
      
      case 'flashcards':
        return (
          <div className="space-y-4">
            {flashcards.length > 0 ? (
              flashcards.map((flashcard, index) => (
                <div key={index} className="p-4 bg-white border border-indigo-100 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-indigo-900 mb-2">{flashcard.question}</h4>
                  <p className="text-sm text-gray-700">{flashcard.answer}</p>
                </div>
              ))
            ) : flashcardsContent ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {flashcardsContent}
                </ReactMarkdown>
              </div>
            ) : null}
          </div>
        )
      
      case 'glossary':
        return (
          <div className="space-y-3">
            {glossary.map((item, index) => (
              <div key={index} className="p-4 bg-white border border-blue-100 rounded-lg shadow-sm">
                <h4 className="font-semibold text-blue-900 mb-2">{item.term}</h4>
                <div className="text-sm text-gray-700 prose prose-sm max-w-none">
                  <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                    {item.definition}
                  </ReactMarkdown>
                </div>
              </div>
            ))}
          </div>
        )
      
      case 'quiz':
        return (
          <div className="space-y-4">
            {quizQuestions.length > 0 ? (
              quizQuestions.map((quiz, index) => (
                <div key={index} className="p-4 bg-white border border-purple-100 rounded-lg shadow-sm">
                  <h4 className="font-semibold text-purple-900 mb-2">
                    {index + 1}. {quiz.question}
                  </h4>
                  <p className="text-sm text-gray-700">
                    <span className="font-medium text-purple-700">Answer:</span> {quiz.answer}
                  </p>
                </div>
              ))
            ) : quickQuizContent ? (
              <div className="prose prose-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeHighlight]}>
                  {quickQuizContent}
                </ReactMarkdown>
              </div>
            ) : null}
          </div>
        )
      
      default:
        return null
    }
  }

  return (
    <div className={cn("bg-white border border-gray-200 rounded-xl shadow-sm hover:shadow-md transition-shadow duration-200", className)}>
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 px-6 py-4 rounded-t-xl">
        <h3 className="text-base font-bold text-white flex items-center gap-2">
          <span className="text-indigo-100">📚</span>
          Learning Hub
        </h3>
      </div>
      
      <div className="p-6">
        {/* Tab Navigation */}
        <div className="flex flex-wrap gap-1 mb-4 p-1 bg-gray-100 rounded-lg">
          {availableTabs.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "flex items-center gap-1.5 px-3 py-2 rounded-md text-xs font-medium transition-all",
                "focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2",
                activeTab === tab.id
                  ? "bg-blue-50 text-blue-700 shadow-sm border border-blue-200"
                  : "text-gray-600 hover:text-gray-900 hover:bg-gray-50"
              )}
            >
              <span>{tab.icon}</span>
              <span className="hidden sm:inline">{tab.label}</span>
              {tab.count > 0 && (
                <span className={cn(
                  "text-xs px-1.5 py-0.5 rounded-full font-semibold",
                  activeTab === tab.id
                    ? "bg-blue-100 text-blue-700"
                    : "bg-gray-200 text-gray-600"
                )}>
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>

        {/* Tab Content */}
        <div className="max-h-80 overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100">
          {renderContent()}
        </div>
      </div>
    </div>
  )
}