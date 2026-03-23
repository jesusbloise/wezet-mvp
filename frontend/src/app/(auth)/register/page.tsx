"use client";

import Link from "next/link";
import Image from "next/image";
import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";

type AccountType = "creative" | "producer" | null;

export default function RegisterPage() {
  const { register } = useAuth();
  const router = useRouter();

  const [step, setStep] = useState<1 | 2>(1);
  const [accountType, setAccountType] = useState<AccountType>(null);

  const [displayName, setDisplayName] = useState("");
  const [orgName, setOrgName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  const isCreative = accountType === "creative";
  const isProducer = accountType === "producer";

  const onSelectType = (type: AccountType) => {
    setAccountType(type);
    setError(null);
  };

  const goNext = () => {
    if (!accountType) return;
    setStep(2);
    setError(null);
  };

  const goBack = () => {
    setStep(1);
    setError(null);
  };

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (!accountType) {
      setError("Debes seleccionar un tipo de cuenta.");
      return;
    }

    setSubmitting(true);

    try {
      if (accountType === "creative") {
        await register({
          email,
          password,
          accountType: "creative",
          displayName,
        });
      } else {
        await register({
          email,
          password,
          accountType: "producer",
          orgName,
        });
      }

      router.push("/dashboard");
    } catch (e: any) {
      setError(String(e?.message || e));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#050913] text-white">
      <div className="flex min-h-screen items-center justify-center p-6">
        <div className="w-full max-w-5xl">
          <div className="mb-10 text-center">
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
            <p className="mt-4 font-ui text-sm uppercase tracking-[0.16em] text-slate-400">
              Creative Workspace
            </p>
          </div>

          <div className="mx-auto max-w-3xl rounded-[32px] border border-white/10 bg-[#0b1220] p-6 shadow-[0_20px_80px_rgba(0,0,0,0.45)] md:p-8">
            {step === 1 ? (
              <>
                <div className="text-center">
                  <div className="inline-flex rounded-full border border-[#f2c94c]/30 bg-[#f2c94c]/10 px-4 py-2 font-ui text-xs font-bold uppercase tracking-[0.18em] text-[#f2c94c]">
                    Demo MVP
                  </div>

                  <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-white">
                    ¿Cómo quieres usar Wezet?
                  </h2>

                  <p className="mt-3 text-base text-slate-400">
                    Selecciona tu perfil para personalizar tu experiencia
                  </p>
                </div>

                <div className="mt-8 grid gap-4 md:grid-cols-2">
                  <button
                    type="button"
                    onClick={() => onSelectType("creative")}
                    className={[
                      "rounded-[24px] border p-6 text-left transition",
                      isCreative
                        ? "border-[#f2c94c]/30 bg-[#f2c94c]/10 shadow-sm ring-2 ring-[#f2c94c]/15"
                        : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]",
                    ].join(" ")}
                  >
                    <div className="text-5xl">🎨</div>
                    <div className="mt-5 text-3xl font-bold text-white">
                      Soy Creativo
                    </div>
                    <p className="mt-4 text-lg leading-8 text-slate-400">
                      Freelancer, diseñador, fotógrafo, desarrollador o profesional independiente
                    </p>

                    <div className="mt-5 space-y-3 text-base text-slate-300">
                      <div>✓ Gestiona tus proyectos</div>
                      <div>✓ Crea contratos con IA</div>
                      <div>✓ Cobra más rápido</div>
                    </div>
                  </button>

                  <button
                    type="button"
                    onClick={() => onSelectType("producer")}
                    className={[
                      "rounded-[24px] border p-6 text-left transition",
                      isProducer
                        ? "border-[#f2c94c]/30 bg-[#f2c94c]/10 shadow-sm ring-2 ring-[#f2c94c]/15"
                        : "border-white/10 bg-white/[0.04] hover:bg-white/[0.06]",
                    ].join(" ")}
                  >
                    <div className="text-5xl">🏢</div>
                    <div className="mt-5 text-3xl font-bold text-white">
                      Empresa Creativa
                    </div>
                    <p className="mt-4 text-lg leading-8 text-slate-400">
                      Agencia, estudio, productora o equipo que trabaja con creativos
                    </p>

                    <div className="mt-5 space-y-3 text-base text-slate-300">
                      <div>✓ Gestiona múltiples proyectos</div>
                      <div>✓ Colabora con freelancers</div>
                      <div>✓ Centraliza acuerdos</div>
                    </div>
                  </button>
                </div>

                {error ? (
                  <div className="mt-6 rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                    {error}
                  </div>
                ) : null}

                <button
                  type="button"
                  onClick={goNext}
                  disabled={!accountType}
                  className="mt-7 w-full rounded-[22px] px-6 py-4 text-lg font-bold text-[#0b0f17] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                >
                  {accountType ? "Continuar" : "Selecciona una opción"}
                </button>

                <div className="mt-6 text-center text-sm text-slate-500">
                  Sin registro • Sin tarjeta de crédito • Acceso inmediato
                </div>
              </>
            ) : (
              <>
                <div className="mb-6 flex items-center justify-between gap-4">
                  <div>
                    <div
                      className={[
                        "inline-flex rounded-full px-4 py-2 font-ui text-xs font-bold uppercase tracking-[0.18em]",
                        "border border-[#f2c94c]/30 bg-[#f2c94c]/10 text-[#f2c94c]",
                      ].join(" ")}
                    >
                      {isCreative ? "Cuenta creativa" : "Cuenta empresa"}
                    </div>

                    <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-white">
                      {isCreative ? "Crea tu perfil creativo" : "Crea tu cuenta de empresa"}
                    </h2>

                    <p className="mt-2 text-sm text-slate-400">
                      {isCreative
                        ? "Completa tus datos para empezar a trabajar como creativo en WEZET."
                        : "Completa los datos de tu productora para empezar a gestionar tu equipo y proyectos."}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={goBack}
                    className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-2 text-sm font-semibold text-slate-300 hover:bg-white/[0.08]"
                  >
                    Volver
                  </button>
                </div>

                <form onSubmit={onSubmit} className="space-y-5">
                  {isCreative ? (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-200">
                        Nombre visible
                      </label>
                      <input
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#f2c94c]/10"
                        value={displayName}
                        onChange={(e) => setDisplayName(e.target.value)}
                        placeholder="Ej: Jesús Bloise"
                        required
                      />
                    </div>
                  ) : (
                    <div>
                      <label className="mb-2 block text-sm font-semibold text-slate-200">
                        Nombre de la empresa / productora
                      </label>
                      <input
                        className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#f2c94c]/10"
                        value={orgName}
                        onChange={(e) => setOrgName(e.target.value)}
                        placeholder="Ej: Wezet Studio"
                        required
                      />
                    </div>
                  )}

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Email
                    </label>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#f2c94c]/10"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="tuemail@empresa.com"
                      type="email"
                      autoComplete="email"
                      required
                    />
                  </div>

                  <div>
                    <label className="mb-2 block text-sm font-semibold text-slate-200">
                      Contraseña
                    </label>
                    <input
                      className="w-full rounded-2xl border border-white/10 bg-white/[0.05] px-4 py-3 text-sm text-white outline-none transition placeholder:text-slate-500 focus:bg-white/[0.07] focus:ring-4 focus:ring-[#f2c94c]/10"
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Mínimo 6 caracteres"
                      autoComplete="new-password"
                      minLength={6}
                      required
                    />
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  ) : null}

                  <button
                    type="submit"
                    disabled={submitting}
                    className="w-full rounded-2xl px-4 py-3.5 text-sm font-bold text-[#0b0f17] shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                    style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                  >
                    {submitting ? "Creando cuenta..." : "Crear cuenta"}
                  </button>
                </form>
              </>
            )}

            <div className="mt-8 text-center text-sm text-slate-500">
              ¿Ya tienes cuenta?{" "}
              <Link
                href="/login"
                className="font-semibold text-[#f2c94c] transition hover:underline"
              >
                Inicia sesión aquí
              </Link>
            </div>
          </div>

          <div className="mt-8 text-center text-sm text-slate-500">
            <button type="button" className="font-medium text-slate-400 hover:text-slate-200">
              Conocer más sobre Wezet →
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

