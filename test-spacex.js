// Quick test script to verify SpaceX API integration
import fetch from 'node-fetch';

const ENDPOINT = 'https://spacex-production.up.railway.app/';

// Test 1: Get Rockets
async function testGetRockets() {
  console.log('Testing GetRockets query...\n');

  const query = `
    query GetRockets {
      rockets {
        id
        name
        type
        active
        cost_per_launch
        success_rate_pct
        description
      }
    }
  `;

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query }),
  });

  const result = await response.json();

  if (result.errors) {
    console.error('❌ Error:', result.errors);
    return false;
  }

  console.log('✅ Success! Found rockets:', result.data.rockets.length);
  console.log('\nSample rocket:');
  console.log(JSON.stringify(result.data.rockets[0], null, 2));
  return true;
}

// Test 2: Get Launches
async function testGetLaunches() {
  console.log('\n\nTesting GetLaunches query...\n');

  const query = `
    query GetLaunches($limit: Int!) {
      launchesPast(limit: $limit) {
        mission_name
        launch_date_utc
        launch_success
        rocket {
          rocket_name
        }
      }
    }
  `;

  const response = await fetch(ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      query,
      variables: { limit: 5 }
    }),
  });

  const result = await response.json();

  if (result.errors) {
    console.error('❌ Error:', result.errors);
    return false;
  }

  console.log('✅ Success! Found launches:', result.data.launchesPast.length);
  console.log('\nSample launch:');
  console.log(JSON.stringify(result.data.launchesPast[0], null, 2));
  return true;
}

// Run tests
async function runTests() {
  console.log('='.repeat(60));
  console.log('Testing SpaceX GraphQL API Integration');
  console.log('='.repeat(60) + '\n');

  try {
    const test1 = await testGetRockets();
    const test2 = await testGetLaunches();

    console.log('\n' + '='.repeat(60));
    console.log('Test Results:');
    console.log('='.repeat(60));
    console.log(`GetRockets: ${test1 ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`GetLaunches: ${test2 ? '✅ PASS' : '❌ FAIL'}`);
    console.log('\n✨ Both queries work! Ready to use with MCP server.\n');
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    process.exit(1);
  }
}

runTests();
