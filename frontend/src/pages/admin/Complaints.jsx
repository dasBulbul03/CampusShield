import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import AdminLayout from '../../components/layout/AdminLayout'
import LoadError from '../../components/LoadError'
import api from '../../services/api'
import { Eye, Search, FileText } from 'lucide-react'

const PAGE_SIZE = 20

const AdminComplaints = () => {
  const [complaints, setComplaints] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [meta, setMeta] = useState({ total: 0, page: 1, pages: 1 })
  const [search, setSearch] = useState('')
  const [debouncedSearch, setDebouncedSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')
  const [filterPriority, setFilterPriority] = useState('')
  const [filterCategory, setFilterCategory] = useState('')
  const [page, setPage] = useState(1)

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search)
      setPage(1)
    }, 300)
    return () => clearTimeout(timer)
  }, [search])

  useEffect(() => {
    setPage(1)
  }, [filterStatus, filterPriority, filterCategory])

  const fetchComplaints = useCallback(async () => {
    setError(null)
    setLoading(true)
    try {
      const response = await api.get('/admin/complaints', {
        params: {
          page,
          page_size: PAGE_SIZE,
          status: filterStatus || undefined,
          priority: filterPriority || undefined,
          category: filterCategory || undefined,
          search: debouncedSearch || undefined,
        },
      })
      setComplaints(response.data.items)
      setMeta({
        total: response.data.total,
        page: response.data.page,
        pages: response.data.pages,
      })
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to load complaints')
    } finally {
      setLoading(false)
    }
  }, [page, filterStatus, filterPriority, filterCategory, debouncedSearch])

  useEffect(() => {
    fetchComplaints()
  }, [fetchComplaints])

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

  const hasFilters =
    search !== '' || filterStatus !== '' || filterPriority !== '' || filterCategory !== ''

  return (
    <AdminLayout>
      <div className="space-y-6">
        <h1 className="text-2xl font-bold text-gray-900">All Complaints</h1>

        {/* Filters */}
        <div className="card">
          <div className="card-body">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <div className="lg:col-span-2">
                <label className="label">Search</label>
                <div className="relative">
                  <Search className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="input-field pl-10"
                    placeholder="Search by ID or title..."
                  />
                </div>
              </div>
              <div>
                <label className="label">Status</label>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Statuses</option>
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
                <label className="label">Priority</label>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Priorities</option>
                  <option value="P1">P1 - Critical</option>
                  <option value="P2">P2 - High</option>
                  <option value="P3">P3 - Medium</option>
                  <option value="P4">P4 - Low</option>
                </select>
              </div>
              <div>
                <label className="label">Category</label>
                <select
                  value={filterCategory}
                  onChange={(e) => setFilterCategory(e.target.value)}
                  className="input-field"
                >
                  <option value="">All Categories</option>
                  <option value="HARASSMENT">Harassment</option>
                  <option value="RAGGING">Ragging</option>
                  <option value="THREAT">Threat</option>
                  <option value="THEFT">Theft</option>
                  <option value="CYBERCRIME">Cybercrime</option>
                  <option value="BULLYING">Bullying</option>
                  <option value="HOSTEL_SAFETY">Hostel Safety</option>
                  <option value="INFRASTRUCTURE">Infrastructure</option>
                  <option value="ACADEMIC">Academic</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
            </div>
          </div>
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
                <h3 className="text-lg font-medium text-gray-900 mb-2">
                  {hasFilters ? 'No complaints match your filters' : 'No complaints yet'}
                </h3>
                <p className="text-gray-500 text-sm">
                  {hasFilters
                    ? 'Try adjusting the search or filters above.'
                    : 'Complaints submitted by students will appear here.'}
                </p>
              </div>
            ) : (
              <>
                <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Title
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Category
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Severity
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
                        Anonymous
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
                        <td className="px-6 py-4 whitespace-nowrap text-sm">
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
                          {complaint.anonymous ? 'Yes' : 'No'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                          {new Date(complaint.created_at).toLocaleDateString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <Link
                            to={`/admin/complaints/${complaint.id}`}
                            className="text-primary-600 hover:text-primary-900 flex items-center gap-1"
                          >
                            <Eye className="h-4 w-4" />
                            View & Manage
                          </Link>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-6 py-4 border-t border-gray-200">
                  <p className="text-sm text-gray-600">
                    Showing {(meta.page - 1) * PAGE_SIZE + 1}&ndash;
                    {Math.min(meta.page * PAGE_SIZE, meta.total)} of {meta.total}
                  </p>
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                      disabled={meta.page <= 1}
                      className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <span className="text-sm text-gray-600">
                      Page {meta.page} of {meta.pages}
                    </span>
                    <button
                      type="button"
                      onClick={() => setPage((p) => Math.min(meta.pages, p + 1))}
                      disabled={meta.page >= meta.pages}
                      className="btn-secondary px-3 py-1.5 text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </AdminLayout>
  )
}

export default AdminComplaints
