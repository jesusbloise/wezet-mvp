"use client";

import Link from "next/link";
import { Suspense, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { api } from "@/lib/api";

function ResetPasswordContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const token = searchParams.get("token") || "";

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setMessage("");

    if (!token) {
      setError("Token no encontrado.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Las contraseñas no coinciden.");
      return;
    }

    setLoading(true);

    try {
      const res = await api<{ ok: true; message: string }>("/auth/reset-password", {
        method: "POST",
        body: JSON.stringify({ token, password }),
      });

      setMessage(res.message);

      setTimeout(() => {
        router.push("/login");
      }, 1500);
    } catch (err: any) {
      setError(err?.message || "No se pudo restablecer la contraseña.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
      <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white text-xl font-black">
          W
        </div>

        <h1 className="mt-5 text-center text-3xl font-extrabold text-slate-900">
          Nueva contraseña
        </h1>
        <p className="mt-2 text-center text-sm text-slate-500">
          Ingresa tu nueva clave para continuar.
        </p>

        <form onSubmit={onSubmit} className="mt-8 space-y-5">
          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Nueva contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          <div>
            <label className="mb-2 block text-sm font-semibold text-slate-700">
              Confirmar contraseña
            </label>
            <input
              type="password"
              className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
            />
          </div>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          {message ? (
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
              {message}
            </div>
          ) : null}

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
          >
            {loading ? "Guardando..." : "Guardar nueva contraseña"}
          </button>
        </form>

        <div className="mt-6 text-center text-sm text-slate-500">
          <Link href="/login" className="font-semibold text-blue-600 hover:underline">
            Volver al login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
          <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl text-center text-slate-500">
            Cargando...
          </div>
        </div>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}


// "use client";

// import Link from "next/link";
// import { useSearchParams, useRouter } from "next/navigation";
// import { useState } from "react";
// import { api } from "@/lib/api";

// export default function ResetPasswordPage() {
//   const searchParams = useSearchParams();
//   const router = useRouter();

//   const token = searchParams.get("token") || "";

//   const [password, setPassword] = useState("");
//   const [confirmPassword, setConfirmPassword] = useState("");
//   const [loading, setLoading] = useState(false);
//   const [message, setMessage] = useState("");
//   const [error, setError] = useState("");

//   async function onSubmit(e: React.FormEvent) {
//     e.preventDefault();
//     setError("");
//     setMessage("");

//     if (!token) {
//       setError("Token no encontrado.");
//       return;
//     }

//     if (password !== confirmPassword) {
//       setError("Las contraseñas no coinciden.");
//       return;
//     }

//     setLoading(true);

//     try {
//       const res = await api<{ ok: true; message: string }>("/auth/reset-password", {
//         method: "POST",
//         body: JSON.stringify({ token, password }),
//       });

//       setMessage(res.message);

//       setTimeout(() => {
//         router.push("/login");
//       }, 1500);
//     } catch (err: any) {
//       setError(err?.message || "No se pudo restablecer la contraseña.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   return (
//     <div className="min-h-screen bg-slate-100 flex items-center justify-center p-6">
//       <div className="w-full max-w-md rounded-[28px] border border-slate-200 bg-white p-8 shadow-xl">
//         <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-white text-xl font-black">
//           W
//         </div>

//         <h1 className="mt-5 text-center text-3xl font-extrabold text-slate-900">
//           Nueva contraseña
//         </h1>
//         <p className="mt-2 text-center text-sm text-slate-500">
//           Ingresa tu nueva clave para continuar.
//         </p>

//         <form onSubmit={onSubmit} className="mt-8 space-y-5">
//           <div>
//             <label className="mb-2 block text-sm font-semibold text-slate-700">
//               Nueva contraseña
//             </label>
//             <input
//               type="password"
//               className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
//               value={password}
//               onChange={(e) => setPassword(e.target.value)}
//               required
//               minLength={6}
//             />
//           </div>

//           <div>
//             <label className="mb-2 block text-sm font-semibold text-slate-700">
//               Confirmar contraseña
//             </label>
//             <input
//               type="password"
//               className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm outline-none focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
//               value={confirmPassword}
//               onChange={(e) => setConfirmPassword(e.target.value)}
//               required
//               minLength={6}
//             />
//           </div>

//           {error ? (
//             <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
//               {error}
//             </div>
//           ) : null}

//           {message ? (
//             <div className="rounded-2xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
//               {message}
//             </div>
//           ) : null}

//           <button
//             type="submit"
//             disabled={loading}
//             className="w-full rounded-2xl bg-gradient-to-r from-blue-600 to-violet-600 px-4 py-3.5 text-sm font-bold text-white transition hover:opacity-95 disabled:opacity-60"
//           >
//             {loading ? "Guardando..." : "Guardar nueva contraseña"}
//           </button>
//         </form>

//         <div className="mt-6 text-center text-sm text-slate-500">
//           <Link href="/login" className="font-semibold text-blue-600 hover:underline">
//             Volver al login
//           </Link>
//         </div>
//       </div>
//     </div>
//   );
// }
