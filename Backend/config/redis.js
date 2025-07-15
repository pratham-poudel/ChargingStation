const redis = require('redis');
require('dotenv').config();

let redisClient;

const connectRedis = async () => {
  try {
    const redisConfig = {
      socket: {
        host: process.env.REDIS_HOST || '127.0.0.1',
        port: process.env.REDIS_PORT ? parseInt(process.env.REDIS_PORT) : 6379,
        keepAlive: true,
      },
      password: process.env.REDIS_PASSWORD || undefined,
    };

    if (process.env.REDIS_TLS === 'true') {
      redisConfig.socket.tls = true;
      redisConfig.socket.rejectUnauthorized = false; // ✅ Ignore invalid/self-signed cert
    }

    redisClient = redis.createClient(redisConfig);

    redisClient.on('error', (err) => {
      console.error('Redis Client Error:', err);
    });

    redisClient.on('connect', () => {
      console.log('✅ Redis client connected');
    });

    redisClient.on('ready', () => {
      console.log('✅ Redis client ready');
    });

    redisClient.on('end', () => {
      console.log('❌ Redis client disconnected');
    });

    await redisClient.connect();
    return redisClient;
  } catch (error) {
    console.error('❌ Failed to connect to Redis:', error);
    throw error;
  }
};

const getRedisClient = () => {
  if (!redisClient) {
    throw new Error('Redis client not initialized. Call connectRedis() first.');
  }
  return redisClient;
};

// OTP related functions
const storeOTP = async (phoneNumber, otp, expireMinutes = 10) => {
  try {
    const client = getRedisClient();
    const key = `otp:${phoneNumber}`;
    const expireSeconds = expireMinutes * 60;
    
    await client.setEx(key, expireSeconds, otp);
    console.log(`📱 OTP stored for ${phoneNumber}, expires in ${expireMinutes} minutes`);
    return true;
  } catch (error) {
    console.error('Error storing OTP:', error);
    throw error;
  }
};

const getOTP = async (phoneNumber) => {
  try {
    const client = getRedisClient();
    const key = `otp:${phoneNumber}`;
    const otp = await client.get(key);
    return otp;
  } catch (error) {
    console.error('Error getting OTP:', error);
    throw error;
  }
};

const deleteOTP = async (phoneNumber) => {
  try {
    const client = getRedisClient();
    const key = `otp:${phoneNumber}`;
    await client.del(key);
    console.log(`🗑️ OTP deleted for ${phoneNumber}`);
    return true;
  } catch (error) {
    console.error('Error deleting OTP:', error);
    throw error;
  }
};

// Session management
const storeSession = async (sessionId, data, expireHours = 24) => {
  try {
    const client = getRedisClient();
    const key = `session:${sessionId}`;
    const expireSeconds = expireHours * 60 * 60;
    
    await client.setEx(key, expireSeconds, JSON.stringify(data));
    return true;
  } catch (error) {
    console.error('Error storing session:', error);
    throw error;
  }
};

const getSession = async (sessionId) => {
  try {
    const client = getRedisClient();
    const key = `session:${sessionId}`;
    const data = await client.get(key);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting session:', error);
    throw error;
  }
};

const deleteSession = async (sessionId) => {
  try {
    const client = getRedisClient();
    const key = `session:${sessionId}`;
    await client.del(key);
    return true;
  } catch (error) {
    console.error('Error deleting session:', error);
    throw error;
  }
};

// Rate limiting for OTP requests
const checkOTPRateLimit = async (phoneNumber, maxAttempts = 3, windowMinutes = 15) => {
  try {
    const client = getRedisClient();
    const key = `otp_attempts:${phoneNumber}`;
    const attempts = await client.get(key);
    
    if (!attempts) {
      // First attempt
      await client.setEx(key, windowMinutes * 60, '1');
      return { allowed: true, attemptsLeft: maxAttempts - 1 };
    }
    
    const currentAttempts = parseInt(attempts);
    if (currentAttempts >= maxAttempts) {
      const ttl = await client.ttl(key);
      return { 
        allowed: false, 
        attemptsLeft: 0,
        resetInMinutes: Math.ceil(ttl / 60)
      };
    }
    
    // Increment attempts
    await client.incr(key);
    return { 
      allowed: true, 
      attemptsLeft: maxAttempts - currentAttempts - 1 
    };
  } catch (error) {
    console.error('Error checking OTP rate limit:', error);
    throw error;
  }
};
process.on('uncaughtException', (err) => {
  console.error('❗ Uncaught Exception:', err);
});
process.on('unhandledRejection', (err) => {
  console.error('❗ Unhandled Rejection:', err);
});

module.exports = {
  connectRedis,
  getRedisClient,
  storeOTP,
  getOTP,
  deleteOTP,
  storeSession,
  getSession,
  deleteSession,
  checkOTPRateLimit
};
