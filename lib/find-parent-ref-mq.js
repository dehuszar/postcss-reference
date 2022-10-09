module.exports = (mqTestObj) => {
  while (mqTestObj.parent && mqTestObj.parent.type !== "root") {
    if (mqTestObj.parent.type === "atrule" &&
        mqTestObj.parent.name === "references-media") {
          return mqTestObj.parent;
    } else {
      mqTestObj = mqTestObj.parent;
    }
  }
};