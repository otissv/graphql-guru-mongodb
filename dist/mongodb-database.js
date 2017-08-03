'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports.MongoDBMutation = exports.MongoDBQuery = undefined;

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

var _createClass = function () { function defineProperties(target, props) { for (var i = 0; i < props.length; i++) { var descriptor = props[i]; descriptor.enumerable = descriptor.enumerable || false; descriptor.configurable = true; if ("value" in descriptor) descriptor.writable = true; Object.defineProperty(target, descriptor.key, descriptor); } } return function (Constructor, protoProps, staticProps) { if (protoProps) defineProperties(Constructor.prototype, protoProps); if (staticProps) defineProperties(Constructor, staticProps); return Constructor; }; }();

exports.connect = connect;

var _mongodb = require('mongodb');

var _mongodb2 = _interopRequireDefault(_mongodb);

var _classAutobind = require('class-autobind');

var _classAutobind2 = _interopRequireDefault(_classAutobind);

var _mongodbUtils = require('./mongodb-utils');

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

function _classCallCheck(instance, Constructor) { if (!(instance instanceof Constructor)) { throw new TypeError("Cannot call a class as a function"); } }

function connect(options) {
  return _mongodb2.default.MongoClient.connect(options.uri, { native_parser: true });
}

var MongoDBQuery = exports.MongoDBQuery = function () {
  function MongoDBQuery() {
    _classCallCheck(this, MongoDBQuery);

    (0, _classAutobind2.default)(this);
  }

  _createClass(MongoDBQuery, [{
    key: 'resolve',
    value: function resolve(params) {
      return Array.isArray(params.args) ? this.findManyById(_extends({}, params, { args: { id: params.args } })) : this.findById(params);
    }
  }, {
    key: 'findAll',
    value: function findAll(_ref) {
      var query = _ref.query,
          args = _ref.args,
          databases = _ref.databases,
          _ref$projection = _ref.projection,
          projection = _ref$projection === undefined ? {} : _ref$projection,
          models = _ref.models;
      var mongodb = databases.mongodb;

      var TABLE = this.table;
      var obj = args || query;

      return mongodb.then(function (db) {
        return new Promise(function (resolve, reject) {
          return db.collection(TABLE).find((0, _mongodbUtils.queryObjectId)(obj), projection).toArray(function (err, docs) {
            if (err) {
              reject(err);
            } else {
              resolve(docs);
            }
          });
        });
      });
    }
  }, {
    key: 'findById',
    value: function findById(_ref2) {
      var query = _ref2.query,
          args = _ref2.args,
          databases = _ref2.databases,
          _ref2$projection = _ref2.projection,
          projection = _ref2$projection === undefined ? {} : _ref2$projection,
          models = _ref2.models,
          cache = _ref2.cache;
      var mongodb = databases.mongodb;

      var TABLE = this.table;
      var obj = args || query;

      if (obj == null || obj._id == null) return null;

      // check to see if document is in cached
      var cacheKey = '' + this.table + obj._id;
      var checkCache = cache.load({ key: cacheKey });
      if (checkCache) return checkCache;

      var data = mongodb.then(function (db) {
        return db.collection(TABLE).findOne((0, _mongodbUtils.queryObjectId)(args), projection).then(function (doc) {
          return doc;
        }).catch(function (error) {
          return error;
        });
      });

      cache.add({
        key: cacheKey,
        value: data
      });

      return data;
    }
  }, {
    key: 'findManyById',
    value: function findManyById(_ref3) {
      var _this = this;

      var query = _ref3.query,
          args = _ref3.args,
          databases = _ref3.databases,
          _ref3$projection = _ref3.projection,
          projection = _ref3$projection === undefined ? {} : _ref3$projection,
          models = _ref3.models,
          cache = _ref3.cache;
      var mongodb = databases.mongodb;

      var TABLE = this.table;
      var obj = args || query;

      if (obj == null) return null;

      var notCached = [];

      // check if any of the query documents are in the cache
      var cached = obj._id.map(function (item, index) {
        var cacheKey = _this.table + '_' + item;
        var checkCache = cache.load({ key: cacheKey });

        if (checkCache) return checkCache;

        notCached.push({ index: index, item: item });
      });

      // if all documents are already in the cache return the cache
      if (!cached.some(function (c) {
        return c == null;
      })) return cached;

      // find non-cached documents
      return mongodb.then(function (db) {
        return new Promise(function (resolve, reject) {
          return db.collection(TABLE).find(_extends({}, args, {
            _id: {
              $in: notCached.map(function (val) {
                return (0, _mongodbUtils.objectId)(val.item);
              })
            }
          }), projection).toArray(function (err, docs) {
            if (err) return reject(err);

            // add non-cached documents to the cache
            notCached.forEach(function (value, index) {
              var cacheKey = _this.table + '_' + value.item;

              // add item to cache
              cache.add({
                key: cacheKey,
                value: docs[index]
              });

              // insert not cached documents into cached
              cached[value.index] = docs[index];
            });

            return resolve(cached);
          });
        });
      });
    }
  }]);

  return MongoDBQuery;
}();

