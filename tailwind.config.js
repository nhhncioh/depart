/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{ts,tsx,js,jsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        sans: [
          "-apple-system","SF Pro Text","SF Pro Display",
          "system-ui","Segoe UI","Helvetica Neue","Arial","Noto Sans","sans-serif"
        ],
      },
      boxShadow: {
        card: "0 1px 2px rgba(0,0,0,.06), 0 8px 24px rgba(0,0,0,.05)",
      },
      borderRadius: { xl: "14px", "2xl": "20px" },
    },
  },
  plugins: [],
};
