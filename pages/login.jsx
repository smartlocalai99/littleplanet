import { useState } from "react";
import { useRouter } from "next/router";
import { getUserFromRequest } from "@/lib/auth";
import Image from "next/image";
const DEMO_WHATSAPP_CODE = "482916";

const LOGIN_THEME = {
  primary: "#6968aa",
  primarySoft: "#f3f2ff",
  accent: "#ffd6ff",
  accentSoft: "#f3f2ff",
  ink: "#000000",
  muted: "#6b7280",
  surface: "#ffffff",
};

const WHATSAPP_THEME = {
  primary: "#25d366",
  primaryDark: "#128c7e",
  soft: "#eafaf1",
};

export async function getServerSideProps(context) {
  const user = await getUserFromRequest(context.req);

  if (user) {
    return {
      redirect: {
        destination: "/dashboard",
        permanent: false,
      },
    };
  }

  return { props: {} };
}

function PositivePrimeLogo() {
  return (
    <div className="relative h-42.5 w-57.5">
      <Image
        src="/accountslogo.png"
        alt="SmartBooks AI Logo"
        fill
        priority
        className="object-contain object-left"
      />
    </div>
  );
}

function MobileLoginLogo() {
  return (
    <div className="mb-4 flex justify-center sm:mb-6 lg:hidden">
      <div className="relative h-20 w-28 sm:h-44 sm:w-52">
        <Image
          src="/accountslogo.png"
          alt="SmartBooks AI Logo"
          fill
          priority
          className="object-contain"
        />
      </div>
    </div>
  );
}

function WhatsAppIcon({ className = "h-5 w-5" }) {
  return (
    <svg
      viewBox="0 0 32 32"
      fill="currentColor"
      className={className}
      aria-hidden="true"
    >
      <path d="M16.04 3C9.46 3 4.1 8.26 4.1 14.74c0 2.08.56 4.12 1.62 5.9L4 29l8.56-1.68a12.1 12.1 0 0 0 3.48.51c6.58 0 11.94-5.26 11.94-11.74S22.62 3 16.04 3Zm0 22.77c-1.14 0-2.26-.18-3.32-.55l-.48-.16-5.08 1 1.02-4.9-.25-.5a9.71 9.71 0 0 1-1.36-4.92c0-5.34 4.25-9.68 9.47-9.68 5.22 0 9.47 4.34 9.47 9.68s-4.25 10.03-9.47 10.03Zm5.47-7.25c-.3-.15-1.78-.87-2.06-.97-.28-.1-.48-.15-.68.15-.2.3-.78.97-.96 1.17-.18.2-.35.22-.65.07-.3-.15-1.27-.46-2.42-1.48-.9-.78-1.5-1.75-1.68-2.05-.18-.3-.02-.46.13-.61.13-.13.3-.35.45-.52.15-.17.2-.3.3-.5.1-.2.05-.37-.03-.52-.08-.15-.68-1.62-.93-2.22-.25-.58-.5-.5-.68-.51h-.58c-.2 0-.52.07-.8.37-.28.3-1.05 1.02-1.05 2.48s1.08 2.88 1.23 3.08c.15.2 2.13 3.23 5.16 4.52.72.31 1.28.5 1.72.64.72.23 1.38.2 1.9.12.58-.09 1.78-.72 2.03-1.42.25-.7.25-1.3.18-1.42-.08-.12-.28-.2-.58-.35Z" />
    </svg>
  );
}

function EyeIcon({ visible }) {
  return (
    <div
      className={`transition-all duration-300 ${
        visible
          ? "rotate-0 scale-110 text-[#6968aa]"
          : "rotate-[-8deg] scale-100 text-[#9ca3af]"
      }`}
    >
      {visible ? (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M2 12s3.5-6 10-6 10 6 10 6-3.5 6-10 6S2 12 2 12Z"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <circle cx="12" cy="12" r="3" stroke="currentColor" strokeWidth="2" />
        </svg>
      ) : (
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
          <path
            d="M3 3l18 18"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M10.6 10.6A2 2 0 0012 14a2 2 0 001.4-.6"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
          />
          <path
            d="M6.5 6.8C3.8 8.5 2 12 2 12s3.5 6 10 6c1.8 0 3.4-.5 4.7-1.2"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
          <path
            d="M21.7 12.4S18.5 6 12 6c-.8 0-1.6.1-2.3.3"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      )}
    </div>
  );
}

