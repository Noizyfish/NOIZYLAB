#!/usr/bin/env node

/**
 * NOIZYLAB Email Agent - Cluster Mode
 * Run multiple instances for high performance
 */

const cluster = require('cluster');
const os = require('os');

const numCPUs = os.cpus().length;

if (cluster.isMaster || cluster.isPrimary) {
  console.log(`🚀 NOIZYLAB Email Agent - CLUSTER MODE`);
  console.log(`Master process ${process.pid} is running`);
  console.log(`Starting ${numCPUs} workers...`);
  console.log('');
  
  // Fork workers
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork();
  }
  
  cluster.on('exit', (worker, code, signal) => {
    console.log(`Worker ${worker.process.pid} died. Restarting...`);
    cluster.fork();
  });
  
  cluster.on('online', (worker) => {
    console.log(`✅ Worker ${worker.process.pid} is online`);
  });
  
} else {
  // Workers share the TCP connection
  require('./agent.js');
}
