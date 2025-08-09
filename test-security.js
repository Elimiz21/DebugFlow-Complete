#!/usr/bin/env node

// Test script for Phase 2 security improvements
import axios from 'axios';

const BASE_URL = process.env.API_URL || 'http://localhost:5173/api';

const tests = {
  // Test CORS
  async testCORS() {
    console.log('\n🔍 Testing CORS...');
    try {
      const response = await axios.get(`${BASE_URL}/health`, {
        headers: {
          'Origin': 'http://malicious-site.com'
        }
      });
      console.log('❌ CORS should block malicious origins');
    } catch (error) {
      if (error.message.includes('CORS')) {
        console.log('✅ CORS blocking works');
      } else {
        console.log('⚠️ CORS test inconclusive:', error.message);
      }
    }
  },

  // Test rate limiting
  async testRateLimiting() {
    console.log('\n🔍 Testing Rate Limiting...');
    const promises = [];
    
    // Try to make 10 rapid login attempts
    for (let i = 0; i < 10; i++) {
      promises.push(
        axios.post(`${BASE_URL}/auth?action=login`, {
          email: 'test@test.com',
          password: 'wrongpassword'
        }).catch(err => err.response)
      );
    }
    
    const responses = await Promise.all(promises);
    const rateLimited = responses.filter(r => r && r.status === 429);
    
    if (rateLimited.length > 0) {
      console.log(`✅ Rate limiting works (${rateLimited.length} requests blocked)`);
    } else {
      console.log('❌ Rate limiting not working');
    }
  },

  // Test input validation
  async testInputValidation() {
    console.log('\n🔍 Testing Input Validation...');
    
    // Test XSS attempt
    try {
      await axios.post(`${BASE_URL}/auth?action=register`, {
        name: '<script>alert("XSS")</script>',
        email: 'not-an-email',
        password: '123' // Too short
      });
      console.log('❌ Input validation should reject invalid data');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ Input validation works');
      } else {
        console.log('⚠️ Input validation test error:', error.message);
      }
    }
  },

  // Test SQL injection prevention
  async testSQLInjection() {
    console.log('\n🔍 Testing SQL Injection Prevention...');
    
    try {
      await axios.post(`${BASE_URL}/auth?action=login`, {
        email: "admin' OR '1'='1",
        password: "'; DROP TABLE users; --"
      });
      console.log('⚠️ SQL injection attempt processed (check if blocked properly)');
    } catch (error) {
      if (error.response && error.response.status === 401) {
        console.log('✅ SQL injection prevented');
      } else {
        console.log('⚠️ SQL injection test error:', error.message);
      }
    }
  },

  // Test error handling
  async testErrorHandling() {
    console.log('\n🔍 Testing Error Handling...');
    
    try {
      await axios.get(`${BASE_URL}/nonexistent-endpoint`);
      console.log('❌ 404 handler should trigger');
    } catch (error) {
      if (error.response && error.response.status === 404) {
        console.log('✅ 404 error handling works');
      } else {
        console.log('⚠️ Error handling test error:', error.message);
      }
    }
  },

  // Test file upload security
  async testFileUploadSecurity() {
    console.log('\n🔍 Testing File Upload Security...');
    
    const FormData = (await import('form-data')).default;
    const formData = new FormData();
    
    // Try to upload a dangerous file type
    formData.append('files', Buffer.from('<?php system($_GET["cmd"]); ?>'), {
      filename: 'shell.php',
      contentType: 'application/x-php'
    });
    formData.append('projectName', 'Test Project');
    formData.append('projectType', 'web-app');
    
    try {
      await axios.post(`${BASE_URL}/upload`, formData, {
        headers: {
          ...formData.getHeaders(),
          'Authorization': 'Bearer mock-jwt-token-for-development'
        }
      });
      console.log('❌ Should reject dangerous file types');
    } catch (error) {
      if (error.response && error.response.status === 400) {
        console.log('✅ File upload validation works');
      } else {
        console.log('⚠️ File upload test error:', error.message);
      }
    }
  },

  // Test security headers
  async testSecurityHeaders() {
    console.log('\n🔍 Testing Security Headers...');
    
    try {
      const response = await axios.get(`${BASE_URL}/health`);
      const headers = response.headers;
      
      const securityHeaders = [
        'x-content-type-options',
        'x-frame-options',
        'x-xss-protection',
        'referrer-policy'
      ];
      
      const present = securityHeaders.filter(h => headers[h]);
      
      if (present.length === securityHeaders.length) {
        console.log('✅ All security headers present');
      } else {
        console.log(`⚠️ Only ${present.length}/${securityHeaders.length} security headers present`);
      }
    } catch (error) {
      console.log('❌ Security headers test error:', error.message);
    }
  }
};

// Run all tests
async function runTests() {
  console.log('🚀 Starting Security Tests for DebugFlow Phase 2\n');
  console.log(`Testing against: ${BASE_URL}\n`);
  
  for (const [name, test] of Object.entries(tests)) {
    try {
      await test();
    } catch (error) {
      console.log(`❌ Test ${name} failed:`, error.message);
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log('\n✨ Security tests completed!\n');
}

// Run tests
runTests().catch(console.error);