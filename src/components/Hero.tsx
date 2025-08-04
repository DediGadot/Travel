'use client';

import { useState } from 'react';
import { useTranslations } from 'next-intl';
import Link from 'next/link';

export default function Hero() {
  const t = useTranslations('common');
  const [searchQuery, setSearchQuery] = useState('');

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      window.location.href = `/chat?q=${encodeURIComponent(searchQuery)}`;
    }
  };

  return (
    <div className="relative bg-gradient-to-r from-primary-600 to-primary-800 overflow-hidden">
      <div className="absolute inset-0">
        <img
          className="w-full h-full object-cover opacity-20"
          src="https://images.unsplash.com/photo-1488646953014-85cb44e25828?ixlib=rb-4.0.3&ixid=M3wxMjA3fDB8MHxwaG90by1wYWdlfHx8fGVufDB8fHx8fA%3D%3D&auto=format&fit=crop&w=2835&q=80"
          alt="Travel destination"
        />
        <div className="absolute inset-0 bg-primary-600 mix-blend-multiply" />
      </div>
      
      <div className="relative max-w-7xl mx-auto py-24 px-4 sm:py-32 sm:px-6 lg:px-8">
        <div className="text-center">
          <h1 className="text-4xl font-extrabold tracking-tight text-white sm:text-5xl lg:text-6xl">
            Plan Your Perfect Trip
          </h1>
          <p className="mt-6 max-w-3xl mx-auto text-xl text-primary-100">
            Use AI to discover amazing destinations, create personalized itineraries, 
            and book everything in one place. Available in English and Hebrew.
          </p>
          
          <div className="mt-10 max-w-2xl mx-auto">
            <form onSubmit={handleSearch} className="relative">
              <div className="flex rounded-lg shadow-lg">
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Where do you want to go? Ask me anything..."
                  className="flex-1 px-6 py-4 text-lg border-0 rounded-l-lg focus:ring-2 focus:ring-primary-300 focus:outline-none"
                />
                <button
                  type="submit"
                  className="px-8 py-4 bg-yellow-400 text-yellow-900 font-semibold rounded-r-lg hover:bg-yellow-300 focus:outline-none focus:ring-2 focus:ring-yellow-300 transition-colors duration-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                  </svg>
                </button>
              </div>
            </form>
            
            <div className="mt-6 flex flex-wrap justify-center gap-3">
              {[
                "Plan a 5-day trip to Tokyo",
                "Find romantic restaurants in Paris", 
                "Best activities in New York?",
                "Hotels under $200 per night"
              ].map((suggestion, index) => (
                <button
                  key={index}
                  onClick={() => setSearchQuery(suggestion)}
                  className="px-4 py-2 bg-white bg-opacity-20 text-white rounded-full text-sm hover:bg-opacity-30 transition-colors duration-200"
                >
                  {suggestion}
                </button>
              ))}
            </div>
          </div>

          <div className="mt-12 flex justify-center space-x-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-white">10M+</div>
              <div className="text-primary-200">Points of Interest</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">700K+</div>
              <div className="text-primary-200">Hotels</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-white">1.2K+</div>
              <div className="text-primary-200">Airlines</div>
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0">
        <svg
          className="w-full h-12 text-gray-50"
          preserveAspectRatio="none"
          viewBox="0 0 1200 120"
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z"
            fill="currentColor"
          />
        </svg>
      </div>
    </div>
  );
}