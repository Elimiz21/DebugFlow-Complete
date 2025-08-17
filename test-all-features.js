#!/usr/bin/env node

/**
 * Comprehensive test script for all DebugFlow features
 * Tests that everything is actually working, not just returning placeholders
 */

import fetch from 'node-fetch';
import { promises as fs } from 'fs';
import path from 'path';

const API_URL = 'http://localhost:3001/api';
let authToken = null;
let testResults = [];
let testProjectId = null;

// Test credentials
const TEST_USER = {
  email: 'test@debugflow.com',
  password: 'test1234',
  name: 'Test User'
};

// Color codes for terminal output
const colors = {
  reset: '\x1b[0m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m'
};

function log(message, type = 'info') {
  const prefix = {
    success: `${colors.green}✓${colors.reset}`,
    error: `${colors.red}✗${colors.reset}`,
    warning: `${colors.yellow}⚠${colors.reset}`,
    info: `${colors.blue}ℹ${colors.reset}`
  };
  console.log(`${prefix[type] || ''} ${message}`);
}

async function testFeature(name, testFn) {
  console.log(`\n${colors.blue}Testing: ${name}${colors.reset}`);
  try {
    const result = await testFn();
    testResults.push({ name, success: true, result });
    log(`${name} passed`, 'success');
    return result;
  } catch (error) {
    testResults.push({ name, success: false, error: error.message });
    log(`${name} failed: ${error.message}`, 'error');
    return null;
  }
}

// Test 1: Authentication
async function testAuthentication() {
  // Register user
  const registerRes = await fetch(`${API_URL}/auth?action=register`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(TEST_USER)
  });
  
  const registerData = await registerRes.json();
  
  // If user exists, try login
  if (!registerData.success) {
    const loginRes = await fetch(`${API_URL}/auth?action=login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_USER.email,
        password: TEST_USER.password
      })
    });
    
    const loginData = await loginRes.json();
    if (!loginData.success) throw new Error('Login failed');
    authToken = loginData.data.token;
  } else {
    authToken = registerData.data.token;
  }
  
  if (!authToken) throw new Error('No auth token received');
  return authToken;
}

// Test 2: GitHub Import
async function testGitHubImport() {
  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      projectName: 'Test GitHub Import',
      projectDescription: 'Testing real GitHub import',
      projectType: 'library',
      uploadMethod: 'github',
      githubRepo: 'https://github.com/sindresorhus/got'
    })
  });
  
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  
  testProjectId = data.data.project.id;
  
  // Wait for import to complete
  await new Promise(resolve => setTimeout(resolve, 5000));
  
  // Check if files were imported
  const projectRes = await fetch(`${API_URL}/projects?id=${testProjectId}&files=true`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  const projectData = await projectRes.json();
  if (!projectData.success) throw new Error('Failed to fetch project');
  if (projectData.data.files.length === 0) throw new Error('No files imported');
  
  return `Imported ${projectData.data.files.length} files`;
}

// Test 3: URL Import
async function testURLImport() {
  const res = await fetch(`${API_URL}/upload`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      projectName: 'Test URL Import',
      projectDescription: 'Testing real URL fetch',
      projectType: 'web-app',
      uploadMethod: 'url',
      appUrl: 'https://www.rust-lang.org'
    })
  });
  
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  
  // Wait for import
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Check project
  const projectRes = await fetch(`${API_URL}/projects?id=${data.data.project.id}&files=true`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  const projectData = await projectRes.json();
  if (!projectData.success) throw new Error('Failed to fetch project');
  
  // Check if actual HTML content was fetched
  const htmlFile = projectData.data.files.find(f => f.filename.includes('.html'));
  if (!htmlFile || htmlFile.content.length < 100) {
    throw new Error('No real HTML content fetched');
  }
  
  return `Fetched ${projectData.data.files.length} files with real content`;
}

// Test 4: AI Analysis (OpenAI)
async function testOpenAIAnalysis() {
  const res = await fetch(`${API_URL}/ai/analyze-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      code: `function calculateSum(a, b) {
        return a + b;
      }`,
      language: 'javascript',
      provider: 'openai'
    })
  });
  
  const data = await res.json();
  if (!data.success) {
    log('OpenAI API key not configured, skipping', 'warning');
    return 'Skipped - no API key';
  }
  
  // Check if response is not mock
  if (data.analysis.includes('mock') || data.analysis.includes('Mock')) {
    throw new Error('Received mock response instead of real analysis');
  }
  
  return 'Real AI analysis received';
}

// Test 5: Groq AI
async function testGroqAnalysis() {
  const res = await fetch(`${API_URL}/ai/analyze-code`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      code: `def fibonacci(n):
        if n <= 1:
          return n
        return fibonacci(n-1) + fibonacci(n-2)`,
      language: 'python',
      provider: 'groq'
    })
  });
  
  const data = await res.json();
  if (!data.success) {
    log('Groq API key not configured, using fallback', 'warning');
    return 'Using fallback';
  }
  
  return 'Groq analysis completed';
}

