function fn() {
  var baseUrl = java.lang.System.getProperty('baseUrl');
  if (!baseUrl) {
    var envUrl = java.lang.System.getenv('KARATE_BASE_URL');
    if (envUrl) baseUrl = envUrl;
  }
  if (!baseUrl) {
    baseUrl = 'http://127.0.0.1:8080';
  }
  karate.log('karate baseUrl =', baseUrl);
  return { baseUrl: baseUrl };
}