// Debug test for document upload flow
// Copy this into browser console after opening the merchant dashboard

console.log('🔍 Testing Document Upload Flow with Debug Logs...\n');

// Function to test the complete upload flow
async function testDocumentUploadFlow() {
  try {
    // Check if we're in the right context
    if (typeof merchantAPI === 'undefined') {
      console.log('⚠️ merchantAPI not available. Make sure you\'re on the merchant dashboard page.');
      return;
    }

    // Create a test file
    const testContent = 'Test document content for upload flow testing';
    const testFile = new File([testContent], 'test-business-cert.pdf', {
      type: 'application/pdf'
    });

    console.log('📄 Created test file:', {
      name: testFile.name,
      size: testFile.size,
      type: testFile.type
    });

    // Test the merchantAPI directly
    console.log('\n🧪 Testing merchantAPI.uploadDocument directly...');
    const result = await merchantAPI.uploadDocument(testFile, 'businessRegistrationCertificate');
    
    console.log('📊 Final result:', result);
    
    if (result && result.success) {
      console.log('✅ SUCCESS: Document upload completed successfully!');
      console.log('📋 Document info:', result.data.document);
      console.log('👤 Vendor status:', result.data.vendor.verificationStatus);
    } else {
      console.log('❌ FAILED: Upload did not succeed');
      console.log('📋 Error details:', result);
    }

  } catch (error) {
    console.error('🚨 ERROR in test:', error);
    console.error('📋 Error details:', {
      message: error.message,
      response: error.response?.data,
      status: error.response?.status
    });
  }
}

// Run the test
testDocumentUploadFlow();

console.log('\n📋 Debug Flow Status:');
console.log('- Testing: ✅ merchantAPI.uploadDocument() direct call');
console.log('- Logging: ✅ Full request/response chain');
console.log('- File type: ✅ PDF test file');
console.log('- Document type: ✅ businessRegistrationCertificate');
