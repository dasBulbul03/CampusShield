import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import StudentLayout from '../../components/layout/StudentLayout'
import api, { downloadEvidence } from '../../services/api'
import { toast } from 'react-toastify'
import { ArrowLeft, Clock, CheckCircle, AlertTriangle, Star, Paperclip } from 'lucide-react'

const statusSteps = [
  'SUBMITTED',
  'AI_ANALYZED',
  'ASSIGNED',
  'UNDER_REVIEW',
  'INVESTIGATING',
  'ACTION_TAKEN',
  'RESOLVED',
]

const ComplaintDetail = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const [complaint, setComplaint] = useState(null)
  const [loading, setLoading] = useState(true)
  const [feedback, setFeedback] = useState({ rating: 0, comment: '' })
  const [submittingFeedback, setSubmittingFeedback] = useState(false)
  const [showFeedback, setShowFeedback] = useState(false)

  const fetchComplaint = async () => {
    try {
      const response = await api.get(`/complaints/${id}`)
      setComplaint(response.data)
      if (response.data.status === 'RESOLVED') {
        setShowFeedback(true)
      }
    } catch (error) {
      toast.error('Failed to fetch complaint')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComplaint()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleDownloadEvidence = async (file) => {
    try {
      await downloadEvidence(id, file.id, file.filename)
    } catch (error) {
      toast.error('Failed to download evidence')
    }
  }

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RESOLVED':
        return <span className="badge badge-success">{status.replace('_', ' ')}</span>
      default:
        return <span className="badge badge-info">{status.replace('_', ' ')}</span>
    }
  }

  const getPriorityBadge = (priority) => {
    if (priority === 'P1') return <span className="badge badge-danger">CRITICAL</span>
    if (priority === 'P2') return <span className="badge badge-warning">HIGH</span>
    if (priority === 'P3') return <span className="badge badge-info">MEDIUM</span>
    if (priority === 'P4') return <span className="badge badge-gray">LOW</span>
    return null
  }

  const getStatusIndex = (status) => {
    return statusSteps.indexOf(status)
  }

  const handleSubmitFeedback = async (e) => {
    e.preventDefault()
    if (feedback.rating === 0) {
      toast.error('Please provide a rating')
      return
    }
    setSubmittingFeedback(true)
    try {
      const formData = new FormData()
      formData.append('rating', feedback.rating)
      if (feedback.comment) formData.append('comment', feedback.comment)
      const response = await api.post(`/complaints/${id}/feedback`, formData)
      setComplaint((prev) => ({ ...prev, feedback: response.data.feedback }))
      toast.success('Feedback submitted successfully!')
      setShowFeedback(false)
    } catch (error) {
      toast.error(error.response?.data?.detail || 'Failed to submit feedback')
    } finally {
      setSubmittingFeedback(false)
    }
  }

  if (loading) {
    return (
      <StudentLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </StudentLayout>
    )
  }

  if (!complaint) {
    return (
      <StudentLayout>
        <div className="text-center py-12">Complaint not found</div>
      </StudentLayout>
    )
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/student/complaints')} className="btn-secondary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Complaints
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{complaint.complaint_number}</h1>
            <p className="text-gray-600">{complaint.title}</p>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Complaint Status</h2>
          </div>
          <div className="card-body">
            <div className="relative">
              <div className="flex justify-between">
                {statusSteps.map((step, index) => {
                  const currentIndex = getStatusIndex(complaint.status)
                  const isCompleted = index <= currentIndex
                  const isCurrent = index === currentIndex
                  return (
                    <div key={step} className="flex flex-col items-center flex-1">
                      <div
                        className={`w-10 h-10 rounded-full flex items-center justify-center z-10 relative ${
                          isCompleted
                            ? 'bg-primary-600 text-white'
                            : 'bg-gray-200 text-gray-400'
                        }`}
                      >
                        {isCompleted ? <CheckCircle className="h-5 w-5" /> : index + 1}
                      </div>
                      <p
                        className={`text-xs mt-2 text-center ${
                          isCurrent ? 'font-semibold text-primary-600' : 'text-gray-600'
                        }`}
                      >
                        {step.replace('_', ' ')}
                      </p>
                    </div>
                  )
                })}
              </div>
              <div className="absolute top-5 left-5 right-5 h-1 bg-gray-200">
                <div
                  className="h-1 bg-primary-600 transition-all duration-500"
                  style={{
                    width: `${(getStatusIndex(complaint.status) / (statusSteps.length - 1)) * 100}%`,
                  }}
                />
              </div>
            </div>
          </div>
        </div>

        {/* Complaint Details */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Complaint Information</h2>
            </div>
            <div className="card-body space-y-4">
              <div>
                <label className="text-sm font-medium text-gray-500">Description</label>
                <p className="mt-1 text-gray-900 whitespace-pre-wrap">{complaint.description}</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-gray-500">Category</label>
                  <p className="mt-1 text-gray-900">
                    {complaint.category?.replace('_', ' ') || 'Pending AI Analysis'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Location</label>
                  <p className="mt-1 text-gray-900">{complaint.location || 'Not specified'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Severity</label>
                  <p className="mt-1">
                    {complaint.severity ? (
                      <span className={`font-semibold ${
                        complaint.severity === 'CRITICAL' ? 'text-red-600' :
                        complaint.severity === 'HIGH' ? 'text-orange-600' :
                        complaint.severity === 'MEDIUM' ? 'text-yellow-600' :
                        'text-green-600'
                      }`}>
                        {complaint.severity}
                      </span>
                    ) : 'Pending'}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Priority</label>
                  <p className="mt-1">{getPriorityBadge(complaint.priority) || 'Pending'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Department</label>
                  <p className="mt-1 text-gray-900">{complaint.department || 'Unassigned'}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Status</label>
                  <p className="mt-1">{getStatusBadge(complaint.status)}</p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Submitted</label>
                  <p className="mt-1 text-gray-900">
                    {new Date(complaint.created_at).toLocaleString()}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-gray-500">Last Updated</label>
                  <p className="mt-1 text-gray-900">
                    {new Date(complaint.updated_at).toLocaleString()}
                  </p>
                </div>
              </div>
              <div>
                <label className="text-sm font-medium text-gray-500">Anonymous</label>
                <p className="mt-1 text-gray-900">{complaint.anonymous ? 'Yes' : 'No'}</p>
              </div>
              {complaint.evidence?.length > 0 && (
                <div>
                  <label className="text-sm font-medium text-gray-500">Evidence</label>
                  <ul className="mt-1 space-y-1">
                    {complaint.evidence.map((file) => (
                      <li key={file.id}>
                        <button
                          type="button"
                          onClick={() => handleDownloadEvidence(file)}
                          className="inline-flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-500 hover:underline"
                        >
                          <Paperclip className="h-4 w-4" />
                          {file.filename}
                        </button>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          </div>

          {/* AI Analysis */}
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">AI Analysis</h2>
            </div>
            <div className="card-body">
              {complaint.analysis ? (
                <div className="space-y-4">
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-xs text-blue-700">
                      <strong>AI Recommended</strong> - These are recommendations only. Final decisions rest with administrators.
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Summary</label>
                    <p className="mt-1 text-gray-900">{complaint.analysis.summary}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Risk Factors</label>
                    {complaint.analysis.risk_factors && (
                      <ul className="mt-1 list-disc list-inside space-y-1">
                        {Array.isArray(complaint.analysis.risk_factors)
                          ? complaint.analysis.risk_factors.map((rf, i) => (
                              <li key={i} className="text-gray-900">{rf}</li>
                            ))
                          : JSON.parse(complaint.analysis.risk_factors).map((rf, i) => (
                              <li key={i} className="text-gray-900">{rf}</li>
                            ))}
                      </ul>
                    )}
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Recommended Action</label>
                    <p className="mt-1 text-gray-900">{complaint.analysis.recommended_action}</p>
                  </div>
                  <div className="text-xs text-gray-500 pt-2 border-t border-gray-200">
                    Model: {complaint.analysis.ai_model_used} | Fallback: {complaint.analysis.used_fallback ? 'Yes' : 'No'}
                  </div>
                </div>
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <AlertTriangle className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                  <p>No AI analysis yet</p>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Updates Timeline */}
        {complaint.updates && complaint.updates.length > 0 && (
          <div className="card">
            <div className="card-header">
              <h2 className="text-lg font-semibold text-gray-900">Investigation Timeline</h2>
            </div>
            <div className="card-body">
              <div className="space-y-4">
                {complaint.updates.map((update, index) => (
                  <div key={index} className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-primary-100 flex items-center justify-center">
                        <Clock className="h-4 w-4 text-primary-600" />
                      </div>
                    </div>
                    <div>
                      <p className="font-medium text-gray-900">{update.status.replace('_', ' ')}</p>
                      <p className="text-sm text-gray-600 mt-1">{update.note}</p>
                      <p className="text-xs text-gray-500 mt-1">
                        {new Date(update.created_at).toLocaleString()}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* Feedback */}
        {complaint.feedback ? (
          <div className="card border-green-200">
            <div className="card-header bg-green-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Your Feedback
              </h2>
            </div>
            <div className="card-body space-y-3">
              <div className="flex items-center gap-1">
                {[1, 2, 3, 4, 5].map((star) => (
                  <Star
                    key={star}
                    className={`h-6 w-6 ${
                      star <= complaint.feedback.rating
                        ? 'text-yellow-500 fill-yellow-500'
                        : 'text-gray-300'
                    }`}
                  />
                ))}
                <span className="ml-2 text-sm font-medium text-gray-700">
                  {complaint.feedback.rating}/5
                </span>
              </div>
              {complaint.feedback.comment && (
                <p className="text-gray-700 whitespace-pre-wrap">{complaint.feedback.comment}</p>
              )}
              <p className="text-xs text-gray-500">
                Submitted {new Date(complaint.feedback.submitted_at).toLocaleString()}
              </p>
            </div>
          </div>
        ) : showFeedback ? (
          <div className="card border-green-200">
            <div className="card-header bg-green-50">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                <Star className="h-5 w-5 text-yellow-500" />
                Share Your Feedback
              </h2>
            </div>
            <div className="card-body">
              <p className="text-gray-600 mb-4">
                Your complaint has been resolved. Please share your experience to help us improve.
              </p>
              <form onSubmit={handleSubmitFeedback} className="space-y-4">
                <div>
                  <label className="label">Rating</label>
                  <div className="flex gap-2">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setFeedback({ ...feedback, rating: star })}
                        className="focus:outline-none"
                      >
                        <Star
                          className={`h-8 w-8 ${
                            star <= feedback.rating
                              ? 'text-yellow-500 fill-yellow-500'
                              : 'text-gray-300'
                          }`}
                        />
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label htmlFor="comment" className="label">
                    Comments (Optional)
                  </label>
                  <textarea
                    id="comment"
                    rows={3}
                    value={feedback.comment}
                    onChange={(e) => setFeedback({ ...feedback, comment: e.target.value })}
                    className="input-field"
                    placeholder="Tell us about your experience..."
                  />
                </div>
                <button type="submit" disabled={submittingFeedback} className="btn-primary">
                  {submittingFeedback ? 'Submitting...' : 'Submit Feedback'}
                </button>
              </form>
            </div>
          </div>
        ) : null}
      </div>
    </StudentLayout>
  )
}

export default ComplaintDetail
