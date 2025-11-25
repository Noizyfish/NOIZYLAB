#!/usr/bin/env node

/**
 * ╔════════════════════════════════════════════════════════════════════╗
 * ║  GORUNFREE: THE MONOLITH (v1.1)                                    ║
 * ║  Server • Client • Installer • Automation • Zero Dependencies      ║
 * ╚════════════════════════════════════════════════════════════════════╝
 */

const http = require('http');
const { spawn } = require('child_process');
const fs = require('fs');
const os = require('os');

// --- CONFIGURATION ---
const VERSION = '1.1.0';
const PORT = process.env.GORUNFREE_PORT || 9999;
const BROWSER = process.env.GORUNFREE_BROWSER || 'Safari';
const PLATFORM = os.platform();
const IS_MACOS = PLATFORM === 'darwin';
const IS_WINDOWS = PLATFORM === 'win32';
const SOUNDS = IS_MACOS;
const MAX_BODY_SIZE = 10 * 1024 * 1024; // 10MB limit
const REQUEST_TIMEOUT = 5000;

// --- PROMPT TEMPLATES ---
const PROMPTS = {
    fix: '🚨 BUG REPORT. Analyze this, find the error, and rewrite the fixed version:\n\n',
    roast: '🔥 ROAST ME. Criticize this code brutally:\n\n',
    optimize: '🚀 SPEED RUN. Refactor for speed and cleanliness:\n\n',
    explain: '👨‍🏫 EXPLAIN LIKE I\'M 5. What does this do?\n\n',
    default: ''
};

// --- CLI ROUTER ---
const command = process.argv[2];

const HELP_TEXT = `
\x1b[36m⚡ GORUNFREE MONOLITH CLI v${VERSION} ⚡\x1b[0m

\x1b[33mUSAGE:\x1b[0m
  gorunfree server        → Start the bridge (Keep window open)

  gorunfree fix           → Send clipboard to Claude (Bug Fix Mode)
  gorunfree roast         → Send clipboard to Claude (Roast Mode)
  gorunfree fast          → Send clipboard to Claude (Optimize Mode)
  gorunfree explain       → Send clipboard to Claude (Explain Mode)
  gorunfree raw           → Send clipboard as-is

  gorunfree back          → Retrieve code from Claude & Paste to Cursor

  gorunfree install       → Install to /usr/local/bin (Requires sudo)
  gorunfree version       → Show version info
  gorunfree status        → Check if server is running

\x1b[33mENVIRONMENT:\x1b[0m
  GORUNFREE_PORT=9999     → Custom port
  GORUNFREE_BROWSER=Safari → Browser (Safari, Google Chrome, Arc)
`;

// Command routing with early exit for unknown commands
const COMMANDS = {
    server: runServer,
    fix: () => sendClient('fix'),
    roast: () => sendClient('roast'),
    fast: () => sendClient('optimize'),
    explain: () => sendClient('explain'),
    raw: () => sendClient('default'),
    back: retrieveClient,
    install: installCLI,
    version: () => { console.log(`GORUNFREE v${VERSION} (${PLATFORM})`); process.exit(0); },
    status: checkStatus,
    help: () => { console.log(HELP_TEXT); process.exit(0); },
    '-h': () => { console.log(HELP_TEXT); process.exit(0); },
    '--help': () => { console.log(HELP_TEXT); process.exit(0); },
};

if (!command) { console.log(HELP_TEXT); process.exit(0); }
if (COMMANDS[command]) { COMMANDS[command](); }
else { console.error(`\x1b[31m❌ Unknown command: ${command}\x1b[0m\nRun 'gorunfree help' for usage.`); process.exit(1); }

// ==========================================
// 1. CLIENT LOGIC
// ==========================================

