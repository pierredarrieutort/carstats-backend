'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const { sanitizeEntity } = require('strapi-utils')
const atob = require('atob')

module.exports = {
  async me(ctx) {
    const { id } = JSON.parse(atob(ctx.headers.authorization.split('.')[1].replace('-', '+').replace('_', '/')))

    return await strapi.query('users-global-stat').find({
      user_id: id,
    })
  },

  async leaderboard() {
    const maxSpeed = await strapi.query('users-global-stat').find({
      _limit: 10,
      _sort: 'vMax:DESC'
    })

    const maxDistance = await strapi.query('users-global-stat').find({
      _limit: 10,
      _sort: 'totalDistance:DESC'
    })

    const totalDuration = await strapi.query('users-global-stat').find({
      _limit: 10,
      _sort: 'totalTravelDuration:DESC'
    })

    const maxSpeedSanitized = sanitizeEntity(maxSpeed, { model: strapi.models['users-global-stat'] })
    const maxDistanceSanitized = sanitizeEntity(maxDistance, { model: strapi.models['users-global-stat'] })
    const totalDurationSanitized = sanitizeEntity(totalDuration, { model: strapi.models['users-global-stat'] })

    return { maxSpeedSanitized, maxDistanceSanitized, totalDurationSanitized }
  }
}
