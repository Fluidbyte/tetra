var passwordHash = require('password-hash');
var _ = require('underscore');
var fs = require('fs');

module.exports = function (req, res) {

  var self = this;

  // Users record file
  var usersFile = __dirname + '/../conf/users.json';

  var uri = req.protocol + '://' + req.get('host') + req.originalUrl;
  // Add URI trailing slash
  uri = (uri.substr(-1) === '/') ? uri : uri + '/';

  // Get data
  var users = fs.readFileSync(usersFile, 'utf8', function (err, data) {
    if (err) {
      return false;
    }
    // Ensure proper data
    try {
      JSON.parse(data);
    } catch (e) {
      return false;
    }
    return data;
  });

  if (!users) {
    // User FAIL
    self.respond(500, 'Missing user data');
    return false;
  } else {
    // Convert to object
    users = JSON.parse(users);
  }

  // Save data back to users file
  var saveData = function (code) {
    var name = Object.keys(users)[0];
    // Write to file
    fs.writeFile(usersFile, JSON.stringify(users, null, 2), 'utf8', function (err) {
      if (err) {
        self.respond(500);
        return false;
      }
      // Send proper response (201 or 200)
      if (code === 201) {
        res.header('Location', uri + name);
      }
      self.respond(code);
    });
  };

  // Read single user or list
  var read = function () {
    var params = req.params[0];
    var username = params.split('/').pop();

    // Strip passwords
    for (var u in users) {
      delete users[u].password;
    }

    // Check type
    if (username) {
      // Single entity request
      if (users.hasOwnProperty(username)) {
        self.respond(200, users[username]);
      } else {
        self.respond(404, 'User does not exist');
      }
    } else {
      // Full request
      self.respond(200, users);
    }

  };

  // Create user
  var create = function () {

    var name = Object.keys(req.body)[0];

    // Ensure mandatory data
    if (!req.body[name] || !req.body[name].hasOwnProperty('password')) {
      // Malformed
      self.respond(400, 'Not a valid request body');
      return false;
    }

    // Ensure account doesn't already exist
    if (users.hasOwnProperty(name)) {
      // Already exists
      self.respond(409, 'User already exists');
      return false;
    }

    // Set insert object
    var input = {};
    // Encrypt password
    input.password = passwordHash.generate(req.body[name].password);
    input.data = req.body[name].data || {};
    input.type = req.body[name].type || 1;

    // Add to users
    users[name] = input;

    // Save
    saveData(201);
  };

  // Update user
  var update = function () {

    // Get param
    var params = req.params[0];
    var username = params.split('/').pop();

    // Ensure user exists
    if (!users.hasOwnProperty(username)) {
      self.respond(404, 'User does not exist');
      return false;
    }

    // Encrypt password (if applicable)
    if (req.body.hasOwnProperty('password')) {
      req.body.password = passwordHash.generate(req.body.password);
    }

    // Update
    _.extend(users[username], req.body);

    // Save
    saveData(200);

  };

  // Delete user
  var del = function () {
    // Get param
    var params = req.params[0];
    var username = params.split('/').pop();

    // Ensure user exists
    if (!users.hasOwnProperty(username)) {
      self.respond(404, 'User does not exist');
      return false;
    }

    // Remove
    delete users[username];

    // Save
    saveData(200);
  };

  // Check method
  switch (req.method) {
  case 'GET':
    read();
    break;
  case 'POST':
    create();
    break;
  case 'PUT':
    update();
    break;
  case 'DELETE':
    del();
    break;
  default:
    // Unsupported method
    self.respond(405);
    return false;
  }

};
