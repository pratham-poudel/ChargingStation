import { useState, useEffect } from 'react'
import { Helmet } from 'react-helmet-async'
import { motion } from 'framer-motion'
import { 
  Plus,
  Search,
  Filter,
  Download,
  Eye,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  User,
  Users,
  Settings,
  RefreshCw,
  UserPlus
} from 'lucide-react'
import AdminLayout from '../../components/layout/AdminLayout'
import { useAdminAuth } from '../../context/AdminAuthContext'
import LoadingSpinner from '../../components/ui/LoadingSpinner'
import toast from 'react-hot-toast'

const AdminManagement = () => {
  const { 
    admin, 
    getAdmins, 
    getEmployees, 
    createAdmin, 
    createEmployee,
    loading: contextLoading
  } = useAdminAuth()
  const [admins, setAdmins] = useState([])
  const [employees, setEmployees] = useState([])
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('admins')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createType, setCreateType] = useState('admin')
  const [searchTerm, setSearchTerm] = useState('')
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    role: 'admin',
    permissions: {},
    stationAccess: []
  })

  // Check if current admin is super admin
  const isSuperAdmin = admin?.role === 'superadmin'

  useEffect(() => {
    if (isSuperAdmin) {
      fetchAdmins()
      fetchEmployees()
    }
  }, [isSuperAdmin])

  const fetchAdmins = async () => {
    try {
      setLoading(true)
      const response = await getAdmins()
      
      if (response.success) {
        setAdmins(response.data.admins || [])
      }
    } catch (error) {
      console.error('Error fetching admins:', error)
      toast.error('Failed to fetch admins')
    } finally {
      setLoading(false)
    }
  }

  const fetchEmployees = async () => {
    try {
      const response = await getEmployees()
      
      if (response.success) {
        setEmployees(response.data.employees || [])
      }
    } catch (error) {
      console.error('Error fetching employees:', error)
      toast.error('Failed to fetch employees')
    }
  }

  const handleCreateAdmin = async (e) => {
    e.preventDefault()
    try {
      const response = await createAdmin({
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        role: formData.role,
        permissions: formData.permissions
      })

      if (response.success) {
        setShowCreateModal(false)
        resetForm()
        fetchAdmins()
      }
    } catch (error) {
      console.error('Error creating admin:', error)
    }
  }

  const handleCreateEmployee = async (e) => {
    e.preventDefault()
    try {
      const response = await createEmployee({
        name: formData.name,
        email: formData.email,
        phoneNumber: formData.phoneNumber,
        stationAccess: formData.stationAccess
      })

      if (response.success) {
        setShowCreateModal(false)
        resetForm()
        fetchEmployees()
      }
    } catch (error) {
      console.error('Error creating employee:', error)
    }
  }

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      phoneNumber: '',
      role: 'admin',
      permissions: {},
      stationAccess: []
    })
  }

  const handleStatusChange = async (id, type, newStatus) => {
    try {
      // This would need to be implemented in the context if needed
      // For now, we'll show a placeholder message
      toast.success(`${type} status change feature coming soon`)
      
      // Refresh the lists
      if (type === 'admin') {
        fetchAdmins()
      } else {
        fetchEmployees()
      }
    } catch (error) {
      toast.error(`Failed to update ${type} status`)
    }
  }

  const filteredAdmins = admins.filter(admin => 
    admin.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    admin.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const filteredEmployees = employees.filter(employee => 
    employee.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    employee.email?.toLowerCase().includes(searchTerm.toLowerCase())
  )

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  if (!isSuperAdmin) {
    return (
      <AdminLayout>
        <div className="text-center py-12">
          <Shield className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access admin management.</p>
        </div>
      </AdminLayout>
    )
  }

  return (
    <AdminLayout>
      <div className="space-y-6">
        <Helmet>
          <title>Admin Management - Admin Dashboard</title>
        </Helmet>

        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Admin Management</h1>
            <p className="text-gray-600">Manage administrators and employees</p>
          </div>
          <div className="flex items-center space-x-3">
            <button
              onClick={() => {
                setCreateType('admin')
                setShowCreateModal(true)
              }}
              className="flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Admin
            </button>
            <button
              onClick={() => {
                setCreateType('employee')
                setShowCreateModal(true)
              }}
              className="flex items-center px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
            >
              <UserPlus className="h-4 w-4 mr-2" />
              Add Employee
            </button>
          </div>
        </div>

        {/* Search and Tabs */}
        <div className="bg-white p-6 rounded-lg shadow-sm border">
          <div className="flex items-center justify-between mb-4">
            <div className="flex space-x-1">
              <button
                onClick={() => setActiveTab('admins')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'admins'
                    ? 'bg-blue-100 text-blue-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <Users className="h-4 w-4 inline mr-2" />
                Admins ({admins.length})
              </button>
              <button
                onClick={() => setActiveTab('employees')}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  activeTab === 'employees'
                    ? 'bg-green-100 text-green-700'
                    : 'text-gray-600 hover:text-gray-900'
                }`}
              >
                <User className="h-4 w-4 inline mr-2" />
                Employees ({employees.length})
              </button>
            </div>

            <div className="flex items-center space-x-3">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
                <input
                  type="text"
                  placeholder="Search..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10 w-64 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <button
                onClick={() => {
                  fetchAdmins()
                  fetchEmployees()
                }}
                className="flex items-center px-3 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
              >
                <RefreshCw className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-white rounded-lg shadow-sm border">
          {loading ? (
            <div className="flex justify-center items-center py-12">
              <LoadingSpinner size="lg" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === 'admins' ? 'Admin' : 'Employee'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      {activeTab === 'admins' ? 'Role' : 'Station Access'}
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Status
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Created
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {(activeTab === 'admins' ? filteredAdmins : filteredEmployees).map((person) => (
                    <motion.tr
                      key={person._id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="hover:bg-gray-50"
                    >
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          <div className={`h-8 w-8 rounded-full flex items-center justify-center ${
                            person.role === 'superadmin' ? 'bg-purple-100' : 'bg-blue-100'
                          }`}>
                            {person.role === 'superadmin' ? (
                              <ShieldCheck className={`h-4 w-4 ${
                                person.role === 'superadmin' ? 'text-purple-600' : 'text-blue-600'
                              }`} />
                            ) : (
                              <User className="h-4 w-4 text-blue-600" />
                            )}
                          </div>
                          <div className="ml-3">
                            <div className="text-sm font-medium text-gray-900">
                              {person.name}
                            </div>
                            {person.role === 'superadmin' && (
                              <div className="text-xs text-purple-600 font-medium">
                                Super Admin
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div>
                          <div className="text-sm text-gray-900">{person.email}</div>
                          <div className="text-sm text-gray-500">{person.phoneNumber}</div>
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        {activeTab === 'admins' ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            person.role === 'superadmin' 
                              ? 'text-purple-600 bg-purple-100'
                              : 'text-blue-600 bg-blue-100'
                          }`}>
                            {person.role}
                          </span>
                        ) : (
                          <div className="text-sm text-gray-900">
                            {person.stationAccess?.length || 0} stations
                          </div>
                        )}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          person.isActive 
                            ? 'text-green-600 bg-green-100'
                            : 'text-red-600 bg-red-100'
                        }`}>
                          {person.isActive ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                        {formatDate(person.createdAt)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          <button className="text-blue-600 hover:text-blue-900">
                            <Eye className="h-4 w-4" />
                          </button>
                          <button className="text-gray-600 hover:text-gray-900">
                            <Edit className="h-4 w-4" />
                          </button>
                          {person.role !== 'superadmin' && (
                            <button
                              onClick={() => handleStatusChange(
                                person._id, 
                                activeTab.slice(0, -1), 
                                person.isActive ? 'inactive' : 'active'
                              )}
                              className="text-orange-600 hover:text-orange-900"
                            >
                              <Settings className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Create Modal */}
        {showCreateModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h2 className="text-xl font-bold text-gray-900">
                    Create New {createType === 'admin' ? 'Admin' : 'Employee'}
                  </h2>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-500 hover:text-gray-700"
                  >
                    ×
                  </button>
                </div>
                
                <form onSubmit={createType === 'admin' ? handleCreateAdmin : handleCreateEmployee}>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Full Name
                      </label>
                      <input
                        type="text"
                        required
                        value={formData.name}
                        onChange={(e) => setFormData({...formData, name: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Email Address
                      </label>
                      <input
                        type="email"
                        required
                        value={formData.email}
                        onChange={(e) => setFormData({...formData, email: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Phone Number
                      </label>
                      <input
                        type="tel"
                        required
                        value={formData.phoneNumber}
                        onChange={(e) => setFormData({...formData, phoneNumber: e.target.value})}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {createType === 'admin' && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                          Role
                        </label>
                        <select
                          value={formData.role}
                          onChange={(e) => setFormData({...formData, role: e.target.value})}
                          className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                        >
                          <option value="admin">Admin</option>
                          <option value="moderator">Moderator</option>
                        </select>
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end space-x-3 mt-6">
                    <button
                      type="button"
                      onClick={() => setShowCreateModal(false)}
                      className="px-4 py-2 text-gray-600 border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Create {createType === 'admin' ? 'Admin' : 'Employee'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
      </div>
    </AdminLayout>
  )
}

export default AdminManagement
