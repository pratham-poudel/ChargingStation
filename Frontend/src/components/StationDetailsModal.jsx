import React, { useState } from 'react';
import { CheckCircle, XCircle, Power, Trash2, MapPin, Zap, User } from 'lucide-react';
import toast from 'react-hot-toast';
import LoadingSpinner from './ui/LoadingSpinner';
import { useAdminAuth } from '../context/AdminAuthContext';

const StationDetailsModal = ({ station, onClose, onActionSuccess }) => {
  const [loading, setLoading] = useState(false);
  const [otp, setOtp] = useState('');
  const [otpStep, setOtpStep] = useState(false);
  const { toggleDockitRecommended, verifyStation, toggleStationActive } = useAdminAuth();

  // Admin actions (implement API calls as needed)
  const handleToggleDockitRecommended = async () => {
    setLoading(true);
    try {
      await toggleDockitRecommended(station._id, !station.dockitRecommended);
      onActionSuccess && onActionSuccess();
    } catch (e) {
      toast.error('Failed to update dockitRecommended');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleActive = async () => {
    setLoading(true);
    try {
      await toggleStationActive(station._id, station.isActive);
      onActionSuccess && onActionSuccess();
    } catch (e) {
      toast.error('Failed to update status');
    } finally {
      setLoading(false);
    }
  };

  const handleToggleVerified = async () => {
    setLoading(true);
    try {
      if (!station.isVerified) {
        await verifyStation(station._id);
        toast.success('Verification status updated');
        onActionSuccess && onActionSuccess();
      } else {
        toast.error('Un-verifying a station is not supported.');
      }
    } catch (e) {
      toast.error('Failed to update verification');
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteStation = async () => {
    if (!otpStep) {
      await adminAPI.post(`/stations/${station._id}/request-delete-otp`)
      setOtpStep(true);
      toast.success('OTP sent to admin phone');
      return;
    }
    setLoading(true);
    try {
      await adminAPI.delete(`/stations/${station._id}`, { data: { otp } });
      toast.success('Station deleted');
      onActionSuccess && onActionSuccess();
      onClose();
    } catch (e) {
      toast.error('Failed to delete station');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-40">
      <div className="bg-white rounded-lg shadow-lg w-full max-w-3xl mx-4 p-6 relative">
        {loading && <LoadingSpinner />}
        <button onClick={onClose} className="absolute top-3 right-3 text-gray-400 hover:text-gray-700">
          <XCircle className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-3 mb-4">
          <Zap className="text-green-500" />
          <h2 className="text-xl font-bold">Station Details</h2>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <div className="font-bold text-lg mb-1">{station.name}</div>
            <div className="text-xs text-gray-500 mb-2">ID: {station._id}</div>
            <div className="mb-2 flex items-center"><User className="inline w-4 h-4 mr-1" /> Vendor: {station.vendor?.businessName || 'N/A'}</div>
            <div className="mb-2 flex items-center"><MapPin className="inline w-4 h-4 mr-1" /> Address: {station.address ? `${station.address.street || ''}${station.address.landmark ? ', ' + station.address.landmark : ''}, ${station.address.city || ''}, ${station.address.state || ''} - ${station.address.pincode || ''}` : 'N/A'}</div>
            <div className="mb-2">Coordinates: {station.location?.coordinates?.join(', ') || 'N/A'}</div>
            <div className="mb-2">Description: {station.description || 'N/A'}</div>
            <div className="mb-2">Amenities: {station.amenities?.length ? station.amenities.join(', ') : 'N/A'}</div>
            <div className="mb-2 flex items-center">DockitRecommended: <button onClick={handleToggleDockitRecommended} className={`ml-2 px-2 py-1 rounded ${station.dockitRecommended ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'}`}>{station.dockitRecommended ? 'Yes' : 'No'}</button></div>
            <div className="mb-2 flex items-center">Active: <button onClick={handleToggleActive} className={`ml-2 px-2 py-1 rounded ${station.isActive ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'}`}>{station.isActive ? 'Yes' : 'No'}</button></div>
            <div className="mb-2 flex items-center">Verified: <button onClick={handleToggleVerified} className={`ml-2 px-2 py-1 rounded ${station.isVerified ? 'bg-green-200 text-green-800' : 'bg-gray-200 text-gray-700'}`}>{station.isVerified ? 'Yes' : 'No'}</button></div>
          </div>
          <div>
            <div className="mb-2">Station Master: {station.stationMaster?.name} ({station.stationMaster?.phoneNumber})</div>
            <div className="mb-2">Total Ports: {station.totalPorts}</div>
            <div className="mb-2">Available Ports: {station.availablePorts}</div>
            <div className="mb-2">Rating: {station.rating?.average} ({station.rating?.count} ratings)</div>
            <div className="mb-2">Created: {station.createdAt ? new Date(station.createdAt).toLocaleString() : ''}</div>
            <div className="mb-2">Updated: {station.updatedAt ? new Date(station.updatedAt).toLocaleString() : ''}</div>
            <div className="mb-2">Images: {station.images?.length ? station.images.map(img => <img src={img?.url} alt="station" key={img?.url} className="inline w-10 h-10 object-cover rounded mr-1" />) : 'N/A'}</div>
          </div>
        </div>
        <div className="mb-2 mt-4 font-semibold">Charging Ports:</div>
        <div className="overflow-x-auto mb-4">
          <table className="min-w-full text-xs border">
            <thead>
              <tr>
                <th>Port #</th>
                <th>Type</th>
                <th>Power (kW)</th>
                <th>Charging Type</th>
                <th>Price/kWh</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {station.chargingPorts?.map((port, idx) => (
                <tr key={idx}>
                  <td>{port.portNumber}</td>
                  <td>{port.connectorType}</td>
                  <td>{port.powerOutput}</td>
                  <td>{port.chargingType}</td>
                  <td>{port.pricePerUnit}</td>
                  <td>{port.currentStatus}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex gap-4 mt-4">
          <button onClick={handleDeleteStation} className="bg-red-600 text-white px-4 py-2 rounded flex items-center gap-2">
            <Trash2 className="w-4 h-4" /> Delete Station
          </button>
          {otpStep && (
            <div className="flex items-center gap-2">
              <input type="text" placeholder="Enter OTP" value={otp} onChange={e => setOtp(e.target.value)} className="border px-2 py-1 rounded" />
              <button onClick={handleDeleteStation} className="bg-red-700 text-white px-3 py-1 rounded">Confirm Delete</button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StationDetailsModal;
