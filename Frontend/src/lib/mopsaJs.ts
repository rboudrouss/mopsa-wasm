// This file contains the functions that are used to interact with the Mopsa API
// This is used so that if the API changes, we only need to change the functions
// in this file and not the entire codebase
import share from "./share.json";

const defaultCode = `int main() { return 0; }\n`;

shareData = share;

const defaultConfigs = {
  c: getShares()["configs"]["c"]["default.json"],
  python: getShares()["configs"]["python"]["default.json"],
  cfg: getShares()["configs"]["cfg"]["default.json"],
  universal: getShares()["configs"]["universal"]["default.json"],
};

// To anaylize, mopsa needs the code, the config and the options
// cf /js/mopsaJs.ml
function setCode(code: string) {
  mopsaJs.setCode(code + "\n");
}

function setConfig(config: string) {
  mopsaJs.setConfig(config);
}

function getCode() {
  try {
    return mopsaJs.getCode();
  } catch (e) {
    console.log(
      "[FRONTEND] mopsaJS.getCode() failed, returning default code. Setting code file to default code\n",
      "This may be normal if it's the first time you're running the app"
    );
    mopsaJs.setCode(defaultCode);
    return defaultCode;
  }
}

function getConfig() {
  try {
    return mopsaJs.getConfig();
  } catch (e) {
    console.log(
      "[FRONTEND] mopsaJS.getConfig() failed, returning empty string. Setting config file to default config\n",
      "This may be normal if it's the first time you're running the app"
    );
    mopsaJs.setConfig(defaultConfigs.universal);
    return defaultConfigs.universal;
  }
}

function analyze(options: string[]) {
  return mopsaJs.analyze(options);
}

function analyzeParams(options: string[], code: string, config: string) {
  setCode(code);
  setConfig(config);
  return analyze(options);
}

function getShares() {
  return share as shareData;
}

function moveFile(filename: string, destination: string) {
  console.log("Moving file", filename, "to", destination);
  let content = mopsaJs.readFile(filename);
  mopsaJs.writeFile(destination, content);
  mopsaJs.deleteFile(filename);
}

function listDir(dir: string) {
  // HACK to set default files if they don't exist
  MopsaJs.getCode();
  MopsaJs.getConfig();

  let out;
  try {
    out = mopsaJs.listDir(dir);
  } catch (e) {
    console.log(
      "[FRONTEND] mopsaJS.listDir() failed, returning empty array. Setting code file to empty string\n",
      "This may be normal if it's the first time you're running the app"
    );
    return [];
  }
  return out.slice(1).filter((s) => s != "dev" && s!= "config.json") as string[];
}

function getCodeFilePath() {
  return mopsaJs.getCodeFilePath()[1];
}

function changeCodeFilePath(codeFilePath: string) {
  if (!codeFilePath.startsWith("/")) codeFilePath = "/" + codeFilePath;
  mopsaJs.changeCodeFilePath(codeFilePath);
}

function writeFile(filename: string, content: string) {
  if (!filename.startsWith("/")) filename = "/" + filename;
  console.log("Writing file", filename, "with content", content);
  mopsaJs.writeFile(filename, content);
}

function readFile(filename: string) {
  if (!filename.startsWith("/")) filename = "/" + filename;
  console.log("Reading file", filename);
  return mopsaJs.readFile(filename);
}

function deleteFile(filename: string) {
  if (!filename.startsWith("/")) filename = "/" + filename;
  console.log("Deleting file", filename);
  mopsaJs.deleteFile(filename);
}

const MopsaJs = {
  changeCodeFilePath,
  getCodeFilePath,
  moveFile,
  listDir,
  setConfig,
  analyze,
  setCode,
  analyzeParams,
  getCode,
  getConfig,
  getShares,
  writeFile,
  readFile,
  deleteFile,
  defaultConfigs,
};
export default MopsaJs;
