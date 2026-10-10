import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import api, { downloadEvidence } from '../../services/api'
import { toast } from 'react-toastify'
import { ArrowLeft, Clock, CheckCircle, Paperclip } from 'lucide-react'

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
  const [departments, setDepartments] = useState([])
  const [assignForm, setAssignForm] = useState({
    department_id: '',
    severity: '',
    priority: '',
  })
  const [statusForm, setStatusForm] = useState({
    status: '',
    note: '',
  })
  const [saving, setSaving] = useState(false)

  const fetchComplaint = async () => {
    try {
      const response = await api.get(`/complaints/${id}`)
      setComplaint(response.data)
      setStatusForm({ status: response.data.status, note: '' })
      setAssignForm({
        department_id: response.data.department_id || '',
        severity: response.data.severity || '',
        priority: response.data.priority || '',
      })
    } catch (error) {
      toast.error('Failed to fetch complaint')
    } finally {
      setLoading(false)
    }
  }

  const fetchDepartments = async () => {
    try {
      const response = await api.get('/admin/departments')
      setDepartments(response.data)
    } catch (error) {
      console.error(error)
    }
  }

  useEffect(() => {
    fetchComplaint()
    fetchDepartments()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id])

  const handleDownloadEvidence = async (file) => {
    try {
      await downloadEvidence(id, file.id, file.filename)
    } catch (error) {
      toast.error('Failed to download evidence')
    }
  }

  const getStatusIndex = (status) => {
    return statusSteps.indexOf(status)
  }

  const handleAssign = async (e) => {
    e.preventDefault()
    if (!assignForm.department_id) {
      toast.error('Please select a department')
      return
    }
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('department_id', assignForm.department_id)
      if (assignForm.severity) formData.append('severity', assignForm.severity)
      if (assignForm.priority) formData.append('priority', assignForm.priority)
      await api.post(`/complaints/${id}/assign`, formData)
      toast.success('Complaint assigned successfully!')
      fetchComplaint()
    } catch (error) {
      toast.error('Failed to assign complaint')
    } finally {
      setSaving(false)
    }
  }

  const handleStatusUpdate = async (e) => {
    e.preventDefault()
    if (!statusForm.note) {
      toast.error('Please add an investigation note')
      return
    }
    setSaving(true)
    try {
      const formData = new FormData()
      formData.append('status_val', statusForm.status)
      formData.append('note', statusForm.note)
      await api.post(`/complaints/${id}/status`, formData)
      toast.success('Status updated successfully!')
      fetchComplaint()
      setStatusForm({ ...statusForm, note: '' })
    } catch (error) {
      toast.error('Failed to update status')
    } finally {
      setSaving(false)
    }
  }

  if (loading) {
    return (
      <AdminLayout>
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary-600"></div>
        </div>
      </AdminLayout>
    )
  }

  if (!complaint) {
    return (
      <AdminLayout>
        <div className="text-center py-12">Complaint not found</div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <button onClick={() => navigate('/admin/complaints')} className="btn-secondary">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back
          </button>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{complaint.complaint_number}</h1>
            <p className="text-gray-600">{complaint.title}</p>
          </div>
        </div>

        {/* Status Timeline */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Status Timeline</h2>
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

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Complaint Info */}
          <div className="space-y-6">
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
                    <label className="text-sm font-medium text-gray-500">Submitted By</label>
                    <p className="mt-1 text-gray-900">
                      {complaint.anonymous ? 'Anonymous' : complaint.student_name}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Email</label>
                    <p className="mt-1 text-gray-900">
                      {complaint.anonymous ? 'N/A' : complaint.student_email}
                    </p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Category</label>
                    <p className="mt-1 text-gray-900">{complaint.category?.replace('_', ' ') || 'Pending'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Location</label>
                    <p className="mt-1 text-gray-900">{complaint.location || 'N/A'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Severity</label>
                    <p className="mt-1 text-gray-900">{complaint.severity || 'Pending'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Priority</label>
                    <p className="mt-1 text-gray-900">{complaint.priority || 'Pending'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Department</label>
                    <p className="mt-1 text-gray-900">{complaint.department || 'Unassigned'}</p>
                  </div>
                  <div>
                    <label className="text-sm font-medium text-gray-500">Status</label>
                    <p className="mt-1">{complaint.status.replace('_', ' ')}</p>
                  </div>
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
                        <strong>AI Recommended</strong> - Admin can override these values.
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Recommended Category</label>
                      <p className="mt-1 text-gray-900">{complaint.analysis.category.replace('_', ' ')}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Recommended Severity</label>
                      <p className="mt-1 text-gray-900">{complaint.analysis.severity}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Recommended Priority</label>
                      <p className="mt-1 text-gray-900">{complaint.analysis.priority}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-500">Recommended Department</label>
                      <p className="mt-1 text-gray-900">{complaint.analysis.recommended_department}</p>
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
                  </div>
                ) : (
                  <p className="text-gray-500">No AI analysis available</p>
                )}
              </div>
            </div>
          </div>

          {/* Admin Controls */}
          <div className="space-y-6">
            {/* Assign & Override */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Assign & Override</h2>
              </div>
              <div className="card-body">
                <form onSubmit={handleAssign} className="space-y-4">
                  <div>
                    <label className="label">Department *</label>
                    <select
                      value={assignForm.department_id}
                      onChange={(e) => setAssignForm({ ...assignForm, department_id: e.target.value })}
                      className="input-field"
                      required
                    >
                      <option value="">Select Department</option>
                      {departments.map((dept) => (
                        <option key={dept.id} value={dept.id}>
                          {dept.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label className="label">Override Severity</label>
                    <select
                      value={assignForm.severity}
                      onChange={(e) => setAssignForm({ ...assignForm, severity: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Use AI Recommendation</option>
                      <option value="LOW">LOW</option>
                      <option value="MEDIUM">MEDIUM</option>
                      <option value="HIGH">HIGH</option>
                      <option value="CRITICAL">CRITICAL</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Override Priority</label>
                    <select
                      value={assignForm.priority}
                      onChange={(e) => setAssignForm({ ...assignForm, priority: e.target.value })}
                      className="input-field"
                    >
                      <option value="">Use AI Recommendation</option>
                      <option value="P1">P1 - Critical</option>
                      <option value="P2">P2 - High</option>
                      <option value="P3">P3 - Medium</option>
                      <option value="P4">P4 - Low</option>
                    </select>
                  </div>
                  <button type="submit" disabled={saving} className="btn-primary w-full">
                    {saving ? 'Saving...' : 'Assign & Update'}
                  </button>
                </form>
              </div>
            </div>

            {/* Update Status */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Update Status</h2>
              </div>
              <div className="card-body">
                <form onSubmit={handleStatusUpdate} className="space-y-4">
                  <div>
                    <label className="label">Status</label>
                    <select
                      value={statusForm.status}
                      onChange={(e) => setStatusForm({ ...statusForm, status: e.target.value })}
                      className="input-field"
                    >
                      <option value="SUBMITTED">Submitted</option>
                      <option value="AI_ANALYZED">AI Analyzed</option>
                      <option value="ASSIGNED">Assigned</option>
                      <option value="UNDER_REVIEW">Under Review</option>
                      <option value="INVESTIGATING">Investigating</option>
                      <option value="ACTION_TAKEN">Action Taken</option>
                      <option value="RESOLVED">Resolved</option>
                    </select>
                  </div>
                  <div>
                    <label className="label">Investigation Note *</label>
                    <textarea
                      rows={4}
                      value={statusForm.note}
                      onChange={(e) => setStatusForm({ ...statusForm, note: e.target.value })}
                      className="input-field"
                      placeholder="Add investigation notes, actions taken, etc."
                      required
                    />
                  </div>
                  <button type="submit" disabled={saving} className="btn-primary w-full">
                    {saving ? 'Updating...' : 'Update Status'}
                  </button>
                </form>
              </div>
            </div>

            {/* Updates History */}
            <div className="card">
              <div className="card-header">
                <h2 className="text-lg font-semibold text-gray-900">Updates History</h2>
              </div>
              <div className="card-body">
                <div className="space-y-4 max-h-96 overflow-y-auto">
                  {complaint.updates && complaint.updates.length > 0 ? (
                    complaint.updates.map((update, index) => (
                      <div key={index} className="border-l-2 border-primary-200 pl-4 pb-4">
                        <p className="font-medium text-gray-900">{update.status.replace('_', ' ')}</p>
                        <p className="text-sm text-gray-600 mt-1 whitespace-pre-wrap">{update.note}</p>
                        <p className="text-xs text-gray-500 mt-1">
                          {new Date(update.created_at).toLocaleString()}
                        </p>
                      </div>
                    ))
                  ) : (
                    <p className="text-gray-500 text-sm">No updates yet</p>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default ComplaintDetail
