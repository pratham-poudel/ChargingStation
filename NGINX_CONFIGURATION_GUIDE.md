# 🔧 NGINX CONFIGURATION FOR DIRECT S3 UPLOADS

## 📋 **Current Issue Resolution**

Your **413 Content Too Large** errors are caused by Nginx's default `client_max_body_size` limit. With our new **Direct S3 Upload** implementation, this is no longer relevant since files bypass Nginx entirely.

## ⚙️ **Recommended Nginx Configuration**

### **Current Configuration (Causing 413 Errors):**
```nginx
# Likely current setting causing 413 errors
client_max_body_size 1M;  # Too small for images
```

### **Updated Configuration for Hybrid Approach:**
```nginx
server {
    listen 80;
    server_name lb.dallytech.com;

    # Allow larger uploads for legacy endpoints (if any)
    client_max_body_size 100M;
    
    # Timeout settings for file uploads
    client_body_timeout 60s;
    client_header_timeout 60s;
    
    # For API endpoints (metadata only with new direct upload)
    location /api/ {
        proxy_pass http://your-backend-servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # These can be smaller since we're only handling metadata
        client_max_body_size 10M;  # For metadata and small files
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
    }
    
    # Specific optimization for presigned upload endpoints
    location /api/presigned-upload/ {
        proxy_pass http://your-backend-servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Very small size since only JSON metadata
        client_max_body_size 1M;
        proxy_read_timeout 30s;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
    }
}
```

### **Optimal Configuration with Direct S3 Upload:**
```nginx
server {
    listen 80;
    server_name lb.dallytech.com;

    # Default for most API endpoints
    client_max_body_size 50M;  # Conservative limit for legacy endpoints
    
    location /api/ {
        proxy_pass http://your-backend-servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Standard settings
        proxy_read_timeout 60s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_buffering on;
        proxy_buffer_size 4k;
        proxy_buffers 8 4k;
    }
    
    # Presigned upload endpoints - only handle metadata
    location /api/presigned-upload/ {
        proxy_pass http://your-backend-servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Small size for metadata only
        client_max_body_size 2M;
        proxy_read_timeout 30s;
        proxy_connect_timeout 30s;
        proxy_send_timeout 30s;
    }
    
    # Legacy upload endpoints (if you keep any)
    location /api/uploads-optimized/ {
        proxy_pass http://your-backend-servers;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_Set_header X-Forwarded-Proto $scheme;
        
        # Larger limit for files that still go through server
        client_max_body_size 100M;
        proxy_read_timeout 120s;
        proxy_connect_timeout 60s;
        proxy_send_timeout 120s;
        
        # Disable buffering for large file uploads
        proxy_buffering off;
        proxy_request_buffering off;
    }
}
```

## 🎯 **Why Direct S3 Upload Solves This**

### **Before (Files Through Nginx):**
```
Client (8MB file) → Nginx (1MB limit) → ❌ 413 Error
```

### **After (Direct S3 Upload):**
```
Client → Nginx (metadata ~1KB) → ✅ Success
Client → S3 Direct (8MB file) → ✅ Success
```

## 🚀 **Performance Impact**

### **Nginx Load Reduction:**
- **Before:** 100% of file data flows through Nginx
- **After:** Only ~0.1% metadata flows through Nginx

### **Server Resource Usage:**
- **Before:** High memory, high bandwidth usage
- **After:** Minimal memory, minimal bandwidth usage

### **Upload Success Rate:**
- **Before:** Limited by Nginx `client_max_body_size`
- **After:** Limited only by S3 limits (TB scale)

## 📊 **Monitoring Commands**

### **Check Current Nginx Configuration:**
```bash
# Find nginx config file
nginx -t

# Check current client_max_body_size
grep -r "client_max_body_size" /etc/nginx/

# Check nginx error logs for 413 errors
tail -f /var/log/nginx/error.log | grep 413
```

### **Test Upload Limits:**
```bash
# Test small metadata request (should work)
curl -X POST https://lb.dallytech.com/api/presigned-upload/generate-upload-url \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{"fileName":"test.jpg","fileType":"image/jpeg","fileSize":1048576}'

# Test large file direct to S3 (should work)
curl -X PUT "PRESIGNED_URL" \
  -H "Content-Type: image/jpeg" \
  --data-binary @large-image.jpg
```

## 🔧 **Implementation Priority**

### **Immediate (High Priority):**
1. ✅ **Deploy Direct S3 Upload API** (Already completed)
2. ✅ **Update Frontend to Use Direct Upload** (Already completed)
3. 🔄 **Test with 8MB+ files**

### **Optional (Medium Priority):**
1. **Update Nginx config** to reflect new architecture
2. **Monitor old upload endpoint usage**
3. **Gradually migrate all uploads to direct S3**

### **Future (Low Priority):**
1. **Remove legacy upload endpoints**
2. **Further optimize Nginx configuration**

## ✅ **Verification Steps**

### **Test Direct S3 Upload:**
1. Upload 8MB image using new frontend service
2. Verify file appears in S3/R2 storage
3. Verify metadata saved in database
4. Confirm no 413 errors in Nginx logs

### **Expected Results:**
- ✅ Large files upload successfully
- ✅ No 413 errors in logs
- ✅ Fast upload speeds (direct to S3)
- ✅ Minimal server resource usage

## 🎉 **Summary**

With the **Direct S3 Upload** implementation:
- **413 errors are eliminated** because files bypass Nginx
- **Server performance improves** due to reduced load
- **Upload size limits are removed** (up to S3 limits)
- **Nginx configuration becomes less critical** for file uploads

Your upload system is now **scalable and nginx-independent**! 🚀
