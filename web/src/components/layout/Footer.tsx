export default function Footer() {
  return (
    <footer className="py-8 px-6 border-t border-card-border mt-auto">
      <div className="max-w-5xl mx-auto flex flex-col items-center justify-center text-center">
        <p className="text-sm text-muted">
          © {new Date().getFullYear()} Fintrack. Final Year Project - AI-Powered Bitcoin News Analysis System
        </p>
      </div>
    </footer>
  );
}
