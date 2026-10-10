import { Link } from 'react-router-dom'
import { Shield, Brain, Eye, BarChart3, Users, FileCheck, ArrowRight, CheckCircle } from 'lucide-react'
import { useAuth } from '../../contexts/AuthContext'

const Landing = () => {
  const { isAuthenticated, user } = useAuth()

  return (
    <div className="min-h-screen bg-white">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-2">
              <Shield className="h-8 w-8 text-primary-600" />
              <span className="text-xl font-bold text-gray-900">CampusShield</span>
            </div>
            <div className="flex items-center gap-4">
              {isAuthenticated ? (
                <>
                  <Link
                    to={user?.role === 'ADMIN' ? '/admin/dashboard' : '/student/dashboard'}
                    className="btn-primary"
                  >
                    Go to Dashboard
                  </Link>
                </>
              ) : (
                <>
                  <Link to="/login" className="text-gray-700 hover:text-gray-900 font-medium">
                    Sign In
                  </Link>
                  <Link to="/register" className="btn-primary">
                    Get Started
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="bg-gradient-to-br from-primary-50 via-white to-blue-50 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-3xl mx-auto">
            <div className="flex justify-center mb-6">
              <div className="p-3 bg-primary-600 rounded-full">
                <Shield className="h-12 w-12 text-white" />
              </div>
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Your Safety. Your Voice. <span className="text-primary-600">Your Campus.</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8">
              Report campus incidents safely, let AI help prioritize your complaint, and track the resolution from submission to closure.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link to={isAuthenticated ? '/student/report' : '/login'} className="btn-primary text-lg px-8 py-3">
                Report an Incident
                <ArrowRight className="h-5 w-5 ml-2" />
              </Link>
              <Link to={isAuthenticated ? '/student/complaints' : '/login'} className="btn-secondary text-lg px-8 py-3">
                Track Complaint
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How CampusShield Works</h2>
            <p className="text-lg text-gray-600">A seamless process from reporting to resolution</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="text-center">
              <div className="p-4 bg-primary-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <FileCheck className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Report Safely</h3>
              <p className="text-gray-600">Submit complaints with optional anonymous reporting and attach supporting evidence</p>
            </div>
            <div className="text-center">
              <div className="p-4 bg-primary-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <Brain className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">AI-Powered Analysis</h3>
              <p className="text-gray-600">Intelligent classification, severity assessment, and department routing for faster action</p>
            </div>
            <div className="text-center">
              <div className="p-4 bg-primary-100 rounded-full w-16 h-16 mx-auto mb-4 flex items-center justify-center">
                <BarChart3 className="h-8 w-8 text-primary-600" />
              </div>
              <h3 className="text-xl font-semibold mb-2">Track Transparently</h3>
              <p className="text-gray-600">Real-time status updates, investigation timeline, and resolution tracking</p>
            </div>
          </div>
        </div>
      </section>

      {/* AI Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">AI-Powered Incident Intelligence</h2>
            <p className="text-lg text-gray-600">Smart assistance that prioritizes what matters most</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <h3 className="font-semibold">Automated Classification</h3>
                </div>
                <p className="text-gray-600">Accurately categorizes incidents into appropriate safety categories</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <h3 className="font-semibold">Severity & Priority Assessment</h3>
                </div>
                <p className="text-gray-600">Recommends urgency levels to help administrators focus on critical cases first</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-3">
                  <CheckCircle className="h-6 w-6 text-green-600" />
                  <h3 className="font-semibold">Smart Department Routing</h3>
                </div>
                <p className="text-gray-600">Routes complaints to the right authority for faster resolution</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-3">
                  <Eye className="h-6 w-6 text-green-600" />
                  <h3 className="font-semibold">Risk Factor Analysis</h3>
                </div>
                <p className="text-gray-600">Identifies potential safety risks for better decision making</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-3">
                  <Users className="h-6 w-6 text-green-600" />
                  <h3 className="font-semibold">Human-in-the-Loop</h3>
                </div>
                <p className="text-gray-600">AI assists, humans decide - final authority always with administrators</p>
              </div>
            </div>
            <div className="card">
              <div className="card-body">
                <div className="flex items-center gap-3 mb-3">
                  <Shield className="h-6 w-6 text-green-600" />
                  <h3 className="font-semibold">Safe & Ethical AI</h3>
                </div>
                <p className="text-gray-600">Built with safety guardrails - never determines guilt or makes legal judgments</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 bg-primary-600">
        <div className="max-w-4xl mx-auto text-center px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Make Campus Safer?</h2>
          <p className="text-xl text-primary-100 mb-8">
            Join CampusShield today and help create a safer, more responsive campus community
          </p>
          <Link to={isAuthenticated ? '/student/report' : '/register'} className="inline-flex items-center bg-white text-primary-600 font-semibold px-8 py-3 rounded-md hover:bg-gray-100 transition-colors">
            {isAuthenticated ? 'Report an Incident' : 'Get Started Now'}
            <ArrowRight className="h-5 w-5 ml-2" />
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-gray-300 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center gap-2 mb-4 md:mb-0">
              <Shield className="h-6 w-6 text-white" />
              <span className="text-lg font-bold text-white">CampusShield</span>
            </div>
            <div className="text-center md:text-right">
              <p className="text-sm">&copy; 2026 CampusShield. All rights reserved.</p>
              <p className="text-xs mt-1">Your Safety. Your Voice. Your Campus.</p>
            </div>
          </div>
        </div>
      </footer>
    </div>
  )
}

export default Landing
