import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { emitLogin } from "../socket";
import { useGameStore } from "../store";

export default function Login() {
	const setUsername = useGameStore((s) => s.setUsername);
	const [name, setName] = useState("");
	const [error, setError] = useState("");
	const navigate = useNavigate();

	function listGames(e: React.FormEvent) {
		e.preventDefault();
		const trimmed = name.trim();
		if (!trimmed) return;
		emitLogin(trimmed, (res) => {
			if (res.ok) {
				setUsername(trimmed);
				navigate("/dashboard");
			} else {
				setError(res.error ?? "Login failed");
			}
		});
	}

	return (
		<div className="flex min-h-screen items-center justify-center p-4">
			<div className="w-full max-w-sm rounded-lg border border-plum/40 bg-barn p-8 ember-glow text-plum">
				<h1 className="mb-1 text-center text-3xl text-barn-red ember-text">
					GRANGE
				</h1>
				<p className="mb-6 text-center text-xs tracking-widest text-husk">
					SOW · GROW · HARVEST
				</p>

				<form onSubmit={listGames} className="flex flex-col gap-4">
					<label className="flex flex-col gap-1 text-sm text-cream">
						Username
						<input
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="rounded border border-leaf/40 bg-barn-deep px-3 py-2 text-cream outline-none transition focus:border-leaf focus:ember-border text-leaf"
						/>
					</label>
					<button
						type="submit"
						className="rounded border border-barn-red/60 bg-barn-red/10 px-4 py-2 font-display text-sm font-bold uppercase tracking-wider text-barn-red transition hover:bg-barn-red/20 ember-glow"
					>
						List Games
					</button>
					{error && <p className="text-center text-sm text-pumpkin">{error}</p>}
				</form>
			</div>
		</div>
	);
}