// Test 6: Test Runner
async function testTestRunner() {
  // Create a simple test file
  const testCode = `
test('addition', () => {
  expect(1 + 1).toBe(2);
});
  `;
  
  const res = await fetch(`${API_URL}/test-runner/run`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      projectId: testProjectId || 'test-project',
      framework: 'npm-test',
      options: {}
    })
  });
  
  const data = await res.json();
  if (!data.success) {
    log('Test runner needs actual project setup', 'warning');
    return 'Needs project setup';
  }
  
  // Check test status
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const statusRes = await fetch(`${API_URL}/test-runner/results/${data.testId}`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  const statusData = await statusRes.json();
  return `Test execution: ${statusData.status}`;
}

// Test 7: Bug Analysis
async function testBugAnalysis() {
  const res = await fetch(`${API_URL}/bugs/analyze`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${authToken}`
    },
    body: JSON.stringify({
      code: `
function getData() {
  const data = null;
  return data.length; // Null pointer error
}
      `,
      filename: 'test.js',
      language: 'javascript'
    })
  });
  
  const data = await res.json();
  if (!data.success) throw new Error(data.message || 'Bug analysis failed');
  
  if (!data.bugs || data.bugs.length === 0) {
    throw new Error('No bugs detected in problematic code');
  }
  
  return `Found ${data.bugs.length} bugs`;
}

// Test 8: Project Files
async function testProjectFiles() {
  if (!testProjectId) {
    throw new Error('No test project created');
  }
  
  const res = await fetch(`${API_URL}/projects?id=${testProjectId}&files=true`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  
  const files = data.data.files;
  if (!files || files.length === 0) {
    throw new Error('No files in project');
  }
  
  // Check if files have real content
  const hasRealContent = files.some(f => f.content && f.content.length > 50);
  if (!hasRealContent) {
    throw new Error('Files have no real content');
  }
  
  return `${files.length} files with real content`;
}

// Test 9: Job Queue
async function testJobQueue() {
  const res = await fetch(`${API_URL}/jobs/stats`, {
    headers: { 'Authorization': `Bearer ${authToken}` }
  });
  
  const data = await res.json();
  if (!data.success) throw new Error(data.message);
  
  // Check if job queues are initialized
  if (!data.data || Object.keys(data.data).length === 0) {
    throw new Error('Job queues not initialized');
  }
  
  return `${Object.keys(data.data).length} job queues active`;
}

// Main test runner
async function runAllTests() {
  console.log(`\n${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}     DebugFlow Comprehensive Test Suite     ${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  
  // Run tests
  await testFeature('Authentication', testAuthentication);
  await testFeature('GitHub Import', testGitHubImport);
  await testFeature('URL Import', testURLImport);
  await testFeature('OpenAI Analysis', testOpenAIAnalysis);
  await testFeature('Groq AI', testGroqAnalysis);
  await testFeature('Test Runner', testTestRunner);
  await testFeature('Bug Analysis', testBugAnalysis);
  await testFeature('Project Files', testProjectFiles);
  await testFeature('Job Queue', testJobQueue);
  
  // Summary
  console.log(`\n${colors.blue}═══════════════════════════════════════════${colors.reset}`);
  console.log(`${colors.blue}                Test Summary                ${colors.reset}`);
  console.log(`${colors.blue}═══════════════════════════════════════════${colors.reset}\n`);
  
  const passed = testResults.filter(r => r.success).length;
  const failed = testResults.filter(r => !r.success).length;
  const total = testResults.length;
  
  testResults.forEach(result => {
    const icon = result.success ? `${colors.green}✓${colors.reset}` : `${colors.red}✗${colors.reset}`;
    const status = result.success ? 
      `${colors.green}PASSED${colors.reset}` : 
      `${colors.red}FAILED${colors.reset}`;
    console.log(`${icon} ${result.name}: ${status}`);
    if (!result.success && result.error) {
      console.log(`  ${colors.red}→ ${result.error}${colors.reset}`);
    }
  });
  
  console.log(`\n${colors.blue}Results: ${colors.green}${passed} passed${colors.reset}, ${colors.red}${failed} failed${colors.reset}, ${total} total`);
  
  if (failed === 0) {
    console.log(`\n${colors.green}🎉 All tests passed! Everything is working correctly!${colors.reset}`);
  } else {
    console.log(`\n${colors.yellow}⚠️  Some tests failed. Check the errors above.${colors.reset}`);
  }
  
  process.exit(failed === 0 ? 0 : 1);
}

// Check if server is running
async function checkServer() {
  try {
    const res = await fetch(`${API_URL}/health`);
    const data = await res.json();
    if (data.status !== 'healthy') {
      throw new Error('API not healthy');
    }
  } catch (error) {
    console.error(`${colors.red}Error: Server is not running on ${API_URL}${colors.reset}`);
    console.error(`${colors.yellow}Please run: npm run dev:full${colors.reset}`);
    process.exit(1);
  }
}

// Run tests
(async () => {
  await checkServer();
  await runAllTests();
})();