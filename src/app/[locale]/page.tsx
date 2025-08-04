import { useTranslations } from 'next-intl';
import { Suspense } from 'react';
import Link from 'next/link';
import Hero from '@/components/Hero';
import FeaturedTrips from '@/components/FeaturedTrips';
import PopularDestinations from '@/components/PopularDestinations';
import Navigation from '@/components/Navigation';

export default function HomePage() {
  const t = useTranslations('common');

  return (
    <div className="min-h-screen bg-gray-50">
      <Navigation />
      
      <main>
        <Suspense fallback={<div className="flex justify-center items-center h-64">
          <div className="spinner"></div>
        </div>}>
          <Hero />
        </Suspense>

        <section className="py-16 bg-white">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center mb-12">
              <h2 className="text-3xl font-bold text-gray-900 mb-4">
                Start Planning Your Perfect Trip
              </h2>
              <p className="text-lg text-gray-600 max-w-2xl mx-auto">
                Use our AI-powered assistant to discover amazing destinations, 
                create personalized itineraries, and book your next adventure.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
              <div className="text-center">
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">AI-Powered Chat</h3>
                <p className="text-gray-600">Chat with our intelligent assistant to plan your perfect trip based on your preferences.</p>
              </div>

              <div className="text-center">
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">Smart Recommendations</h3>
                <p className="text-gray-600">Get personalized suggestions for hotels, restaurants, and activities based on real data.</p>
              </div>

              <div className="text-center">
                <div className="bg-primary-100 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4">
                  <svg className="w-8 h-8 text-primary-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-gray-900 mb-2">One-Click Booking</h3>
                <p className="text-gray-600">Book flights, hotels, and activities directly through our platform with affiliate partnerships.</p>
              </div>
            </div>

            <div className="text-center mt-12">
              <Link href="/chat" className="btn-primary text-lg px-8 py-3">
                Start Planning Now
              </Link>
            </div>
          </div>
        </section>

        <Suspense fallback={<div className="py-16"><div className="spinner mx-auto"></div></div>}>
          <PopularDestinations />
        </Suspense>

        <Suspense fallback={<div className="py-16"><div className="spinner mx-auto"></div></div>}>
          <FeaturedTrips />
        </Suspense>
      </main>

      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <h3 className="text-lg font-semibold mb-4">Travel Assistant</h3>
              <p className="text-gray-400">Your AI-powered travel planning companion.</p>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Features</h4>
              <ul className="space-y-2 text-gray-400">
                <li>AI Chat Assistant</li>
                <li>Smart Itineraries</li>
                <li>Live Booking</li>
                <li>Magic Camera</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Support</h4>
              <ul className="space-y-2 text-gray-400">
                <li>Help Center</li>
                <li>Contact Us</li>
                <li>Terms of Service</li>
                <li>Privacy Policy</li>
              </ul>
            </div>
            <div>
              <h4 className="font-semibold mb-4">Languages</h4>
              <div className="flex space-x-4">
                <Link href="/en" className="text-gray-400 hover:text-white">English</Link>
                <Link href="/he" className="text-gray-400 hover:text-white">עברית</Link>
              </div>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 Travel Assistant. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}