import { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Clock, AlertTriangle } from 'lucide-react';

const CountdownTimer = ({ 
  endDate, 
  onExpired, 
  title = "Time Remaining",
  className = "",
  variant = "default", // "default", "warning", "danger"
  size = "medium" // "small", "medium", "large"
}) => {
  const [timeLeft, setTimeLeft] = useState({ days: 0, hours: 0, minutes: 0, seconds: 0 });
  const [isExpired, setIsExpired] = useState(false);

  useEffect(() => {
    const calculateTimeLeft = () => {
      if (!endDate) {
        setIsExpired(true);
        return;
      }

      const now = new Date().getTime();
      const targetTime = new Date(endDate).getTime();
      const difference = targetTime - now;

      if (difference <= 0) {
        setTimeLeft({ days: 0, hours: 0, minutes: 0, seconds: 0 });
        setIsExpired(true);
        if (onExpired) onExpired();
        return;
      }

      const days = Math.floor(difference / (1000 * 60 * 60 * 24));
      const hours = Math.floor((difference % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((difference % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((difference % (1000 * 60)) / 1000);

      setTimeLeft({ days, hours, minutes, seconds });
      setIsExpired(false);
    };

    calculateTimeLeft();
    const timer = setInterval(calculateTimeLeft, 1000);

    return () => clearInterval(timer);
  }, [endDate, onExpired]);

  const getVariantStyles = () => {
    if (isExpired) {
      return {
        container: "bg-red-50 border-red-200",
        title: "text-red-800",
        timeUnit: "bg-red-100 border-red-200 text-red-800",
        icon: "text-red-600"
      };
    }

    switch (variant) {
      case "warning":
        return {
          container: "bg-amber-50 border-amber-200",
          title: "text-amber-800",
          timeUnit: "bg-amber-100 border-amber-200 text-amber-800",
          icon: "text-amber-600"
        };
      case "danger":
        return {
          container: "bg-red-50 border-red-200",
          title: "text-red-800",
          timeUnit: "bg-red-100 border-red-200 text-red-800",
          icon: "text-red-600"
        };
      default:
        return {
          container: "bg-blue-50 border-blue-200",
          title: "text-blue-800",
          timeUnit: "bg-blue-100 border-blue-200 text-blue-800",
          icon: "text-blue-600"
        };
    }
  };

  const getSizeStyles = () => {
    switch (size) {
      case "small":
        return {
          container: "p-3",
          title: "text-sm",
          timeValue: "text-lg",
          timeLabel: "text-xs",
          grid: "gap-2"
        };
      case "large":
        return {
          container: "p-6",
          title: "text-lg",
          timeValue: "text-3xl",
          timeLabel: "text-sm",
          grid: "gap-4"
        };
      default:
        return {
          container: "p-4",
          title: "text-base",
          timeValue: "text-2xl",
          timeLabel: "text-xs",
          grid: "gap-3"
        };
    }
  };

  const variantStyles = getVariantStyles();
  const sizeStyles = getSizeStyles();

  const timeUnits = [
    { label: 'Days', value: timeLeft.days },
    { label: 'Hours', value: timeLeft.hours },
    { label: 'Minutes', value: timeLeft.minutes },
    { label: 'Seconds', value: timeLeft.seconds }
  ];

  if (isExpired) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className={`border rounded-lg ${variantStyles.container} ${sizeStyles.container} ${className}`}
      >
        <div className="flex items-center justify-center">
          <AlertTriangle className={`w-5 h-5 mr-2 ${variantStyles.icon}`} />
          <span className={`font-medium ${variantStyles.title}`}>
            Subscription Expired
          </span>
        </div>
      </motion.div>
    );
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`border rounded-lg ${variantStyles.container} ${sizeStyles.container} ${className}`}
    >
      <div className="flex items-center justify-center mb-3">
        <Clock className={`w-4 h-4 mr-2 ${variantStyles.icon}`} />
        <h3 className={`font-medium ${variantStyles.title} ${sizeStyles.title}`}>
          {title}
        </h3>
      </div>
      
      <div className={`grid grid-cols-4 ${sizeStyles.grid}`}>
        {timeUnits.map((unit, index) => (
          <motion.div
            key={unit.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            className={`text-center border rounded-lg ${variantStyles.timeUnit} ${sizeStyles.container}`}
          >
            <div className={`font-bold ${variantStyles.title} ${sizeStyles.timeValue}`}>
              {String(unit.value).padStart(2, '0')}
            </div>
            <div className={`${variantStyles.title} ${sizeStyles.timeLabel} font-medium opacity-75`}>
              {unit.label}
            </div>
          </motion.div>
        ))}
      </div>
    </motion.div>
  );
};

export default CountdownTimer; 