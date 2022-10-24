module.exports = (reqMq, refMq, targetMq) => 
  (reqMq === refMq)
    || targetMq === refMq
    || (targetMq === "" && refMq === null);