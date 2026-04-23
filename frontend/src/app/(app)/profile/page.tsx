"use client";

import { useEffect, useState } from "react";
import { api } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

type ProfileType = "creative" | "company" | "";

type Profile = {
  id: string;
  email: string;
  role: string;
  org_id?: string | null;
  created_at?: string;
  profile_type: ProfileType | null;
  display_name: string | null;
  phone: string | null;
  country: string | null;
  website: string | null;
  bio: string | null;
  specialty: string | null;
  portfolio: string | null;
  experience: string | null;
  company_name: string | null;
  tax_id: string | null;
  industry: string | null;
  address: string | null;
  avatar_url: string | null;
};

type FormState = {
  profile_type: ProfileType;
  display_name: string;
  phone: string;
  country: string;
  website: string;
  bio: string;
  specialty: string;
  portfolio: string;
  experience: string;
  company_name: string;
  tax_id: string;
  industry: string;
  address: string;
};

const emptyForm: FormState = {
  profile_type: "",
  display_name: "",
  phone: "",
  country: "",
  website: "",
  bio: "",
  specialty: "",
  portfolio: "",
  experience: "",
  company_name: "",
  tax_id: "",
  industry: "",
  address: "",
};

function toForm(profile: Profile): FormState {
  return {
    profile_type: (profile.profile_type as ProfileType) || "",
    display_name: profile.display_name || "",
    phone: profile.phone || "",
    country: profile.country || "",
    website: profile.website || "",
    bio: profile.bio || "",
    specialty: profile.specialty || "",
    portfolio: profile.portfolio || "",
    experience: profile.experience || "",
    company_name: profile.company_name || "",
    tax_id: profile.tax_id || "",
    industry: profile.industry || "",
    address: profile.address || "",
  };
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block">
      <div className="mb-2 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
        {label}
      </div>
      {children}
    </label>
  );
}

function inputClass(readOnly = false) {
  return [
    "w-full rounded-2xl border px-3 py-3 text-sm outline-none transition",
    readOnly
      ? "border-white/8 bg-white/[0.04] text-slate-500"
      : "border-white/8 bg-white/[0.04] text-white focus:bg-white/[0.06] focus:ring-2 focus:ring-[#f2c94c]/20",
  ].join(" ");
}

function sectionCardClass(tone: "yellow" | "blue" | "violet" = "yellow") {
  if (tone === "blue") {
    return "rounded-2xl border border-blue-500/20 bg-blue-500/10 p-4";
  }
  if (tone === "violet") {
    return "rounded-2xl border border-violet-500/20 bg-violet-500/10 p-4";
  }
  return "rounded-2xl border border-[#f2c94c]/20 bg-[#f2c94c]/10 p-4";
}

