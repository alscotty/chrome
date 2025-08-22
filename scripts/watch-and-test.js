#!/usr/bin/env node

const { spawn } = require('child_process');
const chokidar = require('chokidar');
const path = require('path');
const debounce = require('lodash.debounce');

let testProcess = null;
let buildProcess = null;

// Function to kill running processes
function killProcesses() {
  if (testProcess) {
    testProcess.kill();
    testProcess = null;
  }
  if (buildProcess) {
    buildProcess.kill();
    buildProcess = null;
  }
}

// Function to build the extension
function build() {
  return new Promise((resolve, reject) => {
    console.log('🔨 Building extension...');
    buildProcess = spawn('npm', ['run', 'build'], {
      stdio: 'inherit',
      cwd: process.cwd()
    });
    
    buildProcess.on('close', (code) => {
      buildProcess = null;
      if (code === 0) {
        console.log('✅ Build completed successfully');
        resolve();
      } else {
        console.log('❌ Build failed');
        reject(new Error(`Build failed with code ${code}`));
      }
    });
  });
}

// Function to run tests
function runTests() {
  console.log('🧪 Running tests...');
  testProcess = spawn('npx', ['playwright', 'test', '--reporter=dot'], {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  testProcess.on('close', (code) => {
    testProcess = null;
    if (code === 0) {
      console.log('✅ All tests passed');
    } else {
      console.log('❌ Some tests failed');
    }
    console.log('👀 Watching for changes...\n');
  });
}

// Debounced function to rebuild and test
const rebuildAndTest = debounce(async () => {
  killProcesses();
  try {
    await build();
    runTests();
  } catch (error) {
    console.log('Build failed, skipping tests');
  }
}, 1000);

// Initial build and test
console.log('🚀 Starting watch mode...');
rebuildAndTest();

// Watch for file changes
const watcher = chokidar.watch(['src/**/*', 'tests/**/*'], {
  ignored: /node_modules/,
  persistent: true
});

watcher.on('change', (filepath) => {
  console.log(`📁 File changed: ${path.relative(process.cwd(), filepath)}`);
  rebuildAndTest();
});

watcher.on('add', (filepath) => {
  console.log(`📁 File added: ${path.relative(process.cwd(), filepath)}`);
  rebuildAndTest();
});

// Graceful shutdown
process.on('SIGINT', () => {
  console.log('\n👋 Shutting down...');
  killProcesses();
  watcher.close();
  process.exit(0);
});