const fs = require('fs');
const postcss = require('postcss');

const fetchUrl = async url => {
  debugger
};

const constructPath = (expression, importTarget) => {
  const scrubbedTarget = importTarget.replaceAll('"', '');
  switch(true) {
    case scrubbedTarget.startsWith('http'):
      return fetchUrl(scrubbedTarget);
    case scrubbedTarget.startsWith('../'):
      const targetArray = scrubbedTarget.split('../')
      const numParentFolders = targetArray.slice(0, -1).length;
      const target = targetArray.slice(-1);
      const rootPath = expression.split('/').slice(0, -numParentFolders).join('/')
      
      return `${rootPath}/${target}`;
    default:
      return `${expression}${scrubbedTarget.replace('./', '/')}`
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