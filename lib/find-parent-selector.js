module.exports = (testObj) => {
  while (testObj.parent.type !== "root") {
    if (testObj.parent.type === "rule") {
      return testObj.parent.selector;
    } else {
      testObj = testObj.parent;
    }
  }
};
