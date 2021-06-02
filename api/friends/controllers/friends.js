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
    const blockedUsers = await friendRequestParser(groupedFriends, 'blocked')
    const sendedRequests = await friendRequestParser(friendRequests, 'pending')

    ctx.send({
      myFriends,
      sendedRequests,
      pendingRequests,
      blockedUsers
    })
  },

  async createViaID (ctx) {
    const { id: requesterID } = JSON.parse(atob(ctx.headers.authorization.split('.')[1].replace('-', '+').replace('_', '/')))
    const target = await strapi.query('user', 'users-permissions').findOne({ username: ctx.request.body.username })

    if (!target) {
      unableToGetUser(ctx)
    } else if (requesterID === target.id) {
      // User can request himself as friend
      return ctx.throw(403, { message: 'You can\'t add yourself as friend' })
    }

    // Group all friendships
    const groupedFriends = [...target.friendRequests, ...target.receivedFriends]


    const existingFriendship = groupedFriends.find(({ friendRequester, userTarget }) => userTarget === requesterID || friendRequester === requesterID)

    if (existingFriendship) {
      switch (existingFriendship.status) {
        case 'blocked':
          // If the Requester blocked target user, he's able to pass friendship to pending (new friend request)
          if (existingFriendship.lastActionAuthor === requesterID) {
            console.log('TODO Update friendship status to PENDING')
          } else {
            unableToGetUser(ctx)
          }
          break
        case 'pending':
          if (existingFriendship.lastActionAuthor === requesterID) {
            console.log('TODO Create message : the request already sended')
          } else {
            console.log('TODO Update friendship status to ACCEPTED')
          }
          break
        case 'accepted':
          console.log('TODO ctx returns message : already friends')
          break
      }

    } else {
      console.log('TODO Create friendship relation : requester, target, status = pending')
    }
  }
}

function unableToGetUser (ctx) {
  return ctx.throw(404, { message: 'User not found' })
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
    .map(async ({ id: friendshipID, status, friendRequester, userTarget }) => {
      const { id: fromId, username: fromUsername } = await strapi.query('user', 'users-permissions').findOne({ id: friendRequester })
      const { id: toId, username: toUsername } = await strapi.query('user', 'users-permissions').findOne({ id: userTarget })

      return {
        friendshipID,
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
