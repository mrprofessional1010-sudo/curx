// Using native fetch

async function testLiveServer() {
  console.log('Testing live Next.js App API endpoint: http://localhost:3000/api/pipeline/status ...');
  const start = Date.now();
  try {
    const res = await fetch('http://localhost:3000/api/pipeline/status');
    const latency = Date.now() - start;
    console.log(`Status: ${res.status} ${res.statusText} (${latency}ms)`);
    const data = await res.json();
    console.log('Response:', JSON.stringify(data, null, 2));
  } catch (err) {
    console.error('Error fetching live server:', err.message);
  }
}

testLiveServer();
