import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  X, 
  Crown, 
  Zap, 
  MapPin, 
  Clock, 
  CheckCircle,
  Star,
  Search,
  Filter,
  Loader
} from 'lucide-react';

const StationSelectionModal = ({ 
  isOpen, 
  onClose, 
  stations = [], 
  onStationSelect,
  loading = false 
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [selectedStation, setSelectedStation] = useState(null);
  const [filteredStations, setFilteredStations] = useState([]);

  useEffect(() => {
    if (stations) {
      let filtered = stations;

      // Filter by search term
      if (searchTerm) {
        filtered = filtered.filter(station => 
          station.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          station.address?.city?.toLowerCase().includes(searchTerm.toLowerCase())
        );
      }

      // Filter by status
      if (filterStatus === 'active') {
        filtered = filtered.filter(station => station.isActive && station.isVerified);
      } else if (filterStatus === 'premium') {
        filtered = filtered.filter(station => station.premiumSubscription?.isActive);
      } else if (filterStatus === 'standard') {
        filtered = filtered.filter(station => !station.premiumSubscription?.isActive);
      }

      setFilteredStations(filtered);
    }
  }, [stations, searchTerm, filterStatus]);

  const handleStationSelect = (station) => {
    setSelectedStation(station);
  };

  const handleContinue = () => {
    if (selectedStation && onStationSelect) {
      onStationSelect(selectedStation);
    }
  };

  const handleClose = () => {
    setSelectedStation(null);
    setSearchTerm('');
    setFilterStatus('all');
    onClose();
  };

  const getStationStatus = (station) => {
    if (station.premiumSubscription?.isActive) {
      return {
        label: 'Premium Active',
        color: 'text-yellow-700 bg-yellow-100',
        icon: Crown
      };
    } else if (station.isActive && station.isVerified) {
      return {
        label: 'Active',
        color: 'text-green-700 bg-green-100',
        icon: CheckCircle
      };
    } else {
      return {
        label: 'Inactive',
        color: 'text-gray-700 bg-gray-100',
        icon: Clock
      };
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence mode="wait" key="station-selection-modal">
      <div className="fixed inset-0 z-[9990] overflow-y-auto">
        <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity z-[9989]"
            onClick={handleClose}
          />

          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full relative z-[9990]"
          >
            {/* Header */}
            <div className="bg-gradient-to-r from-yellow-50 to-orange-50 px-6 py-4 border-b border-gray-200">
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <Crown className="w-6 h-6 text-yellow-600 mr-3" />
                  <div>
                    <h3 className="text-lg font-semibold text-gray-900">
                      Select Station for Premium Upgrade
                    </h3>
                    <p className="text-sm text-gray-600">
                      Choose which station you want to upgrade to premium
                    </p>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            {/* Search and Filters */}
            <div className="px-6 py-4 bg-gray-50 border-b border-gray-200">
              <div className="flex flex-col sm:flex-row gap-4">
                {/* Search */}
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                    <input
                      type="text"
                      placeholder="Search stations by name or location..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Filter */}
                <div className="sm:w-48">
                  <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                  >
                    <option value="all">All Stations</option>
                    <option value="active">Active Only</option>
                    <option value="standard">Standard Only</option>
                    <option value="premium">Premium Only</option>
                  </select>
                </div>
              </div>
            </div>

            {/* Content */}
            <div className="px-6 py-6 max-h-96 overflow-y-auto">
              {loading ? (
                <div className="flex items-center justify-center h-32">
                  <Loader className="w-8 h-8 animate-spin text-yellow-600" />
                </div>
              ) : filteredStations.length === 0 ? (
                <div className="text-center py-8">
                  <Zap className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h4 className="text-lg font-medium text-gray-900 mb-2">No stations found</h4>
                  <p className="text-gray-600">
                    {searchTerm || filterStatus !== 'all' 
                      ? 'Try adjusting your search or filters'
                      : 'You haven\'t added any stations yet'
                    }
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {filteredStations.map((station) => {
                    const status = getStationStatus(station);
                    const StatusIcon = status.icon;
                    const isSelected = selectedStation?._id === station._id;
                    const isPremium = station.premiumSubscription?.isActive;

                    return (
                      <motion.div
                        key={station._id}
                        whileHover={{ scale: 1.01 }}
                        className={`border-2 rounded-lg p-4 cursor-pointer transition-all ${
                          isSelected
                            ? 'border-yellow-400 bg-yellow-50'
                            : isPremium
                            ? 'border-yellow-200 bg-yellow-25'
                            : 'border-gray-200 hover:border-gray-300'
                        }`}
                        onClick={() => !isPremium && handleStationSelect(station)}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            {/* Selection Radio */}
                            <div className={`w-5 h-5 rounded-full border-2 flex items-center justify-center ${
                              isPremium 
                                ? 'border-yellow-400 bg-yellow-400'
                                : isSelected 
                                ? 'border-yellow-400 bg-yellow-400' 
                                : 'border-gray-300'
                            }`}>
                              {(isSelected || isPremium) && (
                                isPremium ? (
                                  <Crown className="w-3 h-3 text-white" />
                                ) : (
                                  <CheckCircle className="w-3 h-3 text-white" fill="currentColor" />
                                )
                              )}
                            </div>

                            {/* Station Info */}
                            <div className="flex-1">
                              <div className="flex items-center space-x-3">
                                <h4 className="text-lg font-semibold text-gray-900">
                                  {station.name}
                                </h4>
                                {isPremium && (
                                  <div className="inline-flex items-center px-2 py-1 rounded-full bg-yellow-200 text-yellow-800 text-xs font-bold">
                                    <Crown className="w-3 h-3 mr-1" />
                                    PREMIUM
                                  </div>
                                )}
                              </div>
                              
                              <div className="flex items-center mt-1 text-sm text-gray-600">
                                <MapPin className="w-4 h-4 mr-1" />
                                <span>
                                  {station.address ? 
                                    `${station.address.city}, ${station.address.state}` : 
                                    'Location not set'
                                  }
                                </span>
                              </div>

                              <div className="flex items-center space-x-4 mt-2">
                                <div className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${status.color}`}>
                                  <StatusIcon className="w-3 h-3 mr-1" />
                                  {status.label}
                                </div>
                                
                                <div className="text-xs text-gray-500">
                                  {station.totalPorts || 0} charging ports
                                </div>
                              </div>
                            </div>
                          </div>

                          {/* Premium Info */}
                          {isPremium && (
                            <div className="text-right">
                              <div className="text-sm font-medium text-yellow-800">
                                Already Premium
                              </div>
                              <div className="text-xs text-gray-600">
                                Active subscription
                              </div>
                            </div>
                          )}
                        </div>

                        {isPremium && (
                          <div className="mt-3 p-3 bg-yellow-100 rounded-lg">
                            <p className="text-sm text-yellow-800">
                              This station already has an active premium subscription. 
                              Premium features are currently enabled.
                            </p>
                          </div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Footer */}
            <div className="bg-gray-50 px-6 py-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                {selectedStation ? (
                  <span>Selected: <strong>{selectedStation.name}</strong></span>
                ) : (
                  'Select a station to continue'
                )}
              </div>
              
              <div className="flex space-x-3">
                <button
                  onClick={handleClose}
                  className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-lg hover:bg-gray-50"
                >
                  Cancel
                </button>
                
                <button
                  onClick={handleContinue}
                  disabled={!selectedStation}
                  className="px-6 py-2 bg-gradient-to-r from-yellow-500 to-orange-600 text-white rounded-lg hover:from-yellow-600 hover:to-orange-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center"
                >
                  <Crown className="w-4 h-4 mr-2" />
                  Upgrade to Premium
                </button>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </AnimatePresence>
  );
};

export default StationSelectionModal; 