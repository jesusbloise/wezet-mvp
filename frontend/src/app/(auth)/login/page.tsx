"use client";

import { useAuth } from "@/context/AuthContext";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function LoginPage() {
  const { login, user, loading } = useAuth();
  const router = useRouter();
  const [email, setEmail] = useState("producer@test.com");
  const [password, setPassword] = useState("123456");
  const [error, setError] = useState<string | null>(null);

  if (!loading && user) router.push("/dashboard");

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await login({ email, password });
      router.push("/dashboard");
    } catch (e: any) {
      setError(String(e.message || e));
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-6">
      <form onSubmit={onSubmit} className="w-full max-w-md rounded-2xl border p-6">
        <h1 className="text-xl font-bold mb-4">Iniciar sesión</h1>

        <label className="text-sm">Email</label>
        <input className="w-full border rounded-lg p-2 mb-3" value={email} onChange={(e) => setEmail(e.target.value)} />

        <label className="text-sm">Password</label>
        <input className="w-full border rounded-lg p-2 mb-3" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />

        {error && <div className="text-red-600 text-sm mb-3">{error}</div>}

        <button className="w-full bg-black text-white rounded-lg p-2">Entrar</button>
      </form>
    </div>
  );
}