// "use client";

// import Link from "next/link";
// import { useAuth } from "@/context/AuthContext";
// import { useRouter } from "next/navigation";
// import { useState } from "react";

// type AccountType = "creative" | "producer" | null;

// export default function RegisterPage() {
//   const { register } = useAuth();
//   const router = useRouter();

//   const [step, setStep] = useState<1 | 2>(1);
//   const [accountType, setAccountType] = useState<AccountType>(null);

//   const [displayName, setDisplayName] = useState("");
//   const [orgName, setOrgName] = useState("");
//   const [email, setEmail] = useState("");
//   const [password, setPassword] = useState("");

//   const [error, setError] = useState<string | null>(null);
//   const [submitting, setSubmitting] = useState(false);

//   const isCreative = accountType === "creative";
//   const isProducer = accountType === "producer";

//   const onSelectType = (type: AccountType) => {
//     setAccountType(type);
//     setError(null);
//   };

//   const goNext = () => {
//     if (!accountType) return;
//     setStep(2);
//     setError(null);
//   };

//   const goBack = () => {
//     setStep(1);
//     setError(null);
//   };

//   const onSubmit = async (e: React.FormEvent) => {
//     e.preventDefault();
//     setError(null);

//     if (!accountType) {
//       setError("Debes seleccionar un tipo de cuenta.");
//       return;
//     }

