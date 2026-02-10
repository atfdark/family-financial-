/**
 * Startup script that runs both Express backend and React frontend concurrently
 * Includes process monitoring with auto-restart, health checks, and graceful shutdown
 */
require('dotenv').config();
const { spawn } = require('child_process');
const path = require('path');
const http = require('http');

console.log('🚀 Starting Family Financial App...\n');

// Configuration
const MAX_RESTART_ATTEMPTS = 5;
const RESTART_DELAY = 3000; // 3 seconds
const SHUTDOWN_TIMEOUT = 10000; // 10 seconds
const HEALTH_CHECK_INTERVAL = 30000; // 30 seconds
const BACKEND_PORT = process.env.PORT || 8000;
const FRONTEND_PORT = 3000;

// Process state tracking
const processes = {
  backend: {
    process: null,
    name: 'Backend',
    command: 'node',
    args: ['server.js'],
    cwd: process.cwd(),
    restartCount: 0,
    isRestarting: false,
    isHealthy: false,
    healthUrl: `http://localhost:${BACKEND_PORT}/api/health`
  },
  frontend: {
    process: null,
    name: 'Frontend',
    command: 'npm',
    args: ['start'],
    cwd: path.join(process.cwd(), 'react-frontend'),
    restartCount: 0,
    isRestarting: false,
    isHealthy: false
  }
};

let isShuttingDown = false;

// Validate environment configuration
function validateEnvironment() {
  console.log('🔍 Validating environment configuration...');
  
  const requiredVars = ['PORT', 'NODE_ENV'];
  const missingVars = requiredVars.filter(varName => !process.env[varName]);
  
  if (missingVars.length > 0) {
    console.error('❌ Missing required environment variables:', missingVars.join(', '));
    console.error('Please create a .env file with these variables.');
    return false;
  }
  
  console.log('✅ Environment configuration validated');
  return true;
}

// Check if port is already in use
function isPortInUse(port) {
  return new Promise((resolve) => {
    const server = http.createServer();
    
    server.once('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        resolve(true);
      } else {
        resolve(false);
      }
      server.close();
    });
    
    server.once('listening', () => {
      server.close();
      resolve(false);
    });
    
    server.listen(port, 'localhost');
  });
}

// Check process health
async function checkHealth(processKey) {
  const config = processes[processKey];
  
  if (processKey === 'backend') {
    try {
      const response = await fetch(config.healthUrl);
      if (response.ok) {
        config.isHealthy = true;
        console.log(`✅ ${config.name} health check passed`);
        return true;
      }
    } catch (error) {
      config.isHealthy = false;
      console.log(`⚠️  ${config.name} health check failed:`, error.message);
      return false;
    }
  }
  
  // For frontend, just check if process is running
  config.isHealthy = config.process && !config.process.killed;
  return config.isHealthy;
}

// Start a process with monitoring
function startProcess(processKey) {
  const config = processes[processKey];
  
  if (isShuttingDown) {
    console.log(`⚠️  Shutdown in progress, skipping ${config.name} start`);
    return;
  }

  console.log(`🔄 Starting ${config.name}...`);
  
  // Set environment variables
  const env = { ...process.env };
  
  // Set specific port for each service
  if (processKey === 'backend') {
    env.PORT = BACKEND_PORT;
  } else if (processKey === 'frontend') {
    // For React scripts, PORT env var overrides the default port 3000
    env.PORT = FRONTEND_PORT;
  }
  
  config.process = spawn(config.command, config.args, {
    cwd: config.cwd,
    stdio: 'inherit',
    shell: true,
    env: env
  });

  // Handle process errors
  config.process.on('error', (err) => {
    console.error(`❌ Failed to start ${config.name}:`, err.message);
    
    if (!isShuttingDown && config.restartCount < MAX_RESTART_ATTEMPTS) {
      scheduleRestart(processKey);
    } else if (config.restartCount >= MAX_RESTART_ATTEMPTS) {
      console.error(`❌ ${config.name} exceeded maximum restart attempts (${MAX_RESTART_ATTEMPTS})`);
      gracefulShutdown('max-restarts');
    }
  });

  // Handle process exit
  config.process.on('close', (code) => {
    console.log(`${config.name} process exited with code ${code}`);
    config.isHealthy = false;
    
    if (!isShuttingDown && !config.isRestarting) {
      if (code !== 0 && config.restartCount < MAX_RESTART_ATTEMPTS) {
        console.log(`⚠️  ${config.name} crashed, attempting restart...`);
        scheduleRestart(processKey);
      } else if (code !== 0 && config.restartCount >= MAX_RESTART_ATTEMPTS) {
        console.error(`❌ ${config.name} exceeded maximum restart attempts (${MAX_RESTART_ATTEMPTS})`);
        gracefulShutdown('max-restarts');
      } else {
        console.log(`✅ ${config.name} shut down gracefully`);
      }
    }
  });

  // Reset restart count on successful start
  config.restartCount = 0;
  config.isRestarting = false;
}

