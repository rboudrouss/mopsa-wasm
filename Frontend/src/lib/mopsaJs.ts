// This file contains the functions that are used to interact with the Mopsa API
// This is used so that if the API changes, we only need to change the functions
// in this file and not the entire codebase
//
// This version uses a Web Worker with WASM instead of the old synchronous mopsaJs.bc.js
import share from "./share.json";
import type { shareData } from "../mopsaJs.d";

const defaultCode = `int main() { return 0; }\n`;

// Local state management (files stored in memory, synced with worker)
const localFiles: Map<string, string> = new Map();
let currentCode = defaultCode;
let currentConfig = "";
let currentCodeFilePath = "/main.c";

// Worker instance
let worker: Worker | null = null;
let workerReady = false;
let pendingAnalyze: ((result: string) => void) | null = null;

// Share data
const shareDataTyped = share as shareData;

const defaultConfigs = {
  c: shareDataTyped["configs"]["c"]["default.json"],
  python: shareDataTyped["configs"]["python"]["default.json"],
  cfg: shareDataTyped["configs"]["cfg"]["default.json"],
  universal: shareDataTyped["configs"]["universal"]["default.json"],
};

// Set default config
currentConfig = defaultConfigs.universal;

// Initialize worker
function initWorker(): Worker {
  if (worker) return worker;

  // Use the pre-built mopsa_worker.js from the backend (placed in public/ folder)
  // This is not a module worker - it's a classic script worker
  worker = new Worker('/mopsa_worker.js');

  worker.onmessage = (event) => {
    const [action, ...args] = event.data;

    switch (action) {
      case 'Ready':
        workerReady = true;
        console.log('[MopsaJs] Worker ready');
        break;
      case 'Status':
        console.log('[MopsaJs] Status:', args[0]);
        break;
      case 'AnalyzeResult':
        if (pendingAnalyze) {
          const result = args[0];
          pendingAnalyze(typeof result === 'string' ? result : JSON.stringify(result, null, 2));
          pendingAnalyze = null;
        }
        break;
      case 'Error':
        console.error('[MopsaJs] Error:', args[0]);
        if (pendingAnalyze) {
          pendingAnalyze(`Error: ${args[0]}`);
          pendingAnalyze = null;
        }
        break;
      case 'Stdout':
        console.log('[MopsaJs] Stdout:', args[0]);
        break;
    }
  };

  worker.onerror = (error) => {
    console.error('[MopsaJs] Worker error:', error);
  };

  return worker;
}

function setCode(code: string) {
  currentCode = code.endsWith("\n") ? code : code + "\n";
  localFiles.set(currentCodeFilePath, currentCode);

  const w = initWorker();
  if (workerReady) {
    w.postMessage(['SetCode', currentCode]);
  }
}

function setConfig(config: string) {
  currentConfig = config;

  const w = initWorker();
  if (workerReady) {
    w.postMessage(['SetConfig', currentConfig]);
  }
}

function getCode(): string {
  return currentCode;
}

function getConfig(): string {
  return currentConfig || defaultConfigs.universal;
}

// Analyze is async but we return a promise-like sync interface for compatibility
function analyze(_options: string[]): string {
  const w = initWorker();

  if (!workerReady) {
    return "Error: MOPSA worker not ready. Please wait for initialization.";
  }

  // Send config and code to worker before analyzing
  w.postMessage(['SetConfig', currentConfig]);
  w.postMessage(['SetCode', currentCode]);
  w.postMessage(['Analyze', currentCode]);

  return "Analyzing... (see console for results)";
}

// Async version of analyze for proper async handling
async function analyzeAsync(_options: string[] = []): Promise<string> {
  const w = initWorker();

  // Wait for worker to be ready
  if (!workerReady) {
    await new Promise<void>((resolve) => {
      const checkReady = setInterval(() => {
        if (workerReady) {
          clearInterval(checkReady);
          resolve();
        }
      }, 100);
    });
  }

  return new Promise((resolve) => {
    pendingAnalyze = resolve;
    w.postMessage(['SetConfig', currentConfig]);
    w.postMessage(['SetCode', currentCode]);
    w.postMessage(['Analyze', currentCode]);
  });
}

function analyzeParams(options: string[], code: string, config: string) {
  setCode(code);
  setConfig(config);
  return analyze(options);
}

function getShares(): shareData {
  return shareDataTyped;
}

function moveFile(filename: string, destination: string) {
  console.log("Moving file", filename, "to", destination);
  const content = readFile(filename);
  writeFile(destination, content);
  deleteFile(filename);
}

function listDir(dir: string): string[] {
  // Return files that start with the directory path
  const prefix = dir.endsWith('/') ? dir : dir + '/';
  const files: string[] = [];

  for (const path of localFiles.keys()) {
    if (path.startsWith(prefix) || (dir === '/' && path.startsWith('/'))) {
      files.push(path);
    }
  }

  // Always include the main code file
  if (!files.includes(currentCodeFilePath)) {
    files.push(currentCodeFilePath);
  }

  return files.filter((s) => s !== "/dev" && s !== "/config.json");
}

function getCodeFilePath(): string {
  return currentCodeFilePath;
}

function changeCodeFilePath(codeFilePath: string) {
  if (!codeFilePath.startsWith("/")) codeFilePath = "/" + codeFilePath;

  // Move content from old path to new path
  const oldContent = localFiles.get(currentCodeFilePath) || currentCode;
  localFiles.delete(currentCodeFilePath);

  currentCodeFilePath = codeFilePath;
  localFiles.set(currentCodeFilePath, oldContent);
}

function writeFile(filename: string, content: string) {
  if (!filename.startsWith("/")) filename = "/" + filename;
  console.log("Writing file", filename);
  localFiles.set(filename, content);

  // If writing to the code file, update currentCode
  if (filename === currentCodeFilePath) {
    currentCode = content;
  }
}

function readFile(filename: string): string {
  if (!filename.startsWith("/")) filename = "/" + filename;
  console.log("Reading file", filename);

  if (filename === currentCodeFilePath) {
    return currentCode;
  }

  return localFiles.get(filename) || "";
}

function deleteFile(filename: string) {
  if (!filename.startsWith("/")) filename = "/" + filename;
  console.log("Deleting file", filename);
  localFiles.delete(filename);
}

// Initialize worker on module load
initWorker();

const MopsaJs = {
  changeCodeFilePath,
  getCodeFilePath,
  moveFile,
  listDir,
  setConfig,
  analyze,
  analyzeAsync,
  setCode,
  analyzeParams,
  getCode,
  getConfig,
  getShares,
  writeFile,
  readFile,
  deleteFile,
  defaultConfigs,
  isReady: () => workerReady,
};

export default MopsaJs;
