
@authentication
Feature: User Authentication

  Background:
    * url baseUrl
    * def SchemaValidator = Java.type('com.usyd.catams.testing.SchemaValidator')

  Scenario: Successful login with valid credentials
    Given path '/api/v1/auth/login'
    And request { username: 'testuser', password: 'password' }
    When method post
    Then status 200
    # Core: Contract validation against the OpenAPI schema
    # This single line replaces dozens of brittle, hard-coded field checks.
    # If the API response deviates from the AuthResult schema, this test will fail.
    * SchemaValidator.validate('AuthResult.json', response)

  Scenario: Failed login with invalid credentials
    Given path '/api/v1/auth/login'
    And request { username: 'wronguser', password: 'wrongpassword' }
    When method post
    Then status 401
    # For error responses, we can still validate against an ErrorResponse schema
    * SchemaValidator.validate('ErrorResponse.json', response)
