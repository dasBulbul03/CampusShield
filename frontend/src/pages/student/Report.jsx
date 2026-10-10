import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import StudentLayout from '../../components/layout/StudentLayout'
import api from '../../services/api'
import { toast } from 'react-toastify'
import { Upload, Bot, AlertCircle, CheckCircle } from 'lucide-react'

const categories = [
  { value: 'HARASSMENT', label: 'Harassment' },
  { value: 'RAGGING', label: 'Ragging' },
  { value: 'THREAT', label: 'Threat' },
  { value: 'THEFT', label: 'Theft' },
  { value: 'CYBERCRIME', label: 'Cybercrime' },
  { value: 'BULLYING', label: 'Bullying' },
  { value: 'HOSTEL_SAFETY', label: 'Hostel Safety' },
  { value: 'INFRASTRUCTURE', label: 'Infrastructure' },
  { value: 'ACADEMIC', label: 'Academic' },
  { value: 'OTHER', label: 'Other' },
]

const Report = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    category: '',
    location: '',
    incident_date: '',
    incident_time: '',
    anonymous: false,
  })
  const [evidence, setEvidence] = useState(null)
  const [analysis, setAnalysis] = useState(null)
  const [complaintId, setComplaintId] = useState(null)
  const [complaintNumber, setComplaintNumber] = useState(null)

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }))
  }

  const handleFileChange = (e) => {
    if (e.target.files[0]) {
      setEvidence(e.target.files[0])
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const formDataToSend = new FormData()
      formDataToSend.append('title', formData.title)
      formDataToSend.append('description', formData.description)
      if (formData.category) formDataToSend.append('category', formData.category)
      if (formData.location) formDataToSend.append('location', formData.location)
      if (formData.incident_date) formDataToSend.append('incident_date', formData.incident_date + 'T00:00:00')
      if (formData.incident_time) formDataToSend.append('incident_time', formData.incident_time)
      formDataToSend.append('anonymous', formData.anonymous)

      if (evidence) {
        formDataToSend.append('evidence', evidence)
      }

      const response = await api.post('/complaints/', formDataToSend, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })

      setComplaintId(response.data.id)
      setComplaintNumber(response.data.complaint_number)
      toast.success('Complaint submitted successfully!')
    } catch (error) {
      const message = error.response?.data?.detail || 'Failed to submit complaint'
      toast.error(message)
    } finally {
      setLoading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!complaintId) {
      toast.error('Please submit the complaint first')
      return
    }
    setAnalyzing(true)
    try {
      const response = await api.post(`/complaints/${complaintId}/analyze`)
      setAnalysis(response.data.analysis)
      if (response.data.analysis.used_fallback) {
        toast.warning('Gemini is unavailable or over quota; fallback analysis was used. Please review it.')
      } else {
        toast.success('AI analysis completed!')
      }
    } catch (error) {
      toast.error('Analysis request failed. No analysis was saved; please try again.')
    } finally {
      setAnalyzing(false)
    }
  }

  const handleViewComplaint = () => {
    navigate(`/student/complaints/${complaintId}`)
  }

  return (
    <StudentLayout>
      <div className="max-w-3xl mx-auto space-y-6">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Report an Incident</h1>
          <p className="text-gray-600 mt-1">
            Help make campus safer. Your report matters. You can submit anonymously.
          </p>
        </div>

        {!complaintId ? (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="card">
              <div className="card-body space-y-6">
                <div>
                  <label htmlFor="title" className="label">
                    Incident Title *
                  </label>
                  <input
                    type="text"
                    id="title"
                    name="title"
                    required
                    value={formData.title}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Brief title of the incident"
                  />
                </div>

                <div>
                  <label htmlFor="description" className="label">
                    Description *
                  </label>
                  <textarea
                    id="description"
                    name="description"
                    required
                    rows={6}
                    value={formData.description}
                    onChange={handleChange}
                    className="input-field"
                    placeholder="Provide a detailed description of what happened. Be specific but factual."
                  />
                  <p className="mt-1 text-xs text-gray-500">
                    AI will analyze this - only reported facts are considered.
                  </p>
                </div>

                <div>
                  <label htmlFor="category" className="label">
                    Category
                  </label>
                  <select
                    id="category"
                    name="category"
                    value={formData.category}
                    onChange={handleChange}
                    className="input-field"
                  >
                    <option value="">Select a category (optional)</option>
                    {categories.map((cat) => (
                      <option key={cat.value} value={cat.value}>
                        {cat.label}
                      </option>
                    ))}
                  </select>
                  <p className="mt-1 text-xs text-gray-500">
                    Leave empty to let AI classify this complaint
                  </p>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label htmlFor="location" className="label">
                      Location
                    </label>
                    <input
                      type="text"
                      id="location"
                      name="location"
                      value={formData.location}
                      onChange={handleChange}
                      className="input-field"
                      placeholder="e.g., Hostel Gate"
                    />
                  </div>
                  <div>
                    <label htmlFor="incident_date" className="label">
                      Date
                    </label>
                    <input
                      type="date"
                      id="incident_date"
                      name="incident_date"
                      value={formData.incident_date}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label htmlFor="incident_time" className="label">
                      Time
                    </label>
                    <input
                      type="time"
                      id="incident_time"
                      name="incident_time"
                      value={formData.incident_time}
                      onChange={handleChange}
                      className="input-field"
                    />
                  </div>
                </div>

                <div>
                  <label className="label">Evidence Upload (Optional)</label>
                  <div className="mt-1 flex justify-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md hover:border-gray-400 transition-colors">
                    <div className="space-y-1 text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <div className="flex text-sm text-gray-600">
                        <label htmlFor="evidence" className="relative cursor-pointer bg-white rounded-md font-medium text-primary-600 hover:text-primary-500 focus-within:outline-none">
                          <span>Upload a file</span>
                          <input
                            id="evidence"
                            name="evidence"
                            type="file"
                            className="sr-only"
                            onChange={handleFileChange}
                            accept="image/*,.pdf,.doc,.docx"
                          />
                        </label>
                        <p className="pl-1">or drag and drop</p>
                      </div>
                      <p className="text-xs text-gray-500">PNG, JPG, PDF up to 10MB</p>
                      {evidence && <p className="text-sm text-green-600 mt-2">{evidence.name}</p>}
                    </div>
                  </div>
                </div>

                <div className="bg-blue-50 border border-blue-200 rounded-md p-4">
                  <div className="flex items-start">
                    <AlertCircle className="h-5 w-5 text-blue-600 mt-0.5" />
                    <div className="ml-3">
                      <label className="flex items-center cursor-pointer">
                        <input
                          type="checkbox"
                          name="anonymous"
                          checked={formData.anonymous}
                          onChange={handleChange}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                        />
                        <span className="ml-2 text-sm font-medium text-blue-900">
                          Submit anonymously
                        </span>
                      </label>
                      <p className="text-sm text-blue-700 mt-1">
                        If enabled, your identity will not be exposed in normal complaint views while tracking remains functional.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex justify-end">
              <button type="submit" disabled={loading} className="btn-primary px-8 py-2.5">
                {loading ? 'Submitting...' : 'Submit Complaint'}
              </button>
            </div>
          </form>
        ) : (
          <div className="space-y-6">
            <div className="card border-green-200 bg-green-50">
              <div className="card-body">
                <div className="flex items-center">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-8 w-8 text-green-600" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-lg font-medium text-green-900">
                      Complaint Submitted Successfully
                    </h3>
                    <p className="mt-1 text-sm text-green-700">
                      Complaint ID:{' '}
                      <span className="font-mono font-semibold">{complaintNumber || `#${complaintId}`}</span>
                      {' — '}Your complaint has been recorded and assigned an ID.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div className="card">
              <div className="card-body space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
                    <Bot className="h-5 w-5 text-primary-600" />
                    AI Incident Analysis
                  </h3>
                  {!analysis && (
                    <button
                      onClick={handleAnalyze}
                      disabled={analyzing}
                      className="btn-primary"
                    >
                      {analyzing ? 'Analyzing...' : 'Let AI Analyze This Complaint'}
                    </button>
                  )}
                </div>

                {analyzing && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
                    <span className="ml-3 text-gray-600">Analyzing with AI...</span>
                  </div>
                )}

                {analysis && (
                  <div className="space-y-4 border-t border-gray-200 pt-4">
                    <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                      <p className="text-xs text-blue-700">
                        <strong>Note:</strong> AI provides recommendations only. Human administrators make final decisions.
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-500">Category</label>
                        <p className="text-base font-semibold text-gray-900 mt-1">
                          {analysis.category?.replace('_', ' ')}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Severity</label>
                        <p className="text-base font-semibold mt-1">
                          {analysis.severity === 'CRITICAL' && <span className="text-red-600">CRITICAL</span>}
                          {analysis.severity === 'HIGH' && <span className="text-orange-600">HIGH</span>}
                          {analysis.severity === 'MEDIUM' && <span className="text-yellow-600">MEDIUM</span>}
                          {analysis.severity === 'LOW' && <span className="text-green-600">LOW</span>}
                        </p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Priority</label>
                        <p className="text-base font-semibold text-gray-900 mt-1">{analysis.priority}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-500">Recommended Department</label>
                        <p className="text-base font-semibold text-gray-900 mt-1">{analysis.recommended_department}</p>
                      </div>
                    </div>

                    <div>
                      <label className="text-sm font-medium text-gray-500">Summary</label>
                      <p className="text-gray-900 mt-1">{analysis.summary}</p>
                    </div>

                    {analysis.risk_factors && (
                      <div>
                        <label className="text-sm font-medium text-gray-500">Risk Factors</label>
                        <ul className="list-disc list-inside mt-1 space-y-1">
                          {Array.isArray(analysis.risk_factors)
                            ? analysis.risk_factors.map((rf, i) => <li key={i} className="text-gray-900">{rf}</li>)
                            : JSON.parse(analysis.risk_factors).map((rf, i) => <li key={i} className="text-gray-900">{rf}</li>)}
                        </ul>
                      </div>
                    )}

                    <div>
                      <label className="text-sm font-medium text-gray-500">Recommended Action</label>
                      <p className="text-gray-900 mt-1">{analysis.recommended_action}</p>
                    </div>

                    {analysis.used_fallback && (
                      <p className="text-xs text-amber-600 italic">
                        Analysis used fallback classifier (AI service unavailable)
                      </p>
                    )}
                  </div>
                )}
              </div>
            </div>

            <div className="flex justify-end gap-3">
              <button onClick={() => navigate('/student/dashboard')} className="btn-secondary">
                Go to Dashboard
              </button>
              <button onClick={handleViewComplaint} className="btn-primary">
                View Complaint Details
              </button>
            </div>
          </div>
        )}
      </div>
    </StudentLayout>
  )
}

export default Report
