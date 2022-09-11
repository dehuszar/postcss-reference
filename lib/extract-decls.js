module.exports = rule => {
  const decls = [];
  rule.walkDecls(function(decl) {
    decls.push(decl);
  });

  return decls;
};