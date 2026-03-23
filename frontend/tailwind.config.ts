import type { Config } from "tailwindcss";

const config: Config = {
  content: [
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        wezet: {
          primary: "#2563eb",
          secondary: "#7c3aed",
          accent: "#06b6d4",
          text: "#0f172a",
          muted: "#64748b",
          surface: "#f8fafc",
        },
      },
      fontFamily: {
        display: ["var(--font-bebas)", "sans-serif"],
        body: ["var(--font-dm-sans)", "sans-serif"],
        ui: ["var(--font-dm-mono)", "monospace"],
      },
      borderRadius: {
        wezet: "24px",
      },
      boxShadow: {
        wezet: "0 20px 60px rgba(37,99,235,0.10)",
      },
      backgroundImage: {
        "wezet-gradient": "linear-gradient(135deg, #2563eb, #7c3aed)",
        "wezet-gradient-alt": "linear-gradient(135deg, #0ea5e9, #2563eb)",
      },
    },
  },
  plugins: [],
};

export default config;


// import type { Config } from "tailwindcss";

// const config: Config = {
//   content: [
//     "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
//     "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
//     "./src/context/**/*.{js,ts,jsx,tsx,mdx}",
//     "./src/lib/**/*.{js,ts,jsx,tsx,mdx}",
//   ],
//   theme: {
//     extend: {},
//   },
//   plugins: [],
// };

// export default config;