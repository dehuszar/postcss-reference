module.exports = (mqTestObj) => {
  while (mqTestObj.parent.type !== "root") {
    if (mqTestObj.parent.type === "atrule" &&
        mqTestObj.parent.name === "media") {
          return mqTestObj.parent.params;
    } else {
      mqTestObj = mqTestObj.parent;
    }
  }
};