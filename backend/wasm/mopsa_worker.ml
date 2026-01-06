(**
 * MOPSA WASM Worker
 *
 * This is the OCaml entry point for running MOPSA in WebAssembly.
 * It exposes a callback interface that can be called from JavaScript.
 *)

(* External function implemented in JavaScript (core.ts) *)
external mopsa_emit : string -> unit = "mopsa_emit"

(* Command types for communication with JavaScript *)
type command =
  | Init of string          (* Initialize with configuration *)
  | Analyze of string       (* Analyze code *)
  | AnalyzeWithOptions of string * string list  (* Analyze with extra options *)
  | SetConfig of string     (* Set configuration JSON *)
  | SetCode of string       (* Set code to analyze *)
  | Stop                    (* Stop the worker *)

(* Response type *)
type response = {
  success : bool;
  message : string;
  data : string option;
}

(* Serialize response to JSON *)
let serialize_response (resp : response) : string =
  let data_str = match resp.data with
    | Some d -> Printf.sprintf ", \"data\": %s" d
    | None -> ""
  in
  Printf.sprintf "{\"success\": %b, \"message\": \"%s\"%s}"
    resp.success
    (String.escaped resp.message)
    data_str

(* Global state *)
let current_code = ref ""
let current_config = ref ""
let mopsa_output = ref ""

(* Default configuration for universal language *)
let default_config =
  "{\"language\": \"universal\",\"domain\": {\"switch\": [\"universal.iterators.program\",\"universal.iterators.intraproc\",\"universal.iterators.loops\",\"universal.iterators.interproc.inlining\",\"universal.iterators.unittest\",{\"nonrel\": {\"union\": [\"universal.numeric.values.intervals.integer\",\"universal.numeric.values.intervals.float\",\"universal.strings.powerset\"]}}]}}"

(* File paths in virtual filesystem *)
let code_file = "/code.c"
let config_file = "/config.json"
let share_dir = "/share"

(* Write file to virtual filesystem *)
let write_file path content =
  let oc = open_out path in
  output_string oc content;
  close_out oc

(* Capture stdout output *)
let capture_stdout () =
  mopsa_output := ""

let append_stdout s =
  mopsa_output := !mopsa_output ^ s

(* Initialize MOPSA *)
let init_mopsa config =
  try
    current_config := (if config = "" then default_config else config);
    write_file config_file !current_config;
    { success = true; message = "MOPSA initialized"; data = None }
  with e ->
    { success = false; message = Printexc.to_string e; data = None }

(* Run MOPSA analysis with given options *)
let run_mopsa_analysis options =
  capture_stdout ();
  let args = Array.of_list ([
    "mopsa";
    "-config=" ^ config_file;
    "-share-dir=" ^ share_dir
  ] @ options @ [code_file]) in

  (* Run the analysis *)
  let exit_code =
    Mopsa_analyzer.Framework.Runner.parse_options
      args
      Mopsa_analyzer.Framework.Runner.analyze_files
      ()
  in
  (exit_code, !mopsa_output)

(* Analyze code *)
let analyze_code ?(options=[]) code =
  try
    current_code := code;
    write_file code_file code;

    (* Run actual MOPSA analysis *)
    let (exit_code, output) = run_mopsa_analysis options in

    let escaped_output = String.escaped output in
    if exit_code = 0 then
      { success = true;
        message = "Analysis complete";
        data = Some (Printf.sprintf "\"%s\"" escaped_output) }
    else
      { success = false;
        message = Printf.sprintf "Analysis failed with exit code %d" exit_code;
        data = Some (Printf.sprintf "\"%s\"" escaped_output) }
  with e ->
    { success = false;
      message = Printexc.to_string e;
      data = Some (Printf.sprintf "\"%s\"" (String.escaped !mopsa_output)) }

(* Parse command from JSON string *)
let parse_command json_str : command option =
  (* Simple JSON parsing - look for command patterns *)
  if String.length json_str < 2 then None
  else
    let s = String.trim json_str in
    (* Handle array format: ["CommandName", "arg"] or ["CommandName"] *)
    if String.get s 0 = '[' then
      let s = String.sub s 1 (String.length s - 2) in
      let parts = String.split_on_char ',' s in
      match parts with
      | [cmd] -> 
          let cmd = String.trim cmd in
          let cmd = String.sub cmd 1 (String.length cmd - 2) in (* remove quotes *)
          (match cmd with
           | "Stop" -> Some Stop
           | _ -> None)
      | cmd :: arg :: _ ->
          let cmd = String.trim cmd in
          let cmd = String.sub cmd 1 (String.length cmd - 2) in
          let arg = String.trim arg in
          let arg = if String.length arg > 2 && String.get arg 0 = '"' 
                    then String.sub arg 1 (String.length arg - 2) 
                    else arg in
          (match cmd with
           | "Init" -> Some (Init arg)
           | "Analyze" -> Some (Analyze arg)
           | "SetConfig" -> Some (SetConfig arg)
           | "SetCode" -> Some (SetCode arg)
           | _ -> None)
      | _ -> None
    else
      None

(* Handle a request from JavaScript *)
let handle_request json_str =
  try
    match parse_command json_str with
    | Some (Init config) ->
        serialize_response (init_mopsa config)
    | Some (Analyze code) ->
        serialize_response (analyze_code code)
    | Some (AnalyzeWithOptions (code, options)) ->
        serialize_response (analyze_code ~options code)
    | Some (SetConfig config) ->
        current_config := config;
        write_file config_file config;
        serialize_response { success = true; message = "Config set"; data = None }
    | Some (SetCode code) ->
        current_code := code;
        write_file code_file code;
        serialize_response { success = true; message = "Code set"; data = None }
    | Some Stop ->
        serialize_response { success = true; message = "Stopped"; data = None }
    | None ->
        serialize_response { success = false; message = "Unknown command: " ^ json_str; data = None }
  with e ->
    serialize_response { success = false; message = "Error: " ^ Printexc.to_string e; data = None }

(* Main entry point *)
let () =
  (* Register the callback that JavaScript will call *)
  Callback.register "mopsa_post" handle_request;
  
  (* Handle stdin for CLI mode *)
  if Array.length Sys.argv > 1 && Sys.argv.(1) = "-stdin" then
    try
      while true do
        mopsa_emit @@ handle_request @@ Stdlib.read_line ()
      done
    with End_of_file -> ()
  else
    (* Just print that we're ready *)
    Format.eprintf "MOPSA WASM Worker initialized@\n%!"

