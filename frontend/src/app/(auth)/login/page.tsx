"use client";

import Link from "next/link";
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
    <div className="min-h-screen bg-slate-100">
      <div className="grid min-h-screen lg:grid-cols-2">
        <section className="relative hidden overflow-hidden lg:flex">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-600 via-sky-500 to-violet-600" />
          <div className="absolute -left-16 top-16 h-72 w-72 rounded-full bg-white/10 blur-3xl" />
          <div className="absolute bottom-10 right-10 h-80 w-80 rounded-full bg-white/10 blur-3xl" />

          <div className="relative z-10 flex w-full flex-col justify-between p-10 text-white">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/20 text-xl font-black backdrop-blur">
                W
              </div>
              <div>
                <div className="text-2xl font-extrabold">wezet</div>
                <div className="text-sm text-white/80">Producer Console</div>
              </div>
            </div>

            <div className="max-w-lg">
              <div className="inline-flex rounded-full border border-white/20 bg-white/10 px-4 py-2 text-sm font-semibold backdrop-blur">
                Gestión creativa y producción
              </div>

              <h1 className="mt-6 text-5xl font-extrabold leading-tight">
                Organiza proyectos, talentos y documentos en un solo lugar
              </h1>

              <p className="mt-5 text-lg leading-8 text-white/85">
                Accede a tu espacio de trabajo, administra tu equipo y mantén el flujo de producción
                alineado con una experiencia visual mucho más moderna.
              </p>

              <div className="mt-8 grid grid-cols-3 gap-3">
                <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
                  <div className="text-2xl font-extrabold">Pro</div>
                  <div className="mt-1 text-sm text-white/80">Gestión simple</div>
                </div>
                <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
                  <div className="text-2xl font-extrabold">Team</div>
                  <div className="mt-1 text-sm text-white/80">Trabajo colaborativo</div>
                </div>
                <div className="rounded-2xl bg-white/12 p-4 backdrop-blur">
                  <div className="text-2xl font-extrabold">Docs</div>
                  <div className="mt-1 text-sm text-white/80">Todo centralizado</div>
                </div>
              </div>
            </div>

            <div className="text-sm text-white/70">
              Acceso seguro para productores, creatives y equipos.
            </div>
          </div>
        </section>

        <section className="flex items-center justify-center p-6 md:p-10">
          <div className="w-full max-w-md">
            <div className="mb-8 text-center lg:hidden">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-xl font-black text-white shadow-lg">
                W
              </div>
              <h1 className="mt-4 text-3xl font-extrabold text-slate-900">wezet</h1>
              <p className="mt-2 text-sm text-slate-500">Producer Console</p>
            </div>

            <div className="rounded-[28px] border border-slate-200 bg-white p-6 shadow-xl md:p-8">
              <div className="mb-6">
                <div className="inline-flex rounded-full bg-blue-50 px-3 py-1 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
                  Bienvenido
                </div>
                <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
                  Iniciar sesión
                </h2>
                <p className="mt-2 text-sm text-slate-500">
                  Entra con tu cuenta para continuar a tu panel de trabajo.
                </p>
              </div>

              <form onSubmit={onSubmit} className="space-y-5">
                <div>
                  <label className="mb-2 block text-sm font-semibold text-slate-700">
                    Email
                  </label>
                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="tuemail@empresa.com"
                    type="email"
                    autoComplete="email"
                  />
                </div>

                <div>
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <label className="block text-sm font-semibold text-slate-700">
                      Contraseña
                    </label>

                    <Link
                      href="/forgot-password"
                      className="text-sm font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
                    >
                      ¿Olvidaste tu clave?
                    </Link>
                  </div>

                  <input
                    className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Ingresa tu contraseña"
                    autoComplete="current-password"
                  />
                </div>

                {error ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {error}
                  </div>
                ) : null}

                <button
                  type="submit"
                  disabled={submitting || loading}
                  className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {submitting ? "Entrando..." : "Entrar"}
                </button>
              </form>

              <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                Accede a proyectos, equipo, contactos, quotes y branding desde un solo lugar.
              </div>

              <div className="mt-6 text-center text-sm text-slate-500">
                ¿No tienes cuenta?{" "}
                <Link
                  href="/register"
                  className="font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
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

// import { useAuth } from "@/context/AuthContext";
// import { useRouter } from "next/navigation";
// import { useState } from "react";

// export default function LoginPage() {
//   const { login, user, loading } = useAuth();
//   const router = useRouter();
//   const [email, setEmail] = useState("producer@test.com");
//   const [password, setPassword] = useState("123456");
//   const [error, setError] = useState<string | null>(null);

//   if (!loading && user) router.push("/dashboard");

//   const onSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError(null);
//     try {
//       await login({ email, password });
//       router.push("/dashboard");
//     } catch (e: any) {
//       setError(String(e.message || e));
//     }
//   };

//   return (
//     <div className="min-h-screen flex items-center justify-center p-6">
//       <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border p-6">
//         <h1 className="text-xl font-bold mb-4">Iniciar sesión</h1>

//         <label className="text-sm">Email</label>
//         <input className="w-full border rounded-lg p-2 mb-3" value={email} onChange={(e) => setEmail(e.target.value)} />

//         <label className="text-sm">Password</label>
//         <input className="w-full border rounded-lg p-2 mb-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

//         {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

//         <button className="w-full bg-black text-white rounded-lg p-2">Entrar</button>
//       </form>
//     </div>
//   );
// }