function WhatsAppFlowModal({
  open,
  phone,
  setPhone,
  code,
  setCode,
  stage,
  setStage,
  busy,
  setBusy,
  error,
  setError,
  onClose,
}) {
  if (!open) {
    return null;
  }

  async function handleSendCode(event) {
    event.preventDefault();
    setError("");

    if (!phone.trim()) {
      setError("Enter a username or WhatsApp number to continue.");
      return;
    }

    setBusy(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 900));
      setStage("verify");
    } finally {
      setBusy(false);
    }
  }

  async function handleVerifyCode(event) {
    event.preventDefault();
    setError("");

    if (code.trim().length !== 6) {
      setError("Enter the 6-digit code sent to WhatsApp.");
      return;
    }

    setBusy(true);

    try {
      await new Promise((resolve) => setTimeout(resolve, 700));

      if (code.trim() !== DEMO_WHATSAPP_CODE) {
        setError("That code does not match the demo WhatsApp message.");
        return;
      }

      setStage("success");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-[#071714]/60 px-4 backdrop-blur-sm">
      <div className="w-full max-w-140 overflow-hidden rounded-4xl border border-white/60 bg-white shadow-[0_30px_100px_rgba(6,20,18,0.28)]">
        <div
          className="px-6 py-5 text-white sm:px-8"
          style={{
            background: `linear-gradient(135deg, ${LOGIN_THEME.primary} 0%, #7d7ac0 56%, ${LOGIN_THEME.accent} 100%)`,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="text-sm font-semibold uppercase tracking-[0.28em] text-white/80">
                Secure recovery
              </p>
              <h2 className="mt-2 text-2xl font-bold sm:text-3xl">
                {stage === "verify" ? "Enter the code" : stage === "success" ? "Code verified" : "Recover access on WhatsApp"}
              </h2>
            </div>

            <button
              type="button"
              onClick={onClose}
              className="rounded-full bg-white/15 px-3 py-2 text-sm font-semibold text-white transition hover:bg-white/25"
            >
              Close
            </button>
          </div>
        </div>

        <div className="space-y-6 px-6 py-6 sm:px-8">
          <div className="rounded-3xl border border-[#e0def6] bg-[#f8f7ff] p-4">
            <p className="text-sm font-semibold uppercase tracking-[0.2em] text-[#5e5c9a]">
              WhatsApp recovery
            </p>
            <p className="mt-2 text-sm leading-6 text-[#5a587f]">
              We&apos;ll send a one-time code to your mobile number on WhatsApp. Enter that code here to continue.
            </p>
          </div>

          <form onSubmit={stage === "verify" ? handleVerifyCode : handleSendCode} className="space-y-4">
            <label className="block">
              <span className="mb-2 block text-sm font-semibold text-[#1f1f2d]">
                Mobile number
              </span>
              <input
                value={phone}
                onChange={(event) => {
                  setPhone(event.target.value);
                  setError("");
                }}
                placeholder="Enter your mobile number"
                className="h-14.5 w-full rounded-2xl border border-[#e0def6] bg-white px-4 text-base text-[#111827] outline-none transition focus:border-[#6968aa] focus:shadow-[0_0_0_4px_rgba(105,104,170,0.12)]"
                autoComplete="tel"
                inputMode="tel"
              />
            </label>

            {stage === "verify" && (
              <label className="block">
                <span className="mb-2 block text-sm font-semibold text-[#1f1f2d]">
                  6-digit code
                </span>
                <input
                  value={code}
                  onChange={(event) => {
                    setCode(event.target.value.replace(/\D/g, "").slice(0, 6));
                    setError("");
                  }}
                  placeholder="Enter the code"
                  className="h-14.5 w-full rounded-2xl border border-[#e0def6] bg-white px-4 text-base tracking-[0.35em] text-[#111827] outline-none transition focus:border-[#6968aa] focus:shadow-[0_0_0_4px_rgba(105,104,170,0.12)]"
                  inputMode="numeric"
                  maxLength={6}
                />
              </label>
            )}

            {error && (
              <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                {error}
              </div>
            )}

            {stage === "verify" && !error && (
              <div className="rounded-2xl border border-[#dff2e6] bg-[#f2fff6] px-4 py-3 text-sm text-[#2c6b44]">
                Code sent to WhatsApp ending in <span className="font-semibold">{phone.trim().slice(-2) || "••"}</span>.
                Use demo code <span className="font-semibold">{DEMO_WHATSAPP_CODE}</span>.
              </div>
            )}

            {stage === "success" && (
              <div className="rounded-2xl border border-[#dff2e6] bg-[#f2fff6] px-4 py-3 text-sm text-[#2c6b44]">
                Code accepted. You can return to login and continue.
              </div>
            )}

            <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
              <button
                type="button"
                onClick={onClose}
                className="h-13 rounded-full border border-[#d8d6ef] px-6 text-sm font-semibold text-[#1f1f2d] transition hover:bg-[#f3f2ff]"
              >
                Cancel
              </button>

              {stage === "verify" ? (
                <button
                  type="submit"
                  disabled={busy}
                  className="flex h-13 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ backgroundColor: WHATSAPP_THEME.primary }}
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  {busy ? "Checking..." : "Verify on WhatsApp"}
                </button>
              ) : stage === "success" ? (
                <button
                  type="button"
                  onClick={onClose}
                  className="h-13 rounded-full px-6 text-sm font-semibold text-white transition hover:opacity-95"
                  style={{ backgroundColor: WHATSAPP_THEME.primaryDark }}
                >
                  Back to login
                </button>
              ) : (
                <button
                  type="submit"
                  disabled={busy}
                  className="flex h-13 items-center gap-2 rounded-full px-6 text-sm font-semibold text-white transition hover:brightness-95 disabled:cursor-not-allowed disabled:opacity-70"
                  style={{ backgroundColor: WHATSAPP_THEME.primary }}
                >
                  <WhatsAppIcon className="h-5 w-5" />
                  {busy ? "Sending..." : "Send code on WhatsApp"}
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  const router = useRouter();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [forgotOpen, setForgotOpen] = useState(false);
  const [forgotStage, setForgotStage] = useState("request");
  const [forgotPhone, setForgotPhone] = useState("");
  const [forgotCode, setForgotCode] = useState("");
  const [forgotBusy, setForgotBusy] = useState(false);
  const [forgotError, setForgotError] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  function openForgotFlow(event) {
    event.preventDefault();
    setForgotOpen(true);
    setForgotStage("request");
    setForgotPhone(username);
    setForgotCode("");
    setForgotError("");
    setForgotBusy(false);
  }

  function closeForgotFlow() {
    setForgotOpen(false);
    setForgotStage("request");
    setForgotPhone("");
    setForgotCode("");
    setForgotError("");
    setForgotBusy(false);
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setLoading(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();

      if (!response.ok || !data.success) {
        throw new Error(data.message || "Unable to sign in");
      }

      await router.replace("/dashboard");
    } catch (loginError) {
      setError(loginError.message || "Unable to sign in");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main
      className="min-h-screen overflow-hidden bg-[#6968ab] lg:bg-white"
    >
      <div className="grid min-h-screen grid-cols-1 lg:grid-cols-[44%_56%]">
        <section
          className="relative hidden overflow-hidden lg:block"
          style={{ background: `linear-gradient(160deg, ${LOGIN_THEME.primary} 0%, #7774b9 48%, #5f5ea1 100%)` }}
        >
          <div className="absolute left-5 top-8 z-20">
            <PositivePrimeLogo />
          </div>

          <div className="absolute -right-40 -top-24 h-120 w-120 rounded-full border-95 border-[#ffd6ff]"></div>
          <div className="absolute -right-15 top-30 h-44 w-44 rotate-45 bg-[#ffd6ff]"></div>

          <div className="absolute -bottom-72 -left-40 h-130 w-130 rounded-full bg-[#7774b9]/55"></div>
          <div className="absolute -bottom-56 -left-64 h-125 w-125 rounded-full bg-[#5f5ea1]/45"></div>

          <div className="absolute bottom-12 left-10 z-20 text-white">
            <p className="text-3xl font-semibold text-white/92">Hey,</p>
            <p className="mt-4 text-3xl font-semibold text-white/92">Welcome To</p>
            <p className="mt-4 text-3xl font-semibold text-white">SmartBooks Ai</p>
          </div>
        </section>

        <section className="flex min-h-screen items-center justify-center px-4 py-5 sm:px-6 sm:py-10">
          <div className="w-full max-w-215">
            <MobileLoginLogo />
            <div className="relative rounded-3xl border border-white/70 bg-white/95 p-5 shadow-[0_22px_70px_rgba(16,36,31,0.16)] backdrop-blur sm:rounded-4xl sm:bg-white/80 sm:p-6 sm:shadow-[0_30px_90px_rgba(16,36,31,0.12)] xl:p-10">
              <div className="mx-auto w-full max-w-175">
              <div className="mb-6 flex items-center justify-between gap-4 sm:mb-10">
                <div>
                  <p className="text-xs font-semibold uppercase tracking-[0.28em] sm:text-sm" style={{ color: LOGIN_THEME.muted }}>
                    Secure access
                  </p>
                  <h1 className="mt-2 text-3xl font-extrabold sm:mt-3 sm:text-5xl" style={{ color: LOGIN_THEME.ink }}>
                    Login
                  </h1>
                </div>

                <div
                  className="hidden rounded-full px-4 py-2 text-sm font-semibold sm:block"
                  style={{ backgroundColor: LOGIN_THEME.accentSoft, color: LOGIN_THEME.ink }}
                >
                Smart Accounting
                </div>
              </div>

              <form onSubmit={handleSubmit}>
                <div className="space-y-4 sm:space-y-8">
                  <input
                    type="text"
                    value={username}
                    onChange={(event) => setUsername(event.target.value)}
                    placeholder="Username"
                    autoComplete="username"
                    required
                    className="h-14 w-full rounded-2xl border border-[#e0def6] bg-white px-4 text-base text-[#111827] shadow-[0_10px_30px_rgba(105,104,170,0.10)] outline-none transition-all duration-300 placeholder:text-[#9ca3af] focus:border-[#6968aa] focus:shadow-[0_12px_32px_rgba(105,104,170,0.18)] sm:h-19 sm:rounded-3xl sm:px-6 sm:text-lg"
                  />

                  <div className="relative">
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      placeholder="Password"
                      autoComplete="current-password"
                      required
                      className="h-14 w-full rounded-2xl border border-[#e0def6] bg-white px-4 pr-16 text-base text-[#111827] shadow-[0_10px_30px_rgba(105,104,170,0.10)] outline-none transition-all duration-300 placeholder:text-[#9ca3af] focus:border-[#6968aa] focus:shadow-[0_12px_32px_rgba(105,104,170,0.18)] sm:h-19 sm:rounded-3xl sm:px-6 sm:pr-20 sm:text-lg"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((value) => !value)}
                      className="absolute right-3 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full transition-all duration-300 hover:scale-110 active:scale-95 sm:right-5 sm:h-11 sm:w-11"
                      style={{ backgroundColor: LOGIN_THEME.primarySoft }}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                    >
                      <EyeIcon visible={showPassword} />
                    </button>
                  </div>
                </div>

                <div className="mt-5 flex items-center justify-end text-sm sm:mt-8 sm:text-base">
                  <button type="button" onClick={openForgotFlow} className="font-semibold transition" style={{ color: LOGIN_THEME.primary }}>
                    Forgot Password ?
                  </button>
                </div>

                {error && (
                  <div className="mt-6 rounded-2xl bg-red-50 px-5 py-3 text-center text-sm font-medium text-red-600">
                    {error}
                  </div>
                )}

                <div className="mt-7 flex justify-center sm:mt-10">
                  <button
                    type="submit"
                    disabled={loading}
                    className="h-14 w-full max-w-[320px] rounded-full text-base font-bold text-white shadow-[0_16px_30px_rgba(15,118,110,0.28)] transition-all duration-300 hover:scale-[1.03] active:scale-95 disabled:cursor-not-allowed disabled:opacity-60 sm:h-18 sm:text-xl"
                    style={{ backgroundColor: LOGIN_THEME.primary }}
                  >
                    {loading ? "LOGGING IN..." : "LOGIN"}
                  </button>
                </div>
              </form>
              </div>
            </div>
          </div>
        </section>
      </div>

      <WhatsAppFlowModal
        open={forgotOpen}
        phone={forgotPhone}
        setPhone={setForgotPhone}
        code={forgotCode}
        setCode={setForgotCode}
        stage={forgotStage}
        setStage={setForgotStage}
        busy={forgotBusy}
        setBusy={setForgotBusy}
        error={forgotError}
        setError={setForgotError}
        onClose={closeForgotFlow}
      />
    </main>
  );
}
