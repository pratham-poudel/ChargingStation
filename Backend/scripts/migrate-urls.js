const mongoose = require('mongoose');
const ChargingStation = require('../models/ChargingStation');
require('dotenv').config();

async function migrateUrls() {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');

    // Get all stations
    const stations = await ChargingStation.find({});
    console.log(`Found ${stations.length} stations`);

    let updated = 0;
    let errors = 0;

    for (const station of stations) {
      try {
        let stationUpdated = false;

        // Update station images URLs
        for (const image of station.images) {
          if (image.objectName && image.url && 
              (image.url.includes('X-Amz-Signature') || image.url.includes('9000/mybucket'))) {
            // This is an old presigned URL or direct MinIO URL, update it
            const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
            const oldUrl = image.url;
            image.url = `${backendUrl}/api/files/${image.objectName}`;
            console.log(`Updated image URL: ${oldUrl} -> ${image.url}`);
            stationUpdated = true;
          }
        }

        // Update station master photo URL
        if (station.stationMaster && station.stationMaster.photo && 
            station.stationMaster.photo.objectName && 
            station.stationMaster.photo.url && 
            (station.stationMaster.photo.url.includes('X-Amz-Signature') || 
             station.stationMaster.photo.url.includes('9000/mybucket'))) {
          const backendUrl = process.env.BACKEND_URL || `http://localhost:${process.env.PORT || 5000}`;
          const oldUrl = station.stationMaster.photo.url;
          station.stationMaster.photo.url = `${backendUrl}/api/files/${station.stationMaster.photo.objectName}`;
          console.log(`Updated station master photo URL: ${oldUrl} -> ${station.stationMaster.photo.url}`);
          stationUpdated = true;
        }

        if (stationUpdated) {
          await station.save();
          updated++;
          console.log(`✅ Updated station: ${station.name}`);
        }
      } catch (stationError) {
        console.error(`❌ Error updating station ${station._id}:`, stationError);
        errors++;
      }
    }

    console.log('\n🎉 Migration completed!');
    console.log(`📊 Results:`);
    console.log(`  • Total stations: ${stations.length}`);
    console.log(`  • Stations updated: ${updated}`);
    console.log(`  • Errors: ${errors}`);

    await mongoose.connection.close();
    console.log('✅ Database connection closed');

  } catch (error) {
    console.error('❌ Migration error:', error);
    process.exit(1);
  }
}

// Run the migration
migrateUrls(); 