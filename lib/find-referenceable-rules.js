module.exports = (atRule, target) => {
  atRule.walkRules(function(rule) {
    target.push(rule);
  });
  
  atRule.remove();
};