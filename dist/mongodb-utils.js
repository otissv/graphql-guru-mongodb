'use strict';

Object.defineProperty(exports, "__esModule", {
  value: true
});

var _extends = Object.assign || function (target) { for (var i = 1; i < arguments.length; i++) { var source = arguments[i]; for (var key in source) { if (Object.prototype.hasOwnProperty.call(source, key)) { target[key] = source[key]; } } } return target; };

exports.objectId = objectId;
exports.isObjectEmpty = isObjectEmpty;
exports.queryObjectId = queryObjectId;

var _mongodb = require('mongodb');

var _mongodb2 = _interopRequireDefault(_mongodb);

function _interopRequireDefault(obj) { return obj && obj.__esModule ? obj : { default: obj }; }

var ObjectId = _mongodb2.default.ObjectId;
function objectId(id) {
  return ObjectId(id);
}

function isObjectEmpty(obj) {
  function check(val) {
    // checks if object is truthy or falsey
    if (!val || val.trim === '') return true;

    // checks objects length property (array)
    if (val.length && val.length === 0) return true;
    if (Object.keys(val).length === 0) return true;
  }

  // checks all object properties are empty
  for (var key in obj) {
    if (hasOwnProperty.call(obj, key)) {
      return check(obj[key]);
    }
  }

  return check(obj);
}

function queryObjectId(args) {
  if (isObjectEmpty(args)) return {};

  return args._id ? _extends({}, args, { _id: objectId(args._id) }) : objectId(args);
}
//# sourceMappingURL=mongodb-utils.js.map