const fs = require('fs');
const postcss = require('postcss');

const fetchUrl = async url => {
  debugger
};

const reconcilePaths = (absolutePath, relativePath) => {
  debugger
};

const constructPath = (expression, importTarget) => {
  switch(expression) {
    case expression.startsWith('http'):
      fetchUrl(expression);
    case expression.startsWith('../'):
      debugger
    default:
      return `${expression}${importTarget.replace('./', '/').replaceAll('"', '')}`
  }
}


module.exports = (atRule, target) => {
  const pushRulesToTarget = (rule) => {
    target.push(rule);
  }

  atRule.walkAtRules(function(atRule) {
    if (atRule.name === "import") {
      const originatingImportSourcePath = atRule.source.input.file.split('/').slice(0, -1).join('/');

      const path = constructPath(originatingImportSourcePath, atRule.params);

      const importedRules = fs.readFileSync(path, 'utf-8');

      const root = postcss.parse(importedRules);

      root.walkRules(pushRulesToTarget);
    }
  })
  atRule.walkRules(pushRulesToTarget);
  
  atRule.remove();
};