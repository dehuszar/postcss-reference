module.exports = (testObj) => {
  if (testObj.parent.type === "root") {
    return testObj.parent;
  }

  while (testObj.parent && testObj.parent.type !== "root") {
    testObj = testObj.parent;
  }

  return testObj;
};