//     setSubmitting(true);

//     try {
//       if (accountType === "creative") {
//         await register({
//           email,
//           password,
//           accountType: "creative",
//           displayName,
//         });
//       } else {
//         await register({
//           email,
//           password,
//           accountType: "producer",
//           orgName,
//         });
//       }

//       router.push("/dashboard");
//     } catch (e: any) {
//       setError(String(e?.message || e));
//     } finally {
//       setSubmitting(false);
//     }
//   };

//   return (
//     <div className="min-h-screen bg-slate-100">
//       <div className="flex min-h-screen items-center justify-center p-6">
//         <div className="w-full max-w-4xl">
//           <div className="mb-10 text-center">
//             <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-blue-600 to-violet-600 text-2xl font-black text-white shadow-lg">
//               W
//             </div>
//             <h1 className="mt-5 text-4xl font-extrabold tracking-tight text-slate-900">
//               wezet
//             </h1>
//             <p className="mt-3 text-base text-slate-500">
//               Gestión inteligente de acuerdos para creativos
//             </p>
//           </div>

//           <div className="mx-auto max-w-3xl rounded-[32px] border border-slate-200 bg-white p-6 shadow-xl md:p-8">
//             {step === 1 ? (
//               <>
//                 <div className="text-center">
//                   <div className="inline-flex rounded-full bg-blue-50 px-4 py-2 text-xs font-bold uppercase tracking-[0.18em] text-blue-600">
//                     Demo MVP
//                   </div>

//                   <h2 className="mt-6 text-3xl font-extrabold tracking-tight text-slate-900">
//                     ¿Cómo quieres usar Wezet?
//                   </h2>

//                   <p className="mt-3 text-base text-slate-500">
//                     Selecciona tu perfil para personalizar tu experiencia
//                   </p>
//                 </div>

//                 <div className="mt-8 grid gap-4 md:grid-cols-2">
//                   <button
//                     type="button"
//                     onClick={() => onSelectType("creative")}
//                     className={[
//                       "rounded-[24px] border p-6 text-left transition",
//                       isCreative
//                         ? "border-blue-400 bg-blue-50 shadow-sm ring-4 ring-blue-100"
//                         : "border-slate-200 bg-white hover:border-blue-200 hover:bg-slate-50",
//                     ].join(" ")}
//                   >
//                     <div className="text-5xl">🎨</div>
//                     <div className="mt-5 text-3xl font-bold text-slate-900">
//                       Soy Creativo
//                     </div>
//                     <p className="mt-4 text-lg leading-8 text-slate-500">
//                       Freelancer, diseñador, fotógrafo, desarrollador o profesional independiente
//                     </p>

//                     <div className="mt-5 space-y-3 text-base text-slate-600">
//                       <div>✓ Gestiona tus proyectos</div>
//                       <div>✓ Crea contratos con IA</div>
//                       <div>✓ Cobra más rápido</div>
//                     </div>
//                   </button>

//                   <button
//                     type="button"
//                     onClick={() => onSelectType("producer")}
//                     className={[
//                       "rounded-[24px] border p-6 text-left transition",
//                       isProducer
//                         ? "border-violet-400 bg-violet-50 shadow-sm ring-4 ring-violet-100"
//                         : "border-slate-200 bg-white hover:border-violet-200 hover:bg-slate-50",
//                     ].join(" ")}
//                   >
//                     <div className="text-5xl">🏢</div>
//                     <div className="mt-5 text-3xl font-bold text-slate-900">
//                       Empresa Creativa
//                     </div>
//                     <p className="mt-4 text-lg leading-8 text-slate-500">
//                       Agencia, estudio, productora o equipo que trabaja con creativos
//                     </p>

//                     <div className="mt-5 space-y-3 text-base text-slate-600">
//                       <div>✓ Gestiona múltiples proyectos</div>
//                       <div>✓ Colabora con freelancers</div>
//                       <div>✓ Centraliza acuerdos</div>
//                     </div>
//                   </button>
//                 </div>

//                 {error ? (
//                   <div className="mt-6 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
//                     {error}
//                   </div>
//                 ) : null}

//                 <button
//                   type="button"
//                   onClick={goNext}
//                   disabled={!accountType}
//                   className="mt-7 w-full rounded-[22px] bg-gradient-to-r from-blue-600 to-violet-600 px-6 py-4 text-lg font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400 disabled:opacity-100"
//                 >
//                   {accountType ? "Continuar" : "Selecciona una opción"}
//                 </button>

