
@authentication
Feature: User Authentication

  Background:
    * url karate.properties['baseUrl']
    * def SchemaValidator = Java.type('com.usyd.catams.testing.SchemaValidator')

  Scenario: Successful login with valid credentials
    Given path '/api/auth/login'
    And request { email: 'tutor@example.com', password: 'Tutor123!' }
    When method post
    Then status 200
    * string resp = response
    * SchemaValidator.validate('AuthResult.json', resp)

  Scenario: Failed login with invalid credentials
    Given path '/api/auth/login'
    And request { email: 'tutor@example.com', password: 'WrongPass!' }
    When method post
    Then status 401
    * string err = response
    * SchemaValidator.validate('ErrorResponse.json', err)
