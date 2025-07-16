import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { Helmet } from 'react-helmet-async'
import { motion, AnimatePresence } from 'framer-motion'
import { useMerchant } from '../context/MerchantContext'
import { restaurantAPI } from '../services/restaurantAPI'
import { presignedUploadAPI } from '../services/presignedUploadAPI'
import LoadingSpinner, { ContentLoader } from '../components/ui/LoadingSpinner'
import { 
  ChefHat,
  BarChart3,
  Package,
  Users,
  Clock,
  Star,
  DollarSign,
  TrendingUp,
  Settings,
  LogOut,
  Bell,
  Eye,
  EyeOff,
  Plus,
  Edit,
  CheckCircle2,
  AlertCircle,
  Menu,
  X,
  IndianRupee,
  Search,
  Filter,
  MoreVertical,
  Key,
  Trash2,
  ChevronDown,
  ChevronUp,
  Calendar,
  MapPin,
  Phone,
  CreditCard,
  FileText
} from 'lucide-react'

const RestaurantManagement = () => {
  const { restaurantId } = useParams()
  const navigate = useNavigate()
  const { merchant, token: merchantToken, isAuthenticated: isMerchantAuthenticated } = useMerchant()
  const [restaurant, setRestaurant] = useState(null)
  const [employee, setEmployee] = useState(null)
  const [dashboardData, setDashboardData] = useState(null)
  const [orders, setOrders] = useState([])
  const [employees, setEmployees] = useState([])
  const [menuLoading, setMenuLoading] = useState(false)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('dashboard')
  
  // Menu management state
  const [showMenuModal, setShowMenuModal] = useState(false)
  const [editingMenuItem, setEditingMenuItem] = useState(null)
  const [menuForm, setMenuForm] = useState({
    name: '',
    description: '',
    price: '',
    category: '',
    preparationTime: 15,
    isVeg: false,
    isSpicy: false,
    allergens: [],
    images: []
  })
  const [uploadingImages, setUploadingImages] = useState(false)
  
  // Search and filter state
  const [searchQuery, setSearchQuery] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  
  // Order expansion state
  const [expandedOrders, setExpandedOrders] = useState(new Set())

  // Offline Order Creation State
  const [showCreateOrder, setShowCreateOrder] = useState(false)
  const [createOrderStep, setCreateOrderStep] = useState('menu') // 'menu', 'customer', 'payment', 'success'
  const [cartItems, setCartItems] = useState([])
  const [customerInfo, setCustomerInfo] = useState({
    name: '',
    phoneNumber: '',
    email: ''
  })
  const [orderDetails, setOrderDetails] = useState({
    orderType: 'dine_in',
    tableNumber: '',
    paymentMethod: 'cash',
    notes: ''
  })
  const [creatingOrder, setCreatingOrder] = useState(false)
  const [createdOrder, setCreatedOrder] = useState(null)
  const [menuSearchQuery, setMenuSearchQuery] = useState('')
  const [menuCategoryFilter, setMenuCategoryFilter] = useState('')

  // Employee management state (only for vendors)
  const [showAssignEmployee, setShowAssignEmployee] = useState(false)
  const [assigningEmployee, setAssigningEmployee] = useState(false)
  const [assignEmployeeData, setAssignEmployeeData] = useState({
    employeeName: '',
    phoneNumber: '',
    password: '',
    email: '',
    role: 'restaurant_manager',
    notes: ''
  })

  // Password change state
  const [showPasswordChange, setShowPasswordChange] = useState(false)
  const [selectedEmployee, setSelectedEmployee] = useState(null)
  const [passwordChangeData, setPasswordChangeData] = useState({
    newPassword: '',
    confirmPassword: '',
    otp: ''
  })
  const [passwordChangeStep, setPasswordChangeStep] = useState('password') // 'password' or 'otp'
  const [changingPassword, setChangingPassword] = useState(false)
  const [otpSent, setOtpSent] = useState(false)

  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false)
  const [authMode, setAuthMode] = useState('checking') // 'checking', 'merchant', 'employee'
  const [loginForm, setLoginForm] = useState({
    employeeId: '',
    password: ''
  })
  const [isLoggingIn, setIsLoggingIn] = useState(false)

  useEffect(() => {
    checkAuthentication()
  }, [restaurantId, isMerchantAuthenticated, merchantToken])

  const checkAuthentication = async () => {
    try {
      setLoading(true)
      
      // First check if user is authenticated as merchant and owns this restaurant
      if (isMerchantAuthenticated && merchantToken && merchant) {
        try {
          console.log('Checking merchant access...', { merchantId: merchant.id || merchant._id, restaurantId })
          const response = await restaurantAPI.getRestaurant(restaurantId)
          console.log('Restaurant data:', response.data)
          
          const merchantId = merchant.id || merchant._id
          
          // If the API call succeeds, it means the merchant owns the restaurant
          // (the backend validates ownership in the query)
          if (response.success) {
            console.log('Merchant owns restaurant, authenticating as merchant')
            const restaurantData = response.data.restaurant || response.data
            
            setAuthMode('merchant')
            setIsAuthenticated(true)
            setRestaurant(restaurantData)
            setEmployee({ 
              name: merchant.businessName || merchant.name,
              role: 'Owner',
              id: merchantId,
              type: 'merchant'
            })
            await loadDashboardData(merchantToken)
            return
          }
        } catch (error) {
          console.log('Merchant authentication failed, falling back to employee login:', error)
          // Fall through to employee authentication
        }
      }
      
      // Check if restaurant employee is logged in
      const token = localStorage.getItem(`restaurant_token_${restaurantId}`)
      const savedEmployee = localStorage.getItem(`restaurant_employee_${restaurantId}`)
      
      if (token && savedEmployee) {
        setAuthMode('employee')
        setEmployee(JSON.parse(savedEmployee))
        setIsAuthenticated(true)
        await loadDashboardData(token)
      } else {
        setAuthMode('employee')
        setLoading(false)
      }
    } catch (error) {
      console.error('Authentication check error:', error)
      setAuthMode('employee')
      setError('Failed to verify authentication')
      setLoading(false)
    }
  }

  const handleLogin = async (e) => {
    e.preventDefault()
    try {
      setIsLoggingIn(true)
      setError('')

      const response = await restaurantAPI.employeeLogin(restaurantId, loginForm)
      
      if (response.success) {
        const { token, employee } = response.data
        
        // Store auth data
        localStorage.setItem(`restaurant_token_${restaurantId}`, token)
        localStorage.setItem(`restaurant_employee_${restaurantId}`, JSON.stringify(employee))
        
        setEmployee(employee)
        setAuthMode('employee')
        setIsAuthenticated(true)
        await loadDashboardData(token)
      }
    } catch (error) {
      console.error('Login error:', error)
      setError(error.response?.data?.message || 'Login failed')
    } finally {
      setIsLoggingIn(false)
    }
  }

  const handleLogout = () => {
    if (authMode === 'merchant') {
      // For merchant access, navigate back to merchant dashboard
      navigate('/merchant/restaurants')
    } else {
      // For employee access, clear local storage and show login
      localStorage.removeItem(`restaurant_token_${restaurantId}`)
      localStorage.removeItem(`restaurant_employee_${restaurantId}`)
      setEmployee(null)
      setIsAuthenticated(false)
      setDashboardData(null)
      setOrders([])
    }
  }

  const loadDashboardData = async (token) => {
    try {
      setLoading(true)
      const response = await restaurantAPI.getRestaurantDashboard(restaurantId, token)
      
      if (response.success) {
        setDashboardData(response.data)
        setRestaurant(response.data.restaurant)
      }
    } catch (error) {
      console.error('Error loading dashboard:', error)
      
      // Check if it's a verification error
      if (error.response?.status === 403 && 
          error.response?.data?.message?.includes('not active or verified')) {
        setError('RESTAURANT_NOT_VERIFIED')
      } else {
        setError('Failed to load dashboard data')
      }
    } finally {
      setLoading(false)
    }
  }

  const getCurrentToken = () => {
    if (authMode === 'merchant') {
      return merchantToken
    } else {
      return localStorage.getItem(`restaurant_token_${restaurantId}`)
    }
  }

  const loadOrders = async () => {
    try {
      const token = getCurrentToken()
      const response = await restaurantAPI.getRestaurantOrders(restaurantId, {}, token)
      
      if (response.success) {
        setOrders(response.data.orders)
      }
    } catch (error) {
      console.error('Error loading orders:', error)
      setError('Failed to load orders')
    }
  }

  const loadEmployees = async () => {
    try {
      const token = getCurrentToken()
      const response = await restaurantAPI.getRestaurantEmployees(restaurantId, token)
      
      if (response.success) {
        setEmployees(response.data)
      }
    } catch (error) {
      console.error('Error loading employees:', error)
      setError('Failed to load employees')
    }
  }

  const updateOrderStatus = async (orderId, status, notes = '') => {
    try {
      setError('') // Clear any previous errors
      const token = getCurrentToken()
      const response = await restaurantAPI.updateOrderStatus(
        restaurantId, 
        orderId, 
        { status, notes }, 
        token
      )
      
      if (response.success) {
        // Refresh both orders and dashboard data
        await Promise.all([
          loadOrders(),
          loadDashboardData(token)
        ])
      }
    } catch (error) {
      console.error('Error updating order status:', error)
      setError(`Failed to update order status: ${error.response?.data?.message || error.message}`)
    }
  }

  const toggleMenuItemAvailability = async (itemId, isAvailable) => {
    try {
      setMenuLoading(true)
      const token = getCurrentToken()
      const response = await restaurantAPI.updateMenuAvailability(
        restaurantId, 
        itemId, 
        !isAvailable, 
        token
      )
      
      if (response.success) {
        await loadDashboardData(token)
        // Show success feedback
        setError('')
      }
    } catch (error) {
      console.error('Error toggling menu availability:', error)
      setError('Failed to update menu item availability')
    } finally {
      setMenuLoading(false)
    }
  }

  const openMenuModal = (menuItem = null) => {
    if (menuItem) {
      // Editing existing item
      setEditingMenuItem(menuItem)
      setMenuForm({
        name: menuItem.name,
        description: menuItem.description || '',
        price: menuItem.price.toString(),
        category: menuItem.category,
        preparationTime: menuItem.preparationTime || 15,
        isVeg: menuItem.isVegetarian || false, // Map isVegetarian to isVeg
        isSpicy: menuItem.isSpicy || false, // Now use actual isSpicy field
        allergens: menuItem.allergens || [],
        images: menuItem.images || []
      })
    } else {
      // Adding new item
      setEditingMenuItem(null)
      setMenuForm({
        name: '',
        description: '',
        price: '',
        category: '',
        preparationTime: 15,
        isVeg: false,
        isSpicy: false,
        allergens: [],
        images: []
      })
    }
    setShowMenuModal(true)
  }

  const closeMenuModal = () => {
    setShowMenuModal(false)
    setEditingMenuItem(null)
    setMenuForm({
      name: '',
      description: '',
      price: '',
      category: '',
      preparationTime: 15,
      isVeg: false,
      isSpicy: false,
      allergens: [],
      images: []
    })
  }

  const handleMenuSubmit = async (e) => {
    e.preventDefault()
    try {
      setMenuLoading(true)
      const token = getCurrentToken()

      const menuData = {
        ...menuForm,
        price: parseFloat(menuForm.price),
        preparationTime: parseInt(menuForm.preparationTime)
      }

      if (editingMenuItem) {
        // Update existing item
        await restaurantAPI.updateMenuItem(restaurantId, editingMenuItem._id, menuData, token)
      } else {
        // Add new item
        await restaurantAPI.addMenuItem(restaurantId, menuData, token)
      }

      // Refresh dashboard data to get updated menu
      await loadDashboardData(token)
      closeMenuModal()
      setError('')
    } catch (error) {
      console.error('Error saving menu item:', error)
      setError(`Failed to ${editingMenuItem ? 'update' : 'add'} menu item: ${error.response?.data?.message || error.message}`)
    } finally {
      setMenuLoading(false)
    }
  }

  const handleDeleteMenuItem = async (itemId) => {
    if (!confirm('Are you sure you want to delete this menu item?')) {
      return
    }

    try {
      setMenuLoading(true)
      const token = getCurrentToken()
      await restaurantAPI.deleteMenuItem(restaurantId, itemId, token)
      
      // Refresh dashboard data to get updated menu
      await loadDashboardData(token)
      setError('')
    } catch (error) {
      console.error('Error deleting menu item:', error)
      setError(`Failed to delete menu item: ${error.response?.data?.message || error.message}`)
    } finally {
      setMenuLoading(false)
    }
  }

  const handleImageUpload = async (files) => {
    try {
      setUploadingImages(true)
      const uploadedImages = []

      for (const file of files) {
        // Generate presigned URL using the API service
        const presignedResponse = await presignedUploadAPI.generateUploadUrl({
          fileName: file.name,
          fileType: file.type,
          fileSize: file.size,
          folder: 'Images'
        })

        if (!presignedResponse.success) {
          throw new Error('Failed to generate upload URL')
        }

        // Upload file directly to S3/MinIO using the API service
        const uploadResult = await presignedUploadAPI.uploadFileToR2(
          presignedResponse.data.uploadUrl,
          file
        )

        if (!uploadResult.success) {
          throw new Error('Failed to upload file')
        }

        // Add image object with proper structure
        uploadedImages.push({
          url: presignedResponse.data.fileUrl,
          caption: '',
          objectName: presignedResponse.data.objectName,
          originalName: file.name,
          uploadedAt: new Date()
        })
      }

      setMenuForm(prev => ({
        ...prev,
        images: [...prev.images, ...uploadedImages]
      }))

    } catch (error) {
      console.error('Error uploading images:', error)
      setError('Failed to upload images: ' + error.message)
    } finally {
      setUploadingImages(false)
    }
  }

  const handleRemoveImage = (index) => {
    setMenuForm(prev => ({
      ...prev,
      images: prev.images.filter((_, i) => i !== index)
    }))
  }

  const handleAssignEmployee = async (e) => {
    e.preventDefault()
    try {
      setAssigningEmployee(true)
      setError('')

      const token = getCurrentToken()
      const response = await restaurantAPI.assignRestaurantEmployee(restaurantId, assignEmployeeData, token)

      if (response.success) {
        // Reset form
        setAssignEmployeeData({
          employeeName: '',
          phoneNumber: '',
          password: '',
          email: '',
          role: 'restaurant_manager',
          notes: ''
        })
        setShowAssignEmployee(false)
        
        // Refresh employees list
        await loadEmployees()
        
        // Show success message
        alert(`Employee assigned successfully!\nAssignment Number: ${response.data.employee.assignmentNumber}\n\nPlease share this assignment number with the employee for login.`)
      }
    } catch (error) {
      console.error('Error assigning employee:', error)
      setError(`Failed to assign employee: ${error.response?.data?.message || error.message}`)
    } finally {
      setAssigningEmployee(false)
    }
  }

  const handleDeleteEmployee = async (employeeId, employeeName) => {
    if (!window.confirm(`Are you sure you want to delete employee "${employeeName}"? This action cannot be undone.`)) {
      return
    }

    try {
      const token = getCurrentToken()
      const response = await restaurantAPI.deleteRestaurantEmployee(restaurantId, employeeId, token)

      if (response.success) {
        // Refresh employees list
        await loadEmployees()
        alert('Employee deleted successfully!')
      }
    } catch (error) {
      console.error('Error deleting employee:', error)
      setError(`Failed to delete employee: ${error.response?.data?.message || error.message}`)
    }
  }

  const openPasswordChangeModal = (employee) => {
    setSelectedEmployee(employee)
    setPasswordChangeData({
      newPassword: '',
      confirmPassword: '',
      otp: ''
    })
    setPasswordChangeStep('password')
    setOtpSent(false)
    setShowPasswordChange(true)
  }

  const closePasswordChangeModal = () => {
    setShowPasswordChange(false)
    setSelectedEmployee(null)
    setPasswordChangeData({
      newPassword: '',
      confirmPassword: '',
      otp: ''
    })
    setPasswordChangeStep('password')
    setOtpSent(false)
  }

  const handlePasswordChange = async (e) => {
    e.preventDefault()
    
    if (passwordChangeStep === 'password') {
      // Validate passwords
      if (passwordChangeData.newPassword !== passwordChangeData.confirmPassword) {
        setError('Passwords do not match')
        return
      }
      
      if (passwordChangeData.newPassword.length < 6) {
        setError('Password must be at least 6 characters long')
        return
      }

      try {
        setChangingPassword(true)
        setError('')
        
        const token = getCurrentToken()
        const response = await restaurantAPI.requestPasswordChangeOTP(restaurantId, selectedEmployee._id, passwordChangeData.newPassword, token)
        
        if (response.success) {
          setPasswordChangeStep('otp')
          setOtpSent(true)
          alert('OTP has been sent to your phone number. Please enter it to confirm the password change.')
        }
      } catch (error) {
        console.error('Error requesting password change:', error)
        setError(`Failed to request password change: ${error.response?.data?.message || error.message}`)
      } finally {
        setChangingPassword(false)
      }
    } else if (passwordChangeStep === 'otp') {
      // Verify OTP and change password
      if (!passwordChangeData.otp) {
        setError('Please enter the OTP')
        return
      }

      try {
        setChangingPassword(true)
        setError('')
        
        const token = getCurrentToken()
        const response = await restaurantAPI.verifyPasswordChangeOTP(
          restaurantId, 
          selectedEmployee._id, 
          passwordChangeData.newPassword, 
          passwordChangeData.otp, 
          token
        )
        
        if (response.success) {
          closePasswordChangeModal()
          alert(`Password changed successfully for ${selectedEmployee.employeeName}!`)
        }
      } catch (error) {
        console.error('Error changing password:', error)
        setError(`Failed to change password: ${error.response?.data?.message || error.message}`)
      } finally {
        setChangingPassword(false)
      }
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'confirmed': return 'bg-blue-100 text-blue-800'
      case 'preparing': return 'bg-orange-100 text-orange-800'
      case 'ready': return 'bg-green-100 text-green-800'
      case 'completed': return 'bg-gray-100 text-gray-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const toggleOrderExpansion = (orderId) => {
    const newExpanded = new Set(expandedOrders)
    if (newExpanded.has(orderId)) {
      newExpanded.delete(orderId)
    } else {
      newExpanded.add(orderId)
    }
    setExpandedOrders(newExpanded)
  }

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const formatDateOnly = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  // Offline Order Creation Functions
  const openCreateOrder = () => {
    setShowCreateOrder(true)
    setCreateOrderStep('menu')
    setCartItems([])
    setCustomerInfo({ name: '', phoneNumber: '', email: '' })
    setOrderDetails({ orderType: 'dine_in', tableNumber: '', paymentMethod: 'cash', notes: '' })
    setCreatedOrder(null)
  }

  const closeCreateOrder = () => {
    setShowCreateOrder(false)
    setCreateOrderStep('menu')
    setCartItems([])
    setCustomerInfo({ name: '', phoneNumber: '', email: '' })
    setOrderDetails({ orderType: 'dine_in', tableNumber: '', paymentMethod: 'cash', notes: '' })
    setCreatedOrder(null)
  }

  const addToCart = (menuItem) => {
    const existingItem = cartItems.find(item => item.menuItemId === menuItem._id)
    
    if (existingItem) {
      setCartItems(prev => prev.map(item => 
        item.menuItemId === menuItem._id 
          ? { ...item, quantity: item.quantity + 1, totalPrice: (item.quantity + 1) * item.unitPrice }
          : item
      ))
    } else {
      setCartItems(prev => [...prev, {
        menuItemId: menuItem._id,
        name: menuItem.name,
        price: menuItem.price,
        unitPrice: menuItem.price,
        quantity: 1,
        totalPrice: menuItem.price,
        category: menuItem.category
      }])
    }
  }

  const removeFromCart = (menuItemId) => {
    setCartItems(prev => prev.filter(item => item.menuItemId !== menuItemId))
  }

  const updateCartItemQuantity = (menuItemId, newQuantity) => {
    if (newQuantity <= 0) {
      removeFromCart(menuItemId)
      return
    }
    
    setCartItems(prev => prev.map(item => 
      item.menuItemId === menuItemId 
        ? { ...item, quantity: newQuantity, totalPrice: newQuantity * item.unitPrice }
        : item
    ))
  }

  const getCartTotal = () => {
    return cartItems.reduce((total, item) => total + item.totalPrice, 0)
  }

  // Filter menu items for search and category
  const getFilteredMenuItems = () => {
    if (!restaurant?.menu) return []
    
    return restaurant.menu.filter(item => {
      const matchesSearch = !menuSearchQuery || 
        item.name.toLowerCase().includes(menuSearchQuery.toLowerCase()) ||
        item.description?.toLowerCase().includes(menuSearchQuery.toLowerCase())
      
      const matchesCategory = !menuCategoryFilter || item.category === menuCategoryFilter
      
      return item.isAvailable && matchesSearch && matchesCategory
    })
  }

  const proceedToCustomerInfo = () => {
    if (cartItems.length === 0) {
      setError('Please add at least one item to cart')
      return
    }
    setCreateOrderStep('customer')
    setError('')
  }

  const proceedToPayment = () => {
    if (!customerInfo.name.trim() || !customerInfo.phoneNumber.trim()) {
      setError('Please fill in customer name and phone number')
      return
    }
    setCreateOrderStep('payment')
    setError('')
  }

  const createOrder = async () => {
    try {
      setCreatingOrder(true)
      setError('')

      const orderData = {
        customer: customerInfo,
        items: cartItems.map(item => ({
          menuItemId: item.menuItemId,
          quantity: item.quantity,
          specialInstructions: ''
        })),
        orderType: orderDetails.orderType,
        payment: {
          method: orderDetails.paymentMethod
        },
        tableInfo: orderDetails.orderType === 'dine_in' && orderDetails.tableNumber ? {
          tableNumber: orderDetails.tableNumber
        } : null,
        notes: {
          customer: orderDetails.notes || '',
          restaurant: ''
        }
      }

      const token = getCurrentToken()
      const response = await restaurantAPI.createOfflineOrder(restaurantId, orderData, token)

      if (response.success) {
        setCreatedOrder(response.data)
        setCreateOrderStep('success')
        
        // Refresh orders list
        await loadOrders()
      }
    } catch (error) {
      console.error('Error creating order:', error)
      setError(`Failed to create order: ${error.response?.data?.message || error.message}`)
    } finally {
      setCreatingOrder(false)
    }
  }

  const printBill = () => {
    if (!createdOrder) return

    const printWindow = window.open('', '_blank')
    const printData = createdOrder.printData
    
    // Format address properly
    const formatAddress = (address) => {
      if (!address) return ''
      const parts = []
      if (address.street) parts.push(address.street)
      if (address.landmark) parts.push(address.landmark)
      if (address.city) parts.push(address.city)
      if (address.state) parts.push(address.state)
      if (address.pincode) parts.push(address.pincode)
      return parts.join(', ')
    }
    
    const printContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <title>Bill - ${printData.orderNumber}</title>
        <style>
          * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
          }
          
          body { 
            font-family: 'Courier New', monospace;
            font-size: 12px; 
            line-height: 1.2; 
            color: #000;
            background: white;
            width: 80mm;
            padding: 5px;
          }
          
          .header {
            text-align: center;
            margin-bottom: 15px;
            padding-bottom: 10px;
            border-bottom: 1px solid #000;
          }
          
          .restaurant-name {
            font-weight: bold;
            font-size: 14px;
            margin-bottom: 5px;
            text-transform: uppercase;
          }
          
          .restaurant-address {
            font-size: 10px;
            line-height: 1.3;
            margin-bottom: 3px;
          }
          
          .restaurant-phone {
            font-size: 10px;
            font-weight: bold;
          }
          
          .order-info {
            margin-bottom: 15px;
          }
          
          .order-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10px;
          }
          
          .order-label {
            font-weight: bold;
          }
          
          .customer-info {
            margin-bottom: 15px;
            padding: 8px;
            border: 1px solid #000;
          }
          
          .customer-title {
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 5px;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
          }
          
          .customer-detail {
            font-size: 10px;
            margin-bottom: 2px;
          }
          
          .items-section {
            margin-bottom: 15px;
          }
          
          .items-title {
            font-weight: bold;
            font-size: 10px;
            margin-bottom: 8px;
            text-transform: uppercase;
            border-bottom: 1px solid #000;
            padding-bottom: 2px;
          }
          
          .item {
            margin-bottom: 6px;
            padding: 4px 0;
            border-bottom: 1px dotted #000;
          }
          
          .item-header {
            display: flex;
            justify-content: space-between;
            align-items: flex-start;
            margin-bottom: 2px;
          }
          
          .item-name {
            font-weight: bold;
            font-size: 10px;
            flex: 1;
          }
          
          .item-quantity {
            font-weight: bold;
            font-size: 10px;
            margin-left: 5px;
          }
          
          .item-price {
            font-size: 9px;
            margin-bottom: 1px;
          }
          
          .item-total {
            text-align: right;
            font-weight: bold;
            font-size: 10px;
          }
          
          .totals {
            border-top: 2px solid #000;
            padding-top: 10px;
            margin-bottom: 15px;
          }
          
          .total-row {
            display: flex;
            justify-content: space-between;
            margin-bottom: 3px;
            font-size: 10px;
          }
          
          .total-label {
            font-weight: bold;
          }
          
          .final-total {
            border-top: 1px solid #000;
            padding-top: 5px;
            margin-top: 5px;
            font-size: 12px;
          }
          
          .final-total .total-label {
            font-weight: bold;
            font-size: 12px;
          }
          
          .final-total .total-value {
            font-weight: bold;
            font-size: 12px;
          }
          
          .footer {
            text-align: center;
            padding: 10px;
            border: 1px solid #000;
            margin-top: 15px;
          }
          
          .footer-text {
            font-size: 9px;
            margin-bottom: 3px;
          }
          
          .footer-text:last-child {
            margin-bottom: 0;
          }
          
          .footer-highlight {
            font-weight: bold;
          }
          
          .divider {
            height: 1px;
            background: #000;
            margin: 5px 0;
          }
          
          @media print {
            body { 
              width: 80mm;
            }
          }
        </style>
      </head>
      <body>
        <div class="header">
          <div class="restaurant-name">${printData.restaurantName}</div>
          <div class="restaurant-address">${formatAddress(printData.restaurantAddress)}</div>
          ${printData.restaurantPhone ? `<div class="restaurant-phone">Phone: ${printData.restaurantPhone}</div>` : ''}
        </div>
        
        <div class="order-info">
          <div class="order-row">
            <span class="order-label">Order #:</span>
            <span>${printData.orderNumber}</span>
          </div>
          <div class="order-row">
            <span class="order-label">Date:</span>
            <span>${new Date(printData.createdAt).toLocaleDateString('en-IN')}</span>
          </div>
          <div class="order-row">
            <span class="order-label">Time:</span>
            <span>${new Date(printData.createdAt).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <div class="order-row">
            <span class="order-label">Type:</span>
            <span>${printData.orderType.replace('_', ' ').toUpperCase()}</span>
          </div>
          ${printData.tableNumber ? `
            <div class="order-row">
              <span class="order-label">Table:</span>
              <span>${printData.tableNumber}</span>
            </div>
          ` : ''}
        </div>
        
        <div class="customer-info">
          <div class="customer-title">Customer Details</div>
          <div class="customer-detail">Name: ${printData.customerName}</div>
          <div class="customer-detail">Phone: ${printData.customerPhone}</div>
        </div>
        
        <div class="items-section">
          <div class="items-title">Order Items</div>
          ${printData.items.map(item => `
            <div class="item">
              <div class="item-header">
                <div class="item-name">${item.menuItemSnapshot.name}</div>
                <div class="item-quantity">x${item.quantity}</div>
              </div>
              <div class="item-price">₹${item.unitPrice} each</div>
              <div class="item-total">₹${item.totalPrice}</div>
            </div>
          `).join('')}
        </div>
        
        <div class="totals">
          <div class="total-row">
            <span class="total-label">Subtotal:</span>
            <span>₹${printData.subtotal}</span>
          </div>
          ${printData.serviceChargeAmount > 0 ? `
            <div class="total-row">
              <span class="total-label">Service Charge:</span>
              <span>₹${printData.serviceChargeAmount}</span>
            </div>
          ` : ''}
          <div class="total-row final-total">
            <span class="total-label">TOTAL:</span>
            <span class="total-value">₹${printData.totalAmount}</span>
          </div>
        </div>
        
        <div class="footer">
          <div class="footer-text footer-highlight">Thank you for dining with us!</div>
          <div class="footer-text">Please visit again</div>
          <div class="divider"></div>
          <div class="footer-text">Generated by DockIt</div>
        </div>
      </body>
      </html>
    `

    printWindow.document.write(printContent)
    printWindow.document.close()
    printWindow.focus()
    printWindow.print()
    printWindow.close()
  }

  if (!isAuthenticated) {
    return (
      <>
        <Helmet>
          <title>Restaurant Employee Login - DockIt</title>
        </Helmet>

        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-8">
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-blue-600 rounded-full flex items-center justify-center mx-auto mb-4">
                  <ChefHat className="w-8 h-8 text-white" />
                </div>
                <h1 className="text-2xl font-bold text-gray-900">Restaurant Portal</h1>
                {authMode === 'checking' ? (
                  <p className="text-gray-600">Checking authentication...</p>
                ) : (
                  <p className="text-gray-600">Employee sign in required</p>
                )}
              </div>

              {authMode === 'checking' ? (
                <div className="flex justify-center">
                  <LoadingSpinner />
                </div>
              ) : (
                <>
                  {error && (
                    <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                      {error}
                    </div>
                  )}

                  <form onSubmit={handleLogin}>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Employee ID
                    </label>
                    <input
                      type="text"
                      value={loginForm.employeeId}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, employeeId: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your employee ID"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Password
                    </label>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm(prev => ({ ...prev, password: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter your password"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoggingIn}
                  className="w-full mt-6 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {isLoggingIn ? (
                    <div className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" />
                      Signing In...
                    </div>
                  ) : (
                    'Sign In'
                  )}
                </button>
              </form>
                </>
              )}
            </div>
          </div>
        </div>
      </>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <ContentLoader />
      </div>
    )
  }

  // Special case for restaurant not verified
  if (error === 'RESTAURANT_NOT_VERIFIED') {
    return (
      <>
        <Helmet>
          <title>Restaurant Under Verification - DockIt</title>
        </Helmet>

        <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
          <div className="max-w-md w-full">
            <div className="bg-white rounded-lg shadow-lg p-8 text-center">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-6">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              
              <h1 className="text-2xl font-bold text-gray-900 mb-4">
                Restaurant Under Verification
              </h1>
              
              <div className="space-y-4 text-left">
                <div className="flex items-start gap-3 p-3 bg-orange-50 rounded-lg border border-orange-200">
                  <AlertCircle className="w-5 h-5 text-orange-600 mt-0.5 flex-shrink-0" />
                  <div>
                    <p className="text-sm font-medium text-orange-800">Verification in Progress</p>
                    <p className="text-sm text-orange-700 mt-1">
                      Your restaurant is currently under review by our team. This process typically takes 1-2 business days.
                    </p>
                  </div>
                </div>

                <div className="space-y-2">
                  <h3 className="font-medium text-gray-900">What happens next?</h3>
                  <ul className="space-y-2 text-sm text-gray-600">
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      Our team reviews your restaurant details
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      We verify your business documentation
                    </li>
                    <li className="flex items-center gap-2">
                      <div className="w-1.5 h-1.5 bg-blue-500 rounded-full"></div>
                      You'll receive an email notification once approved
                    </li>
                  </ul>
                </div>
              </div>

              <div className="mt-6 pt-6 border-t border-gray-200">
                <p className="text-sm text-gray-500 mb-4">
                  Need help or have questions?
                </p>
                <div className="flex gap-3">
                  <button
                    onClick={() => window.open('mailto:support@dockit.com', '_blank')}
                    className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm font-medium"
                  >
                    Contact Support
                  </button>
                  <button
                    onClick={handleLogout}
                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200 transition-colors text-sm font-medium"
                  >
                    Go Back
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </>
    )
  }

  // Filter menu items based on search and category
  const filteredMenuItems = restaurant?.menu?.filter(item => {
    const matchesSearch = !searchQuery || 
      item.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description?.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesCategory = !categoryFilter || item.category === categoryFilter
    
    return matchesSearch && matchesCategory
  }) || []

  return (
    <>
      <Helmet>
        <title>{restaurant?.name} - Restaurant Management - DockIt</title>
      </Helmet>

      <div className="min-h-screen bg-gray-50">
        {/* Header */}
        <header className="bg-white shadow-sm border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-blue-600 rounded-full flex items-center justify-center">
                  <ChefHat className="w-5 h-5 text-white" />
                </div>
                <div className="ml-3">
                  <h1 className="text-lg font-semibold text-gray-900">{restaurant?.name}</h1>
                  <p className="text-sm text-gray-500">Restaurant Management</p>
                </div>
              </div>

              <div className="flex items-center gap-4">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span>Welcome, {employee?.name}</span>
                  <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded text-xs">
                    {employee?.role}
                  </span>
                </div>

                <button
                  onClick={handleLogout}
                  className="flex items-center gap-2 px-3 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </header>

        {/* Navigation Tabs */}
        <div className="bg-white border-b border-gray-200">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <nav className="flex space-x-8">
              {[
                { id: 'dashboard', name: 'Dashboard', icon: BarChart3 },
                { id: 'orders', name: 'Orders', icon: Package },
                { id: 'menu', name: 'Menu', icon: ChefHat },
                // Only show Employee tab for vendor owners
                ...(authMode === 'merchant' ? [{ id: 'employees', name: 'Employees', icon: Users }] : [])
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => {
                    setActiveTab(tab.id)
                    if (tab.id === 'orders') loadOrders()
                    if (tab.id === 'employees') loadEmployees()
                  }}
                  className={`flex items-center gap-2 px-1 py-4 border-b-2 font-medium text-sm transition-colors ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="w-4 h-4" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Content */}
        <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          {error && error !== 'RESTAURANT_NOT_VERIFIED' && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
              {error}
            </div>
          )}

          {activeTab === 'dashboard' && dashboardData && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-blue-50 rounded-lg">
                      <Package className="w-6 h-6 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Pending Orders</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {dashboardData.stats.pendingOrders}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-green-50 rounded-lg">
                      <CheckCircle2 className="w-6 h-6 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Completed Today</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {dashboardData.stats.completedOrders}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-yellow-50 rounded-lg">
                      <IndianRupee className="w-6 h-6 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Daily Revenue</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        ₹{dashboardData.stats.dailyRevenue}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-white rounded-lg border border-gray-200 p-6">
                  <div className="flex items-center">
                    <div className="p-2 bg-purple-50 rounded-lg">
                      <Users className="w-6 h-6 text-purple-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-gray-600">Active Staff</p>
                      <p className="text-2xl font-semibold text-gray-900">
                        {dashboardData.stats.employeeCount}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Recent Orders */}
              <div className="bg-white rounded-lg border border-gray-200">
                <div className="p-6 border-b border-gray-200">
                  <h2 className="text-lg font-semibold text-gray-900">Recent Orders</h2>
                </div>
                <div className="p-6">
                  {dashboardData.recentOrders?.length > 0 ? (
                    <div className="space-y-4">
                      {dashboardData.recentOrders.slice(0, 5).map((order) => (
                        <div key={order._id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
                          <div>
                            <p className="font-medium text-gray-900">#{order.orderNumber}</p>
                            <p className="text-sm text-gray-600">
                              {order.items.length} items • ₹{order.totalAmount}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                              {order.status.toUpperCase()}
                            </span>
                            <p className="text-sm text-gray-500">
                              {new Date(order.orderedAt).toLocaleTimeString()}
                            </p>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="text-gray-500 text-center py-8">No recent orders</p>
                  )}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'orders' && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Order Management</h2>
                    <p className="text-gray-600">Manage and track customer orders</p>
                  </div>
                  <div className="flex items-center gap-3">
                    <button
                      onClick={openCreateOrder}
                      className="flex items-center gap-2 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors text-sm"
                    >
                      <Plus className="w-4 h-4" />
                      Create Order
                    </button>
                    <button
                      onClick={loadOrders}
                      className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                    >
                      <TrendingUp className="w-4 h-4" />
                      Refresh Orders
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-6">
                {orders.length > 0 ? (
                  <div className="space-y-4">
                    {orders.map((order) => {
                      const isExpanded = expandedOrders.has(order._id)
                      return (
                        <div key={order._id} className="border border-gray-200 rounded-lg hover:shadow-sm transition-shadow">
                          {/* Order Header */}
                          <div className="p-4">
                            <div className="flex items-center justify-between mb-4">
                              <div className="flex-1">
                                <div className="flex items-center gap-3 mb-2">
                                  <h3 className="font-medium text-gray-900 text-lg">#{order.orderNumber}</h3>
                                  <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(order.status)}`}>
                                    {order.status.toUpperCase()}
                                  </span>
                                </div>
                                <p className="text-sm text-gray-600 mb-1">
                                  {formatDate(order.orderedAt)}
                                </p>
                                <p className="text-sm text-blue-600 font-medium">
                                  Customer: {order.customer?.name} ({order.customer?.phoneNumber})
                                </p>
                                {order.scheduledServiceDate && (
                                  <p className="text-sm text-green-600 font-medium flex items-center gap-1 mt-1">
                                    <Calendar className="w-4 h-4" />
                                    Charging Slot: {formatDateOnly(order.scheduledServiceDate)} at {order.scheduledServiceTime}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="text-xl font-bold text-gray-900">
                                  ₹{order.totalAmount}
                                </span>
                                <button
                                  onClick={() => toggleOrderExpansion(order._id)}
                                  className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                                >
                                  {isExpanded ? 
                                    <ChevronUp className="w-5 h-5 text-gray-500" /> : 
                                    <ChevronDown className="w-5 h-5 text-gray-500" />
                                  }
                                </button>
                              </div>
                            </div>

                            {/* Basic Order Info */}
                            <div className="mb-4">
                              <h4 className="font-medium text-gray-900 mb-2">Items ({order.items?.length || 0}):</h4>
                              <div className="space-y-2 bg-gray-50 rounded-lg p-3">
                                {order.items?.map((item, index) => (
                                  <div key={index} className="flex justify-between items-center text-sm">
                                    <div className="flex-1">
                                      <span className="text-gray-900 font-medium">
                                        {item.quantity}x {item.menuItemSnapshot?.name || item.name}
                                      </span>
                                      {item.menuItemSnapshot?.description && (
                                        <p className="text-gray-600 text-xs mt-1">{item.menuItemSnapshot.description}</p>
                                      )}
                                      {item.menuItemSnapshot?.category && (
                                        <span className="text-xs bg-gray-200 text-gray-700 px-2 py-1 rounded-full inline-block mt-1">
                                          {item.menuItemSnapshot.category}
                                        </span>
                                      )}
                                    </div>
                                    <div className="text-right">
                                      <div className="text-gray-900 font-medium">₹{item.totalPrice || (item.unitPrice * item.quantity)}</div>
                                      <div className="text-xs text-gray-600">@₹{item.unitPrice} each</div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>

                            {/* Expanded Details */}
                            <AnimatePresence>
                              {isExpanded && (
                                <motion.div
                                  initial={{ opacity: 0, height: 0 }}
                                  animate={{ opacity: 1, height: "auto" }}
                                  exit={{ opacity: 0, height: 0 }}
                                  transition={{ duration: 0.3 }}
                                  className="border-t border-gray-200 pt-4"
                                >
                                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    {/* Customer Details */}
                                    <div className="space-y-4">
                                      <h5 className="font-medium text-gray-900 border-b border-gray-200 pb-2">Customer Details</h5>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                          <Users className="w-4 h-4 text-gray-500" />
                                          <span className="text-gray-600">Name:</span>
                                          <span className="font-medium">{order.customer?.name}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                          <Phone className="w-4 h-4 text-gray-500" />
                                          <span className="text-gray-600">Phone:</span>
                                          <span className="font-medium">{order.customer?.phoneNumber}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Order Details */}
                                    <div className="space-y-4">
                                      <h5 className="font-medium text-gray-900 border-b border-gray-200 pb-2">Order Details</h5>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Order Type:</span>
                                          <span className="font-medium capitalize">{order.orderType?.replace('_', ' ')}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Preparation Time:</span>
                                          <span className="font-medium">{order.estimatedPreparationTime} mins</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Subtotal:</span>
                                          <span className="font-medium">₹{order.subtotal}</span>
                                        </div>
                                        {order.tax?.amount > 0 && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Tax ({order.tax.percentage}%):</span>
                                            <span className="font-medium">₹{order.tax.amount}</span>
                                          </div>
                                        )}
                                        {order.serviceCharge?.amount > 0 && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Service Charge ({order.serviceCharge.percentage}%):</span>
                                            <span className="font-medium">₹{order.serviceCharge.amount}</span>
                                          </div>
                                        )}
                                        <div className="flex justify-between font-medium text-lg border-t border-gray-200 pt-2">
                                          <span>Total Amount:</span>
                                          <span>₹{order.totalAmount}</span>
                                        </div>
                                      </div>
                                    </div>

                                    {/* Payment Details */}
                                    <div className="space-y-4">
                                      <h5 className="font-medium text-gray-900 border-b border-gray-200 pb-2">Payment Information</h5>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                          <CreditCard className="w-4 h-4 text-gray-500" />
                                          <span className="text-gray-600">Method:</span>
                                          <span className="font-medium capitalize">{order.payment?.method}</span>
                                        </div>
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Status:</span>
                                          <span className={`font-medium ${
                                            order.payment?.status === 'paid' ? 'text-green-600' : 
                                            order.payment?.status === 'refunded' ? 'text-red-600' : 'text-yellow-600'
                                          }`}>
                                            {order.payment?.status?.toUpperCase()}
                                          </span>
                                        </div>
                                        {order.payment?.transactionId && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Transaction ID:</span>
                                            <span className="font-mono text-xs">{order.payment.transactionId}</span>
                                          </div>
                                        )}
                                        {order.payment?.paidAt && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Paid At:</span>
                                            <span className="font-medium">{formatDate(order.payment.paidAt)}</span>
                                          </div>
                                        )}
                                        {order.payment?.refundAmount > 0 && (
                                          <div className="flex justify-between">
                                            <span className="text-gray-600">Refund Amount:</span>
                                            <span className="font-medium text-red-600">₹{order.payment.refundAmount}</span>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Charging Station Details */}
                                    <div className="space-y-4">
                                      <h5 className="font-medium text-gray-900 border-b border-gray-200 pb-2">Charging Session</h5>
                                      <div className="space-y-2 text-sm">
                                        <div className="flex items-center gap-2">
                                          <MapPin className="w-4 h-4 text-gray-500" />
                                          <span className="text-gray-600">Station ID:</span>
                                          <span className="font-medium">{order.chargingStation}</span>
                                        </div>
                                        {order.scheduledServiceDate && (
                                          <>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Service Date:</span>
                                              <span className="font-medium">{formatDateOnly(order.scheduledServiceDate)}</span>
                                            </div>
                                            <div className="flex justify-between">
                                              <span className="text-gray-600">Service Time:</span>
                                              <span className="font-medium">{order.scheduledServiceTime}</span>
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                  </div>

                                  {/* Notes Section */}
                                  {(order.notes?.customer || order.notes?.restaurant) && (
                                    <div className="mt-6 space-y-4">
                                      <h5 className="font-medium text-gray-900 border-b border-gray-200 pb-2">Notes</h5>
                                      {order.notes.customer && (
                                        <div className="p-3 bg-blue-50 rounded-lg">
                                          <div className="flex items-start gap-2">
                                            <FileText className="w-4 h-4 text-blue-600 mt-0.5" />
                                            <div>
                                              <p className="text-sm font-medium text-blue-900">Customer Note:</p>
                                              <p className="text-sm text-blue-800">{order.notes.customer}</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                      {order.notes.restaurant && (
                                        <div className="p-3 bg-green-50 rounded-lg">
                                          <div className="flex items-start gap-2">
                                            <FileText className="w-4 h-4 text-green-600 mt-0.5" />
                                            <div>
                                              <p className="text-sm font-medium text-green-900">Restaurant Note:</p>
                                              <p className="text-sm text-green-800">{order.notes.restaurant}</p>
                                            </div>
                                          </div>
                                        </div>
                                      )}
                                    </div>
                                  )}

                                  {/* Cancellation Details */}
                                  {order.status === 'cancelled' && order.cancellation && (
                                    <div className="mt-6">
                                      <h5 className="font-medium text-gray-900 border-b border-gray-200 pb-2">Cancellation Details</h5>
                                      <div className="p-3 bg-red-50 rounded-lg mt-2">
                                        <div className="space-y-2 text-sm">
                                          {order.cancellation.reason && (
                                            <div>
                                              <span className="text-red-900 font-medium">Reason: </span>
                                              <span className="text-red-800">{order.cancellation.reason}</span>
                                            </div>
                                          )}
                                          {order.cancellation.cancelledBy && (
                                            <div>
                                              <span className="text-red-900 font-medium">Cancelled by: </span>
                                              <span className="text-red-800 capitalize">{order.cancellation.cancelledBy}</span>
                                            </div>
                                          )}
                                          {order.cancellation.cancelledAt && (
                                            <div>
                                              <span className="text-red-900 font-medium">Cancelled at: </span>
                                              <span className="text-red-800">{formatDate(order.cancellation.cancelledAt)}</span>
                                            </div>
                                          )}
                                          <div>
                                            <span className="text-red-900 font-medium">Refund Eligible: </span>
                                            <span className="text-red-800">{order.cancellation.refundEligible ? 'Yes' : 'No'}</span>
                                          </div>
                                        </div>
                                      </div>
                                    </div>
                                  )}

                                  {/* Timeline */}
                                  <div className="mt-6">
                                    <h5 className="font-medium text-gray-900 border-b border-gray-200 pb-2">Order Timeline</h5>
                                    <div className="mt-3 space-y-2 text-sm">
                                      <div className="flex justify-between">
                                        <span className="text-gray-600">Ordered At:</span>
                                        <span className="font-medium">{formatDate(order.orderedAt)}</span>
                                      </div>
                                      {order.confirmedAt && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Confirmed At:</span>
                                          <span className="font-medium">{formatDate(order.confirmedAt)}</span>
                                        </div>
                                      )}
                                      {order.orderDuration && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Processing Duration:</span>
                                          <span className="font-medium">{order.orderDuration} minutes</span>
                                        </div>
                                      )}
                                      {order.lastUpdatedBy && (
                                        <div className="flex justify-between">
                                          <span className="text-gray-600">Last Updated By:</span>
                                          <span className="font-medium text-xs">{order.lastUpdatedBy}</span>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                </motion.div>
                              )}
                            </AnimatePresence>

                            {/* Action Buttons */}
                            {order.status !== 'completed' && order.status !== 'cancelled' && (
                              <div className="flex gap-2 pt-4 border-t border-gray-100 mt-4">
                                {order.status === 'pending' && (
                                  <>
                                    <button
                                      onClick={() => updateOrderStatus(order._id, 'confirmed')}
                                      className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors flex items-center gap-2"
                                    >
                                      <CheckCircle2 className="w-4 h-4" />
                                      Confirm Order
                                    </button>
                                    <button
                                      onClick={() => updateOrderStatus(order._id, 'cancelled', 'Restaurant unavailable')}
                                      className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 transition-colors"
                                    >
                                      Cancel
                                    </button>
                                  </>
                                )}
                                {order.status === 'confirmed' && (
                                  <button
                                    onClick={() => updateOrderStatus(order._id, 'preparing')}
                                    className="px-4 py-2 bg-orange-600 text-white rounded-lg text-sm hover:bg-orange-700 transition-colors flex items-center gap-2"
                                  >
                                    <Clock className="w-4 h-4" />
                                    Start Preparing
                                  </button>
                                )}
                                {order.status === 'preparing' && (
                                  <button
                                    onClick={() => updateOrderStatus(order._id, 'ready')}
                                    className="px-4 py-2 bg-green-600 text-white rounded-lg text-sm hover:bg-green-700 transition-colors flex items-center gap-2"
                                  >
                                    <CheckCircle2 className="w-4 h-4" />
                                    Mark Ready
                                  </button>
                                )}
                                {order.status === 'ready' && (
                                  <button
                                    onClick={() => updateOrderStatus(order._id, 'completed')}
                                    className="px-4 py-2 bg-gray-600 text-white rounded-lg text-sm hover:bg-gray-700 transition-colors flex items-center gap-2"
                                  >
                                    <Package className="w-4 h-4" />
                                    Complete Order
                                  </button>
                                )}
                              </div>
                            )}

                            {/* Completed/Cancelled Status */}
                            {(order.status === 'completed' || order.status === 'cancelled') && (
                              <div className="pt-4 border-t border-gray-100 mt-4">
                                <p className="text-sm text-gray-500">
                                  {order.status === 'completed' ? '✅ Order completed' : '❌ Order cancelled'}
                                  {order.completedAt && ` on ${formatDate(order.completedAt)}`}
                                  {order.cancellation?.cancelledAt && ` on ${formatDate(order.cancellation.cancelledAt)}`}
                                </p>
                              </div>
                            )}
                          </div>
                        </div>
                      )
                    })}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No orders found</p>
                    <p className="text-sm text-gray-400">
                      Orders will appear here when customers place them.
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'menu' && restaurant && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between mb-4">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Menu Management</h2>
                    <p className="text-gray-600">Add, edit and manage your menu items</p>
                  </div>
                  <button
                    onClick={() => openMenuModal()}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Add Menu Item
                  </button>
                </div>

                {/* Search and Filter Controls */}
                <div className="grid gap-4 sm:grid-cols-3 mb-6">
                  <div className="sm:col-span-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder="Search menu items..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      />
                    </div>
                  </div>
                  <div>
                    <select
                      value={categoryFilter}
                      onChange={(e) => setCategoryFilter(e.target.value)}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">All Categories</option>
                      <option value="appetizer">Appetizer</option>
                      <option value="main_course">Main Course</option>
                      <option value="dessert">Dessert</option>
                      <option value="beverage">Beverage</option>
                      <option value="snack">Snack</option>
                      <option value="breakfast">Breakfast</option>
                      <option value="lunch">Lunch</option>
                      <option value="dinner">Dinner</option>
                    </select>
                  </div>
                </div>

                {/* Stats Summary */}
                <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                  <span>
                    Showing {filteredMenuItems.length} of {restaurant.menu?.length || 0} items
                  </span>
                  <span>
                    {restaurant.menu?.filter(item => item.isAvailable).length || 0} available • {' '}
                    {restaurant.menu?.filter(item => !item.isAvailable).length || 0} unavailable
                  </span>
                </div>
              </div>

              <div className="p-6">
                {filteredMenuItems.length > 0 ? (
                  <div className="space-y-3">
                    {filteredMenuItems.map((item) => (
                      <div key={item._id} className={`border rounded-lg p-4 transition-all hover:shadow-sm ${
                        item.isAvailable ? 'border-gray-200 bg-white' : 'border-gray-300 bg-gray-50'
                      }`}>
                        <div className="flex items-center gap-4">
                          {/* Item Image */}
                          <div className="flex-shrink-0">
                            {item.images && item.images.length > 0 ? (
                              <div className="relative">
                                <img
                                  src={typeof item.images[0] === 'string' ? item.images[0] : item.images[0].url}
                                  alt={item.name}
                                  className="w-16 h-16 object-cover rounded-lg border border-gray-200"
                                />
                                {item.images.length > 1 && (
                                  <div className="absolute -top-1 -right-1 bg-blue-500 text-white text-xs px-1.5 py-0.5 rounded-full">
                                    +{item.images.length - 1}
                                  </div>
                                )}
                              </div>
                            ) : (
                              <div className="w-16 h-16 bg-gray-100 rounded-lg flex items-center justify-center">
                                <ChefHat className="w-6 h-6 text-gray-400" />
                              </div>
                            )}
                          </div>

                          {/* Item Details */}
                          <div className="flex-1 min-w-0">
                            <div className="flex items-start justify-between">
                              <div className="flex-1">
                                <h3 className={`font-medium truncate ${item.isAvailable ? 'text-gray-900' : 'text-gray-500'}`}>
                                  {item.name}
                                </h3>
                                <div className="flex items-center gap-2 mt-1">
                                  <span className="text-sm text-gray-500 capitalize">
                                    {item.category.replace('_', ' ')}
                                  </span>
                                  {item.isVegetarian && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                      Veg
                                    </span>
                                  )}
                                  {item.isSpicy && (
                                    <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                      Spicy
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className={`text-sm mt-1 line-clamp-2 ${item.isAvailable ? 'text-gray-600' : 'text-gray-400'}`}>
                                    {item.description}
                                  </p>
                                )}
                              </div>

                              {/* Price and Actions */}
                              <div className="flex items-center gap-4 ml-4">
                                <div className="text-right">
                                  <div className={`text-lg font-semibold ${item.isAvailable ? 'text-blue-600' : 'text-gray-400'}`}>
                                    ₹{item.price}
                                  </div>
                                  {item.preparationTime && (
                                    <div className="text-xs text-gray-500">
                                      {item.preparationTime} min
                                    </div>
                                  )}
                                </div>

                                {/* Availability Toggle */}
                                <div className="flex items-center gap-2">
                                  <label className="relative inline-flex items-center cursor-pointer">
                                    <input
                                      type="checkbox"
                                      checked={item.isAvailable}
                                      onChange={() => toggleMenuItemAvailability(item._id, item.isAvailable)}
                                      disabled={menuLoading}
                                      className="sr-only peer"
                                    />
                                    <div className="w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"></div>
                                  </label>
                                  <span className={`text-xs font-medium ${item.isAvailable ? 'text-green-600' : 'text-gray-500'}`}>
                                    {item.isAvailable ? 'Available' : 'Unavailable'}
                                  </span>
                                </div>

                                {/* Action Buttons */}
                                <div className="flex items-center gap-1">
                                  <button
                                    onClick={() => openMenuModal(item)}
                                    disabled={menuLoading}
                                    className="p-2 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Edit item"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteMenuItem(item._id)}
                                    disabled={menuLoading}
                                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50"
                                    title="Delete item"
                                  >
                                    <X className="w-4 h-4" />
                                  </button>
                                </div>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    {searchQuery || categoryFilter ? (
                      <>
                        <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No menu items found</p>
                        <p className="text-sm text-gray-400 mb-4">
                          Try adjusting your search or filter criteria
                        </p>
                        <button
                          onClick={() => {
                            setSearchQuery('')
                            setCategoryFilter('')
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Clear filters
                        </button>
                      </>
                    ) : (
                      <>
                        <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                        <p className="text-gray-500 mb-4">No menu items found</p>
                        <button
                          onClick={() => openMenuModal()}
                          className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                        >
                          <Plus className="w-4 h-4" />
                          Add Your First Menu Item
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          )}

          {activeTab === 'employees' && authMode === 'merchant' && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="p-6 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">Employee Management</h2>
                    <p className="text-gray-600">Manage restaurant staff and permissions</p>
                  </div>
                  <button
                    onClick={() => setShowAssignEmployee(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors text-sm"
                  >
                    <Plus className="w-4 h-4" />
                    Assign Employee
                  </button>
                </div>
              </div>
              <div className="p-6">
                {employees.length > 0 ? (
                  <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                    {employees.map((emp) => (
                      <div key={emp._id} className="border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-3">
                          <div>
                            <h3 className="font-medium text-gray-900">{emp.employeeName}</h3>
                            <p className="text-sm text-gray-600 capitalize">{emp.role.replace('_', ' ')}</p>
                            <p className="text-xs text-gray-500">ID: {emp.assignmentNumber}</p>
                          </div>
                          <div className="flex items-center gap-2">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              emp.isActive
                                ? 'bg-green-100 text-green-800'
                                : 'bg-gray-100 text-gray-800'
                            }`}>
                              {emp.isActive ? 'Active' : 'Inactive'}
                            </span>
                          </div>
                        </div>
                        
                        <div className="space-y-2 text-sm text-gray-600">
                          <p><span className="font-medium">Phone:</span> {emp.phoneNumber}</p>
                          <p><span className="font-medium">Email:</span> {emp.email || 'N/A'}</p>
                          <p><span className="font-medium">Assigned:</span> {new Date(emp.assignedAt).toLocaleDateString()}</p>
                          {emp.lastLogin && (
                            <p><span className="font-medium">Last Login:</span> {new Date(emp.lastLogin).toLocaleDateString()}</p>
                          )}
                          
                          {emp.permissions && (
                            <div>
                              <p className="font-medium text-gray-700 mb-1">Permissions:</p>
                              <div className="flex flex-wrap gap-1">
                                {Object.entries(emp.permissions)
                                  .filter(([key, value]) => value === true)
                                  .map(([permission]) => (
                                    <span key={permission} className="px-2 py-0.5 bg-blue-100 text-blue-800 text-xs rounded">
                                      {permission.replace('can', '').replace(/([A-Z])/g, ' $1').trim()}
                                    </span>
                                  ))}
                              </div>
                            </div>
                          )}

                          {emp.notes && (
                            <p><span className="font-medium">Notes:</span> {emp.notes}</p>
                          )}
                        </div>

                        <div className="mt-4 flex gap-2">
                          <button
                            onClick={() => openPasswordChangeModal(emp)}
                            className="flex-1 px-3 py-1 bg-blue-100 text-blue-700 rounded text-sm hover:bg-blue-200 transition-colors flex items-center justify-center gap-1"
                          >
                            <Key className="w-3 h-3" />
                            Change Password
                          </button>
                          <button
                            onClick={() => handleDeleteEmployee(emp._id, emp.employeeName)}
                            className="flex-1 px-3 py-1 bg-red-100 text-red-700 rounded text-sm hover:bg-red-200 transition-colors flex items-center justify-center gap-1"
                          >
                            <Trash2 className="w-3 h-3" />
                            Delete
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-gray-500 mb-4">No employees assigned yet</p>
                    <button
                      onClick={() => setShowAssignEmployee(true)}
                      className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      Assign Your First Employee
                    </button>
                  </div>
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Menu Item Modal */}
      {showMenuModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  {editingMenuItem ? 'Edit Menu Item' : 'Add Menu Item'}
                </h3>
                <button
                  onClick={closeMenuModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleMenuSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Name *
                </label>
                <input
                  type="text"
                  value={menuForm.name}
                  onChange={(e) => setMenuForm(prev => ({ ...prev, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter item name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Description
                </label>
                <textarea
                  value={menuForm.description}
                  onChange={(e) => setMenuForm(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter item description"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Price (₹) *
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={menuForm.price}
                    onChange={(e) => setMenuForm(prev => ({ ...prev, price: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    placeholder="0.00"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Category *
                  </label>
                  <select
                    value={menuForm.category}
                    onChange={(e) => setMenuForm(prev => ({ ...prev, category: e.target.value }))}
                    required
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  >
                    <option value="">Select a category</option>
                    <option value="appetizer">Appetizer</option>
                    <option value="main_course">Main Course</option>
                    <option value="dessert">Dessert</option>
                    <option value="beverage">Beverage</option>
                    <option value="snack">Snack</option>
                    <option value="breakfast">Breakfast</option>
                    <option value="lunch">Lunch</option>
                    <option value="dinner">Dinner</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Preparation Time (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  value={menuForm.preparationTime}
                  onChange={(e) => setMenuForm(prev => ({ ...prev, preparationTime: parseInt(e.target.value) || 15 }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* Image Upload Section */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Item Images (Max 3)
                </label>
                
                {/* Existing Images */}
                {menuForm.images.length > 0 && (
                  <div className="grid grid-cols-3 gap-2 mb-3">
                    {menuForm.images.map((image, index) => (
                      <div key={index} className="relative group">
                        <img
                          src={typeof image === 'string' ? image : image.url}
                          alt={`Item ${index + 1}`}
                          className="w-full h-20 object-cover rounded-lg border border-gray-200"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveImage(index)}
                          className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center text-xs hover:bg-red-600 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}

                {/* Upload New Images */}
                {menuForm.images.length < 3 && (
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-4">
                    <div className="text-center">
                      <div className="mb-2">
                        <Plus className="w-8 h-8 text-gray-400 mx-auto" />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">
                        Upload item images ({menuForm.images.length}/3)
                      </p>
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={(e) => {
                          const files = Array.from(e.target.files).slice(0, 3 - menuForm.images.length)
                          if (files.length > 0) {
                            handleImageUpload(files)
                          }
                        }}
                        className="hidden"
                        id="imageUpload"
                        disabled={uploadingImages}
                      />
                      <label
                        htmlFor="imageUpload"
                        className={`inline-flex items-center gap-2 px-3 py-2 border border-gray-300 rounded-lg text-sm font-medium cursor-pointer transition-colors ${
                          uploadingImages
                            ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                            : 'bg-white text-gray-700 hover:bg-gray-50'
                        }`}
                      >
                        {uploadingImages ? (
                          <>
                            <LoadingSpinner size="sm" />
                            Uploading...
                          </>
                        ) : (
                          <>
                            <Plus className="w-4 h-4" />
                            Choose Images
                          </>
                        )}
                      </label>
                      <p className="text-xs text-gray-500 mt-1">
                        PNG, JPG up to 5MB each
                      </p>
                    </div>
                  </div>
                )}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isVeg"
                    checked={menuForm.isVeg}
                    onChange={(e) => setMenuForm(prev => ({ ...prev, isVeg: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isVeg" className="text-sm font-medium text-gray-700">
                    Vegetarian
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    id="isSpicy"
                    checked={menuForm.isSpicy}
                    onChange={(e) => setMenuForm(prev => ({ ...prev, isSpicy: e.target.checked }))}
                    className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                  />
                  <label htmlFor="isSpicy" className="text-sm font-medium text-gray-700">
                    Spicy
                  </label>
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closeMenuModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={menuLoading}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {menuLoading ? (
                    <div className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" />
                      {editingMenuItem ? 'Updating...' : 'Adding...'}
                    </div>
                  ) : (
                    editingMenuItem ? 'Update Item' : 'Add Item'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Assign Employee Modal */}
      {showAssignEmployee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">Assign Restaurant Employee</h3>
                <button
                  onClick={() => setShowAssignEmployee(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handleAssignEmployee} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Employee Name *
                </label>
                <input
                  type="text"
                  value={assignEmployeeData.employeeName}
                  onChange={(e) => setAssignEmployeeData(prev => ({ ...prev, employeeName: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter employee full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number *
                </label>
                <input
                  type="tel"
                  value={assignEmployeeData.phoneNumber}
                  onChange={(e) => setAssignEmployeeData(prev => ({ ...prev, phoneNumber: e.target.value }))}
                  required
                  pattern="[0-9]{10}"
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter 10-digit phone number"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email (Optional)
                </label>
                <input
                  type="email"
                  value={assignEmployeeData.email}
                  onChange={(e) => setAssignEmployeeData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter email address"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Role *
                </label>
                <select
                  value={assignEmployeeData.role}
                  onChange={(e) => setAssignEmployeeData(prev => ({ ...prev, role: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="restaurant_manager">Restaurant Manager</option>
                  <option value="chef">Chef</option>
                  <option value="waiter">Waiter</option>
                  <option value="cashier">Cashier</option>
                  <option value="general_staff">General Staff</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Password *
                </label>
                <input
                  type="password"
                  value={assignEmployeeData.password}
                  onChange={(e) => setAssignEmployeeData(prev => ({ ...prev, password: e.target.value }))}
                  required
                  minLength={6}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Enter password (min 6 characters)"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Notes (Optional)
                </label>
                <textarea
                  value={assignEmployeeData.notes}
                  onChange={(e) => setAssignEmployeeData(prev => ({ ...prev, notes: e.target.value }))}
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  placeholder="Additional notes about the employee"
                />
              </div>

              <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                <p className="text-sm text-blue-800">
                  <strong>Note:</strong> The employee will receive an assignment number after successful registration. 
                  They will use this assignment number and the password to log in to the restaurant management system.
                </p>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowAssignEmployee(false)}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={assigningEmployee}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {assigningEmployee ? (
                    <div className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" />
                      Assigning...
                    </div>
                  ) : (
                    'Assign Employee'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Password Change Modal */}
      {showPasswordChange && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <h3 className="text-lg font-semibold text-gray-900">
                  Change Password - {selectedEmployee?.employeeName}
                </h3>
                <button
                  onClick={closePasswordChangeModal}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <form onSubmit={handlePasswordChange} className="p-6 space-y-4">
              {error && (
                <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                  {error}
                </div>
              )}

              {passwordChangeStep === 'password' && (
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Password *
                    </label>
                    <input
                      type="password"
                      value={passwordChangeData.newPassword}
                      onChange={(e) => setPasswordChangeData(prev => ({ ...prev, newPassword: e.target.value }))}
                      required
                      minLength={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter new password"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Confirm Password *
                    </label>
                    <input
                      type="password"
                      value={passwordChangeData.confirmPassword}
                      onChange={(e) => setPasswordChangeData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                      required
                      minLength={6}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Confirm new password"
                    />
                  </div>
                </div>
              )}

              {passwordChangeStep === 'otp' && (
                <div>
                  <p className="text-sm text-gray-500 mb-4">
                    An OTP has been sent to your registered phone number. Please enter the OTP to confirm the password change.
                  </p>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      OTP *
                    </label>
                    <input
                      type="text"
                      value={passwordChangeData.otp}
                      onChange={(e) => setPasswordChangeData(prev => ({ ...prev, otp: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter OTP"
                      maxLength={6}
                    />
                  </div>
                </div>
              )}

              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={closePasswordChangeModal}
                  className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={changingPassword}
                  className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {changingPassword ? (
                    <div className="flex items-center justify-center gap-2">
                      <LoadingSpinner size="sm" />
                      {passwordChangeStep === 'password' ? 'Sending OTP...' : 'Changing Password...'}
                    </div>
                  ) : (
                    passwordChangeStep === 'password' ? 'Send OTP' : 'Change Password'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Offline Order Creation Modal */}
      {showCreateOrder && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            {/* Header */}
            <div className="p-6 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-gray-900">Create Offline Order</h3>
                  <p className="text-gray-600">Step {createOrderStep === 'menu' ? '1' : createOrderStep === 'customer' ? '2' : createOrderStep === 'payment' ? '3' : '4'} of 4</p>
                </div>
                <button
                  onClick={closeCreateOrder}
                  className="text-gray-400 hover:text-gray-600 transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Progress Steps */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex items-center justify-between">
                {[
                  { id: 'menu', name: 'Menu Selection', icon: ChefHat },
                  { id: 'customer', name: 'Customer Info', icon: Users },
                  { id: 'payment', name: 'Payment', icon: CreditCard },
                  { id: 'success', name: 'Complete', icon: CheckCircle2 }
                ].map((step, index) => (
                  <div key={step.id} className="flex items-center">
                    <div className={`flex items-center justify-center w-8 h-8 rounded-full text-sm font-medium ${
                      createOrderStep === step.id 
                        ? 'bg-blue-600 text-white' 
                        : index < ['menu', 'customer', 'payment', 'success'].indexOf(createOrderStep)
                        ? 'bg-green-600 text-white'
                        : 'bg-gray-200 text-gray-600'
                    }`}>
                      {index < ['menu', 'customer', 'payment', 'success'].indexOf(createOrderStep) ? (
                        <CheckCircle2 className="w-4 h-4" />
                      ) : (
                        index + 1
                      )}
                    </div>
                    <span className={`ml-2 text-sm font-medium ${
                      createOrderStep === step.id ? 'text-blue-600' : 'text-gray-500'
                    }`}>
                      {step.name}
                    </span>
                    {index < 3 && (
                      <div className={`w-16 h-0.5 mx-4 ${
                        index < ['menu', 'customer', 'payment', 'success'].indexOf(createOrderStep)
                        ? 'bg-green-600' : 'bg-gray-200'
                      }`} />
                    )}
                  </div>
                ))}
              </div>
            </div>

            {/* Error Display */}
            {error && (
              <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                {error}
              </div>
            )}

            {/* Step 1: Menu Selection */}
            {createOrderStep === 'menu' && (
              <div className="p-6">
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  {/* Menu Items */}
                  <div className="lg:col-span-2">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Select Menu Items</h4>
                    
                    {/* Search and Filter Controls */}
                    <div className="grid gap-4 sm:grid-cols-2 mb-4">
                      <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-gray-400" />
                        <input
                          type="text"
                          placeholder="Search menu items..."
                          value={menuSearchQuery}
                          onChange={(e) => setMenuSearchQuery(e.target.value)}
                          className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        />
                      </div>
                      <div>
                        <select
                          value={menuCategoryFilter}
                          onChange={(e) => setMenuCategoryFilter(e.target.value)}
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        >
                          <option value="">All Categories</option>
                          <option value="appetizer">Appetizer</option>
                          <option value="main_course">Main Course</option>
                          <option value="dessert">Dessert</option>
                          <option value="beverage">Beverage</option>
                          <option value="snack">Snack</option>
                          <option value="breakfast">Breakfast</option>
                          <option value="lunch">Lunch</option>
                          <option value="dinner">Dinner</option>
                        </select>
                      </div>
                    </div>

                    {/* Results Summary */}
                    <div className="flex items-center justify-between text-sm text-gray-600 mb-4">
                      <span>
                        Showing {getFilteredMenuItems().length} of {restaurant?.menu?.filter(item => item.isAvailable).length || 0} available items
                      </span>
                      {(menuSearchQuery || menuCategoryFilter) && (
                        <button
                          onClick={() => {
                            setMenuSearchQuery('')
                            setMenuCategoryFilter('')
                          }}
                          className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                        >
                          Clear filters
                        </button>
                      )}
                    </div>

                    <div className="space-y-3 max-h-96 overflow-y-auto">
                      {getFilteredMenuItems().length > 0 ? (
                        getFilteredMenuItems().map((item) => (
                          <div key={item._id} className="flex items-center gap-4 p-3 border border-gray-200 rounded-lg hover:bg-gray-50">
                            {/* Item Image */}
                            <div className="flex-shrink-0">
                              {item.images && item.images.length > 0 ? (
                                <img
                                  src={typeof item.images[0] === 'string' ? item.images[0] : item.images[0].url}
                                  alt={item.name}
                                  className="w-12 h-12 object-cover rounded-lg"
                                />
                              ) : (
                                <div className="w-12 h-12 bg-gray-100 rounded-lg flex items-center justify-center">
                                  <ChefHat className="w-5 h-5 text-gray-400" />
                                </div>
                              )}
                            </div>

                            {/* Item Details */}
                            <div className="flex-1 min-w-0">
                              <h5 className="font-medium text-gray-900 truncate">{item.name}</h5>
                              <p className="text-sm text-gray-600 truncate">{item.description}</p>
                              <div className="flex items-center gap-2 mt-1">
                                <span className="text-sm text-gray-500 capitalize">{item.category.replace('_', ' ')}</span>
                                {item.isVegetarian && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-green-100 text-green-800">
                                    Veg
                                  </span>
                                )}
                                {item.isSpicy && (
                                  <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-red-100 text-red-800">
                                    Spicy
                                  </span>
                                )}
                              </div>
                            </div>

                            {/* Price and Add Button */}
                            <div className="flex items-center gap-3">
                              <span className="text-lg font-semibold text-blue-600">₹{item.price}</span>
                              <button
                                onClick={() => addToCart(item)}
                                className="px-3 py-1 bg-blue-600 text-white rounded-lg text-sm hover:bg-blue-700 transition-colors"
                              >
                                Add
                              </button>
                            </div>
                          </div>
                        ))
                      ) : (
                        <div className="text-center py-12">
                          {menuSearchQuery || menuCategoryFilter ? (
                            <>
                              <Search className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500 mb-4">No menu items found</p>
                              <p className="text-sm text-gray-400 mb-4">
                                Try adjusting your search or filter criteria
                              </p>
                              <button
                                onClick={() => {
                                  setMenuSearchQuery('')
                                  setMenuCategoryFilter('')
                                }}
                                className="text-blue-600 hover:text-blue-700 text-sm font-medium"
                              >
                                Clear filters
                              </button>
                            </>
                          ) : (
                            <>
                              <ChefHat className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-500 mb-4">No menu items available</p>
                              <p className="text-sm text-gray-400">
                                Please add menu items to get started
                              </p>
                            </>
                          )}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Cart */}
                  <div className="lg:col-span-1">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4">Order Cart</h4>
                    <div className="bg-gray-50 rounded-lg p-4">
                      {cartItems.length === 0 ? (
                        <p className="text-gray-500 text-center py-8">No items in cart</p>
                      ) : (
                        <div className="space-y-3">
                          {cartItems.map((item) => (
                            <div key={item.menuItemId} className="flex items-center justify-between p-3 bg-white rounded-lg">
                              <div className="flex-1">
                                <h6 className="font-medium text-gray-900">{item.name}</h6>
                                <p className="text-sm text-gray-600">₹{item.unitPrice} each</p>
                              </div>
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => updateCartItemQuantity(item.menuItemId, item.quantity - 1)}
                                  className="w-6 h-6 bg-gray-200 text-gray-600 rounded-full flex items-center justify-center hover:bg-gray-300"
                                >
                                  -
                                </button>
                                <span className="w-8 text-center font-medium">{item.quantity}</span>
                                <button
                                  onClick={() => updateCartItemQuantity(item.menuItemId, item.quantity + 1)}
                                  className="w-6 h-6 bg-blue-600 text-white rounded-full flex items-center justify-center hover:bg-blue-700"
                                >
                                  +
                                </button>
                                <button
                                  onClick={() => removeFromCart(item.menuItemId)}
                                  className="ml-2 text-red-600 hover:text-red-700"
                                >
                                  <X className="w-4 h-4" />
                                </button>
                              </div>
                            </div>
                          ))}
                          
                          <div className="border-t border-gray-200 pt-3">
                            <div className="flex justify-between font-semibold text-lg">
                              <span>Total:</span>
                              <span>₹{getCartTotal()}</span>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>

                    <button
                      onClick={proceedToCustomerInfo}
                      disabled={cartItems.length === 0}
                      className="w-full mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                    >
                      Proceed to Customer Info
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Step 2: Customer Information */}
            {createOrderStep === 'customer' && (
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Customer Information</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Customer Name *
                    </label>
                    <input
                      type="text"
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      required
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter customer name"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Phone Number *
                    </label>
                    <input
                      type="tel"
                      value={customerInfo.phoneNumber}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, phoneNumber: e.target.value }))}
                      required
                      pattern="[0-9]{10}"
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter 10-digit phone number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Email (Optional)
                    </label>
                    <input
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter email address"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Order Type *
                    </label>
                    <select
                      value={orderDetails.orderType}
                      onChange={(e) => setOrderDetails(prev => ({ ...prev, orderType: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="dine_in">Dine In</option>
                      <option value="takeaway">Takeaway</option>
                    </select>
                  </div>

                  {orderDetails.orderType === 'dine_in' && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Table Number (Optional)
                      </label>
                      <input
                        type="text"
                        value={orderDetails.tableNumber}
                        onChange={(e) => setOrderDetails(prev => ({ ...prev, tableNumber: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Enter table number"
                      />
                    </div>
                  )}

                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Special Instructions (Optional)
                    </label>
                    <textarea
                      value={orderDetails.notes}
                      onChange={(e) => setOrderDetails(prev => ({ ...prev, notes: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Any special instructions for the order"
                    />
                  </div>
                </div>

                <div className="flex gap-3 mt-6">
                  <button
                    onClick={() => setCreateOrderStep('menu')}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back to Menu
                  </button>
                  <button
                    onClick={proceedToPayment}
                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Proceed to Payment
                  </button>
                </div>
              </div>
            )}

            {/* Step 3: Payment */}
            {createOrderStep === 'payment' && (
              <div className="p-6">
                <h4 className="text-lg font-semibold text-gray-900 mb-4">Payment Details</h4>
                
                {/* Order Summary */}
                <div className="bg-gray-50 rounded-lg p-4 mb-6">
                  <h5 className="font-medium text-gray-900 mb-3">Order Summary</h5>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Customer:</span>
                      <span>{customerInfo.name}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Phone:</span>
                      <span>{customerInfo.phoneNumber}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Order Type:</span>
                      <span className="capitalize">{orderDetails.orderType.replace('_', ' ')}</span>
                    </div>
                    {orderDetails.tableNumber && (
                      <div className="flex justify-between text-sm">
                        <span>Table:</span>
                        <span>{orderDetails.tableNumber}</span>
                      </div>
                    )}
                                         <div className="border-t border-gray-200 pt-2 mt-2">
                       <div className="flex justify-between font-medium">
                         <span>Items ({cartItems.length}):</span>
                         <span>₹{getCartTotal()}</span>
                       </div>
                       <div className="flex justify-between font-semibold text-lg border-t border-gray-200 pt-2 mt-2">
                         <span>Total:</span>
                         <span>₹{getCartTotal()}</span>
                       </div>
                     </div>
                  </div>
                </div>

                {/* Payment Method */}
                <div className="mb-6">
                  <label className="block text-sm font-medium text-gray-700 mb-3">
                    Payment Method *
                  </label>
                  <div className="grid grid-cols-2 gap-3">
                    {[
                      { value: 'cash', label: 'Cash', icon: '💵' },
                      { value: 'card', label: 'Card', icon: '💳' },
                      { value: 'upi', label: 'UPI', icon: '📱' },
                      { value: 'wallet', label: 'Wallet', icon: '👛' }
                    ].map((method) => (
                      <button
                        key={method.value}
                        onClick={() => setOrderDetails(prev => ({ ...prev, paymentMethod: method.value }))}
                        className={`p-3 border rounded-lg text-center transition-colors ${
                          orderDetails.paymentMethod === method.value
                            ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : 'border-gray-300 hover:border-gray-400'
                        }`}
                      >
                        <div className="text-2xl mb-1">{method.icon}</div>
                        <div className="font-medium">{method.label}</div>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="flex gap-3">
                  <button
                    onClick={() => setCreateOrderStep('customer')}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Back to Customer Info
                  </button>
                  <button
                    onClick={createOrder}
                    disabled={creatingOrder}
                    className="flex-1 px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                  >
                    {creatingOrder ? (
                      <div className="flex items-center justify-center gap-2">
                        <LoadingSpinner size="sm" />
                        Creating Order...
                      </div>
                    ) : (
                      'Create Order & Process Payment'
                    )}
                  </button>
                </div>
              </div>
            )}

            {/* Step 4: Success */}
            {createOrderStep === 'success' && createdOrder && (
              <div className="p-6 text-center">
                <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                  <CheckCircle2 className="w-8 h-8 text-green-600" />
                </div>
                
                <h4 className="text-xl font-semibold text-gray-900 mb-2">Order Created Successfully!</h4>
                <p className="text-gray-600 mb-6">
                  Order #{createdOrder.order.orderNumber} has been created and is now live in your orders section.
                </p>

                <div className="bg-gray-50 rounded-lg p-4 mb-6 text-left">
                  <h5 className="font-medium text-gray-900 mb-3">Order Details</h5>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span>Order Number:</span>
                      <span className="font-medium">{createdOrder.order.orderNumber}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Customer:</span>
                      <span className="font-medium">{createdOrder.order.customer.name}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Total Amount:</span>
                      <span className="font-medium">₹{createdOrder.order.totalAmount}</span>
                    </div>
                    <div className="flex justify-between">
                      <span>Payment Status:</span>
                      <span className="font-medium text-green-600">Paid</span>
                    </div>
                  </div>
                </div>

                <div className="flex gap-3 justify-center">
                  <button
                    onClick={printBill}
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    <FileText className="w-4 h-4" />
                    Print Bill
                  </button>
                  <button
                    onClick={closeCreateOrder}
                    className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors"
                  >
                    Create Another Order
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  )
}

export default RestaurantManagement