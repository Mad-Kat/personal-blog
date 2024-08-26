import { useCallback, useEffect, useState } from "react";
import { base32 } from "rfc4648";
import type { Algorithm, TOTP, TOTPSteps } from "./rust-totp/pkg";

let wasmModule: typeof import("./rust-totp/pkg") | null = null;

async function loadWasm() {
	if (wasmModule === null) {
		const module = await import("./rust-totp/pkg");
		await module.default();
		wasmModule = module;
	}
	return wasmModule;
}

interface TOTPConfig {
	secret: string;
	digits: number;
	algorithm: keyof typeof Algorithm;
	step?: number;
	t0?: number;
}

export function useTOTP(initialConfig: TOTPConfig) {
	const [config, setConfig] = useState<TOTPConfig>(initialConfig);
	const [totpValue, setTotpValue] = useState<string>("");
	const [remainingSeconds, setRemainingSeconds] = useState<number>(
		config.step ?? 30,
	);
	const [error, setError] = useState<string | null>(null);
	const [debug, setDebug] = useState<TOTPSteps>();

	useEffect(() => {
		let intervalId: NodeJS.Timeout;
		let totpInstance: TOTP | null = null;

		const initializeAndGenerate = async () => {
			try {
				const wasm = await loadWasm();

				const secretUint8 = new TextEncoder().encode(config.secret);
				totpInstance = wasm.TOTP.from_base32(
					config.secret,
					config.digits,
					wasm.Algorithm[config.algorithm],
				);

				if (config.step) {
					totpInstance = totpInstance.with_step(BigInt(config.step));
				}

				if (config.t0) {
					totpInstance = totpInstance.with_t0(BigInt(config.t0));
				}

				const updateTOTP = () => {
					if (totpInstance) {
						const debug = totpInstance.generateWithSteps();
						setTotpValue(debug.otp);

						const currentTime = Math.floor(Date.now() / 1000);
						const elapsedSeconds = currentTime % (config.step ?? 30);
						const newRemainingSeconds = (config.step ?? 30) - elapsedSeconds;
						setRemainingSeconds(newRemainingSeconds);

						setDebug(debug);
					}
				};

				updateTOTP(); // Generate initial TOTP
				intervalId = setInterval(updateTOTP, 1000); // Update every second
			} catch (err) {
				setError(err instanceof Error ? err.message : String(err));
			}
		};

		initializeAndGenerate();

		return () => {
			if (intervalId) {
				clearInterval(intervalId);
			}
		};
	}, [config.secret, config.digits, config.algorithm, config.step, config.t0]);

	const updateConfig = useCallback(
		(newConfig: React.SetStateAction<TOTPConfig>) => {
			setError(null);
			setConfig(newConfig);
		},
		[],
	);

	return {
		totpValue,
		remainingSeconds,
		error,
		updateConfig,
		debug,
	};
}
