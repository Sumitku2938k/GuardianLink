const { createClient } = require("redis");

let redisClient = null;
let isRedisConnected = false;
const memoryStore = new Map();

const initRedis = async () => {
  try {
    redisClient = createClient({
      url: process.env.REDIS_URL || "redis://localhost:6379",
      socket: {
        reconnectStrategy: (retries) => {
          if (retries > 3) {
            console.warn("⚠️ Redis reconnect retries exhausted. Fallback to Memory Session Cache.");
            return new Error("Redis retry limit reached");
          }
          return Math.min(retries * 100, 3000);
        }
      }
    });

    redisClient.on("error", (err) => {
      if (!isRedisConnected) {
        console.warn(`⚠️ Redis Client Warning: ${err.message}. Using In-Memory Cache Fallback.`);
      }
      isRedisConnected = false;
    });

    redisClient.on("connect", () => {
      isRedisConnected = true;
      console.log("⚡ Redis Client Connected Successfully");
    });

    await redisClient.connect().catch((err) => {
      console.warn(`⚠️ Could not connect to Redis at ${process.env.REDIS_URL || "redis://localhost:6379"}. Fallback to Memory Store.`);
    });
  } catch (error) {
    console.warn(`⚠️ Redis Init Error: ${error.message}. Fallback to In-Memory Session Cache.`);
  }
};

// Session Cache API with fallback
const setSession = async (key, val, ttlSeconds = 604800) => {
  const dataStr = typeof val === "string" ? val : JSON.stringify(val);
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.set(key, dataStr, { EX: ttlSeconds });
      return;
    } catch (err) {
      console.warn("Redis set failure, falling back to Memory Store");
    }
  }
  memoryStore.set(key, { val: dataStr, expiresAt: Date.now() + ttlSeconds * 1000 });
};

const getSession = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      const data = await redisClient.get(key);
      if (data) return JSON.parse(data);
    } catch (err) {
      console.warn("Redis get failure, falling back to Memory Store");
    }
  }

  const mem = memoryStore.get(key);
  if (!mem) return null;
  if (mem.expiresAt < Date.now()) {
    memoryStore.delete(key);
    return null;
  }
  try {
    return JSON.parse(mem.val);
  } catch {
    return mem.val;
  }
};

const delSession = async (key) => {
  if (isRedisConnected && redisClient) {
    try {
      await redisClient.del(key);
    } catch (err) {
      console.warn("Redis del failure");
    }
  }
  memoryStore.delete(key);
};

module.exports = {
  initRedis,
  setSession,
  getSession,
  delSession
};