// Schedule a process restart with delay
function scheduleRestart(processKey) {
  const config = processes[processKey];
  
  if (config.isRestarting || isShuttingDown) {
    return;
  }
  
  config.isRestarting = true;
  config.restartCount++;
  
  console.log(`⏳ Scheduling ${config.name} restart (attempt ${config.restartCount}/${MAX_RESTART_ATTEMPTS}) in ${RESTART_DELAY}ms...`);
  
  setTimeout(() => {
    if (!isShuttingDown) {
      startProcess(processKey);
    }
  }, RESTART_DELAY);
}

// Graceful shutdown with timeout
function gracefulShutdown(reason) {
  if (isShuttingDown) {
    console.log('⚠️  Shutdown already in progress');
    return;
  }
  
  isShuttingDown = true;
  console.log(`\n👋 Shutting down servers... (Reason: ${reason})`);
  
  const shutdownPromises = [];
  
  // Shutdown backend
  if (processes.backend.process && !processes.backend.process.killed) {
    shutdownPromises.push(new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⚠️  Backend shutdown timeout, forcing kill');
        processes.backend.process.kill('SIGKILL');
        resolve();
      }, SHUTDOWN_TIMEOUT);
      
      processes.backend.process.once('exit', () => {
        clearTimeout(timeout);
        console.log('✅ Backend shut down');
        resolve();
      });
      
      processes.backend.process.kill('SIGTERM');
    }));
  }
  
  // Shutdown frontend
  if (processes.frontend.process && !processes.frontend.process.killed) {
    shutdownPromises.push(new Promise((resolve) => {
      const timeout = setTimeout(() => {
        console.log('⚠️  Frontend shutdown timeout, forcing kill');
        processes.frontend.process.kill('SIGKILL');
        resolve();
      }, SHUTDOWN_TIMEOUT);
      
      processes.frontend.process.once('exit', () => {
        clearTimeout(timeout);
        console.log('✅ Frontend shut down');
        resolve();
      });
      
      processes.frontend.process.kill('SIGTERM');
    }));
  }
  
  // Wait for all processes to shut down or timeout
  Promise.all(shutdownPromises).then(() => {
    console.log('✅ All processes shut down successfully');
    process.exit(0);
  });
  
  // Force exit after total timeout
  setTimeout(() => {
    console.error('⚠️  Forced shutdown after timeout');
    process.exit(1);
  }, SHUTDOWN_TIMEOUT + 2000);
}

// Handle termination signals
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGHUP', () => gracefulShutdown('SIGHUP'));

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('❌ Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (reason, promise) => {
  console.error('❌ Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

// Main startup function
async function main() {
  // Validate environment
  if (!validateEnvironment()) {
    process.exit(1);
  }
  
  // Check port availability
  console.log(`🔍 Checking port availability (Backend: ${BACKEND_PORT}, Frontend: ${FRONTEND_PORT})...`);
  
  const backendPortInUse = await isPortInUse(BACKEND_PORT);
  if (backendPortInUse) {
    console.error(`❌ Port ${BACKEND_PORT} is already in use. Please stop the existing process or change the PORT.`);
    process.exit(1);
  }
  
  console.log('✅ Ports are available');
  
  // Start backend first (sequential startup)
  console.log('\n📦 Starting backend first...');
  startProcess('backend');
  
  // Wait for backend to be ready before starting frontend
  setTimeout(async () => {
    console.log('⏳ Waiting for backend to be ready...');
    
    // Try to connect to backend
    let backendReady = false;
    let attempts = 0;
    const maxAttempts = 30;
    
    while (!backendReady && attempts < maxAttempts) {
      try {
        const healthCheck = await fetch(`http://localhost:${BACKEND_PORT}/api/health`);
        if (healthCheck.ok) {
          backendReady = true;
          console.log('✅ Backend is ready');
          
          // Now start frontend
          console.log('\n🎨 Starting frontend...');
          startProcess('frontend');
          
          // Display startup information
          setTimeout(() => {
            console.log('\n📦 Backend running on http://localhost:' + BACKEND_PORT);
            console.log('🎨 Frontend running on http://localhost:' + FRONTEND_PORT);
            console.log('\n✅ Both servers are now running!');
            console.log('Press Ctrl+C to stop all servers\n');
          }, 2000);
        }
      } catch (error) {
        attempts++;
        await new Promise(resolve => setTimeout(resolve, 1000));
      }
    }
    
    if (!backendReady) {
      console.error('❌ Backend failed to start within timeout');
      gracefulShutdown('backend-timeout');
    }
  }, 2000);
  
  // Start health check interval
  setInterval(() => {
    Object.keys(processes).forEach(key => {
      checkHealth(key);
    });
  }, HEALTH_CHECK_INTERVAL);
}

// Start the application
main().catch(err => {
  console.error('❌ Failed to start application:', err);
  process.exit(1);
});
