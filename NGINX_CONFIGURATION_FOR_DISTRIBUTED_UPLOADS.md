# Nginx Configuration for Optimized Station Image Uploads

## Problem Solved
The original station image upload was sending multiple large images (10-25MB payload) in a single request, causing:
- 413 Content Too Large errors in distributed systems
- Nginx `client_max_body_size` limit exceeded
- High memory usage and timeouts

## Solution Implemented
**Sequential Single-Image Uploads**: Upload one image at a time with small payloads.

## Recommended Nginx Configuration

### For Load Balancer (lb.dallytech.com)

```nginx
server {
    listen 443 ssl http2;
    server_name lb.dallytech.com;
    
    # SSL configuration...
    
    # File upload limits - now much smaller since we upload one image at a time
    client_max_body_size 10M;        # Reduced from default (was causing 413)
    client_body_timeout 60s;         # Timeout for single image
    client_header_timeout 60s;
    
    # Proxy settings for backend servers
    location /api/ {
        # Load balancing to your backend servers
        proxy_pass http://backend_pool;
        
        # Important: Don't buffer large uploads
        proxy_request_buffering off;
        proxy_buffering off;
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
        
        # Headers
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Upload progress tracking (optional)
        track_uploads uploads 30s;
    }
    
    # Optional: Upload progress endpoint
    location ^~ /progress {
        report_uploads uploads;
    }
}

upstream backend_pool {
    least_conn;  # Use least connections for upload balancing
    server backend1.dallytech.com:5000 max_fails=3 fail_timeout=30s;
    server backend2.dallytech.com:5000 max_fails=3 fail_timeout=30s;
    # Add more backend servers as needed
}
```

### For Backend Servers

```nginx
server {
    listen 5000;
    server_name backend1.dallytech.com;  # or backend2, etc.
    
    # Optimized for single image uploads
    client_max_body_size 8M;        # Single image limit
    client_body_timeout 30s;        # Faster timeout for single images
    client_header_timeout 30s;
    
    # Proxy to Node.js application
    location / {
        proxy_pass http://localhost:3000;  # Your Node.js app port
        
        # No buffering for real-time upload progress
        proxy_request_buffering off;
        proxy_buffering off;
        
        # Connection settings
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Real IP forwarding
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

## Performance Comparison

| Method | Payload Size | Nginx Compatibility | Memory Usage | Error Isolation |
|--------|-------------|---------------------|--------------|-----------------|
| **Old**: Bulk Upload | 10-25MB | ❌ 413 Errors | High | Poor |
| **New**: Sequential | 1-3MB each | ✅ Works | Low | Excellent |

## Benefits of New Approach

1. **✅ Nginx Compatibility**: Small payloads don't exceed `client_max_body_size`
2. **✅ Better Error Handling**: Failed images don't affect others
3. **✅ Progress Tracking**: Real-time upload progress
4. **✅ Memory Efficient**: One image in memory at a time
5. **✅ Scalable**: Works with any number of load balancer nodes
6. **✅ Resilient**: Partial uploads possible if some images fail

## Testing Your Configuration

1. **Test single image upload**:
   ```bash
   curl -X POST -F "image=@test.jpg" https://lb.dallytech.com/api/uploads-optimized/station-image-single
   ```

2. **Monitor Nginx logs**:
   ```bash
   tail -f /var/log/nginx/access.log | grep "uploads-optimized"
   ```

3. **Check for 413 errors**:
   ```bash
   grep "413" /var/log/nginx/error.log
   ```

## Troubleshooting

- **Still getting 413 errors**: Increase `client_max_body_size` to 10M
- **Timeouts**: Increase `client_body_timeout` and proxy timeouts
- **Load balancing issues**: Use `least_conn` method for upload distribution
- **Memory issues**: Ensure `proxy_request_buffering off`

The new sequential upload approach eliminates the 413 Content Too Large errors while providing better user experience and system reliability!
