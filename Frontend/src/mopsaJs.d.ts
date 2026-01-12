declare global {
  // Typing for mopsaJs object
  const mopsaJs: {
    configUni: string;
    analyze: (options: string[]) => string
    writeFile : (filename: string, content: string) => void;
    setCode : (code: string) => void;
    setConfig : (config: string) => void;
    readFile : (filename: string) => string;
    getCode : () => string;
    getConfig : () => string;
    listDir : (dir:string) => [number, ...string[]];
    changeCodeFilePath: (codeFilePath: string) => void;
    getCodeFilePath: () => [number, string];
    deleteFile: (filename: string) => void;
  }

  interface unknownFolder {
    [key:string] : string | unknownFolder;
  }

  interface shareData {
    "configs": {
      "c": {
        "default.json": string;
        [key: string]: string | undefined;
      },
      "python": {
        "default.json": string;
        [key: string]: string | undefined;
      },
      "cfg": {
        "default.json": string;
        [key: string]: string | undefined;
      },
      "universal": {
        "default.json": string;
        [key: string]: string | undefined;
      }
    },
    "stubs": {
      "c": unknownFolder
      "python": unknownFolder
      "cpython": unknownFolder
    }
  }

  var mopsaOutput: string;
  var shareData: shareData;
}

export {};