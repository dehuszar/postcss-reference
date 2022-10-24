module.exports = refRule =>
  refRule.parent.type === "atrule"
    && refRule.parent.name === "media"
      ? refRule.parent.params
      : null;
