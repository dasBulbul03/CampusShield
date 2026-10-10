import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './contexts/AuthContext'
import Landing from './pages/public/Landing'
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'
import StudentDashboard from './pages/student/Dashboard'
import StudentReport from './pages/student/Report'
import StudentComplaints from './pages/student/Complaints'
import StudentComplaintDetail from './pages/student/ComplaintDetail'
import AdminDashboard from './pages/admin/Dashboard'
import AdminComplaints from './pages/admin/Complaints'
import AdminComplaintDetail from './pages/admin/ComplaintDetail'
import AdminAnalytics from './pages/admin/Analytics'
import ProtectedRoute from './components/ProtectedRoute'

function App() {
  return (
    <AuthProvider>
      <Router>
        <Routes>
          <Route path="/" element={<Landing />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          
          {/* Student Routes */}
          <Route element={<ProtectedRoute allowedRoles={['STUDENT']} />}>
            <Route path="/student/dashboard" element={<StudentDashboard />} />
            <Route path="/student/report" element={<StudentReport />} />
            <Route path="/student/complaints" element={<StudentComplaints />} />
            <Route path="/student/complaints/:id" element={<StudentComplaintDetail />} />
          </Route>
          
          {/* Admin Routes */}
          <Route element={<ProtectedRoute allowedRoles={['ADMIN']} />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/complaints" element={<AdminComplaints />} />
            <Route path="/admin/complaints/:id" element={<AdminComplaintDetail />} />
            <Route path="/admin/analytics" element={<AdminAnalytics />} />
          </Route>
          
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Router>
    </AuthProvider>
  )
}

export default App
