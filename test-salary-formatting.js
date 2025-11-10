const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// Test salary formatting
const testSalaryFormatting = async () => {
  try {
    console.log('💰 Testing salary formatting...');
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Import the Job model
    const Job = require('./models/job');
    console.log('✅ Job model imported');
    
    // Test different salary scenarios
    console.log('\n📊 Testing different salary formats...');
    
    // Test 1: 100k to 1000k (monthly)
    const testJob1 = {
      title: 'Test Job 1 - 100k to 1000k Monthly',
      shortDescription: 'Testing salary formatting',
      fullDescription: 'Test description',
      requirements: ['Test'],
      responsibilities: ['Test'],
      benefits: ['Test'],
      experience: 'Entry Level',
      location: 'Surat',
      department: 'Engineering',
      employmentType: 'Full-time',
      isActive: true,
      salary: {
        min: 100000,  // 100k
        max: 1000000, // 1000k
        currency: 'INR',
        period: 'monthly'
      }
    };
    
    const job1 = await Job.create(testJob1);
    console.log('✅ Test Job 1 created');
    console.log('💰 Salary Range:', job1.salaryRange);
    console.log('📝 Raw salary data:', job1.salary);
    
    // Test 2: 100k to 1000k (yearly)
    const testJob2 = {
      title: 'Test Job 2 - 100k to 1000k Yearly',
      shortDescription: 'Testing salary formatting',
      fullDescription: 'Test description',
      requirements: ['Test'],
      responsibilities: ['Test'],
      benefits: ['Test'],
      experience: 'Entry Level',
      location: 'Surat',
      department: 'Engineering',
      employmentType: 'Full-time',
      isActive: true,
      salary: {
        min: 100000,  // 100k yearly
        max: 1000000, // 1000k yearly
        currency: 'INR',
        period: 'yearly'
      }
    };
    
    const job2 = await Job.create(testJob2);
    console.log('✅ Test Job 2 created');
    console.log('💰 Salary Range:', job2.salaryRange);
    console.log('📝 Raw salary data:', job2.salary);
    
    // Test 3: Small amounts
    const testJob3 = {
      title: 'Test Job 3 - Small amounts',
      shortDescription: 'Testing salary formatting',
      fullDescription: 'Test description',
      requirements: ['Test'],
      responsibilities: ['Test'],
      benefits: ['Test'],
      experience: 'Entry Level',
      location: 'Surat',
      department: 'Engineering',
      employmentType: 'Full-time',
      isActive: true,
      salary: {
        min: 5000,   // 5k monthly
        max: 15000,  // 15k monthly
        currency: 'INR',
        period: 'monthly'
      }
    };
    
    const job3 = await Job.create(testJob3);
    console.log('✅ Test Job 3 created');
    console.log('💰 Salary Range:', job3.salaryRange);
    console.log('📝 Raw salary data:', job3.salary);
    
    // Test 4: String values (this might be your issue)
    const testJob4 = {
      title: 'Test Job 4 - String values (WRONG WAY)',
      shortDescription: 'Testing salary formatting',
      fullDescription: 'Test description',
      requirements: ['Test'],
      responsibilities: ['Test'],
      benefits: ['Test'],
      experience: 'Entry Level',
      location: 'Surat',
      department: 'Engineering',
      employmentType: 'Full-time',
      isActive: true,
      salary: {
        min: "100k",  // String - WRONG!
        max: "1000k", // String - WRONG!
        currency: 'INR',
        period: 'monthly'
      }
    };
    
    const job4 = await Job.create(testJob4);
    console.log('✅ Test Job 4 created (with string values)');
    console.log('💰 Salary Range:', job4.salaryRange);
    console.log('📝 Raw salary data:', job4.salary);
    console.log('⚠️  This shows what happens when you enter "100k" instead of 100000');
    
    // Clean up test jobs
    console.log('\n🧹 Cleaning up test jobs...');
    await Job.findByIdAndDelete(job1._id);
    await Job.findByIdAndDelete(job2._id);
    await Job.findByIdAndDelete(job3._id);
    await Job.findByIdAndDelete(job4._id);
    console.log('✅ Test jobs cleaned up');
    
    console.log('\n💡 IMPORTANT: When entering salary, use NUMBERS, not strings!');
    console.log('✅ Correct: min: 100000, max: 1000000');
    console.log('❌ Wrong: min: "100k", max: "1000k"');
    console.log('✅ The system will automatically format 100000 as "100K" or "1.0L"');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the test
testSalaryFormatting();

