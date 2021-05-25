'use strict';

/**
 * @description Creat a UserGlobalStats line in DB - policy.
 */
module.exports = async (ctx, next) => {
  await next()
  await strapi.query('users-global-stat').create({
    user_id: ctx.response.body.user.id,
    vMax: 0,
    totalDistance: 0,
    totalTravelDuration: 0
  })
};
