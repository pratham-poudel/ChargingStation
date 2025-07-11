import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  Smartphone, 
  Monitor, 
  Tablet, 
  Trash2, 
  Calendar,
  MapPin,
  RefreshCw,
  Shield,
  AlertCircle
} from 'lucide-react';
import { merchantAPI } from '../services/merchantAPI';
import { getStoredDeviceId } from '../utils/deviceManager';
import toast from 'react-hot-toast';

const TrustedDevices = () => {
  const [devices, setDevices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [removing, setRemoving] = useState(null);
  const [currentDeviceId, setCurrentDeviceId] = useState(null);
  useEffect(() => {
    const initComponent = async () => {
      try {
        // Get current device ID
        const deviceData = await getStoredDeviceId();
        setCurrentDeviceId(deviceData.deviceId);
        
        // Load trusted devices
        await loadDevices();
      } catch (error) {
        console.error('Error initializing TrustedDevices:', error);
        toast.error('Failed to initialize device management');
      }
    };
    
    initComponent();
  }, []);

  const loadDevices = async () => {
    try {
      setLoading(true);
      const response = await merchantAPI.getTrustedDevices();
      if (response.success) {
        setDevices(response.data.devices);
      }
    } catch (error) {
      console.error('Error loading devices:', error);
      toast.error('Failed to load trusted devices');
    } finally {
      setLoading(false);
    }
  };

  const removeDevice = async (deviceId) => {
    if (deviceId === currentDeviceId) {
      toast.error('Cannot remove current device');
      return;
    }

    try {
      setRemoving(deviceId);
      const response = await merchantAPI.removeTrustedDevice(deviceId);
      if (response.success) {
        toast.success('Device removed successfully');
        loadDevices();
      }
    } catch (error) {
      console.error('Error removing device:', error);
      toast.error('Failed to remove device');
    } finally {
      setRemoving(null);
    }
  };

  const cleanupOldDevices = async () => {
    try {
      const response = await merchantAPI.cleanupDevices();
      if (response.success) {
        toast.success('Old devices cleaned up');
        loadDevices();
      }
    } catch (error) {
      console.error('Error cleaning up devices:', error);
      toast.error('Failed to cleanup devices');
    }
  };

  const getDeviceIcon = (deviceName = '') => {
    const name = deviceName.toLowerCase();
    if (name.includes('mobile') || name.includes('android') || name.includes('iphone')) {
      return <Smartphone className="w-5 h-5" />;
    } else if (name.includes('tablet') || name.includes('ipad')) {
      return <Tablet className="w-5 h-5" />;
    } else {
      return <Monitor className="w-5 h-5" />;
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  if (loading) {
    return (
      <div className="bg-white rounded-xl shadow-lg p-6">
        <div className="flex items-center space-x-3 mb-6">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Trusted Devices</h2>
        </div>
        <div className="animate-pulse space-y-4">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-16 bg-gray-200 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-xl shadow-lg p-6">
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-3">
          <Shield className="w-6 h-6 text-blue-600" />
          <h2 className="text-xl font-semibold text-gray-900">Trusted Devices</h2>
        </div>
        <button
          onClick={cleanupOldDevices}
          className="flex items-center space-x-2 px-4 py-2 text-sm font-medium text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Cleanup Old</span>
        </button>
      </div>

      {devices.length === 0 ? (
        <div className="text-center py-8">
          <AlertCircle className="w-12 h-12 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Trusted Devices</h3>
          <p className="text-gray-600">
            Devices will appear here after you log in with OTP verification.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {devices.map((device) => (
            <motion.div
              key={device.deviceId}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className={`p-4 border rounded-lg transition-all duration-200 ${
                device.deviceId === currentDeviceId
                  ? 'border-green-200 bg-green-50'
                  : 'border-gray-200 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <div className={`p-2 rounded-lg ${
                    device.deviceId === currentDeviceId
                      ? 'bg-green-100 text-green-600'
                      : 'bg-gray-100 text-gray-600'
                  }`}>
                    {getDeviceIcon(device.deviceName)}
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2">
                      <h3 className="font-medium text-gray-900">
                        {device.deviceName}
                      </h3>
                      {device.deviceId === currentDeviceId && (
                        <span className="px-2 py-1 bg-green-100 text-green-700 text-xs font-medium rounded-full">
                          Current Device
                        </span>
                      )}
                    </div>
                    
                    <div className="flex items-center space-x-4 mt-1 text-sm text-gray-600">
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Last used: {formatDate(device.lastUsed)}</span>
                      </div>
                      <div className="flex items-center space-x-1">
                        <Calendar className="w-3 h-3" />
                        <span>Added: {formatDate(device.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>

                {device.deviceId !== currentDeviceId && (
                  <button
                    onClick={() => removeDevice(device.deviceId)}
                    disabled={removing === device.deviceId}
                    className="p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Remove device"
                  >
                    {removing === device.deviceId ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <Trash2 className="w-4 h-4" />
                    )}
                  </button>
                )}
              </div>
            </motion.div>
          ))}
        </div>
      )}

      <div className="mt-6 p-4 bg-blue-50 rounded-lg">
        <div className="flex items-start space-x-3">
          <AlertCircle className="w-5 h-5 text-blue-600 mt-0.5 flex-shrink-0" />
          <div className="text-sm">
            <p className="text-blue-900 font-medium mb-1">About Trusted Devices</p>
            <p className="text-blue-700">
              Trusted devices allow you to log in with just your password instead of requiring OTP each time. 
              Devices become trusted after successful OTP verification and remain active for 90 days from last use.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default TrustedDevices;
