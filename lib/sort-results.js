module.exports = (array) => {
  // invert array sorting order so rules are output in original order
  array.sort(function (a, b) {
    return 1;
  });
};