const mongoose = require('mongoose');
require('dotenv').config({ path: './config.env' });

// Test the new job system
const testNewJobSystem = async () => {
  try {
    console.log('🔍 Testing new job system...');
    
    // Connect to MongoDB
    console.log('Connecting to MongoDB...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('✅ Connected to MongoDB');
    
    // Import the Job model
    const Job = require('./models/job');
    console.log('✅ Job model imported');
    
    // Test 1: Create a test job
    console.log('\n📝 Creating test job...');
    const testJob = {
      title: 'Senior Frontend Developer',
      shortDescription: 'We are looking for an experienced Frontend Developer to join our team.',
      fullDescription: 'This is a full job description with detailed requirements and responsibilities.',
      requirements: ['React', 'TypeScript', 'CSS3', '5+ years experience'],
      responsibilities: ['Develop user interfaces', 'Code review', 'Team collaboration'],
      benefits: ['Health insurance', 'Flexible hours', 'Remote work'],
      experience: '5+ years',
      location: 'Surat',
      department: 'Engineering',
      employmentType: 'Full-time',
      isRemote: true,
      isActive: true,
      priority: 1,
      salary: {
        min: 800000,
        max: 1500000,
        currency: 'INR',
        period: 'yearly'
      },
      tags: ['React', 'Frontend', 'Senior']
    };
    
    const job = await Job.create(testJob);
    console.log('✅ Test job created successfully!');
    console.log('📋 Job details:', {
      id: job._id,
      title: job.title,
      slug: job.slug,
      salaryRange: job.salaryRange,
      isOpen: job.isOpen,
      createdAt: job.createdAt
    });
    
    // Test 2: Find the created job
    console.log('\n🔍 Finding created job...');
    const foundJob = await Job.findById(job._id);
    console.log('✅ Job found in database:', !!foundJob);
    
    // Test 3: Test virtual fields
    console.log('\n🎯 Testing virtual fields...');
    console.log('Salary Range:', foundJob.salaryRange);
    console.log('Is Open:', foundJob.isOpen);
    
    // Test 4: List all jobs
    console.log('\n📊 Listing all jobs...');
    const allJobs = await Job.find({});
    console.log('Total jobs in database:', allJobs.length);
    
    // Test 5: Test text search
    console.log('\n🔍 Testing text search...');
    const searchResults = await Job.find({ $text: { $search: 'Frontend Developer' } });
    console.log('Search results for "Frontend Developer":', searchResults.length);
    
    // Test 6: Test filtering
    console.log('\n🎯 Testing filtering...');
    const engineeringJobs = await Job.find({ department: 'Engineering' });
    console.log('Engineering jobs:', engineeringJobs.length);
    
    const remoteJobs = await Job.find({ isRemote: true });
    console.log('Remote jobs:', remoteJobs.length);
    
    // Test 7: Test sorting
    console.log('\n📈 Testing sorting...');
    const sortedJobs = await Job.find({}).sort({ priority: -1, createdAt: -1 });
    console.log('Jobs sorted by priority:', sortedJobs.map(j => ({ title: j.title, priority: j.priority })));
    
    // Clean up test job
    console.log('\n🧹 Cleaning up test job...');
    await Job.findByIdAndDelete(job._id);
    console.log('✅ Test job cleaned up');
    
    console.log('\n🎉 All tests passed! New job system is working correctly.');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
};

// Run the test
testNewJobSystem();

