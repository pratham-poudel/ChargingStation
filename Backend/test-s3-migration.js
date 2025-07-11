#!/usr/bin/env node

/**
 * Test script to verify S3 SDK migration
 * This script tests the basic functionality of the migrated S3 service
 */

require('dotenv').config();
const { connectMinIO, uploadFile, getFolders, listFiles, getFileUrl, fileExists } = require('./config/minio');

async function testS3Migration() {
  console.log('🚀 Testing S3 SDK Migration...\n');
  
  try {
    // Step 1: Connect to S3-compatible storage
    console.log('📡 Step 1: Connecting to S3-compatible storage...');
    await connectMinIO();
    console.log('✅ Connection successful!\n');

    // Step 2: Test upload functionality
    console.log('📤 Step 2: Testing file upload...');
    const testData = Buffer.from('Hello World! This is a test file for S3 migration.', 'utf8');
    const uploadResult = await uploadFile(
      testData,
      'test-migration.txt',
      'Uploads',
      'text/plain'
    );
    console.log('✅ Upload successful!');
    console.log('   Object Name:', uploadResult.objectName);
    console.log('   URL:', uploadResult.url);
    console.log('   Size:', uploadResult.size, 'bytes\n');

    // Step 3: Test file existence check
    console.log('🔍 Step 3: Testing file existence check...');
    const exists = await fileExists(uploadResult.objectName);
    console.log('✅ File exists:', exists ? 'Yes' : 'No');
    if (!exists) {
      throw new Error('File should exist after upload');
    }
    console.log('');

    // Step 4: Test listing files
    console.log('📋 Step 4: Testing file listing...');
    const files = await listFiles('Uploads', 10);
    console.log('✅ Files listed:', files.length);
    if (files.length > 0) {
      console.log('   Sample file:', files[0].name);
    }
    console.log('');

    // Step 5: Test presigned URL generation
    console.log('🔗 Step 5: Testing presigned URL generation...');
    const presignedUrl = await getFileUrl(uploadResult.objectName, 3600);
    console.log('✅ Presigned URL generated successfully!');
    console.log('   URL length:', presignedUrl.length, 'characters');
    console.log('   URL preview:', presignedUrl.substring(0, 100) + '...\n');

    // Step 6: Test folder structure
    console.log('📁 Step 6: Testing folder structure...');
    const folders = getFolders();
    console.log('✅ Available folders:', Object.keys(folders).join(', '));
    console.log('   Folder mapping:', folders);
    console.log('');

    console.log('🎉 All tests passed! S3 SDK migration is successful!\n');
    
    // Configuration summary
    console.log('📋 Configuration Summary:');
    console.log('   Endpoint:', process.env.MINIO_ENDPOINT || '127.0.0.1');
    console.log('   Port:', process.env.MINIO_PORT || '9000');
    console.log('   Use SSL:', process.env.MINIO_USE_SSL || 'false');
    console.log('   Bucket:', process.env.MINIO_BUCKET_NAME || 'mybucket');
    console.log('   Region:', process.env.AWS_REGION || 'us-east-1');
    console.log('   Access Key:', process.env.MINIO_ACCESS_KEY ? '[SET]' : '[NOT SET]');
    console.log('   Secret Key:', process.env.MINIO_SECRET_KEY ? '[SET]' : '[NOT SET]');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('   Error details:', error);
    process.exit(1);
  }
}

// Run the test
if (require.main === module) {
  testS3Migration()
    .then(() => {
      console.log('\n✅ Test completed successfully!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Test failed:', error);
      process.exit(1);
    });
}

module.exports = { testS3Migration };
