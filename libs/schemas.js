var fs = require('fs');
var _ = require('underscore');
var config = require('./config');

module.exports = function (req) {

  var self = this;
  var base = __dirname + '/../conf/schemas/';

  // Get params
  var params = req.params[0].split('/');
  var version = params[1];
  var schema = params[2];
  var doc = req.body.document;

  // Ensure version
  if (!fs.existsSync(base + version)) {
    self.respond(404, 'Version does not exist');
    return false;
  }

  // Ensure schema exists
  var schemaExists = function () {
    if (!fs.existsSync(base + version + '/' + schema + '.json')) {
      // Nope
      return false;
    }
    // YAY!
    return true;
  };

  // Check valid schema attributes and format
  var validFormat = function () {
    // Ensure JSON
    try {
      doc = JSON.parse(doc);
    } catch (e) {
      return false;
    }
    var types = config.service.schemas.types;
    // Check each property
    for (var prop in doc) {
      // Missing or incorrect type?
      if (!doc[prop].hasOwnProperty('type') || types.indexOf(doc[prop].type) === -1) {
        return false;
      }
    }
    return true;
  };

  // Get schema or schema list
  var read = function () {
    if (schema) {
      // Return specific schema
      if (schemaExists(schema)) {
        fs.readFile(base + version + '/' + schema + '.json', 'utf8', function (err, data) {
          if (err) {
            self.respond(500);
            return false;
          }
          // Success
          self.respond(200, data);
        });
      } else {
        self.respond(404, 'Schema does not exist');
        return false;
      }
    } else {
      // Output object
      var output = {};
      // Return all schemas
      var schemas = fs.readdirSync(base + version);
      // Loop through schemas
      for (var x = 0, y = schemas.length; x < y; x++) {
        // Only JSON files
        if (schemas[x].split('.').pop() === 'json') {
          // JSON good => add to object
          output[schemas[x].slice(0, -5)] = JSON.parse(fs.readFileSync(base + version + '/' + schemas[x], 'utf8'));
        }
      }
      self.respond(200, output);
    }
  };

  // Create a new schema
  var create = function () {

    // Set schema
    schema = req.body.name;

    // Ensure schema doesn't already exist
    if (schemaExists()) {
      // Already exists
      self.respond(409, 'Schema already exists');
      return false;
    }

    // Make sure valid format
    if (!validFormat()) {
      self.respond(400, 'Not valid format');
      return false;
    }

    // Create
    fs.writeFile(base + version + '/' + schema + '.json', JSON.stringify(doc, null, 4), 'utf8', function (err) {
      if (err) {
        self.respond(500);
        return false;
      }
      // All good
      self.respond(201);
    });
  };

  // Update an existing schema
  var update = function () {
    // Ensure schema exists
    if (!schemaExists()) {
      // Already exists
      self.respond(404, 'Schema does not exist');
      return false;
    }

    // Get current
    var current = JSON.parse(fs.readFileSync(base + version + '/' + schema + '.json', 'utf8'));

    // Make sure valid format
    if (!validFormat()) {
      self.respond(400, 'Not valid format');
      return false;
    }

    // Merge
    doc = _.extend(current, doc);

    // Save
    // Create
    fs.writeFile(base + version + '/' + schema + '.json', JSON.stringify(doc, null, 4), 'utf8', function (err) {
      if (err) {
        self.respond(500);
        return false;
      }
      // All good
      self.respond(200);
    });
  };

  // Delete an existing schema
  var del = function () {
    // Ensure schema exists
    if (!schemaExists()) {
      // Already exists
      self.respond(404, 'Schema does not exist');
      return false;
    }

    // Delete
    fs.unlink(base + version + '/' + schema + '.json', function (err) {
      if (err) {
        self.respond(500);
        return false;
      }
      // Success
      self.respond(200);
    });
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
