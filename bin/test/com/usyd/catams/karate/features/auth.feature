Feature: Authentication Service

  Background:
    * url baseUrl
    * header Accept = 'application/json'

  Scenario: User login with valid credentials
    Given path '/api/auth/login'
    And request { email: 'admin@test.com', password: 'password' }
    When method post
    Then status 200
    And match response.token == "#string"
    And match response.user.id == "#number"
    And match response.user.email == 'admin@test.com'
    And match response.user.role == 'Admin'

