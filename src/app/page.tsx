/* "/" menampilkan Rutina CSS Lab (public/lab.html) dalam kanvas penuh —
   pola bungkus-iframe yang sama dengan cangkang fallback Rutina.
   Aplikasi Rutina sendiri (public/rutina.html) tetap terbuka lewat
   tautan "Buka Rutina" di header & footer lab, dengan jembatan data
   /api/rutina yang ikut tersedia di proyek ini. */
export default function HomePage() {
  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 100,
        background: "#F8FAFC",
        height: "100dvh",
      }}
    >
      <iframe
        id="lab-frame"
        src="/lab.html"
        title="Rutina CSS Lab"
        style={{
          height: "100%",
          width: "100%",
          border: 0,
          display: "block",
        }}
      />
    </div>
  );
}
