const properties = require('./json/properties.json');
const users = require('./json/users.json');
const { Pool } = require('pg');

const pool = new Pool ({
  user: 'vagrant',
  password: '123',
  host: 'localhost',
  database: 'lightbnb'
})


/// Users

/**
 * Get a single user from the database given their email.
 * @param {String} email The email of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithEmail = function(email) {
  return pool
    .query(`
      SELECT * 
      FROM users
      WHERE users.email = $1;`, [email])
    .then((result) => {
      return result.rows[0] || null;
    });
}
exports.getUserWithEmail = getUserWithEmail;

/**
 * Get a single user from the database given their id.
 * @param {string} id The id of the user.
 * @return {Promise<{}>} A promise to the user.
 */
const getUserWithId = function(id) {
    return pool
      .query(`
        SELECT * 
        FROM users
        WHERE id = $1;`, [id])
      .then((result) => {
      return result.rows[0] || null;
    });
}
exports.getUserWithId = getUserWithId;


/**
 * Add a new user to the database.
 * @param {{name: string, password: string, email: string}} user
 * @return {Promise<{}>} A promise to the user.
 */
const addUser =  function(user) {
  const values = [user.name, user.email, user.password];
  return pool
    .query(`
      INSERT INTO users (name, email, password) 
      VALUES ($1, $2, $3)
      RETURNING *;`, values)
    .then((result) => {
      console.log(result.rows[0]);
      return result.rows[0];
    })
    .catch((error => {
      console.log(error);
    }));
}
exports.addUser = addUser;

/// Reservations

/**
 * Get all reservations for a single user.
 * @param {string} guest_id The id of the user.
 * @return {Promise<[{}]>} A promise to the reservations.
 */
const getAllReservations = function(guest_id, limit = 10) {
  const values = [guest_id, limit];
  return pool
    .query(`
    SELECT reservations.*, properties.*, AVG(rating) as average_rating
    FROM reservations
    JOIN properties ON properties.id = reservations.property_id
    JOIN property_reviews ON properties.id = property_reviews.property_id
    WHERE reservations.guest_id = $1 
    AND reservations.end_date < now()::date
    GROUP BY reservations.id, properties.id
    ORDER BY reservations.start_date
    LIMIT $2;`, values)
    .then((result) => result.rows)
    .catch((err) => console.log("query error", err));
}
exports.getAllReservations = getAllReservations;

/// Properties

/**
 * Get all properties.
 * @param {{}} options An object containing query options.
 * @param {*} limit The number of results to return.
 * @return {Promise<[{}]>}  A promise to the properties.
 */
const getAllProperties = (options, limit = 10) => {
 // 1 Setup an array to hold any parameters that may be available for the query
 const queryParams = [];
 // 2 Start the query with all information that comes before the WHERE clause
 let queryString = `
 SELECT properties.*, avg(property_reviews.rating) as average_rating
 FROM properties
 JOIN property_reviews ON properties.id = property_id
 `;

 // 3 Check if a city has been passed in as an option. Add the city to the params array and create a WHERE clause 
 if (options.city) {
   queryParams.push(`%${options.city}%`);
   queryString += `WHERE city LIKE $${queryParams.length} `;
 }

 if (options.owner_id) {
  queryParams.push(options.owner_id);
  if (queryParams.length === 1) {
    queryString += `WHERE owner_id = $${queryParams.length} `;
  } else {
    queryString += `AND owner_id = $${queryParams.length} `;
  }
}

if (options.minimum_price_per_night && options.maximum_price_per_night) {
  queryParams.push(options.minimum_price_per_night * 100, options.maximum_price_per_night * 100);
  if (queryParams.length === 2) {
    queryString += `WHERE cost_per_night >= $${queryParams.length - 1} AND cost_per_night <= $${queryParams.length} `;
  } else {
    queryString += `AND cost_per_night >= $${queryParams.length - 1} AND cost_per_night <= $${queryParams.length} `;
  }
}
 
 // 4 Add any query that comes after the WHERE clause
 queryString += `
  GROUP BY properties.id
  `;

if (options.minimum_rating) {
  queryParams.push(options.minimum_rating);
  queryString += `HAVING avg(property_reviews.rating) >= $${queryParams.length} `;
}
 queryParams.push(limit);
 queryString += `
 ORDER BY cost_per_night
 LIMIT $${queryParams.length};
 `;

 // 5 Console log everything just to make sure we've done it right
 console.log(queryString, queryParams);

 // 6 Run the query
 return pool.query(queryString, queryParams).then((res) => res.rows);
};
exports.getAllProperties = getAllProperties;


/**
 * Add a property to the database
 * @param {{}} property An object containing all of the property details.
 * @return {Promise<{}>} A promise to the property.
 */
const addProperty = function(property) {
  const queryString = `
    INSERT INTO properties (owner_id, title, description, thumbnail_photo_url, cover_photo_url, cost_per_night, street, city, province, post_code, country, parking_spaces, number_of_bathrooms, number_of_bedrooms)
    VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14)
    RETURNING *;
  `;
  const values = [
    property.owner_id,
    property.title,
    property.description,
    property.thumbnail_photo_url,
    property.cover_photo_url,
    property.cost_per_night * 100,
    property.street,
    property.city,
    property.province,
    property.post_code,
    property.country,
    property.parking_spaces,
    property.number_of_bathrooms,
    property.number_of_bedrooms
  ];
  
  return pool
    .query(queryString, values)
    .then(result => result.rows[0])
};
  

exports.addProperty = addProperty;
