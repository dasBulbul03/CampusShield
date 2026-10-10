import { AlertTriangle, RotateCw } from 'lucide-react'

const LoadError = ({ message = 'Something went wrong.', onRetry }) => (
  <div className="card border-red-200">
    <div className="card-body text-center py-10">
      <AlertTriangle className="h-10 w-10 mx-auto text-red-400 mb-3" />
      <p className="text-gray-900 font-medium">Couldn&apos;t load data</p>
      <p className="text-sm text-gray-600 mt-1">{message}</p>
      {onRetry && (
        <button
          type="button"
          onClick={onRetry}
          className="btn-secondary mt-4 inline-flex items-center gap-2"
        >
          <RotateCw className="h-4 w-4" />
          Try again
        </button>
      )}
    </div>
  </div>
)

export default LoadError