var MongoDBMutation = exports.MongoDBMutation = function () {
  function MongoDBMutation() {
    _classCallCheck(this, MongoDBMutation);

    (0, _classAutobind2.default)(this);
    this.cacheName = 'user_';
  }

  _createClass(MongoDBMutation, [{
    key: 'create',
    value: function create(_ref4) {
      var _this2 = this;

      var query = _ref4.query,
          args = _ref4.args,
          databases = _ref4.databases,
          models = _ref4.models,
          cache = _ref4.cache;
      var mongodb = databases.mongodb;

      var obj = args || query;
      var TABLE = this.table;

      if (obj == null || obj._id == null) {
        return {
          RESULTS_: {
            result: 'failed',
            created: 0,
            error: {
              message: 'No data supplied.'
            }
          }
        };
      }

      return new Promise(function (resolve, reject) {
        return mongodb.then(function (db) {
          return db.collection(TABLE).insert(obj).then(function (response) {
            var id = response.insertedIds;
            var data = _extends({}, obj, { id: id });

            // add the document to the store
            cache.add({
              key: _this2.table + '_' + id,
              value: data
            });
            resolve({
              id: id,
              RESULTS_: {
                result: 'ok',
                created: response.result.n
              }
            });
          }).catch(function (error) {
            return error;
          });
        });
      });
    }
  }, {
    key: 'remove',
    value: function remove(_ref5) {
      var _this3 = this;

      var query = _ref5.query,
          args = _ref5.args,
          databases = _ref5.databases,
          models = _ref5.models,
          cache = _ref5.cache;
      var mongodb = databases.mongodb;

      var obj = args || query;
      var TABLE = this.table;

      if (obj == null || obj._id == null) {
        return {
          _id: obj._id,
          RESULTS_: {
            result: 'failed',
            removed: 0,
            error: {
              message: 'No id supplied.'
            }
          }
        };
      }

      var _id = obj._id;

      return mongodb.then(function (db) {
        return db.collection(TABLE).remove({ _id: (0, _mongodbUtils.objectId)(_id) }).then(function (response) {
          cache.remove({ key: _this3.table + '_' + _id });

          return {
            _id: _id,
            result: response.result.n > 0 ? 'ok' : 'failed',
            removed: response.result.n
          };
        });
      });
    }
  }, {
    key: 'update',
    value: function update(_ref6) {
      var _this4 = this;

      var query = _ref6.query,
          args = _ref6.args,
          databases = _ref6.databases,
          models = _ref6.models,
          cache = _ref6.cache;
      var mongodb = databases.mongodb;

      var TABLE = this.table;
      var obj = args && _extends({}, args) || query && _extends({}, query);
      var _id = obj._id;

      delete obj._id;

      if (obj == null) {
        return {
          RESULTS_: {
            result: 'failed',
            updated: 0,
            error: {
              message: 'No data supplied.'
            }
          }
        };
      }

      return mongodb.then(function (db) {
        return db.collection(TABLE).update({ _id: (0, _mongodbUtils.objectId)(_id) }, obj).then(function (response) {
          var cacheKey = _this4.table + '_' + _id;
          var checkCache = cache.get({ key: cacheKey });
          var data = checkCache ? _extends({}, checkCache, obj) : obj;

          cache.add({
            key: cacheKey,
            value: data
          });

          var error = response.result.n === 0 ? { message: 'No data supplied.' } : null;

          return {
            _id: _id,
            RESULTS_: {
              result: response.result.n > 0 ? 'ok' : 'failed',
              updated: response.result.n,
              error: error
            }
          };
        }).catch(function (error) {
          console.log(error);
          return {
            RESULTS_: {
              result: 'failed',
              updated: 0,
              error: {
                message: 'Document update failed.'
              }
            }
          };
        });
      });
    }

    // createMany
    // deleteMany
    // removeMany
    // updateMany

  }]);

  return MongoDBMutation;
}();
//# sourceMappingURL=mongodb-database.js.map