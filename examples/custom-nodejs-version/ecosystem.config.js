module.exports = {
  /**
   * Application configuration section
   * http://ssp.keymetrics.io/docs/usage/application-declaration/
   */
  apps : [
    // First application
    {
      name      : "API",
      script    : "http.js",
      interpreter : "node@6.9.0"
    }
  ]
}
