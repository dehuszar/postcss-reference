module.exports = (array, param, test) => 
  Boolean(
    array.find(
      (obj, index, array) => 
        obj[param] === test));