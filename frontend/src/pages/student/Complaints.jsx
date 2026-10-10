import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import StudentLayout from '../../components/layout/StudentLayout'
import LoadError from '../../components/LoadError'
import api from '../../services/api'
import { Eye, FileText } from 'lucide-react'

const StudentComplaints = () => {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  const fetchComplaints = async () => {
    setError(null)
    try {
      const response = await api.get('/complaints/my')
      setComplaints(response.data)
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load your complaints')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchComplaints()
  }, [])

  const getStatusBadge = (status) => {
    switch (status) {
      case 'RESOLVED':
        return <span className="badge badge-success">{status.replace('_', ' ')}</span>
      case 'SUBMITTED':
      case 'AI_ANALYZED':
      case 'ASSIGNED':
        return <span className="badge badge-info">{status.replace('_', ' ')}</span>
      case 'UNDER_REVIEW':
      case 'INVESTIGATING':
      case 'ACTION_TAKEN':
        return <span className="badge badge-warning">{status.replace('_', ' ')}</span>
      default:
        return <span className="badge badge-gray">{status.replace('_', ' ')}</span>
    }
  }

  const getPriorityBadge = (priority) => {
    if (priority === 'P1') return <span className="badge badge-danger">CRITICAL</span>
    if (priority === 'P2') return <span className="badge badge-warning">HIGH</span>
    if (priority === 'P3') return <span className="badge badge-info">MEDIUM</span>
    if (priority === 'P4') return <span className="badge badge-gray">LOW</span>
    return null
  }

  return (
    <StudentLayout>
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <h1 className="text-2xl font-bold text-gray-900">My Complaints</h1>
          <Link to="/student/report" className="btn-primary">
            Report New Incident
          </Link>
        </div>

        <div className="card">
          <div className="card-body p-0">
            {loading ? (
              <div className="flex justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
              </div>
            ) : error ? (
              <div className="p-4">
                <LoadError message={error} onRetry={fetchComplaints} />
              </div>
            ) : complaints.length === 0 ? (
              <div className="text-center py-12">
                <FileText className="h-16 w-16 mx-auto text-gray-400 mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No complaints yet</h3>
                <p className="text-gray-500 mb-6">You haven't submitted any complaints yet.</p>
                <Link to="/student/report" className="btn-primary">
                  Report Your First Incident
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Complaint ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Priority
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Department
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {complaints.map((complaint) => (
                      <tr key={complaint.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-primary-600">
                          {complaint.complaint_number}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs truncate">
                          {complaint.title}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {complaint.category?.replace('_', ' ') || 'Pending'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPriorityBadge(complaint.priority)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(complaint.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {complaint.department || 'Unassigned'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(complaint.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            to={`/student/complaints/${complaint.id}`}
                            className="text-primary-600 hover:text-primary-900 flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </StudentLayout>
  )
}

export default StudentComplaints