export default function ProfilePage() {
  const { user } = useAuth();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [profile, setProfile] = useState<Profile | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  async function loadProfile() {
    try {
      setLoading(true);
      setError("");
      const data = await api<Profile>("/me/profile");
      setProfile(data);
      setForm(toForm(data));
    } catch (err: any) {
      setError(err?.message || "No se pudo cargar el perfil.");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadProfile();
  }, []);

  function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSuccess("");

    try {
      const updated = await api<Profile>("/me/profile", {
        method: "PUT",
        body: JSON.stringify({
          ...form,
          profile_type: form.profile_type || null,
        }),
      });

      setProfile(updated);
      setForm(toForm(updated));
      setSuccess("Perfil guardado exitosamente");
    } catch (err: any) {
      setError(err?.message || "No se pudo guardar el perfil.");
    } finally {
      setSaving(false);
    }
  }

  const isCreative = form.profile_type === "creative";
  const isCompany = form.profile_type === "company";

  return (
    <div className="min-h-screen bg-[#070b14] px-4 py-8 text-white">
      <div className="mx-auto max-w-[760px]">
        <div className="overflow-hidden rounded-[28px] border border-white/8 bg-[#0d1320] shadow-sm">
          <div className="border-b border-white/8 px-6 py-5">
            <div className="font-ui text-[11px] uppercase tracking-[0.18em] text-slate-500">
              account profile
            </div>
              <h1
    className="mt-2 text-[26px] font-black"
    style={{
      color: "#ffffff",
      textShadow: "0 1px 10px rgba(0,0,0,0.35)",
    }}
  >
    Mi Perfil
  </h1>
            {/* <h1 className="mt-2 text-xl font-bold text-white">
              {isCreative
                ? "Mi Perfil Creativo"
                : isCompany
                ? "Perfil de Empresa"
                : "Mi Perfil"}
            </h1> */}
            <p className="mt-1 text-sm text-slate-500">
              Completa tu información para personalizar tu experiencia
            </p>
          </div>

          {loading ? (
            <div className="px-6 py-8 text-sm text-slate-400">Cargando perfil...</div>
          ) : (
            <form onSubmit={handleSave}>
              <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
                <div className="space-y-4">
                  <div className={sectionCardClass("yellow")}>
                              <h3
    className="mt-2 text-[18px] font-black"
    style={{
      color: "#ffffff",
      textShadow: "0 1px 10px rgba(0,0,0,0.35)",
    }}
  >
    Información Básica
  </h3>
                    {/* <h3 className="mb-3 text-sm font-semibold text-white">
                      Información Básica
                    </h3> */}

                    <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                      <Field label={isCreative ? "Nombre completo *" : "Nombre de contacto *"}>
                        <input
                          className={inputClass()}
                          value={form.display_name}
                          onChange={(e) => setField("display_name", e.target.value)}
                          placeholder={isCreative ? "Tu nombre" : "Nombre del representante"}
                        />
                      </Field>

                      <Field label="Email *">
                        <input
                          className={inputClass(true)}
                          value={profile?.email || user?.email || ""}
                          readOnly
                        />
                      </Field>

                      <Field label="Teléfono">
                        <input
                          className={inputClass()}
                          value={form.phone}
                          onChange={(e) => setField("phone", e.target.value)}
                          placeholder="+56 9 1234 5678"
                        />
                      </Field>

                      <Field label="País">
                        <input
                          className={inputClass()}
                          value={form.country}
                          onChange={(e) => setField("country", e.target.value)}
                          placeholder="Chile"
                        />
                      </Field>
                    </div>

                    <div className="mt-3">
                      <Field label="Tipo de perfil">
                        <select
                          className={inputClass()}
                          value={form.profile_type}
                          onChange={(e) =>
                            setField("profile_type", e.target.value as ProfileType)
                          }
                        >
                          <option value="">Seleccionar...</option>
                          <option value="creative">Creative</option>
                          <option value="company">Company</option>
                        </select>
                      </Field>
                    </div>

                    <div className="mt-3">
                      <Field label="Sitio web">
                        <input
                          className={inputClass()}
                          value={form.website}
                          onChange={(e) => setField("website", e.target.value)}
                          placeholder="https://tusitio.com"
                        />
                      </Field>
                    </div>
                  </div>

                  {isCreative && (
                    <div className={sectionCardClass("blue")}>
                      <h3 className="mb-3 text-sm font-semibold text-blue-300">
                        Información Profesional
                      </h3>

                      <div className="space-y-3">
                        <Field label="Especialidad / Profesión *">
                          <input
                            className={inputClass()}
                            value={form.specialty}
                            onChange={(e) => setField("specialty", e.target.value)}
                            placeholder="Diseño, desarrollo, edición..."
                          />
                        </Field>

                        <Field label="Portfolio / Behance / Dribbble">
                          <input
                            className={inputClass()}
                            value={form.portfolio}
                            onChange={(e) => setField("portfolio", e.target.value)}
                            placeholder="https://behance.net/tuusuario"
                          />
                        </Field>

                        <Field label="Años de experiencia">
                          <input
                            className={inputClass()}
                            value={form.experience}
                            onChange={(e) => setField("experience", e.target.value)}
                            placeholder="3-5 años"
                          />
                        </Field>

                        <Field label="Sobre ti">
                          <textarea
                            rows={3}
                            className={inputClass()}
                            value={form.bio}
                            onChange={(e) => setField("bio", e.target.value)}
                            placeholder="Cuéntanos sobre tu trabajo y experiencia..."
                          />
                        </Field>
                      </div>
                    </div>
                  )}

                  {isCompany && (
                    <div className={sectionCardClass("violet")}>
                      <h3 className="mb-3 text-sm font-semibold text-violet-300">
                        Información de la Empresa
                      </h3>

                      <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                        <Field label="Nombre de la empresa *">
                          <input
                            className={inputClass()}
                            value={form.company_name}
                            onChange={(e) => setField("company_name", e.target.value)}
                            placeholder="Mi Empresa SpA"
                          />
                        </Field>

                        <Field label="RUT / ID Fiscal">
                          <input
                            className={inputClass()}
                            value={form.tax_id}
                            onChange={(e) => setField("tax_id", e.target.value)}
                            placeholder="12.345.678-9"
                          />
                        </Field>

                        <div className="md:col-span-2">
                          <Field label="Industria / Rubro">
                            <input
                              className={inputClass()}
                              value={form.industry}
                              onChange={(e) => setField("industry", e.target.value)}
                              placeholder="Productora, agencia, software..."
                            />
                          </Field>
                        </div>

                        <div className="md:col-span-2">
                          <Field label="Dirección">
                            <input
                              className={inputClass()}
                              value={form.address}
                              onChange={(e) => setField("address", e.target.value)}
                              placeholder="Calle, número, ciudad"
                            />
                          </Field>
                        </div>

                        <div className="md:col-span-2">
                          <Field label="Descripción de la empresa">
                            <textarea
                              rows={3}
                              className={inputClass()}
                              value={form.bio}
                              onChange={(e) => setField("bio", e.target.value)}
                              placeholder="Cuéntanos qué hace tu empresa..."
                            />
                          </Field>
                        </div>
                      </div>
                    </div>
                  )}

                  <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 p-3">
                    <div className="text-xs text-emerald-200">
                      Esta información se usará para generar tus contratos y documentos de forma automática.
                    </div>
                  </div>

                  {error ? (
                    <div className="rounded-2xl border border-red-500/20 bg-red-500/10 px-4 py-3 text-sm text-red-300">
                      {error}
                    </div>
                  ) : null}

                  {success ? (
                    <div className="rounded-2xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
                      {success}
                    </div>
                  ) : null}
                </div>
              </div>

              <div className="flex gap-3 border-t border-white/8 px-6 py-4">
                <button
                  type="button"
                  onClick={loadProfile}
                  className="flex-1 rounded-xl bg-white/[0.06] px-4 py-3 text-sm font-medium text-slate-200 transition hover:bg-white/[0.1]"
                >
                  Cancelar
                </button>

                <button
                  type="submit"
                  disabled={saving || !(form.display_name && (profile?.email || user?.email))}
                  className="flex-1 rounded-xl px-4 py-3 text-sm font-bold text-[#0b0f17] transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
                  style={{ background: "linear-gradient(135deg,#f2c94c,#d4a72c)" }}
                >
                  {saving ? "Guardando..." : "Guardar Perfil"}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}

// "use client";

// import { useEffect, useState } from "react";
// import { api } from "@/lib/api";
// import { useAuth } from "@/context/AuthContext";

// type ProfileType = "creative" | "company" | "";

// type Profile = {
//   id: string;
//   email: string;
//   role: string;
//   org_id?: string | null;
//   created_at?: string;
//   profile_type: ProfileType | null;
//   display_name: string | null;
//   phone: string | null;
//   country: string | null;
//   website: string | null;
//   bio: string | null;
//   specialty: string | null;
//   portfolio: string | null;
//   experience: string | null;
//   company_name: string | null;
//   tax_id: string | null;
//   industry: string | null;
//   address: string | null;
//   avatar_url: string | null;
// };

// type FormState = {
//   profile_type: ProfileType;
//   display_name: string;
//   phone: string;
//   country: string;
//   website: string;
//   bio: string;
//   specialty: string;
//   portfolio: string;
//   experience: string;
//   company_name: string;
//   tax_id: string;
//   industry: string;
//   address: string;
// };

// const emptyForm: FormState = {
//   profile_type: "",
//   display_name: "",
//   phone: "",
//   country: "",
//   website: "",
//   bio: "",
//   specialty: "",
//   portfolio: "",
//   experience: "",
//   company_name: "",
//   tax_id: "",
//   industry: "",
//   address: "",
// };

// function toForm(profile: Profile): FormState {
//   return {
//     profile_type: (profile.profile_type as ProfileType) || "",
//     display_name: profile.display_name || "",
//     phone: profile.phone || "",
//     country: profile.country || "",
//     website: profile.website || "",
//     bio: profile.bio || "",
//     specialty: profile.specialty || "",
//     portfolio: profile.portfolio || "",
//     experience: profile.experience || "",
//     company_name: profile.company_name || "",
//     tax_id: profile.tax_id || "",
//     industry: profile.industry || "",
//     address: profile.address || "",
//   };
// }

// function Field({
//   label,
//   children,
// }: {
//   label: string;
//   children: React.ReactNode;
// }) {
//   return (
//     <label className="block">
//       <div className="mb-1 text-xs font-medium text-slate-500">{label}</div>
//       {children}
//     </label>
//   );
// }

// function inputClass(readOnly = false) {
//   return [
//     "w-full rounded-lg border border-slate-200 px-3 py-2.5 text-sm outline-none transition",
//     readOnly
//       ? "bg-slate-100 text-slate-500"
//       : "bg-slate-100 text-slate-900 focus:border-blue-400 focus:ring-2 focus:ring-blue-100",
//   ].join(" ");
// }

// export default function ProfilePage() {
//   const { user } = useAuth();

//   const [loading, setLoading] = useState(true);
//   const [saving, setSaving] = useState(false);
//   const [error, setError] = useState("");
//   const [success, setSuccess] = useState("");
//   const [profile, setProfile] = useState<Profile | null>(null);
//   const [form, setForm] = useState<FormState>(emptyForm);

//   async function loadProfile() {
//     try {
//       setLoading(true);
//       setError("");
//       const data = await api<Profile>("/me/profile");
//       setProfile(data);
//       setForm(toForm(data));
//     } catch (err: any) {
//       setError(err?.message || "No se pudo cargar el perfil.");
//     } finally {
//       setLoading(false);
//     }
//   }

//   useEffect(() => {
//     loadProfile();
//   }, []);

//   function setField<K extends keyof FormState>(key: K, value: FormState[K]) {
//     setForm((prev) => ({ ...prev, [key]: value }));
//   }

//   async function handleSave(e: React.FormEvent) {
//     e.preventDefault();
//     setSaving(true);
//     setError("");
//     setSuccess("");

//     try {
//       const updated = await api<Profile>("/me/profile", {
//         method: "PUT",
//         body: JSON.stringify({
//           ...form,
//           profile_type: form.profile_type || null,
//         }),
//       });

//       setProfile(updated);
//       setForm(toForm(updated));
//       setSuccess("Perfil guardado exitosamente");
//     } catch (err: any) {
//       setError(err?.message || "No se pudo guardar el perfil.");
//     } finally {
//       setSaving(false);
//     }
//   }

//   const isCreative = form.profile_type === "creative";
//   const isCompany = form.profile_type === "company";

//   return (
//     <div className="min-h-screen bg-slate-100 px-4 py-8">
//       <div className="mx-auto max-w-[620px]">
//         <div className="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-sm">
//           <div className="flex items-start justify-between border-b border-slate-200 px-6 py-5">
//             <div>
//               <h1 className="text-xl font-bold text-slate-800">
//                 {isCreative ? "Mi Perfil Creativo" : "Perfil de Empresa"}
//               </h1>
//               <p className="mt-1 text-sm text-slate-500">
//                 Completa tu información para personalizar tu experiencia
//               </p>
//             </div>
//           </div>

//           {loading ? (
//             <div className="px-6 py-8 text-sm text-slate-500">Cargando perfil...</div>
//           ) : (
//             <form onSubmit={handleSave}>
//               <div className="max-h-[70vh] overflow-y-auto px-6 py-6">
//                 <div className="space-y-4">
//                   <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
//                     <h3 className="mb-3 text-sm font-semibold text-blue-500">
//                       Información Básica
//                     </h3>

//                     <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
//                       <Field label={isCreative ? "Nombre completo *" : "Nombre de contacto *"}>
//                         <input
//                           className={inputClass()}
//                           value={form.display_name}
//                           onChange={(e) => setField("display_name", e.target.value)}
//                           placeholder={isCreative ? "Tu nombre" : "Nombre del representante"}
//                         />
//                       </Field>

//                       <Field label="Email *">
//                         <input
//                           className={inputClass(true)}
//                           value={profile?.email || user?.email || ""}
//                           readOnly
//                         />
//                       </Field>

//                       <Field label="Teléfono">
//                         <input
//                           className={inputClass()}
//                           value={form.phone}
//                           onChange={(e) => setField("phone", e.target.value)}
//                           placeholder="+56 9 1234 5678"
//                         />
//                       </Field>

//                       <Field label="País">
//                         <input
//                           className={inputClass()}
//                           value={form.country}
//                           onChange={(e) => setField("country", e.target.value)}
//                           placeholder="Chile"
//                         />
//                       </Field>
//                     </div>

//                     <div className="mt-3">
//                       <Field label="Tipo de perfil">
//                         <select
//                           className={inputClass()}
//                           value={form.profile_type}
//                           onChange={(e) =>
//                             setField("profile_type", e.target.value as ProfileType)
//                           }
//                         >
//                           <option value="">Seleccionar...</option>
//                           <option value="creative">Creative</option>
//                           <option value="company">Company</option>
//                         </select>
//                       </Field>
//                     </div>

//                     <div className="mt-3">
//                       <Field label="Sitio web">
//                         <input
//                           className={inputClass()}
//                           value={form.website}
//                           onChange={(e) => setField("website", e.target.value)}
//                           placeholder="https://tusitio.com"
//                         />
//                       </Field>
//                     </div>
//                   </div>

//                   {isCreative && (
//                     <div className="rounded-xl border border-amber-200 bg-amber-50/40 p-4">
//                       <h3 className="mb-3 text-sm font-semibold text-blue-500">
//                         Información Profesional
//                       </h3>

//                       <div className="space-y-3">
//                         <Field label="Especialidad / Profesión *">
//                           <input
//                             className={inputClass()}
//                             value={form.specialty}
//                             onChange={(e) => setField("specialty", e.target.value)}
//                             placeholder="Diseño, desarrollo, edición..."
//                           />
//                         </Field>

//                         <Field label="Portfolio / Behance / Dribbble">
//                           <input
//                             className={inputClass()}
//                             value={form.portfolio}
//                             onChange={(e) => setField("portfolio", e.target.value)}
//                             placeholder="https://behance.net/tuusuario"
//                           />
//                         </Field>

//                         <Field label="Años de experiencia">
//                           <input
//                             className={inputClass()}
//                             value={form.experience}
//                             onChange={(e) => setField("experience", e.target.value)}
//                             placeholder="3-5 años"
//                           />
//                         </Field>

//                         <Field label="Sobre ti">
//                           <textarea
//                             rows={3}
//                             className={inputClass()}
//                             value={form.bio}
//                             onChange={(e) => setField("bio", e.target.value)}
//                             placeholder="Cuéntanos sobre tu trabajo y experiencia..."
//                           />
//                         </Field>
//                       </div>
//                     </div>
//                   )}

//                   {isCompany && (
//                     <div className="rounded-xl border border-violet-200 bg-violet-50/40 p-4">
//                       <h3 className="mb-3 text-sm font-semibold text-violet-500">
//                         Información de la Empresa
//                       </h3>

//                       <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
//                         <Field label="Nombre de la empresa *">
//                           <input
//                             className={inputClass()}
//                             value={form.company_name}
//                             onChange={(e) => setField("company_name", e.target.value)}
//                             placeholder="Mi Empresa SpA"
//                           />
//                         </Field>

//                         <Field label="RUT / ID Fiscal">
//                           <input
//                             className={inputClass()}
//                             value={form.tax_id}
//                             onChange={(e) => setField("tax_id", e.target.value)}
//                             placeholder="12.345.678-9"
//                           />
//                         </Field>

//                         <div className="md:col-span-2">
//                           <Field label="Industria / Rubro">
//                             <input
//                               className={inputClass()}
//                               value={form.industry}
//                               onChange={(e) => setField("industry", e.target.value)}
//                               placeholder="Productora, agencia, software..."
//                             />
//                           </Field>
//                         </div>

//                         <div className="md:col-span-2">
//                           <Field label="Dirección">
//                             <input
//                               className={inputClass()}
//                               value={form.address}
//                               onChange={(e) => setField("address", e.target.value)}
//                               placeholder="Calle, número, ciudad"
//                             />
//                           </Field>
//                         </div>

//                         <div className="md:col-span-2">
//                           <Field label="Descripción de la empresa">
//                             <textarea
//                               rows={3}
//                               className={inputClass()}
//                               value={form.bio}
//                               onChange={(e) => setField("bio", e.target.value)}
//                               placeholder="Cuéntanos qué hace tu empresa..."
//                             />
//                           </Field>
//                         </div>
//                       </div>
//                     </div>
//                   )}

//                   <div className="rounded-xl border border-blue-200 bg-blue-50 p-3">
//                     <div className="text-xs text-blue-600">
//                       Esta información se usará para generar tus contratos y documentos de forma automática.
//                     </div>
//                   </div>

//                   {error ? (
//                     <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
//                       {error}
//                     </div>
//                   ) : null}

//                   {success ? (
//                     <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
//                       {success}
//                     </div>
//                   ) : null}
//                 </div>
//               </div>

//               <div className="flex gap-3 border-t border-slate-200 px-6 py-4">
//                 <button
//                   type="button"
//                   onClick={loadProfile}
//                   className="flex-1 rounded-xl bg-slate-200 px-4 py-3 text-sm font-medium text-slate-800 transition hover:bg-slate-300"
//                 >
//                   Cancelar
//                 </button>

//                 <button
//                   type="submit"
//                   disabled={saving || !(form.display_name && (profile?.email || user?.email))}
//                   className="flex-1 rounded-xl bg-gradient-to-r from-blue-500 to-sky-500 px-4 py-3 text-sm font-bold text-white transition hover:opacity-95 disabled:cursor-not-allowed disabled:opacity-60"
//                 >
//                   {saving ? "Guardando..." : "Guardar Perfil"}
//                 </button>
//               </div>
//             </form>
//           )}
//         </div>
//       </div>
//     </div>
//   );
// }
