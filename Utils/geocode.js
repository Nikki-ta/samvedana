// const axios = require('axios');
// const Bottleneck = require('bottleneck');

// // Initialize Bottleneck to enforce rate limiting (1 request per second)
// const limiter = new Bottleneck({
//   minTime: 1000, // 1 second
// });

// /**
//  * Geocode an address (address, city, state and pincode) to get latitude and longitude.
//  * @param {string} address - The address to geocode (e.g., "Jiit, sector-62, Noida, Uttar Pradesh").
//  * @returns {Promise<{ latitude: number, longitude: number }>}
//  */
// async function getCoordinates(address) {
//   return limiter.schedule(async () => {
//     try {
//       const response = await axios.get('https://nominatim.openstreetmap.org/search', {
//         params: {
//           q: address,
//           format: 'json',
//           addressdetails: 1,
//           limit: 1,
//         },
//         headers: {
//           'User-Agent': 'Samvedana/1.0 (ribhanishal@gmail.com)', // Replace with your app name and contact email
//         },
//       });

//       if (response.data.length === 0) {
//         throw new Error('No results found for the given address.');
//       }

//       const location = response.data[0];
//       return {
//         latitude: parseFloat(location.lat),
//         longitude: parseFloat(location.lon),
//       };
//     } catch (error) {
//       console.error('Error fetching coordinates from OpenStreetMap:', error.message);
//       throw error;
//     }
//   });
// }

// module.exports = getCoordinates;

const axios = require('axios');
const Bottleneck = require('bottleneck');

// Initialize Bottleneck to enforce rate limiting (1 request per second)
const limiter = new Bottleneck({
  minTime: 1000, // 1 second
});

/**
 * Geocode an address (address, city, state, and pincode) to get latitude and longitude.
 * @param {string} address - The address to geocode (e.g., "Jiit, sector-62, Noida, Uttar Pradesh").
 * @returns {Promise<{ latitude: number, longitude: number }>}
 */
async function getCoordinates(address) {
  return limiter.schedule(async () => {
    try {
      const apiKey = '04b5f2f73deca0efd30e9a3965717a63'; // Replace with your PositionStack API key
      const url = `http://api.positionstack.com/v1/forward`;

      // Make the API request
      const response = await axios.get(url, {
        params: {
          access_key: apiKey,
          query: address,
          limit: 1, // Fetch only the most relevant result
        },
      });

      // Check if the response contains results
      if (!response.data || response.data.data.length === 0) {
        throw new Error('No results found for the given address.');
      }

      // Extract latitude and longitude
      const location = response.data.data[0];
      return {
        latitude: location.latitude,
        longitude: location.longitude,
      };
    } catch (error) {
      console.error('Error fetching coordinates from PositionStack:', error.message);
      throw error;
    }
  });
}

module.exports = getCoordinates;
