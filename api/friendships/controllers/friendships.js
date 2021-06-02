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
    const blockedUsers = await friendRequestParser(groupedFriends, 'blocked', id)
    const sendedRequests = await friendRequestParser(friendRequests, 'pending')

    ctx.send({
      myFriends,
      sendedRequests,
      pendingRequests,
      blockedUsers
    })
  },

  async createById (ctx) {
    const target = await strapi.query('user', 'users-permissions').findOne({ id: ctx.request.body.id })

    ctx.request.body.username = target.username
    console.log(ctx.request.body.username)
    return this.createByUsername(ctx)
  },

  async createByUsername (ctx) {
    const targetUsername = ctx.request.body.username
    const { id: requesterID } = JSON.parse(atob(ctx.headers.authorization.split('.')[1].replace('-', '+').replace('_', '/')))
    const target = await strapi.query('user', 'users-permissions').findOne({ username: targetUsername })

    if (!target) {
      return ctx.throw(404, { message: 'User not found' })
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
            await strapi.query('friendships').update(
              { id: existingFriendship.id },
              {
                status: 'pending',
                lastActionAuthor: requesterID
              })

            return ctx.send({ message: 'Friend request has been sent' })
          } else {
            return ctx.throw(404, { message: 'User not found' })
          }
          break
        case 'pending':
          if (existingFriendship.lastActionAuthor === requesterID) {
            return ctx.send({ message: 'Friend request is already pending' })
          } else {
            await strapi.query('friendships').update(
              { id: existingFriendship.id },
              {
                status: 'accepted',
                lastActionAuthor: requesterID
              })

            return ctx.send({ message: `${ctx.request.body.username} is now your friend` })
          }
          break
        case 'accepted':
          return ctx.send({ message: `${ctx.request.body.username} is already your friend` })
          break
      }

    } else {
      await strapi.query('friendships').create({
        status: 'pending',
        lastActionAuthor: requesterID,
        friendRequester: requesterID,
        userTarget: target.id
      })

      return ctx.send({ message: 'Friend request has been sent' })
    }
  },

  async blockByUsername (ctx) {
    const targetUsername = ctx.request.body.username
    const { id: requesterID } = JSON.parse(atob(ctx.headers.authorization.split('.')[1].replace('-', '+').replace('_', '/')))
    const target = await strapi.query('user', 'users-permissions').findOne({ username: targetUsername })

    if (!target) {
      return ctx.throw(404, { message: 'User not found' })
    } else if (requesterID === target.id) {
      // User can't block himself
      return ctx.throw(403, { message: 'You can\'t block yourself' })
    }

    // Group all friendships
    const groupedFriends = [...target.friendRequests, ...target.receivedFriends]

    const existingFriendship = groupedFriends.find(({ friendRequester, userTarget }) => userTarget === requesterID || friendRequester === requesterID)

    if (existingFriendship) {
      if (existingFriendship.status === 'blocked') {
        if (existingFriendship.lastActionAuthor === requesterID) {
          return ctx.send({ message: 'User already blocked' })
        } else {
          return ctx.throw(404, { message: 'User not found' })
        }
      } else {
        await strapi.query('friendships').update(
          { id: existingFriendship.id },
          {
            status: 'blocked',
            lastActionAuthor: requesterID
          })

        return ctx.send({ message: `${ctx.request.body.username} is now blocked` })
      }
    } else {
      await strapi.query('friendships').create({
        status: 'blocked',
        lastActionAuthor: requesterID,
        friendRequester: requesterID,
        userTarget: target.id
      })

      return ctx.send({ message: `${ctx.request.body.username} has been blocked` })
    }
  }
}

/**
 * @description Parse and sanitize users friendships.
 * @param {Array} list Provide a Strapi users array.
 * @param {String=} statusFilter OPTIONAL - Pass wanted filtering status in Strapi friendships.
 * @returns {Array} Parsed array of objects.
 */
async function friendRequestParser (list, statusFilter, requesterID) {
  return await Promise.all(list
    .filter(({ status, lastActionAuthor }) => requesterID
      ? requesterID === lastActionAuthor
      : true
      && status === statusFilter
    )
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
