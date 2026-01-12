import { Editor } from "@monaco-editor/react";
import MopsaJs from "../lib/mopsaJs";
import { useMemo, useState } from "react";
import { SupportedLanguage } from "../lib";
import {
  ResizablePanelGroup,
  ResizablePanel,
  ResizableHandle,
} from "./resizable";
import type { shareData } from "../mopsaJs.d";

export default function ConfigEditor({
  setLang,
}: {
  setLang: (lang: SupportedLanguage) => void;
}) {
  const [value, setValue] = useState<string | undefined>(
    MopsaJs.getConfig() || MopsaJs.defaultConfigs.universal
  );

  const [showPannel, setShowPannel] = useState<boolean>(false);
  const configs = useMemo(() => MopsaJs.getShares()["configs"], []);

  return (
    <ResizablePanelGroup direction="horizontal">
      <ResizablePanel defaultSize={showPannel ? 80 : 100} order={0} id="config-editor">
        <button
          style={{
            position: "fixed",
            right: "1rem",
            bottom: "1rem",
            zIndex: 10,
            borderWidth: "1px",
            borderColor: "black",
          }}
          onClick={() => setShowPannel(!showPannel)}
        >
          {showPannel ? "Hide Configs" : "Show Configs"}
        </button>
        <Editor
          height="100%"
          width="100%"
          defaultLanguage="json"
          value={value}
          onChange={(newValue) => {
            setValue(newValue);
            MopsaJs.setConfig(newValue ?? MopsaJs.defaultConfigs.universal);
          }}
          onMount={(editor) => {
            editor.updateOptions({
              tabSize: 2,
            });
          }}
        />
      </ResizablePanel>

      {showPannel && <ResizableHandle />}

      {showPannel && (
        <ResizablePanel defaultSize={20} order={1} id="config-selector">
          <div style={{ height: "100%", overflow: "auto" }}>
            {(Object.keys(configs) as (keyof shareData["configs"])[]).map(
              (config, i) => (
                <div key={i} style={{ marginBottom: "1rem" }}>
                  <p
                    style={{
                      fontWeight: "bold",
                      fontSize: "1rem",
                      borderBottom: "1px solid black",
                      backgroundColor: "lightgray",
                    }}
                  >
                    {config}
                  </p>
                  {Object.keys(configs[config]).map((file, j) => (
                    <p
                      style={{
                        fontSize: "0.8rem",
                        cursor: "pointer",
                        borderBottom: "1px solid black",
                      }}
                      key={config + file + j}
                      onClick={() => {
                        const newconfig = configs[config][file];
                        MopsaJs.setConfig(newconfig ?? MopsaJs.defaultConfigs.universal);
                        setValue(newconfig);
                        setLang(config === "cfg" ? "c" : config);
                      }}
                    >
                      {file}
                    </p>
                  ))}
                </div>
              )
            )}
            <div style={{ height: "150px" }}></div>
          </div>
        </ResizablePanel>
      )}
    </ResizablePanelGroup>
  );
}
