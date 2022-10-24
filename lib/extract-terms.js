module.exports = node => node.params.split(',').map(term => {
  const all = term.indexOf(' all') !== -1;
  const name = term.replace(' all', '').trim();
  
  return {
    all,
    name
  }
});