//                 <div className="mt-6 text-center text-sm text-slate-500">
//                   Sin registro • Sin tarjeta de crédito • Acceso inmediato
//                 </div>
//               </>
//             ) : (
//               <>
//                 <div className="mb-6 flex items-center justify-between gap-4">
//                   <div>
//                     <div
//                       className={[
//                         "inline-flex rounded-full px-4 py-2 text-xs font-bold uppercase tracking-[0.18em]",
//                         isCreative
//                           ? "bg-blue-50 text-blue-600"
//                           : "bg-violet-50 text-violet-600",
//                       ].join(" ")}
//                     >
//                       {isCreative ? "Cuenta creativa" : "Cuenta empresa"}
//                     </div>

//                     <h2 className="mt-4 text-3xl font-extrabold tracking-tight text-slate-900">
//                       {isCreative ? "Crea tu perfil creativo" : "Crea tu cuenta de empresa"}
//                     </h2>

//                     <p className="mt-2 text-sm text-slate-500">
//                       {isCreative
//                         ? "Completa tus datos para empezar a trabajar como creativo en WEZET."
//                         : "Completa los datos de tu productora para empezar a gestionar tu equipo y proyectos."}
//                     </p>
//                   </div>

//                   <button
//                     type="button"
//                     onClick={goBack}
//                     className="rounded-2xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
//                   >
//                     Volver
//                   </button>
//                 </div>

//                 <form onSubmit={onSubmit} className="space-y-5">
//                   {isCreative ? (
//                     <div>
//                       <label className="mb-2 block text-sm font-semibold text-slate-700">
//                         Nombre visible
//                       </label>
//                       <input
//                         className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
//                         value={displayName}
//                         onChange={(e) => setDisplayName(e.target.value)}
//                         placeholder="Ej: Jesús Bloise"
//                         required
//                       />
//                     </div>
//                   ) : (
//                     <div>
//                       <label className="mb-2 block text-sm font-semibold text-slate-700">
//                         Nombre de la empresa / productora
//                       </label>
//                       <input
//                         className="w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-violet-400 focus:ring-4 focus:ring-violet-100"
//                         value={orgName}
//                         onChange={(e) => setOrgName(e.target.value)}
//                         placeholder="Ej: Wezet Studio"
//                         required
//                       />
//                     </div>
//                   )}

//                   <div>
//                     <label className="mb-2 block text-sm font-semibold text-slate-700">
//                       Email
//                     </label>
//                     <input
//                       className={[
//                         "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition",
//                         isCreative
//                           ? "focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
//                           : "focus:border-violet-400 focus:ring-4 focus:ring-violet-100",
//                       ].join(" ")}
//                       value={email}
//                       onChange={(e) => setEmail(e.target.value)}
//                       placeholder="tuemail@empresa.com"
//                       type="email"
//                       autoComplete="email"
//                       required
//                     />
//                   </div>

//                   <div>
//                     <label className="mb-2 block text-sm font-semibold text-slate-700">
//                       Contraseña
//                     </label>
//                     <input
//                       className={[
//                         "w-full rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-900 outline-none transition",
//                         isCreative
//                           ? "focus:border-blue-400 focus:ring-4 focus:ring-blue-100"
//                           : "focus:border-violet-400 focus:ring-4 focus:ring-violet-100",
//                       ].join(" ")}
//                       type="password"
//                       value={password}
//                       onChange={(e) => setPassword(e.target.value)}
//                       placeholder="Mínimo 6 caracteres"
//                       autoComplete="new-password"
//                       minLength={6}
//                       required
//                     />
//                   </div>

//                   {error ? (
//                     <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
//                       {error}
//                     </div>
//                   ) : null}

//                   <button
//                     type="submit"
//                     disabled={submitting}
//                     className={[
//                       "w-full rounded-2xl px-4 py-3.5 text-sm font-bold text-white shadow-sm transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60",
//                       isCreative
//                         ? "bg-gradient-to-r from-blue-600 to-sky-500"
//                         : "bg-gradient-to-r from-violet-600 to-blue-600",
//                     ].join(" ")}
//                   >
//                     {submitting ? "Creando cuenta..." : "Crear cuenta"}
//                   </button>
//                 </form>
//               </>
//             )}

//             <div className="mt-8 text-center text-sm text-slate-500">
//               ¿Ya tienes cuenta?{" "}
//               <Link
//                 href="/login"
//                 className="font-semibold text-blue-600 transition hover:text-blue-700 hover:underline"
//               >
//                 Inicia sesión aquí
//               </Link>
//             </div>
//           </div>

//           <div className="mt-8 text-center text-sm text-slate-500">
//             <button type="button" className="font-medium text-slate-500 hover:text-slate-700">
//               Conocer más sobre Wezet →
//             </button>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }


