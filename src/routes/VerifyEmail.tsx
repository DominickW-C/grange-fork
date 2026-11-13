import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import type { AuthUser } from "../../shared/auth";
import { verifyEmail } from "../auth";
import { AccountCreatedDialog } from "./AccountCreatedDialog";

/**
 * Lands here from the emailed verification link. A successful verify starts a
 * session, so the account gets the celebration box first; Continue enters the
 * new farm. A bad link just explains why it failed.
 */
export default function VerifyEmail() {
	const [params] = useSearchParams();
	const token = params.get("token") ?? "";
	const [status, setStatus] = useState("Verifying your email…");
	const [created, setCreated] = useState<AuthUser | null>(null);
	const navigate = useNavigate();

	useEffect(() => {
		if (!token) {
			setStatus("This verification link is invalid or expired.");
			return;
		}

		let live = true;
		verifyEmail(token).then((res) => {
			if (!live) return;
			if (res.ok && res.user) {
				setCreated(res.user);
			} else {
				setStatus(res.error ?? "This verification link is invalid or expired.");
			}
		});
		return () => {
			live = false;
		};
	}, [token]);

	if (created) {
		return (
			<AccountCreatedDialog
				username={created.username}
				onContinue={() => navigate("/world")}
			/>
		);
	}

	return (
		<div className="flex min-h-screen flex-col items-center justify-center gap-4 p-4">
			<Link
				to="/"
				className="text-xs tracking-widest text-husk underline-offset-2 hover:text-leaf hover:underline"
			>
				Back to main menu
			</Link>
			<div className="w-full max-w-sm rounded-lg border border-plum/40 bg-barn p-8 ember-glow text-plum">
				<h1 className="mb-4 text-center text-2xl text-barn-red ember-text">
					Verify Email
				</h1>
				<p
					data-testid="verify-status"
					className="text-center text-sm text-cream"
				>
					{status}
				</p>
			</div>
		</div>
	);
}
