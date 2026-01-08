import { MopsaPod } from './core';

interface WorkerMessage {
  data: any[];
}

function postMessage(msg: any): void {
  (self as any).postMessage(msg);
}

// Global pod instance
let pod: MopsaPod | null = null;

function handleMessage(event: WorkerMessage): void {
  const cmd = event.data;

  if (!Array.isArray(cmd) || cmd.length === 0) {
    postMessage(['Error', 'Invalid command format']);
    return;
  }

  const [action, ...args] = cmd;

  switch (action) {
    case 'Init':
      if (pod) {
        const result = pod.init(args[0] || '');
        postMessage(['InitResult', result]);
      }
      break;

    case 'Analyze':
      if (pod) {
        try {
          postMessage(['Status', 'Calling pod.analyze...']);
          const resultStr = pod.analyze(args[0] || '');
          postMessage(['Status', `Analyze returned: ${resultStr}`]);
          // Parse the JSON result
          const result = resultStr ? JSON.parse(resultStr) : { success: false, message: 'No result' };
          postMessage(['AnalyzeResult', result]);
        } catch (e: any) {
          postMessage(['Error', `Analyze error: ${e.message}`]);
        }
      }
      break;

    case 'SetConfig':
      if (pod) {
        const result = pod.setConfig(args[0] || '');
        postMessage(['SetConfigResult', result]);
      }
      break;

    case 'SetCode':
      if (pod) {
        const result = pod.setCode(args[0] || '');
        postMessage(['SetCodeResult', result]);
      }
      break;

    case 'Put':
      if (pod && args.length >= 2) {
        pod.putFile(args[0], args[1]);
        postMessage(['PutResult', { success: true }]);
      }
      break;

    case 'Interrupt':
      if (pod) {
        pod.interrupt();
        postMessage(['InterruptResult', { success: true }]);
      }
      break;

    default:
      // Forward unknown commands to OCaml
      if (pod) {
        const result = pod.command(cmd);
        postMessage(['CommandResult', result]);
      } else {
        postMessage(['Error', 'Pod not initialized']);
      }
  }
}

async function main(): Promise<void> {
  postMessage(['Starting']);

  // binDir is '.' because the bytecode is in the same directory as the worker (dist/)
  pod = new MopsaPod({
    binDir: '.',
    nmDir: './node_modules',
    debug: true,
    initialMemory: 256,  // 256 pages = 16MB
    maximumMemory: 32768  // 32768 pages = 2GB
  });

  // Forward events to main thread
  pod.on('status', (status: string) => {
    postMessage(['Status', status]);
  });

  pod.on('message', (msg: any) => {
    postMessage(['Message', msg]);
  });

  pod.on('stdout', (text: string) => {
    postMessage(['Stdout', text]);
  });

  pod.on('error', (error: Error) => {
    postMessage(['Error', error.message]);
  });

  pod.on('ready', () => {
    postMessage(['Ready']);
  });

  addEventListener('message', handleMessage);

  try {
    await pod.boot();

    // Initialize MOPSA with default config
    postMessage(['Status', 'Initializing MOPSA...']);
    const initResult = pod.init('');
    postMessage(['Status', `Init result: ${initResult}`]);
    if (initResult) {
      const result = JSON.parse(initResult);
      if (!result.success) {
        postMessage(['Error', `Init failed: ${result.message}`]);
      } else {
        postMessage(['Status', 'MOPSA initialized successfully']);
      }
    }
  } catch (error: any) {
    postMessage(['Error', `Boot failed: ${error.message}`]);
  }

  (self as any).pod = pod;
}

main().catch((error: Error) => {
  postMessage(['Error', `Fatal error: ${error.message}`]);
});