async function sendClient(mode) {
    try {
        const code = await getClipboard();
        if (!code.trim()) {
            console.error('\x1b[31m❌ Clipboard is empty\x1b[0m');
            process.exit(1);
        }

        const postData = JSON.stringify({ code, mode });

        const req = http.request({
            hostname: '127.0.0.1',
            port: PORT,
            path: '/upload',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            },
            timeout: REQUEST_TIMEOUT
        }, (res) => {
            let data = '';
            res.on('data', c => data += c);
            res.on('end', () => {
                if (res.statusCode === 200) {
                    console.log(`\x1b[32m✅ Sent to Claude [${mode.toUpperCase()}]\x1b[0m`);
                } else {
                    console.error(`\x1b[31m❌ Server Error: ${res.statusCode}\x1b[0m`);
                }
                process.exit(res.statusCode === 200 ? 0 : 1);
            });
        });

        req.on('error', handleConnectionError);
        req.on('timeout', () => { req.destroy(); handleConnectionError(); });
        req.write(postData);
        req.end();
    } catch (e) {
        console.error(`\x1b[31m❌ ${e.message}\x1b[0m`);
        process.exit(1);
    }
}

async function retrieveClient() {
    const req = http.request({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/download',
        method: 'POST',
        timeout: REQUEST_TIMEOUT
    }, (res) => {
        let data = '';
        res.on('data', c => data += c);
        res.on('end', () => {
            try {
                const json = JSON.parse(data);
                if (json.status === 'received') {
                    console.log(`\x1b[32m✅ Retrieved ${json.length} chars → Pasted to Cursor\x1b[0m`);
                    process.exit(0);
                } else {
                    console.error(`\x1b[31m❌ Error: ${json.error || 'Unknown error'}\x1b[0m`);
                    process.exit(1);
                }
            } catch (e) {
                console.error(`\x1b[31m❌ Invalid response from server\x1b[0m`);
                process.exit(1);
            }
        });
    });

    req.on('error', handleConnectionError);
    req.on('timeout', () => { req.destroy(); handleConnectionError(); });
    req.end();
}

async function checkStatus() {
    const req = http.request({
        hostname: '127.0.0.1',
        port: PORT,
        path: '/health',
        method: 'GET',
        timeout: 2000
    }, (res) => {
        if (res.statusCode === 200) {
            console.log(`\x1b[32m✅ Server is running on port ${PORT}\x1b[0m`);
            process.exit(0);
        }
    });

    req.on('error', () => {
        console.log(`\x1b[33m⚠ Server is not running\x1b[0m`);
        process.exit(1);
    });
    req.on('timeout', () => {
        req.destroy();
        console.log(`\x1b[33m⚠ Server is not responding\x1b[0m`);
        process.exit(1);
    });
    req.end();
}

function handleConnectionError() {
    console.error(`\x1b[31m❌ Connection failed. Is the server running?\x1b[0m`);
    console.error(`   Run: \x1b[36mgorunfree server\x1b[0m`);
    process.exit(1);
}

// ==========================================
// 2. SERVER LOGIC
// ==========================================

