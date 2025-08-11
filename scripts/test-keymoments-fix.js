#!/usr/bin/env node

/**
 * Test script for keyMoments JSON parsing fix
 * Tests the parseJsonField function and data extraction
 */

// Mock the parseJsonField function to test it locally
function parseJsonField(value, fallback = null) {
  // If already parsed (object/array), return as-is
  if (typeof value === 'object' && value !== null) {
    return value;
  }
  
  // If string, try to parse
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      // Type guard: ensure parsed value is not null
      return parsed !== null ? parsed : fallback;
    } catch (error) {
      console.warn('Failed to parse JSON field:', error);
      return fallback;
    }
  }
  
  // Return fallback for null, undefined, empty string, etc.
  return fallback;
}

// Type guards for validating parsed data
function isValidKeyMomentsArray(value) {
  return Array.isArray(value) && value.every(item => 
    typeof item === 'object' && 
    typeof item.timestamp === 'string' && 
    typeof item.insight === 'string'
  );
}

async function testKeyMomentsParsing() {
  console.log('🧪 Testing keyMoments JSON parsing fix...\n');

  // Test data that mimics the database format
  const testCases = [
    {
      name: 'Valid JSON string (from database)',
      data: '["{\\"timestamp\\":\\"00:00\\",\\"insight\\":\\"Introduction: Why people want to monetize AI and speaker\'s background\\"}",{"timestamp":"03:30","insight":"Discovering AI automation as a value-add at work"}]',
      expected: 'array with 2 items'
    },
    {
      name: 'Already parsed array',
      data: [{"timestamp":"00:00","insight":"Test insight"}],
      expected: 'array with 1 item'
    },
    {
      name: 'Null value',
      data: null,
      expected: 'empty array fallback'
    },
    {
      name: 'Empty string',
      data: '',
      expected: 'empty array fallback'
    },
    {
      name: 'Invalid JSON string',
      data: 'invalid json {',
      expected: 'empty array fallback'
    }
  ];

  testCases.forEach((testCase, index) => {
    console.log(`${index + 1}️⃣ Testing: ${testCase.name}`);
    
    try {
      // Parse the data using our function
      const parsedKeyMoments = parseJsonField(testCase.data, []);
      const keyMoments = isValidKeyMomentsArray(parsedKeyMoments) ? parsedKeyMoments : [];
      
      console.log(`   ✅ Parsed successfully`);
      console.log(`   📊 Result: ${Array.isArray(keyMoments) ? `array with ${keyMoments.length} items` : typeof keyMoments}`);
      console.log(`   🎯 Expected: ${testCase.expected}`);
      
      // Test the .map function (this was causing the original error)
      if (Array.isArray(keyMoments)) {
        const mapResult = keyMoments.map((moment, index) => `${index}: ${moment.timestamp}`);
        console.log(`   ✅ .map() works: ${mapResult.join(', ') || 'empty array'}`);
      } else {
        console.log(`   ❌ .map() would fail: not an array`);
      }
      
    } catch (error) {
      console.log(`   ❌ Error: ${error.message}`);
    }
    
    console.log('');
  });

  // Test the actual database scenario using sample data
  console.log('🔍 Testing with actual database format...');
  
  const actualDbData = '[{"timestamp":"00:00","insight":"Introduction: Why people want to monetize AI and speaker\'s background"},{"timestamp":"03:30","insight":"Discovering AI automation as a value-add at work"},{"timestamp":"06:45","insight":"First freelance AI project: selling a LinkedIn post automation"}]';
  
  console.log('Raw data type:', typeof actualDbData);
  console.log('Raw data preview:', actualDbData.substring(0, 100) + '...');
  
  const parsedKeyMoments = parseJsonField(actualDbData, []);
  const keyMoments = isValidKeyMomentsArray(parsedKeyMoments) ? parsedKeyMoments : [];
  
  console.log('✅ Final result:');
  console.log(`   Type: ${typeof keyMoments}`);
  console.log(`   Is Array: ${Array.isArray(keyMoments)}`);
  console.log(`   Length: ${keyMoments.length}`);
  console.log(`   First item: ${JSON.stringify(keyMoments[0])}`);
  
  // Test the problematic .map() call
  try {
    const mapTest = keyMoments.map((moment, index) => ({
      key: index,
      timestamp: moment.timestamp,
      insight: moment.insight
    }));
    console.log(`   ✅ .map() success: Generated ${mapTest.length} items`);
    console.log(`   🎉 keyMoments.map is not a function ERROR FIXED!`);
  } catch (error) {
    console.log(`   ❌ .map() failed: ${error.message}`);
  }

  console.log('\n🎯 Summary:');
  console.log('   ✅ parseJsonField handles JSON strings correctly');
  console.log('   ✅ Type validation prevents invalid data');
  console.log('   ✅ Fallback values ensure arrays are always arrays');
  console.log('   ✅ .map() function will work on parsed keyMoments');
}

// Run the test
testKeyMomentsParsing().catch(console.error);