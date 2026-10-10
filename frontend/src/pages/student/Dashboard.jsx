import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import StudentLayout from '../../components/layout/StudentLayout'
import LoadError from '../../components/LoadError'
import api from '../../services/api'
import { PlusCircle, FileText, CheckCircle, AlertTriangle } from 'lucide-react'

const StudentDashboard = () => {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    resolved: 0,
    highPriority: 0,
  })

  const fetchComplaints = async () => {
    setError(null)
    try {
      const response = await api.get('/complaints/my')
      setComplaints(response.data)

      const total = response.data.length
      const resolved = response.data.filter(c => c.status === 'RESOLVED').length
      const active = total - resolved
      const highPriority = response.data.filter(c => c.priority === 'P1' || c.priority === 'P2').length

      setStats({ total, active, resolved, highPriority })
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
        return <span className="badge badge-info">{status.replace('_', ' ')}</span>
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
          <h1 className="text-2xl font-bold text-gray-900">Student Dashboard</h1>
          <Link to="/student/report" className="btn-primary">
            <PlusCircle className="h-5 w-5 mr-2" />
            Report an Incident
          </Link>
        </div>

        {/* Stats Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="card">
            <div className="card-body flex items-center gap-4">
              <div className="p-3 bg-blue-100 rounded-lg">
                <FileText className="h-6 w-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Total Complaints</p>
                <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body flex items-center gap-4">
              <div className="p-3 bg-yellow-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-yellow-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Active Complaints</p>
                <p className="text-2xl font-bold text-gray-900">{stats.active}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body flex items-center gap-4">
              <div className="p-3 bg-green-100 rounded-lg">
                <CheckCircle className="h-6 w-6 text-green-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">Resolved</p>
                <p className="text-2xl font-bold text-gray-900">{stats.resolved}</p>
              </div>
            </div>
          </div>
          <div className="card">
            <div className="card-body flex items-center gap-4">
              <div className="p-3 bg-red-100 rounded-lg">
                <AlertTriangle className="h-6 w-6 text-red-600" />
              </div>
              <div>
                <p className="text-sm text-gray-600">High Priority</p>
                <p className="text-2xl font-bold text-gray-900">{stats.highPriority}</p>
              </div>
            </div>
          </div>
        </div>

        {/* Recent Complaints */}
        <div className="card">
          <div className="card-header">
            <h2 className="text-lg font-semibold text-gray-900">Recent Complaints</h2>
          </div>
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
              <div className="text-center py-8 text-gray-500">
                <FileText className="h-12 w-12 mx-auto text-gray-400 mb-3" />
                <p>No complaints submitted yet</p>
                <Link to="/student/report" className="text-primary-600 hover:text-primary-500 text-sm mt-2 inline-block">
                  Report your first incident
                </Link>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
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
                        Date
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {complaints.slice(0, 5).map((complaint) => (
                      <tr key={complaint.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-primary-600">
                          <Link to={`/student/complaints/${complaint.id}`}>
                            {complaint.complaint_number}
                          </Link>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {complaint.category?.replace('_', ' ') || 'Unclassified'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getPriorityBadge(complaint.priority)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(complaint.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(complaint.created_at).toLocaleDateString()}
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

export default StudentDashboard
