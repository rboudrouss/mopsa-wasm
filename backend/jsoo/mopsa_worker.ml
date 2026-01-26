(**
 * MOPSA js_of_ocaml Worker
 *
 * This is the OCaml entry point for running MOPSA compiled with js_of_ocaml.
 * It exposes a JavaScript API for analysis.
 *)

open Js_of_ocaml

(* Command types for communication with JavaScript *)
type command =
  | Init of string          (* Initialize with configuration *)
  | Analyze of string       (* Analyze code *)
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

(* Enable backtrace recording *)
let () = Printexc.record_backtrace true

(* Default configuration for C language *)
let default_config =
  "{\"language\": \"c\", \"domain\": {\"compose\": [{\"semantic\": \"C\", \"switch\": [\"c.iterators.program\", \"c.iterators.interproc\", \"c.iterators.goto\", \"c.iterators.switch\", \"c.iterators.loops\", \"c.iterators.intraproc\", \"stubs.iterators.body\", \"c.libs.compiler\", \"c.libs.mopsalib\", \"c.libs.clib.file_descriptor\", \"c.libs.clib.formatted_io.fprint\", \"c.libs.clib.formatted_io.fscanf\", \"c.libs.variadic\", \"c.cstubs.assigns\", \"c.cstubs.builtins\", \"c.cstubs.resources\", \"c.memory.variable_length_array\", \"c.memory.aggregates\", \"c.memory.protection\", \"universal.heap.recency\", {\"compose\": [\"c.memory.lowlevel.cells\", {\"semantic\": \"C/Scalar\", \"switch\": [\"c.memory.scalars.pointer\", \"c.memory.scalars.machine_numbers\"]}]}, \"stubs.iterators.fallback\"]}, {\"semantic\": \"Universal\", \"switch\": [\"universal.iterators.intraproc\", \"universal.iterators.loops\", \"universal.iterators.interproc.inlining\", \"universal.iterators.unittest\", {\"nonrel\": {\"union\": [\"universal.numeric.values.intervals.float\", \"universal.numeric.values.intervals.integer\"]}}]}]}}"

(* File paths in virtual filesystem *)
let code_file = "/code.c"
let config_file = "/config.json"

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
let run_mopsa_analysis _options =
  capture_stdout ();
  Mopsa_analyzer.Framework.Params.Config.Parser.opt_config := config_file;
  let exit_code =
    try
      Mopsa_analyzer.Framework.Runner.analyze_files [code_file] None
    with
    | Sys_error msg ->
        append_stdout (Printf.sprintf "Sys_error: %s\n" msg);
        1
    | e ->
        append_stdout (Printf.sprintf "Exception: %s\n" (Printexc.to_string e));
        1
  in
  (exit_code, !mopsa_output)

(* Analyze code *)
let analyze_code code =
  try
    current_code := code;
    write_file code_file code;
    let (exit_code, output) = run_mopsa_analysis [] in
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
  try
    if String.length json_str < 2 then None
    else
      let s = String.trim json_str in
      if String.get s 0 = '[' then
        let s_len = String.length s in
        if s_len < 2 then None
        else
          let s = String.sub s 1 (s_len - 2) in
          let parts = String.split_on_char ',' s in
          match parts with
          | [cmd] ->
              let cmd = String.trim cmd in
              let cmd_len = String.length cmd in
              if cmd_len < 2 then None
              else
                let cmd = String.sub cmd 1 (cmd_len - 2) in
                (match cmd with
                 | "Stop" -> Some Stop
                 | _ -> None)
          | cmd :: arg :: _ ->
              let cmd = String.trim cmd in
              let cmd_len = String.length cmd in
              if cmd_len < 2 then None
              else
                let cmd = String.sub cmd 1 (cmd_len - 2) in
                let arg = String.trim arg in
                let arg = if String.length arg >= 2 && String.get arg 0 = '"' && String.get arg (String.length arg - 1) = '"'
                          then String.sub arg 1 (String.length arg - 2)
                          else arg in
                (match cmd with
                 | "Init" -> Some (Init arg)
                 | "Analyze" -> Some (Analyze arg)
                 | "SetConfig" -> Some (SetConfig arg)
                 | "SetCode" -> Some (SetCode arg)
                 | _ -> None)
          | _ -> None
      else None
  with _ -> None

(* Handle a request from JavaScript *)
let handle_request json_str =
  try
    match parse_command json_str with
    | Some (Init config) -> serialize_response (init_mopsa config)
    | Some (Analyze code) -> serialize_response (analyze_code code)
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

(* Export functions to JavaScript *)
let () =
  Js.export "MopsaWorker"
    (object%js
       method init config =
         Js.string (serialize_response (init_mopsa (Js.to_string config)))

       method analyze code =
         Js.string (serialize_response (analyze_code (Js.to_string code)))

       method setConfig config =
         current_config := Js.to_string config;
         write_file config_file !current_config;
         Js.string (serialize_response { success = true; message = "Config set"; data = None })

       method setCode code =
         current_code := Js.to_string code;
         write_file code_file !current_code;
         Js.string (serialize_response { success = true; message = "Code set"; data = None })

       method post json =
         Js.string (handle_request (Js.to_string json))
     end)

