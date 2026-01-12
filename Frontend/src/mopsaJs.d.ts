// Type declarations for share data structure

interface unknownFolder {
  [key: string]: string | unknownFolder;
}

interface shareData {
  configs: {
    c: {
      "default.json": string;
      [key: string]: string | undefined;
    };
    python: {
      "default.json": string;
      [key: string]: string | undefined;
    };
    cfg: {
      "default.json": string;
      [key: string]: string | undefined;
    };
    universal: {
      "default.json": string;
      [key: string]: string | undefined;
    };
  };
  stubs?: {
    c?: unknownFolder;
    python?: unknownFolder;
    cpython?: unknownFolder;
  };
}

export { shareData, unknownFolder };
