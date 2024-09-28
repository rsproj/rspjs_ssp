module.exports = {
  ssp : [{
    script : "http_app.js",
    instances : 10
  }, {
    script : "throw.js",
    instances : 10
  }]
}
