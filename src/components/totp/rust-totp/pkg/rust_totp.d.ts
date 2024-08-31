/* tslint:disable */
/* eslint-disable */
/**
*/
export enum Algorithm {
  SHA1 = 0,
  SHA256 = 1,
  SHA512 = 2,
}
export interface TOTPSteps {
    current_time: number;
    time_step: number;
    secret_bytes: string;
    time_bytes: string;
    hmac_input: string;
    hmac_result: string;
    offset: number;
    binary: number;
    otp_int: number;
    otp: string;
}

/**
*/
export class TOTP {
  free(): void;
/**
* @param {Uint8Array} secret
* @param {number} digits
* @param {Algorithm} algorithm
*/
  constructor(secret: Uint8Array, digits: number, algorithm: Algorithm);
/**
* @param {string} secret
* @param {number} digits
* @param {Algorithm} algorithm
* @returns {TOTP}
*/
  static from_base32(secret: string, digits: number, algorithm: Algorithm): TOTP;
/**
* @param {bigint} step
* @returns {TOTP}
*/
  with_step(step: bigint): TOTP;
/**
* @param {bigint} t0
* @returns {TOTP}
*/
  with_t0(t0: bigint): TOTP;
/**
* @returns {string}
*/
  generate(): string;
/**
* @returns {TOTPSteps}
*/
  generateWithSteps(): TOTPSteps;
}

export type InitInput = RequestInfo | URL | Response | BufferSource | WebAssembly.Module;

export interface InitOutput {
  readonly memory: WebAssembly.Memory;
  readonly __wbg_totp_free: (a: number) => void;
  readonly totp_new: (a: number, b: number, c: number, d: number) => number;
  readonly totp_from_base32: (a: number, b: number, c: number, d: number, e: number) => void;
  readonly totp_with_step: (a: number, b: number) => number;
  readonly totp_with_t0: (a: number, b: number) => number;
  readonly totp_generate: (a: number, b: number) => void;
  readonly totp_generateWithSteps: (a: number) => number;
  readonly __wbindgen_malloc: (a: number, b: number) => number;
  readonly __wbindgen_add_to_stack_pointer: (a: number) => number;
  readonly __wbindgen_realloc: (a: number, b: number, c: number, d: number) => number;
  readonly __wbindgen_free: (a: number, b: number, c: number) => void;
  readonly __wbindgen_exn_store: (a: number) => void;
}

export type SyncInitInput = BufferSource | WebAssembly.Module;
/**
* Instantiates the given `module`, which can either be bytes or
* a precompiled `WebAssembly.Module`.
*
* @param {SyncInitInput} module
*
* @returns {InitOutput}
*/
export function initSync(module: SyncInitInput): InitOutput;

/**
* If `module_or_path` is {RequestInfo} or {URL}, makes a request and
* for everything else, calls `WebAssembly.instantiate` directly.
*
* @param {InitInput | Promise<InitInput>} module_or_path
*
* @returns {Promise<InitOutput>}
*/
export default function __wbg_init (module_or_path?: InitInput | Promise<InitInput>): Promise<InitOutput>;
