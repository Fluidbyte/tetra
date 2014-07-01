var config = require('./../../libs/config');
var mongoskin = require('mongoskin');
var ObjectID = require('mongoskin').ObjectID;

// DozerJS NeDB component
var Conn = function () {
  this.store = mongoskin.db(config.service.conn.host, {
    username: config.service.conn.user,
    password: config.service.conn.pass,
    database: config.service.conn.db,
    safe: false
  });
};

// Correctly formats ID values
Conn.prototype.formatIds = function (query) {
  if (query.hasOwnProperty('_id')) {
    query._id = ObjectID.createFromHexString(query._id);
  }
  return query;
};

// Finds specific entry
Conn.prototype.find = function (coll, cursor, query, orderby, cb) {
  var self = this;
  try {
    query = self.formatIds(query);
  } catch (e) {
    cb(false, []);
    return;
  }
  // Translate orderby
  if (orderby) {
    // Set orderby
    for (var key in orderby) {
      orderby[key] = (orderby[key] === 'asc') ? 1 : -1;
    }
  } else {
    // Default
    orderby = {
      _id: 1
    };
  }
  // Set skip
  var skip = (cursor.page === 1) ? 0 : (cursor.count * (cursor.page)) - 1;
  self.store.collection(coll).find(query, null, {
    limit: cursor.count,
    skip: skip,
    sort: orderby
  }).toArray(function (err, data) {
    cb(err, data);
  });
};

// Inserts new record, generates _id
Conn.prototype.insert = function (coll, data, cb) {
  var self = this;
  try {
    data = self.formatIds(data);
  } catch (e) {
    cb('Invalid _id provided');
    return false;
  }
  self.store.collection(coll).insert(data, function (err, data) {
    cb(err, data);
  });
};

// Updates existing record
Conn.prototype.update = function (coll, query, data, cb) {
  var self = this;
  try {
    query = self.formatIds(query);
    data = self.formatIds(data);
  } catch (e) {
    cb('Invalid _id provided');
    return false;
  }
  self.store.collection(coll).update(query, {
    $set: data
  }, function (err, data) {
    cb(err, data);
  });
};

// Removes existing record
Conn.prototype.remove = function (coll, query, cb) {
  var self = this;
  try {
    query = self.formatIds(query);
  } catch (e) {
    cb('Invalid _id provided');
    return false;
  }
  self.store.collection(coll).remove(query, function (err, data) {
    cb(err, data);
  });
};

module.exports = Conn;
