import Navbar from '@/components/landing/Navbar';
import Hero from '@/components/landing/Hero';
import ServiceHorizontalScroll from '@/components/landing/ServiceHorizontalScroll';
import TrustStats from '@/components/landing/TrustStats';
import HowItWorks from '@/components/landing/HowItWorks';
import PopularServices from '@/components/landing/PopularServices';
import FeaturedStores from '@/components/landing/FeaturedStores';
import SellerBanner from '@/components/landing/SellerBanner';
import Footer from '@/components/landing/Footer';

export default function LandingPage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="flex-1">
        <Hero />
        <ServiceHorizontalScroll />
        <TrustStats />
        <HowItWorks />
        <FeaturedStores />
        <SellerBanner />
      </main>
      <Footer />
    </div>
  );
}
