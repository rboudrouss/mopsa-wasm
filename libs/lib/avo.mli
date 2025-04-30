(* File generated from avo.idl *)

type internal

(*
 This file is part of the APRON Library, released under LGPL license.
 Please read the COPYING file packaged in the distribution.
*)

 
(** AV Octagon abstract domain. *)
 


 
type t
(** Type of AV octagons.

AV Octagons are defined by conjunctions of inequalities of the form
[+/-x_i +/- x_j >= 0].

Abstract values which are AV octagons have the type [t Apron.AbstractX.t].

Managers allocated for AV octagons have the type [t Apron.manager.t].
*)

 
(** Allocate a new manager to manipulate AV octagons. *)
external manager_alloc : unit -> t Apron.Manager.t
	= "camlidl_avo_avo_manager_alloc"

(** No internal parameters for now... *)
external manager_get_internal : t Apron.Manager.t -> internal
	= "camlidl_avo_manager_get_internal"

(** Approximate a set of generators to an abstract value, with best precision. *)
external of_generator_array : t Apron.Manager.t -> int -> int -> Apron.Generator0.t array -> t Apron.Abstract0.t
	= "camlidl_avo_ap_abstract0_avo_of_generator_array"

(** Widening with scalar thresholds. *)
external widening_thresholds : t Apron.Manager.t -> t Apron.Abstract0.t -> t Apron.Abstract0.t -> Apron.Scalar.t array -> t Apron.Abstract0.t
	= "camlidl_avo_ap_abstract0_avo_widening_thresholds"

(** Standard narrowing. *)
external narrowing : t Apron.Manager.t -> t Apron.Abstract0.t -> t Apron.Abstract0.t -> t Apron.Abstract0.t
	= "camlidl_avo_ap_abstract0_avo_narrowing"

(** Perturbation. *)
external add_epsilon : t Apron.Manager.t -> t Apron.Abstract0.t -> Apron.Scalar.t -> t Apron.Abstract0.t
	= "camlidl_avo_ap_abstract0_avo_add_epsilon"

(** Perturbation. *)
external add_epsilon_bin : t Apron.Manager.t -> t Apron.Abstract0.t -> t Apron.Abstract0.t -> Apron.Scalar.t -> t Apron.Abstract0.t
	= "camlidl_avo_ap_abstract0_avo_add_epsilon_bin"

(** Algorithms. *)
val pre_widening : int

(** {2 Type conversions} *)

val manager_is_avo : 'a Apron.Manager.t -> bool
  (** Return [true] iff the argument manager is an AV octagon manager *)
val manager_of_avo : t Apron.Manager.t -> 'a Apron.Manager.t
  (** Make an AV octagon manager generic *)
val manager_to_avo : 'a Apron.Manager.t -> t Apron.Manager.t
  (** Instanciate the type of an AV octagon manager.
      Raises [Failure] if the argument manager is not an AV octagon manager *)
module Abstract0 : sig
  val is_avo : 'a Apron.Abstract0.t -> bool
    (** Return [true] iff the argument value is an avo value *)
  val of_avo : t Apron.Abstract0.t -> 'a Apron.Abstract0.t
    (** Make an avo value generic *)
  val to_avo : 'a Apron.Abstract0.t -> t Apron.Abstract0.t
    (** Instanciate the type of an avo value.
	Raises [Failure] if the argument value is not an avo value *)
end
module Abstract1 : sig
  val is_avo : 'a Apron.Abstract1.t -> bool
    (** Return [true] iff the argument value is an avo value *)
  val of_avo : t Apron.Abstract1.t -> 'a Apron.Abstract1.t
    (** Make an avo value generic *)
  val to_avo : 'a Apron.Abstract1.t -> t Apron.Abstract1.t
    (** Instanciate the type of an avo value.
	Raises [Failure] if the argument value is not an avo value *)
end


(**
{2 Compilation information}

See {!Introduction.compilation} for complete explanations.
We just show examples with the file [mlexample.ml].

{3 Bytecode compilation}

{[ocamlc -I $MLGMPIDL_PREFIX/lib -I $APRON_PREFIX/lib -o mlexample.byte \
  bigarray.cma gmp.cma apron.cma avoD.cma mlexample.ml]}

{[ocamlc -I $MLGMPIDL_PREFIX/lib -I $APRON_PREFIX/lib -make-runtime -o myrun \
  bigarray.cma gmp.cma apron.cma avoD.cma

ocamlc -I $MLGMPIDL_PREFIX/lib -I $APRON_PREFIX/lib -use-runtime myrun -o mlexample.byte \
  bigarray.cma gmp.cma apron.cma avoD.cma mlexample.ml ]}

{3 Native-code compilation}

{[ocamlopt -I $MLGMPIDL_PREFIX/lib -I $APRON_PREFIX/lib -o mlexample.opt \
  bigarray.cmxa gmp.cmxa apron.cmxa avoD.cmxa mlexample.ml ]}

{3 Without auto-linking feature}

{[ocamlopt -I $MLGMPIDL_PREFIX/lib -I $APRON_PREFIX/lib -noautolink -o mlexample.opt \
  bigarray.cmxa gmp.cmxa apron.cmxa avoD.cmxa mlexample.ml \
  -cclib "-L$MLGMPIDL_PREFIX/lib -L$APRON_PREFIX/lib \
	  -lavoD_caml_debug -lavoD_debug \
	  -lapron_caml_debug -lapron_debug \
	  -lgmp_caml -L$MPFR_PREFIX/lib -lmpfr -L$GMP_PREFIX/lib -lgmp \
	  -L$CAMLIDL_PREFIX/lib/ocaml -lcamlidl \
	  -lbigarray" ]}

*)