function runServer() {
    const platform = IS_MACOS ? 'macOS' : IS_WINDOWS ? 'Windows' : 'Linux';

    console.clear();
    console.log(`\x1b[32m
    ╔══════════════════════════════════════╗
    ║   GORUNFREE BRIDGE v${VERSION.padEnd(6)}         ║
    ║   Port: ${String(PORT).padEnd(5)} │ ${platform.padEnd(8)}        ║
    ╚══════════════════════════════════════╝\x1b[0m`);

    if (!IS_MACOS) {
        console.log('\x1b[33m    ⚠ Browser automation disabled (macOS only)\x1b[0m');
    }
    console.log(`\x1b[90m    Browser: ${BROWSER}\x1b[0m\n`);

    playSound('PowerOn');

    const server = http.createServer(async (req, res) => {
        // CORS headers
        res.setHeader('Access-Control-Allow-Origin', '*');
        res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
        res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

        // Handle preflight
        if (req.method === 'OPTIONS') {
            res.writeHead(204);
            return res.end();
        }

        // Health check
        if (req.url === '/health' && req.method === 'GET') {
            res.writeHead(200, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ status: 'ok', version: VERSION, uptime: process.uptime() }));
        }

        if (req.method !== 'POST') {
            res.writeHead(405, { 'Content-Type': 'application/json' });
            return res.end(JSON.stringify({ error: 'Method not allowed' }));
        }

        // Collect body with size limit
        let body = '';
        let bodySize = 0;

        req.on('data', chunk => {
            bodySize += chunk.length;
            if (bodySize > MAX_BODY_SIZE) {
                res.writeHead(413, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: 'Request too large' }));
                req.destroy();
                return;
            }
            body += chunk;
        });

        req.on('end', async () => {
            const timestamp = new Date().toLocaleTimeString();

            try {
                if (req.url === '/upload') {
                    const { code, mode } = JSON.parse(body);
                    if (!code) throw new Error('No code provided');

                    const prompt = wrapPrompt(code, mode || 'default');
                    await copyToClipboard(prompt);
                    await runAutomation('PASTE');

                    playSound('Tink');
                    console.log(`\x1b[36m[${timestamp}]\x1b[0m 📥 RECEIVED: \x1b[33m${mode || 'raw'}\x1b[0m (${code.length} chars)`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ success: true, length: code.length }));

                } else if (req.url === '/download') {
                    const raw = await runAutomation('READ');
                    if (!raw || raw.includes('ERROR_NO_MSG')) {
                        throw new Error('No response found in browser');
                    }

                    const clean = sanitize(raw);
                    await copyToClipboard(clean);
                    await runAutomation('CURSOR');

                    playSound('Hero');
                    console.log(`\x1b[36m[${timestamp}]\x1b[0m 📤 SENT TO CURSOR (${clean.length} chars)`);
                    res.writeHead(200, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ status: 'received', length: clean.length }));

                } else {
                    res.writeHead(404, { 'Content-Type': 'application/json' });
                    res.end(JSON.stringify({ error: 'Not found' }));
                }
            } catch (e) {
                playSound('Basso');
                console.error(`\x1b[31m[${timestamp}] ERR: ${e.message}\x1b[0m`);
                res.writeHead(500, { 'Content-Type': 'application/json' });
                res.end(JSON.stringify({ error: e.message }));
            }
        });

        req.on('error', (e) => {
            console.error(`\x1b[31mRequest error: ${e.message}\x1b[0m`);
        });
    });

    // Handle server errors
    server.on('error', (e) => {
        if (e.code === 'EADDRINUSE') {
            console.error(`\x1b[31m❌ Port ${PORT} is already in use!\x1b[0m`);
            console.error(`   Another instance may be running. Check: \x1b[36mgorunfree status\x1b[0m`);
        } else {
            console.error(`\x1b[31m❌ Server error: ${e.message}\x1b[0m`);
        }
        process.exit(1);
    });

    // Graceful shutdown
    const shutdown = (signal) => {
        console.log(`\n\x1b[33m⚡ Shutting down (${signal})...\x1b[0m`);
        server.close(() => {
            console.log('\x1b[32m✅ Server stopped\x1b[0m');
            process.exit(0);
        });
        setTimeout(() => process.exit(0), 3000); // Force exit after 3s
    };

    process.on('SIGINT', () => shutdown('SIGINT'));
    process.on('SIGTERM', () => shutdown('SIGTERM'));

    server.listen(PORT, '127.0.0.1', () => {
        console.log('\x1b[90m    Waiting for requests... (Ctrl+C to stop)\x1b[0m\n');
    });
}

// ==========================================
// 3. UTILITIES & AUTOMATION
// ==========================================

function wrapPrompt(code, mode) {
    const prefix = PROMPTS[mode] || PROMPTS.default;
    return prefix + code;
}

function sanitize(text) {
    if (!text) return '';
    // Extract all code blocks and join them
    const blocks = [...text.matchAll(/```[\w]*\n([\s\S]*?)```/g)];
    if (blocks.length > 0) {
        return blocks.map(m => m[1].trim()).join('\n\n');
    }
    return text.trim();
}

function getClipboard() {
    return new Promise((resolve, reject) => {
        let cmd, args;

        if (IS_MACOS) {
            cmd = 'pbpaste';
            args = [];
        } else if (IS_WINDOWS) {
            cmd = 'powershell';
            args = ['-command', 'Get-Clipboard'];
        } else {
            cmd = 'xclip';
            args = ['-selection', 'clipboard', '-o'];
        }

        const proc = spawn(cmd, args);
        let data = '';
        let error = '';

        proc.stdout.on('data', d => data += d);
        proc.stderr.on('data', d => error += d);
        proc.on('error', (e) => resolve('')); // Fail gracefully
        proc.on('close', (code) => resolve(data));
    });
}

