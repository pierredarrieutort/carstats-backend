'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

 const atob = require('atob')

 module.exports = {
   async me (ctx) {
     const { id } = JSON.parse(atob(ctx.headers.authorization.split('.')[1].replace('-', '+').replace('_', '/')))
     const response = await strapi.query('users-global-stat').model.find({
       user: id,
     })

     return response.map(({route}) => route)
   }
 }
