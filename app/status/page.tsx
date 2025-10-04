'use client'
import useSWR from 'swr'
import { useState, useEffect } from 'react'
import {
  AlertTriangle,
  Database,
  CheckCircle,
  Clock,
  Sun,
  Moon,
} from 'lucide-react'
import { Button } from '@/components/ui/button'

async function fetchAPI(url: string) {
  const response = await fetch(url)
  const respondeBody = await response.json()
  return respondeBody
}

function Loading() {
  return (
    <div className="min-h-screen bg-gray-100 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="text-center">
        <Database className="mx-auto h-12 w-12 text-blue-500 animate-pulse" />
        <h2 className="mt-2 text-lg font-semibold text-gray-900">
          Loading health data...
        </h2>
        <p className="mt-1 text-sm text-gray-500">
          This may take a few moments.
        </p>
      </div>
    </div>
  )
}

export default function Page() {
  const {
    isLoading,
    data: healthData,
    error,
  } = useSWR('/api/v1/status', fetchAPI, {
    refreshInterval: 2000, // 2 seconds
  })
  const [darkMode, setDarkMode] = useState(false)

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark')
    } else {
      document.documentElement.classList.remove('dark')
    }
  }, [darkMode])

  if (isLoading) {
    return <Loading />
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center transition-colors duration-200">
        <div className="text-center">
          <AlertTriangle className="mx-auto h-12 w-12 text-red-500" />
          <h2 className="mt-2 text-lg font-semibold text-gray-900 dark:text-gray-100">
            Error
          </h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            {error}
          </p>
          <Button onClick={() => window.location.reload()} className="mt-4">
            Retry
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-100 dark:bg-gray-900 py-12 px-4 sm:px-6 lg:px-8 transition-colors duration-200">
      <div className="max-w-3xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-gray-100 flex items-center">
            <Database className="mr-2 text-blue-500" />
            Health Status
            <CheckCircle className="ml-2 text-green-500" />
          </h1>
          <Button
            variant="outline"
            size="icon"
            onClick={() => setDarkMode(!darkMode)}
            className="rounded-full"
          >
            {darkMode ? (
              <Sun className="h-[1.2rem] w-[1.2rem]" />
            ) : (
              <Moon className="h-[1.2rem] w-[1.2rem]" />
            )}
            <span className="sr-only">Toggle theme</span>
          </Button>
        </div>
        <div className="bg-white dark:bg-gray-800 shadow overflow-hidden sm:rounded-lg">
          <div className="px-4 py-5 sm:px-6">
            <h2 className="text-lg leading-6 font-medium text-gray-900 dark:text-gray-100 flex items-center">
              <Database className="mr-2 text-blue-500" />
              System Information
            </h2>
            <p className="mt-1 max-w-2xl text-sm text-gray-500 dark:text-gray-400">
              Details about the system health.
            </p>
          </div>
          <div className="border-t border-gray-200 dark:border-gray-700 px-4 py-5 sm:p-0">
            <dl className="sm:divide-y sm:divide-gray-200 dark:divide-gray-700">
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                  <Clock className="mr-2 text-gray-400 dark:text-gray-500" />
                  Last Updated
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2 flex items-center">
                  {new Date(healthData.updated_at).toLocaleString()}
                  <CheckCircle className="ml-2 text-green-500" size={16} />
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                  <Database className="mr-2 text-blue-500" />
                  Database Version
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2 flex items-center">
                  {healthData.dependecies.database.potgres_version}
                  <CheckCircle className="ml-2 text-green-500" size={16} />
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                  <Database className="mr-2 text-blue-500" />
                  Max Connections
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2 flex items-center">
                  {healthData.dependecies.database.max_connections}
                  <CheckCircle className="ml-2 text-green-500" size={16} />
                </dd>
              </div>
              <div className="py-4 sm:py-5 sm:grid sm:grid-cols-3 sm:gap-4 sm:px-6">
                <dt className="text-sm font-medium text-gray-500 dark:text-gray-400 flex items-center">
                  <Database className="mr-2 text-blue-500" />
                  Opened Connections
                </dt>
                <dd className="mt-1 text-sm text-gray-900 dark:text-gray-100 sm:mt-0 sm:col-span-2 flex items-center">
                  {healthData.dependecies.database.opened_connections}
                  <CheckCircle className="ml-2 text-green-500" size={16} />
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </div>
    </div>
  )
}
