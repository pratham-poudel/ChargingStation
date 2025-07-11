// Test script for optimized sequential station image uploads
// Run this in browser console to test the new sequential upload system

console.log('🔍 Testing Optimized Sequential Station Image Upload...\n');

// Function to create test image files
function createTestImageFiles(count = 3) {
  const files = [];
  
  for (let i = 1; i <= count; i++) {
    // Create a small test image (canvas to blob)
    const canvas = document.createElement('canvas');
    canvas.width = 100;
    canvas.height = 100;
    const ctx = canvas.getContext('2d');
    
    // Draw different colored rectangles
    const colors = ['#FF0000', '#00FF00', '#0000FF', '#FFFF00', '#FF00FF'];
    ctx.fillStyle = colors[i % colors.length];
    ctx.fillRect(0, 0, 100, 100);
    
    // Add text
    ctx.fillStyle = '#FFFFFF';
    ctx.font = '16px Arial';
    ctx.fillText(`Image ${i}`, 20, 50);
    
    // Convert to blob and then to file
    canvas.toBlob((blob) => {
      const file = new File([blob], `test-station-image-${i}.png`, {
        type: 'image/png'
      });
      files.push(file);
    }, 'image/png');
  }
  
  return new Promise(resolve => {
    setTimeout(() => resolve(files), 100); // Wait for blob conversion
  });
}

// Test function
async function testSequentialUpload() {
  try {
    // Check if optimizedUploadAPI is available
    if (typeof optimizedUploadAPI === 'undefined') {
      console.log('⚠️ optimizedUploadAPI not available. Make sure you\'re on a page that imports it.');
      return;
    }

    console.log('📄 Creating test image files...');
    const testFiles = await createTestImageFiles(3);
    
    console.log(`📊 Created ${testFiles.length} test files:`, testFiles.map(f => ({ name: f.name, size: f.size })));
    
    // Progress callback
    const progressCallback = (progress) => {
      console.log(`📈 Progress: ${progress.current}/${progress.total} - ${progress.filename} (${progress.status})`);
      if (progress.error) {
        console.error(`❌ Error: ${progress.error}`);
      }
    };
    
    console.log('\n🚀 Starting sequential upload test...');
    const startTime = Date.now();
    
    const result = await optimizedUploadAPI.uploadStationImages(testFiles, progressCallback);
    
    const endTime = Date.now();
    const duration = (endTime - startTime) / 1000;
    
    console.log(`\n📊 Upload Test Results (${duration.toFixed(2)}s):`);
    console.log('✅ Success:', result.success);
    console.log('📤 Uploaded:', result.uploaded);
    console.log('❌ Failed:', result.failed);
    console.log('📊 Total:', result.total);
    
    if (result.success) {
      console.log('\n🎉 SUCCESS: All images uploaded successfully!');
      console.log('📋 Uploaded images:', result.images.map(img => ({
        url: img.url,
        originalName: img.originalName,
        size: img.size
      })));
    } else {
      console.log('\n⚠️ PARTIAL SUCCESS: Some images failed');
      console.log('❌ Errors:', result.errors);
    }
    
    console.log('\n💡 Benefits of Sequential Upload:');
    console.log('- ✅ No 413 Content Too Large errors');
    console.log('- ✅ Works with Nginx load balancers');
    console.log('- ✅ Better error handling per image');
    console.log('- ✅ Progress tracking');
    console.log('- ✅ Memory efficient');
    
  } catch (error) {
    console.error('🚨 Test failed:', error);
    console.error('📋 Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
  }
}

// Run the test
testSequentialUpload();

console.log('\n📋 Test Configuration:');
console.log('- Method: Sequential single-image uploads');
console.log('- Endpoint: /api/uploads-optimized/station-image-single');
console.log('- Payload: Small individual requests');
console.log('- Progress: Real-time feedback');
console.log('- Error handling: Per-image error isolation');
