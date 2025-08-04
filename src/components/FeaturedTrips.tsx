'use client';

export default function FeaturedTrips() {
  const trips = [
    {
      id: 1,
      title: 'Tokyo Adventure',
      destination: 'Tokyo, Japan',
      duration: '7 days',
      price: '$2,400',
      image: 'https://images.unsplash.com/photo-1493976040374-85c8e12f0c0e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      highlights: ['Shibuya Crossing', 'Mount Fuji', 'Traditional Ryokan', 'Sushi Workshop'],
      rating: 4.9,
      reviews: 142
    },
    {
      id: 2,
      title: 'European Capitals',
      destination: 'Paris → Rome → Berlin',
      duration: '12 days',
      price: '$3,800',
      image: 'https://images.unsplash.com/photo-1520986606214-8b456906c813?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      highlights: ['Eiffel Tower', 'Colosseum', 'Brandenburg Gate', 'High-speed Trains'],
      rating: 4.8,
      reviews: 98
    },
    {
      id: 3,
      title: 'Mediterranean Escape',
      destination: 'Tel Aviv → Cyprus → Santorini',
      duration: '10 days',
      price: '$2,900',
      image: 'https://images.unsplash.com/photo-1613395877344-13d4a8e0d49e?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      highlights: ['Beach Clubs', 'Ancient Ruins', 'Sunset Views', 'Local Cuisine'],
      rating: 4.7,
      reviews: 73
    }
  ];

  const renderStars = (rating: number) => {
    return (
      <div className="flex items-center">
        {[1, 2, 3, 4, 5].map((star) => (
          <svg
            key={star}
            className={`w-4 h-4 ${
              star <= rating ? 'text-yellow-400' : 'text-gray-300'
            }`}
            fill="currentColor"
            viewBox="0 0 20 20"
          >
            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
          </svg>
        ))}
        <span className="ml-1 text-sm text-gray-600">
          {rating} ({reviews} reviews)
        </span>
      </div>
    );
  };

  return (
    <section className="py-16 bg-white">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Featured Trip Packages
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Handcrafted itineraries designed by travel experts and powered by AI recommendations.
          </p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {trips.map((trip) => (
            <div
              key={trip.id}
              className="trip-card group cursor-pointer"
            >
              <div className="relative overflow-hidden">
                <img
                  src={trip.image}
                  alt={trip.title}
                  className="trip-card-image group-hover:scale-110 transform transition-transform duration-300"
                />
                <div className="absolute top-4 left-4 bg-primary-600 text-white px-3 py-1 rounded-full text-sm font-medium">
                  {trip.duration}
                </div>
                <div className="absolute top-4 right-4 bg-white px-3 py-1 rounded-full text-lg font-bold text-green-600">
                  {trip.price}
                </div>
              </div>
              
              <div className="trip-card-content">
                <h3 className="text-xl font-semibold text-gray-900 mb-1 group-hover:text-primary-600 transition-colors">
                  {trip.title}
                </h3>
                
                <p className="text-gray-600 mb-3 flex items-center">
                  <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  {trip.destination}
                </p>

                <div className="mb-4">
                  {renderStars(trip.rating)}
                </div>
                
                <div className="mb-4">
                  <h4 className="text-sm font-medium text-gray-900 mb-2">Trip Highlights:</h4>
                  <div className="flex flex-wrap gap-1">
                    {trip.highlights.map((highlight, index) => (
                      <span
                        key={index}
                        className="inline-block bg-gray-100 text-gray-700 text-xs px-2 py-1 rounded-full"
                      >
                        {highlight}
                      </span>
                    ))}
                  </div>
                </div>
                
                <div className="flex space-x-2">
                  <button className="flex-1 bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors duration-200">
                    View Details
                  </button>
                  <button className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition-colors duration-200">
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <div className="bg-gradient-to-r from-primary-600 to-primary-800 rounded-xl p-8 text-white">
            <h3 className="text-2xl font-bold mb-4">Ready for a Custom Trip?</h3>
            <p className="text-primary-100 mb-6 max-w-2xl mx-auto">
              Let our AI assistant create a personalized itinerary just for you. 
              Tell us your preferences, budget, and travel style.
            </p>
            <button className="bg-white text-primary-600 px-8 py-3 rounded-lg font-semibold hover:bg-gray-100 transition-colors duration-200">
              Start Custom Planning
            </button>
          </div>
        </div>
      </div>
    </section>
  );
}