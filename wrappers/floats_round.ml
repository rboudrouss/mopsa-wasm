type t = float

external set_round_near: unit -> unit = "ml_round_near" [@@noalloc]
external set_round_up:   unit -> unit = "ml_round_up"   [@@noalloc]
external set_round_down: unit -> unit = "ml_round_down" [@@noalloc]
external set_round_zero: unit -> unit = "ml_round_zero" [@@noalloc]

external add_near: t -> t -> t = "ml_add_sgl_near" "ml_add_sgl_near_opt" [@@unboxed] [@@noalloc]
external add_up:   t -> t -> t = "ml_add_sgl_up"   "ml_add_sgl_up_opt"   [@@unboxed] [@@noalloc]
external add_down: t -> t -> t = "ml_add_sgl_down" "ml_add_sgl_down_opt" [@@unboxed] [@@noalloc]
external add_zero: t -> t -> t = "ml_add_sgl_zero" "ml_add_sgl_zero_opt" [@@unboxed] [@@noalloc]
(** Addition *)
                                                   
external sub_near: t -> t -> t = "ml_sub_sgl_near" "ml_sub_sgl_near_opt" [@@unboxed] [@@noalloc]
external sub_up:   t -> t -> t = "ml_sub_sgl_up"   "ml_sub_sgl_up_opt"   [@@unboxed] [@@noalloc]
external sub_down: t -> t -> t = "ml_sub_sgl_down" "ml_sub_sgl_down_opt" [@@unboxed] [@@noalloc]
external sub_zero: t -> t -> t = "ml_sub_sgl_zero" "ml_sub_sgl_zero_opt" [@@unboxed] [@@noalloc]
(** Subtraction *)

external mul_near: t -> t -> t = "ml_mul_sgl_near" "ml_mul_sgl_near_opt" [@@unboxed] [@@noalloc]
external mul_up:   t -> t -> t = "ml_mul_sgl_up"   "ml_mul_sgl_up_opt"   [@@unboxed] [@@noalloc]
external mul_down: t -> t -> t = "ml_mul_sgl_down" "ml_mul_sgl_down_opt" [@@unboxed] [@@noalloc]
external mul_zero: t -> t -> t = "ml_mul_sgl_zero" "ml_mul_sgl_zero_opt" [@@unboxed] [@@noalloc]
(** Multiplication *)

external mulz_near: t -> t -> t = "ml_mulz_sgl_near" "ml_mulz_sgl_near_opt" [@@unboxed] [@@noalloc]
external mulz_up:   t -> t -> t = "ml_mulz_sgl_up"   "ml_mulz_sgl_up_opt"   [@@unboxed] [@@noalloc]
external mulz_down: t -> t -> t = "ml_mulz_sgl_down" "ml_mulz_sgl_down_opt" [@@unboxed] [@@noalloc]
external mulz_zero: t -> t -> t = "ml_mulz_sgl_zero" "ml_mulz_sgl_zero_opt" [@@unboxed] [@@noalloc]
(** Special multiplication where 0 times an infinity is 0, not NaN.
    This is particularly useful for interal bounds.
 *)

external div_near: t -> t -> t = "ml_div_sgl_near" "ml_div_sgl_near_opt" [@@unboxed] [@@noalloc]
external div_up:   t -> t -> t = "ml_div_sgl_up"   "ml_div_sgl_up_opt"   [@@unboxed] [@@noalloc]
external div_down: t -> t -> t = "ml_div_sgl_down" "ml_div_sgl_down_opt" [@@unboxed] [@@noalloc]
external div_zero: t -> t -> t = "ml_div_sgl_zero" "ml_div_sgl_zero_opt" [@@unboxed] [@@noalloc]
(** Division *)

external divz_near: t -> t -> t = "ml_divz_sgl_near" "ml_divz_sgl_near_opt" [@@unboxed] [@@noalloc]
external divz_up:   t -> t -> t = "ml_divz_sgl_up"   "ml_divz_sgl_up_opt"   [@@unboxed] [@@noalloc]
external divz_down: t -> t -> t = "ml_divz_sgl_down" "ml_divz_sgl_down_opt" [@@unboxed] [@@noalloc]
external divz_zero: t -> t -> t = "ml_divz_sgl_zero" "ml_divz_sgl_zero_opt" [@@unboxed] [@@noalloc]
(** Special division where 0 / 0 is 0, not NaN.
    This is particularly useful for interal bounds.
 *)
                                                   
external mod_near: t -> t -> t = "ml_mod_sgl_near" "ml_mod_sgl_near_opt" [@@unboxed] [@@noalloc]
external mod_up:   t -> t -> t = "ml_mod_sgl_up"   "ml_mod_sgl_up_opt"   [@@unboxed] [@@noalloc]
external mod_down: t -> t -> t = "ml_mod_sgl_down" "ml_mod_sgl_down_opt" [@@unboxed] [@@noalloc]
external mod_zero: t -> t -> t = "ml_mod_sgl_zero" "ml_mod_sgl_zero_opt" [@@unboxed] [@@noalloc]
(** Remainder. *)

let () =
  Printf.printf "ouais\n"