"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();

  const [email, setEmail] = useState("producer@test.com");
  const [password, setPassword] = useState("123456");
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
                    placeholder="tuemail@empresa.com"
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

                  <input
                    className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#f2c94c]/10"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                  />
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
//     <div className="min-h-screen bg-slate-100">
//       <div className="grid min-h-screen lg:grid-cols-2">
//         <section className="relative hidden overflow-hidden lg:flex">
//           <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-sky-500 to-violet-600" />
//           <div className="absolute -left-16 top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
//           <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

//           <div className="relative z-10 flex w-full flex-col justify-between p-10 text-white">
//             <div className="flex items-center gap-3">
//               <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-xl font-black backdrop-blur">
//                 W
//               </div>
//               <div>
//                 <div className="text-2xl font-extrabold">wezet</div>
//                 <div className="text-sm text-white/80">Producer Console</div>
//               </div>
//             </div>

//             <div className="max-w-lg">
//               <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
//                 Gestión creativa y producción
//               </div>

//               <h1 className="mt-6 text-5xl font-extrabold leading-tight">
//                 Organiza proyectos, talentos y documentos en un solo lugar
//               </h1>

//               <p className="mt-5 text-lg leading-8 text-white/85">
//                 Accede a tu espacio de trabajo, administra tu equipo y mantén el flujo de producción
//                 alineado con una experiencia visual mucho más moderna.
//               </p>

//               <div className="mt-8 grid grid-cols-3 gap-3">
//                 <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
//                   <div className="text-2xl font-extrabold">Pro</div>
//                   <div className="mt-1 text-sm text-white/80">Gestión simple</div>
//                 </div>
//                 <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
//                   <div className="text-2xl font-extrabold">Team</div>
//                   <div className="mt-1 text-sm text-white/80">Trabajo colaborativo</div>
//                 </div>
//                 <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
//                   <div className="text-2xl font-extrabold">Docs</div>
//                   <div className="mt-1 text-sm text-white/80">Todo centralizado</div>
//                 </div>
//               </div>
//             </div>

//             <div className="text-sm text-white/70">
//               Acceso seguro para productores, creatives y equipos.
//             </div>
//           </div>
//         </section>

//         <section className="flex items-center justify-center p-6 md:p-10">
//           <div className="w-full max-w-md">
//             <div className="mb-8 text-center lg:hidden">
//               <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-xl font-black text-white shadow-lg">
//                 W
//               </div>
//               <h1 className="mt-4 text-3xl font-extrabold text-slate-900">wezet</h1>
//               <p className="mt-2 text-sm text-slate-500">Producer Console</p>
//             </div>

//             <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl md:p-8">
//               <div className="mb-6">
//                 <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
//                   Bienvenido
//                 </div>
//                 <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
//                   Iniciar sesión
//                 </h2>
//                 <p className="mt-2 text-sm text-slate-500">
//                   Entra con tu cuenta para continuar a tu panel de trabajo.
//                 </p>
//               </div>

//               <form onSubmit={onSubmit} className="space-y-5">
//                 <div>
//                   <label className="mb-2 block text-sm font-semibold text-slate-700">
//                     Email
//                   </label>
//                   <input
//                     className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
//                     value={email}
//                     onChange={(e) => setEmail(e.target.value)}
//                     placeholder="tuemail@empresa.com"
//                     type="email"
//                     autoComplete="email"
//                   />
//                 </div>

//                 <div>
//                   <div className="mb-2 flex items-center justify-between gap-3">
//                     <label className="block text-sm font-semibold text-slate-700">
//                       Contraseña
//                     </label>

//                     <Link
//                       href="/forgot-password"
//                       className="text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
//                     >
//                       ¿Olvidaste tu clave?
//                     </Link>
//                   </div>

//                   <input
//                     className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
//                     type="password"
//                     value={password}
//                     onChange={(e) => setPassword(e.target.value)}
//                     placeholder="Ingresa tu contraseña"
//                     autoComplete="current-password"
//                   />
//                 </div>

//                 {error ? (
//                   <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
//                     {error}
//                   </div>
//                 ) : null}

//                 <button
//                   type="submit"
//                   disabled={submitting || loading}
//                   className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
//                 >
//                   {submitting ? "Entrando..." : "Entrar"}
//                 </button>
//               </form>

//               <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
//                 Accede a proyectos, equipo, contactos, quotes y branding desde un solo lugar.
//               </div>

//               <div className="mt-6 text-center text-sm text-slate-500">
//                 ¿No tienes cuenta?{" "}
//                 <Link
//                   href="/register"
//                   className="font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
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


