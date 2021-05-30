'use strict';

/**
 * Read the documentation (https://strapi.io/documentation/developer-docs/latest/development/backend-customization.html#core-controllers)
 * to customize this controller
 */

const atob = require('atob')

module.exports = {
  async me (ctx) {
    const { id } = JSON.parse(atob(ctx.headers.authorization.split('.')[1].replace('-', '+').replace('_', '/')))
    const { friendRequests, receivedFriends } = await strapi.query('user', 'users-permissions').findOne({ id })
    const groupedFriends = [...friendRequests, ...receivedFriends]

    const myFriends = await friendRequestParser(groupedFriends, 'accepted')
    const pendingRequests = await friendRequestParser(receivedFriends, 'pending')
    const blockUsers = await friendRequestParser(groupedFriends, 'blocked')
    const sendedRequests = await friendRequestParser(friendRequests, 'pending')

    ctx.send({
      myFriends,
      pendingRequests,
      blockUsers,
      sendedRequests
    })
  }
}

/**
 * @description Parse and sanitize users friendships.
 * @param {Array} list Provide a Strapi users array.
 * @param {String=} statusFilter OPTIONAL - Pass wanted filtering status in Strapi friendships.
 * @returns {Array} Parsed array of objects.
 */
async function friendRequestParser (list, statusFilter) {
  return await Promise.all(list
    .filter(({ status }) => statusFilter ? status === statusFilter : true)
    .map(async ({ status, friend_requester, user_target }) => {
      const { id: fromId, username: fromUsername } = await strapi.query('user', 'users-permissions').findOne({ id: friend_requester })
      const { id: toId, username: toUsername } = await strapi.query('user', 'users-permissions').findOne({ id: user_target })

      return {
        status,
        from: {
          id: fromId,
          username: fromUsername
        },
        to: {
          id: toId,
          username: toUsername
        }
      }
    }))
}
