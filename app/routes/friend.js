var friend = require('../controllers/friendCtrl');

module.exports = function (app) {
    app.get('/user/:user_id/friends', friend.getFriends);
    app.post('/friend/:friend_id', friend.friendRequest);
    app.put('/friend/:friend_id', friend.confirmFriend);
    app.delete('/friend/:friend_id', friend.deleteFriend);
};