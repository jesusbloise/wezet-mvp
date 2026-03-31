"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

function EyeIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M2 12s3.5-7 10-7 10 7 10 7-3.5 7-10 7-10-7-10-7Z" />
      <circle cx="12" cy="12" r="3" />
    </svg>
  );
}

function EyeOffIcon() {
  return (
    <svg
      viewBox="0 0 24 24"
      className="h-5 w-5"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path d="M3 3l18 18" />
      <path d="M10.6 10.6A3 3 0 0 0 12 15a3 3 0 0 0 2.4-4.4" />
      <path d="M9.9 5.2A10.7 10.7 0 0 1 12 5c6.5 0 10 7 10 7a17.2 17.2 0 0 1-4.2 5.2" />
      <path d="M6.2 6.2A17.7 17.7 0 0 0 2 12s3.5 7 10 7a10.7 10.7 0 0 0 2.1-.2" />
    </svg>
  );
}

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (!loading && user) {
      router.push("/dashboard");
    }
  }, [loading, user, router]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);

    try {
      await login({ email, password });
      router.push("/dashboard");
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050913] text-white">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-[#050913]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(242,201,76,0.18),transparent_24%)]" />
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_center,rgba(37,99,235,0.18),transparent_32%)]" />
          <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.015),transparent_30%,rgba(255,255,255,0.008))]" />

          <div className="absolute left-[-40px] top-8 h-72 w-72 rounded-full bg-[#f2c94c]/10 blur-3xl" />
          <div className="absolute bottom-[-40px] right-8 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col justify-between px-8 py-10 xl:px-12">
            <div className="flex items-center">
              <div className="relative h-28 w-[280px] xl:h-32 xl:w-[320px]">
                <Image
                  src="/WEZET.png"
                  alt="Wezet"
                  fill
                  priority
                  unoptimized
                  className="object-contain object-left drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)]"
                />
              </div>
            </div>

            <div className="max-w-xl">
              <div className="inline-flex rounded-full border border-[#f2c94c]/30 bg-[#f2c94c]/10 px-4 py-2 font-ui text-sm uppercase tracking-[0.18em] text-[#f2c94c]">
                // Producer Workspace
              </div>

              <h1
                className="mt-7 text-5xl font-black leading-[1.02] xl:text-6xl"
                style={{
                  color: "#ffffff",
                  textShadow: "0 4px 18px rgba(0,0,0,0.38)",
                }}
              >
                Organiza proyectos,
                <br />
                talentos y documentos
                <br />
                en un solo lugar
              </h1>

              <p
                className="mt-6 max-w-[620px] text-xl leading-9"
                style={{ color: "#e5e7eb" }}
              >
                Accede a tu espacio de trabajo, administra tu equipo y mantén el flujo
                de producción alineado con una experiencia visual mucho más moderna.
              </p>

              <div className="mt-9 grid max-w-[560px] grid-cols-3 gap-4">
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
                  <div className="text-2xl font-extrabold text-[#f2c94c]">Pro</div>
                  <div className="mt-1 text-sm text-slate-300">Gestión simple</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
                  <div className="text-2xl font-extrabold text-[#f2c94c]">Team</div>
                  <div className="mt-1 text-sm text-slate-300">Trabajo colaborativo</div>
                </div>
                <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
                  <div className="text-2xl font-extrabold text-[#f2c94c]">Docs</div>
                  <div className="mt-1 text-sm text-slate-300">Todo centralizado</div>
                </div>
              </div>
            </div>

            <div className="font-ui text-sm uppercase tracking-[0.14em] text-slate-400">
              Acceso seguro para producers, creatives y equipos
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center bg-[#060b16] p-6 md:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:hidden">
              <div className="mx-auto relative h-24 w-[260px]">
                <Image
                  src="/WEZET.png"
                  alt="Wezet"
                  fill
                  priority
                  unoptimized
                  className="object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)]"
                />
              </div>
              <p className="mt-3 font-ui text-sm uppercase tracking-[0.16em] text-slate-400">
                Producer Workspace
              </p>
            </div>

            <div className="rounded-[30px] border border-white/10 bg-[#0a1120] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] md:p-8">
              <div className="mb-6">
                <div className="inline-flex rounded-full border border-[#f2c94c]/30 bg-[#f2c94c]/10 px-3 py-1 font-ui text-xs font-bold uppercase tracking-[0.18em] text-[#f2c94c]">
                  Bienvenido
                </div>

                <h2
                  className="mt-4 text-3xl font-extrabold tracking-tight"
                  style={{
                    color: "#ffffff",
                    textShadow: "0 3px 14px rgba(0,0,0,0.35)",
                  }}
                >
                  Iniciar sesión
                </h2>

                <p className="mt-2 text-sm text-slate-300">
                  Entra con tu cuenta para continuar a tu panel de trabajo.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-100">
                    Email
                  </label>
                  <input
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#f2c94c]/10"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ejemplo@empresa.com"
                    type="email"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-semibold text-slate-100">
                      Contraseña
                    </label>

                    <Link
                      href="/forgot-password"
                      className="text-sm font-semibold text-[#f2c94c] transition hover:underline"
                    >
                      ¿Olvidaste tu clave?
                    </Link>
                  </div>

                  <div className="relative">
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 pr-12 text-sm text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#f2c94c]/10"
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Ingresa tu contraseña"
                      autoComplete="current-password"
                    />

                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 rounded-xl p-2 text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-200"
                      aria-label={showPassword ? "Ocultar contraseña" : "Mostrar contraseña"}
                    >
                      {showPassword ? <EyeOffIcon /> : <EyeIcon />}
                    </button>
                  </div>
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold text-[#0b0f17] shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                >
                  {submitting ? "Entrando..." : "Entrar"}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
                Accede a proyectos, equipo, contactos, quotes y branding desde un solo lugar.
              </div>

              <div className="mt-6 text-center text-sm text-slate-400">
                ¿No tienes cuenta?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-[#f2c94c] transition hover:underline"
                >
                  Regístrate aquí
                </Link>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
}

// "use client";

// import Link from "next/link";
// import Image from "next/image";
// import { useAuth } from "@/context/AuthContext";
// import { useRouter } from "next/navigation";
// import { useEffect, useState } from "react";

// export default function LoginPage() {
//   const { login, user, loading } = useAuth();
//   const router = useRouter();

//   const [email, setEmail] = useState("producer@test.com");
//   const [password, setPassword] = useState("123456");
//   const [error, setError] = useState<string | null>(null);
//   const [submitting, setSubmitting] = useState(false);

//   useEffect(() => {
//     if (!loading && user) {
//       router.push("/dashboard");
//     }
//   }, [loading, user, router]);

//   const onSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError(null);
//     setSubmitting(true);

//     try {
//       await login({ email, password });
//       router.push("/dashboard");
//     } catch (e: any) {
//       setError(String(e?.message || e));
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-[#050913] text-white">
//       <div className="grid min-h-screen lg:grid-cols-2">
//         <section className="relative hidden overflow-hidden lg:flex">
//           <div className="absolute inset-0 bg-[#050913]" />
//           <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(242,201,76,0.18),transparent_24%)]" />
//           <div className="absolute inset-0 bg-[radial-gradient(circle_at_bottom_center,rgba(37,99,235,0.18),transparent_32%)]" />
//           <div className="absolute inset-0 bg-[linear-gradient(90deg,rgba(255,255,255,0.015),transparent_30%,rgba(255,255,255,0.008))]" />

//           <div className="absolute left-[-40px] top-8 h-72 w-72 rounded-full bg-[#f2c94c]/10 blur-3xl" />
//           <div className="absolute bottom-[-40px] right-8 h-96 w-96 rounded-full bg-blue-500/10 blur-3xl" />

//           <div className="relative z-10 flex w-full flex-col justify-between px-8 py-10 xl:px-12">
//             <div className="flex items-center">
//               <div className="relative h-28 w-[280px] xl:h-32 xl:w-[320px]">
//                 <Image
//                   src="/WEZET.png"
//                   alt="Wezet"
//                   fill
//                   priority
//                   unoptimized
//                   className="object-contain object-left drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)]"
//                 />
//               </div>
//             </div>

//             <div className="max-w-xl">
//               <div className="inline-flex rounded-full border border-[#f2c94c]/30 bg-[#f2c94c]/10 px-4 py-2 font-ui text-sm uppercase tracking-[0.18em] text-[#f2c94c]">
//                 // Producer Workspace
//               </div>

//               <h1
//                 className="mt-7 text-5xl font-black leading-[1.02] xl:text-6xl"
//                 style={{
//                   color: "#ffffff",
//                   textShadow: "0 4px 18px rgba(0,0,0,0.38)",
//                 }}
//               >
//                 Organiza proyectos,
//                 <br />
//                 talentos y documentos
//                 <br />
//                 en un solo lugar
//               </h1>

//               <p
//                 className="mt-6 max-w-[620px] text-xl leading-9"
//                 style={{ color: "#e5e7eb" }}
//               >
//                 Accede a tu espacio de trabajo, administra tu equipo y mantén el flujo
//                 de producción alineado con una experiencia visual mucho más moderna.
//               </p>

//               <div className="mt-9 grid max-w-[560px] grid-cols-3 gap-4">
//                 <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
//                   <div className="text-2xl font-extrabold text-[#f2c94c]">Pro</div>
//                   <div className="mt-1 text-sm text-slate-300">Gestión simple</div>
//                 </div>
//                 <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
//                   <div className="text-2xl font-extrabold text-[#f2c94c]">Team</div>
//                   <div className="mt-1 text-sm text-slate-300">Trabajo colaborativo</div>
//                 </div>
//                 <div className="rounded-2xl border border-white/10 bg-white/[0.05] p-5 backdrop-blur">
//                   <div className="text-2xl font-extrabold text-[#f2c94c]">Docs</div>
//                   <div className="mt-1 text-sm text-slate-300">Todo centralizado</div>
//                 </div>
//               </div>
//             </div>

//             <div className="font-ui text-sm uppercase tracking-[0.14em] text-slate-400">
//               Acceso seguro para producers, creatives y equipos
//             </div>
//           </div>
//         </section>

//         <section className="flex items-center justify-center bg-[#060b16] p-6 md:p-10">
//           <div className="w-full max-w-md">
//             <div className="mb-8 text-center lg:hidden">
//               <div className="mx-auto relative h-24 w-[260px]">
//                 <Image
//                   src="/WEZET.png"
//                   alt="Wezet"
//                   fill
//                   priority
//                   unoptimized
//                   className="object-contain drop-shadow-[0_6px_24px_rgba(0,0,0,0.55)]"
//                 />
//               </div>
//               <p className="mt-3 font-ui text-sm uppercase tracking-[0.16em] text-slate-400">
//                 Producer Workspace
//               </p>
//             </div>

//             <div className="rounded-[30px] border border-white/10 bg-[#0a1120] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] md:p-8">
//               <div className="mb-6">
//                 <div className="inline-flex rounded-full border border-[#f2c94c]/30 bg-[#f2c94c]/10 px-3 py-1 font-ui text-xs font-bold uppercase tracking-[0.18em] text-[#f2c94c]">
//                   Bienvenido
//                 </div>

//                 <h2
//                   className="mt-4 text-3xl font-extrabold tracking-tight"
//                   style={{
//                     color: "#ffffff",
//                     textShadow: "0 3px 14px rgba(0,0,0,0.35)",
//                   }}
//                 >
//                   Iniciar sesión
//                 </h2>

//                 <p className="mt-2 text-sm text-slate-300">
//                   Entra con tu cuenta para continuar a tu panel de trabajo.
//                 </p>
//               </div>

//               <form onSubmit={onSubmit} className="space-y-5">
//                 <div>
//                   <label className="mb-2 block text-sm font-semibold text-slate-100">
//                     Email
//                   </label>
//                   <input
//                     className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#f2c94c]/10"
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value)}
//                     placeholder="tuemail@empresa.com"
//                     type="email"
//                     autoComplete="email"
//                   />
//                 </div>

//                 <div>
//                   <div className="mb-2 flex items-center justify-between gap-3">
//                     <label className="block text-sm font-semibold text-slate-100">
//                       Contraseña
//                     </label>

//                     <Link
//                       href="/forgot-password"
//                       className="text-sm font-semibold text-[#f2c94c] transition hover:underline"
//                     >
//                       ¿Olvidaste tu clave?
//                     </Link>
//                   </div>

//                   <input
//                     className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#f2c94c]/10"
//                     type="password"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     placeholder="Ingresa tu contraseña"
//                     autoComplete="current-password"
//                   />
//                 </div>

//                 {error ? (
//                   <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
//                     {error}
//                   </div>
//                 ) : null}

//                 <button
//                   type="submit"
//                   disabled={submitting || loading}
//                   className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold text-[#0b0f17] shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
//                   style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
//                 >
//                   {submitting ? "Entrando..." : "Entrar"}
//                 </button>
//               </form>

//               <div className="mt-6 rounded-2xl border border-white/10 bg-white/[0.04] p-4 text-sm text-slate-300">
//                 Accede a proyectos, equipo, contactos, quotes y branding desde un solo lugar.
//               </div>

//               <div className="mt-6 text-center text-sm text-slate-400">
//                 ¿No tienes cuenta?{" "}
//                 <Link
//                   href="/register"
//                   className="font-semibold text-[#f2c94c] transition hover:underline"
//                 >
//                   Regístrate aquí
//                 </Link>
//               </div>
//             </div>
//           </div>
//         </section>
//       </div>
//     </div>
//   );
// }

