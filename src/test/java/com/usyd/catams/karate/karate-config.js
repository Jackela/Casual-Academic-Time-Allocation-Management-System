function fn() {
  // DbC: baseUrl must be a valid URL when running Karate tests
  var baseUrl = java.lang.System.getProperty('baseUrl');
  if (!baseUrl) {
    var envUrl = java.lang.System.getenv('KARATE_BASE_URL');
    if (envUrl) baseUrl = envUrl;
  }
  if (!baseUrl) {
    // Default for local dev; CI can set KARATE_BASE_URL. Tests will still fail if backend is not running.
    baseUrl = 'http://127.0.0.1:8080';
  }
  karate.log('karate baseUrl =', baseUrl);
  return { baseUrl: baseUrl };
}