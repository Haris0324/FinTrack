import Navbar from "@/components/layout/Navbar";
import Hero from "@/components/landing/Hero";
import Features from "@/components/landing/Features";
import CTA from "@/components/landing/CTA";
import Footer from "@/components/layout/Footer";

export default function Home() {
  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden">
      {/* Background radial gradient */}
      <div className="absolute top-[-20%] left-1/2 -translate-x-1/2 w-[800px] h-[800px] opacity-20 bg-primary/20 rounded-full blur-[120px] pointer-events-none" />
      
      <Navbar />
      
      <div className="flex-1 flex flex-col z-10 pt-16">
        <Hero />
        <Features />
        <CTA />
      </div>
      
      <Footer />
    </main>
  );
}
