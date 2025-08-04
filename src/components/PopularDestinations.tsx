'use client';

export default function PopularDestinations() {
  const destinations = [
    {
      id: 1,
      name: 'Tokyo, Japan',
      image: 'https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      description: 'Experience the perfect blend of traditional culture and modern innovation.',
      price: 'From $1,200',
      rating: 4.8
    },
    {
      id: 2,
      name: 'Paris, France',
      image: 'https://images.unsplash.com/photo-1502602898536-47ad22581b52?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      description: 'The city of lights awaits with romantic streets and world-class cuisine.',
      price: 'From $1,800',
      rating: 4.9
    },
    {
      id: 3,
      name: 'New York, USA',
      image: 'https://images.unsplash.com/photo-1496442226666-8d4d0e62e6e9?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      description: 'The city that never sleeps offers endless entertainment and culture.',
      price: 'From $1,500',
      rating: 4.7
    },
    {
      id: 4,
      name: 'Bali, Indonesia',
      image: 'https://images.unsplash.com/photo-1537953773345-d172ccf13cf1?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      description: 'Tropical paradise with stunning beaches and spiritual temples.',
      price: 'From $800',
      rating: 4.6
    },
    {
      id: 5,
      name: 'Tel Aviv, Israel',
      image: 'https://images.unsplash.com/photo-1544966503-7cc5ac882d5f?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      description: 'Mediterranean beaches meet vibrant nightlife and ancient history.',
      price: 'From $1,300',
      rating: 4.5
    },
    {
      id: 6,
      name: 'Istanbul, Turkey',
      image: 'https://images.unsplash.com/photo-1524231757912-21f4fe3a7200?ixlib=rb-4.0.3&auto=format&fit=crop&w=800&q=80',
      description: 'Where Europe meets Asia in a blend of cultures and flavors.',
      price: 'From $900',
      rating: 4.4
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
        <span className="ml-1 text-sm text-gray-600">{rating}</span>
      </div>
    );
  };

  return (
    <section className="py-16 bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h2 className="text-3xl font-bold text-gray-900 mb-4">
            Popular Destinations
          </h2>
          <p className="text-lg text-gray-600 max-w-2xl mx-auto">
            Discover the world's most loved destinations, handpicked by our AI and verified by millions of travelers.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {destinations.map((destination) => (
            <div
              key={destination.id}
              className="trip-card group cursor-pointer hover:scale-105 transform transition-all duration-300"
            >
              <div className="relative overflow-hidden">
                <img
                  src={destination.image}
                  alt={destination.name}
                  className="trip-card-image group-hover:scale-110 transform transition-transform duration-300"
                />
                <div className="absolute top-4 right-4 bg-white px-2 py-1 rounded-lg shadow-lg">
                  {renderStars(destination.rating)}
                </div>
              </div>
              
              <div className="trip-card-content">
                <div className="flex justify-between items-start mb-2">
                  <h3 className="text-xl font-semibold text-gray-900 group-hover:text-primary-600 transition-colors">
                    {destination.name}
                  </h3>
                  <span className="text-lg font-bold text-green-600">
                    {destination.price}
                  </span>
                </div>
                
                <p className="text-gray-600 mb-4">
                  {destination.description}
                </p>
                
                <button className="w-full bg-primary-600 text-white py-2 px-4 rounded-lg hover:bg-primary-700 transition-colors duration-200 group-hover:shadow-lg">
                  Explore {destination.name}
                </button>
              </div>
            </div>
          ))}
        </div>

        <div className="text-center mt-12">
          <button className="btn-secondary text-lg px-8 py-3">
            View All Destinations
          </button>
        </div>
      </div>
    </section>
  );
}