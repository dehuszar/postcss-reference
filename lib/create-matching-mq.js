const extractMatchingRelationships = require('./extract-matching-relationships');

module.exports = (destination, source, mq) => {
  let newObj = {};
  newObj.mediaQuery = mq;
  newObj.nodes = [];
  destination.push(newObj);
  extractMatchingRelationships(destination[destination.length - 1].nodes, source);
};