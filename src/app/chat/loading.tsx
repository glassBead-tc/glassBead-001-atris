export default function Loading() {
  return (
    <div className="container mx-auto max-w-4xl p-4">
      <div className="animate-pulse space-y-4">
        {/* Message bubbles loading state */}
        <div className="flex justify-end">
          <div className="max-w-[80%] h-12 bg-blue-200 dark:bg-blue-700 rounded-lg" />
        </div>
        <div className="flex justify-start">
          <div className="max-w-[80%] h-24 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
        <div className="flex justify-end">
          <div className="max-w-[80%] h-12 bg-blue-200 dark:bg-blue-700 rounded-lg" />
        </div>
        
        {/* Input area loading state */}
        <div className="mt-auto">
          <div className="h-16 bg-gray-200 dark:bg-gray-700 rounded-lg" />
        </div>
      </div>
    </div>
  )
}