function copyToClipboard(text) {
    return new Promise((resolve, reject) => {
        let cmd, args;

        if (IS_MACOS) {
            cmd = 'pbcopy';
            args = [];
        } else if (IS_WINDOWS) {
            cmd = 'powershell';
            args = ['-command', '$input | Set-Clipboard'];
        } else {
            cmd = 'xclip';
            args = ['-selection', 'clipboard'];
        }

        const proc = spawn(cmd, args);
        proc.on('error', () => resolve()); // Fail gracefully
        proc.stdin.write(text);
        proc.stdin.end();
        proc.on('close', resolve);
    });
}

function playSound(name) {
    if (!SOUNDS) return;
    try {
        const proc = spawn('afplay', [`/System/Library/Sounds/${name}.aiff`], { stdio: 'ignore' });
        proc.on('error', () => {});
        proc.unref(); // Don't wait for sound to finish
    } catch (e) {}
}

function runAutomation(action) {
    return new Promise((resolve) => {
        if (!IS_MACOS) {
            if (action !== 'READ') {
                console.log('\x1b[90m[Linux/Windows] Skipping browser automation\x1b[0m');
            }
            return resolve('');
        }

        const script = getBrowserScript(action);
        const proc = spawn('osascript', ['-e', script]);
        let out = '';
        let err = '';

        proc.stdout.on('data', d => out += d);
        proc.stderr.on('data', d => err += d);
        proc.on('error', () => resolve(''));
        proc.on('close', (code) => {
            if (code !== 0 && err) {
                console.error(`\x1b[31mAppleScript error: ${err.trim()}\x1b[0m`);
            }
            resolve(out.trim());
        });
    });
}

function getBrowserScript(action) {
    const js = `
        var msgs = document.querySelectorAll('div[data-message-author-role="assistant"]');
        var last = msgs[msgs.length - 1];
        last ? last.innerText : "ERROR_NO_MSG";
    `.replace(/\n/g, ' ').replace(/"/g, '\\"');

    if (action === 'PASTE') {
        return `
            tell application "${BROWSER}"
                activate
                open location "https://claude.ai/new"
                delay 1.5
            end tell
            tell application "System Events"
                keystroke "v" using command down
                delay 0.5
                keystroke return
            end tell`;
    }

    if (action === 'READ') {
        return BROWSER === 'Safari'
            ? `tell application "Safari" to do JavaScript "${js}" in document 1`
            : `tell application "${BROWSER}" to tell active tab of window 1 to execute javascript "${js}"`;
    }

    if (action === 'CURSOR') {
        return `
            tell application "Cursor" to activate
            delay 0.5
            tell application "System Events" to keystroke "v" using command down`;
    }

    return '';
}

function installCLI() {
    const dest = '/usr/local/bin/gorunfree';
    const currentPath = fs.realpathSync(process.argv[1]);

    console.log(`Installing ${currentPath} → ${dest}`);

    try {
        // Check if already installed and pointing to same location
        if (fs.existsSync(dest)) {
            const existing = fs.readlinkSync(dest);
            if (existing === currentPath) {
                console.log('\x1b[32m✅ Already installed!\x1b[0m');
                return;
            }
            fs.unlinkSync(dest);
        }

        fs.symlinkSync(currentPath, dest);
        console.log(`\x1b[32m✅ INSTALLED! Run 'gorunfree server' from anywhere.\x1b[0m`);
    } catch (e) {
        if (e.code === 'EACCES') {
            console.error('\x1b[31m❌ Permission denied.\x1b[0m');
            console.error(`   Run: \x1b[36msudo ${process.argv[1]} install\x1b[0m`);
        } else {
            console.error(`\x1b[31m❌ Install failed: ${e.message}\x1b[0m`);
        }
        process.exit(1);
    }
}
