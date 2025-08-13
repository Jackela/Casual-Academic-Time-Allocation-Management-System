# CATAMS Troubleshooting Guide

## Quick Diagnosis

### System Health Check Commands

```bash
# Check all services status
curl -s http://localhost:8084/actuator/health | jq '.'

# Check database connectivity
pg_isready -h localhost -p 5432 -U catams

# Check application processes
ps aux | grep -E "(java|node)" | grep -v grep

# Check ports
netstat -tlnp | grep -E "(8084|5174|5432)"

# Check disk space
df -h

# Check memory usage
free -h
```

### Quick Fixes

| Problem | Quick Fix |
|---------|-----------|
| **Application won't start** | `./gradlew clean bootRun` |
| **Frontend build fails** | `cd frontend && rm -rf node_modules && npm install` |
| **Database connection error** | Check Docker: `docker ps` and restart if needed |
| **Port already in use** | `node tools/scripts/cleanup.js` |
| **Tests failing** | Clear test databases: `docker system prune` |

---

## Application Issues

### Backend Issues

#### Application Won't Start

**Symptoms:**
- Spring Boot application fails to start
- Error messages about bean creation or configuration
- Port binding errors

**Common Causes & Solutions:**

1. **Port Already in Use (8084)**
   ```bash
   # Find process using port
   lsof -ti:8084
   
   # Kill process
   kill -9 $(lsof -ti:8084)
   
   # Or use cleanup script
   node tools/scripts/cleanup.js
   ```

2. **Database Connection Failed**
   ```bash
   # Check if PostgreSQL is running
   docker ps | grep postgres
   
   # Start database if not running
   docker run -d --name catams-postgres \
     -e POSTGRES_DB=catams \
     -e POSTGRES_USER=catams \
     -e POSTGRES_PASSWORD=password \
     -p 5432:5432 \
     postgres:13
   
   # Test connection
   pg_isready -h localhost -p 5432 -U catams
   ```

3. **Java Version Issues**
   ```bash
   # Check Java version
   java -version
   
   # Should show Java 21 or higher
   # If wrong version, set JAVA_HOME:
   export JAVA_HOME=/path/to/java21
   ```

4. **Environment Variables Missing**
   ```bash
   # Check required environment variables
   echo "DB_URL: $DB_URL"
   echo "JWT_SECRET: $JWT_SECRET"
   
   # Set missing variables
   export JWT_SECRET="your-secret-key-at-least-32-characters-long"
   export DB_URL="jdbc:postgresql://localhost:5432/catams"
   ```

#### Application Starts but Endpoints Return Errors

**Symptoms:**
- 500 Internal Server Error
- Database-related exceptions
- Authentication failures

**Solutions:**

1. **Database Schema Issues**
   ```bash
   # Run database migrations
   ./gradlew flywayMigrate
   
   # Check migration status
   ./gradlew flywayInfo
   
   # If migrations are out of sync
   ./gradlew flywayRepair
   ```

2. **JWT Configuration Issues**
   ```bash
   # Generate a secure JWT secret
   openssl rand -base64 32
   
   # Set in environment
   export JWT_SECRET="generated_secret_here"
   ```

3. **Check Application Logs**
   ```bash
   # View logs in real-time
   ./gradlew bootRun --debug
   
   # Or check log files
   tail -f logs/catams.log
   ```

#### Performance Issues

**Symptoms:**
- Slow response times (>2 seconds)
- High memory usage
- Database timeouts

**Diagnosis Commands:**
```bash
# Check JVM memory usage
jstat -gc $(pgrep java) 1s 10

# Monitor database connections
curl -s localhost:8084/actuator/metrics/hikaricp.connections.active

# Check slow queries
curl -s localhost:8084/actuator/metrics/jvm.gc.pause | jq '.'
```

**Solutions:**

1. **JVM Memory Tuning**
   ```bash
   # Increase heap size
   export JAVA_OPTS="-Xms1g -Xmx2g -XX:+UseG1GC"
   ./gradlew bootRun
   ```

2. **Database Connection Pool Tuning**
   ```yaml
   # application.yml
   spring:
     datasource:
       hikari:
         maximum-pool-size: 20
         minimum-idle: 5
         connection-timeout: 30000
   ```

3. **Enable Caching**
   ```java
   // Add to service methods
   @Cacheable("timesheets")
   public List<TimesheetResponse> getTimesheets() {
       // method implementation
   }
   ```

### Frontend Issues

#### Development Server Won't Start

**Symptoms:**
- `npm run dev` fails
- Port 5174 binding errors
- Module resolution errors

**Solutions:**

1. **Clear Node Modules**
   ```bash
   cd frontend
   rm -rf node_modules package-lock.json
   npm install
   ```

2. **Port Conflict**
   ```bash
   # Check if port 5174 is in use
   lsof -ti:5174
   
   # Kill process using port
   kill -9 $(lsof -ti:5174)
   
   # Or change port in vite.config.ts
   server: {
     port: 3000
   }
   ```

3. **Node Version Issues**
   ```bash
   # Check Node version (should be 18+)
   node --version
   
   # Use nvm to switch versions
   nvm use 18
   ```

#### Build Failures

**Symptoms:**
- TypeScript compilation errors
- Module not found errors
- Build process hangs

**Solutions:**

1. **TypeScript Errors**
   ```bash
   # Check TypeScript configuration
   cd frontend
   npx tsc --noEmit
   
   # Fix common issues
   npm run lint --fix
   ```

2. **Clear Build Cache**
   ```bash
   cd frontend
   rm -rf dist node_modules/.vite
   npm install
   npm run build
   ```

3. **Memory Issues During Build**
   ```bash
   # Increase Node memory limit
   export NODE_OPTIONS="--max-old-space-size=4096"
   npm run build
   ```

#### Runtime Errors

**Symptoms:**
- White screen of death
- API call failures
- Authentication redirect loops

**Solutions:**

1. **API Connection Issues**
   ```javascript
   // Check API base URL in .env
   VITE_API_URL=http://localhost:8084/api/v1
   
   // Verify in browser network tab
   // Backend should be running on port 8084
   ```

2. **Authentication Issues**
   ```javascript
   // Clear localStorage
   localStorage.clear();
   
   // Check token expiration
   const token = localStorage.getItem('authToken');
   if (token) {
     const payload = JSON.parse(atob(token.split('.')[1]));
     console.log('Token expires:', new Date(payload.exp * 1000));
   }
   ```

3. **Browser Console Errors**
   ```javascript
   // Check browser console (F12)
   // Common fixes:
   
   // CORS errors - check backend CORS configuration
   // Module errors - clear cache and reinstall
   // Network errors - verify backend is running
   ```

---

## Database Issues

### Connection Problems

**Symptoms:**
- "Connection refused" errors
- "Password authentication failed"
- Connection timeout errors

**Solutions:**

1. **PostgreSQL Not Running**
   ```bash
   # Check if PostgreSQL is running
   docker ps | grep postgres
   
   # Start PostgreSQL container
   docker start catams-postgres
   
   # Or create new container
   docker run -d --name catams-postgres \
     -e POSTGRES_DB=catams \
     -e POSTGRES_USER=catams \
     -e POSTGRES_PASSWORD=password \
     -p 5432:5432 \
     postgres:13
   ```

2. **Authentication Issues**
   ```bash
   # Test connection with psql
   psql -h localhost -p 5432 -U catams -d catams
   
   # If password fails, check environment variables
   echo $DB_PASSWORD
   
   # Reset PostgreSQL password
   docker exec -it catams-postgres psql -U postgres -c "ALTER USER catams PASSWORD 'newpassword';"
   ```

3. **Network Issues**
   ```bash
   # Check if port is accessible
   telnet localhost 5432
   
   # Check Docker network
   docker network ls
   docker inspect catams-postgres
   ```

### Performance Issues

**Symptoms:**
- Slow query execution
- High CPU usage by PostgreSQL
- Connection pool exhaustion

**Diagnosis:**
```sql
-- Find slow queries
SELECT query, calls, total_time, mean_time
FROM pg_stat_statements
ORDER BY total_time DESC
LIMIT 10;

-- Check active connections
SELECT COUNT(*) as active_connections
FROM pg_stat_activity
WHERE state = 'active';

-- Check database size
SELECT pg_size_pretty(pg_database_size('catams'));
```

**Solutions:**

1. **Query Optimization**
   ```sql
   -- Create missing indexes
   CREATE INDEX IF NOT EXISTS idx_timesheets_tutor_id ON timesheets(tutor_id);
   CREATE INDEX IF NOT EXISTS idx_timesheets_status ON timesheets(status);
   CREATE INDEX IF NOT EXISTS idx_timesheets_created_at ON timesheets(created_at);
   
   -- Analyze query performance
   EXPLAIN ANALYZE SELECT * FROM timesheets WHERE tutor_id = 1;
   ```

2. **Connection Pool Tuning**
   ```yaml
   # application.yml
   spring:
     datasource:
       hikari:
         maximum-pool-size: 10
         minimum-idle: 2
         connection-timeout: 20000
         idle-timeout: 600000
   ```

3. **PostgreSQL Configuration**
   ```bash
   # Add to postgresql.conf
   shared_buffers = 128MB
   effective_cache_size = 512MB
   maintenance_work_mem = 64MB
   checkpoint_completion_target = 0.9
   ```

### Data Issues

**Symptoms:**
- Constraint violation errors
- Data inconsistency
- Migration failures

**Solutions:**

1. **Constraint Violations**
   ```sql
   -- Check constraint violations
   SELECT conname, conrelid::regclass, pg_get_constraintdef(oid)
   FROM pg_constraint
   WHERE NOT convalidated;
   
   -- Fix common issues
   UPDATE timesheets SET status = 'DRAFT' WHERE status IS NULL;
   ```

2. **Migration Failures**
   ```bash
   # Check migration status
   ./gradlew flywayInfo
   
   # Repair failed migrations
   ./gradlew flywayRepair
   
   # Manually fix and retry
   ./gradlew flywayMigrate
   ```

3. **Data Recovery**
   ```bash
   # Restore from backup
   pg_restore -h localhost -p 5432 -U catams -d catams backup.dump
   
   # Or recreate test data
   ./gradlew bootRun --args="--spring.profiles.active=dev"
   ```

---

## Testing Issues

### Unit Tests Failing

**Symptoms:**
- JUnit tests fail with database errors
- Mock objects not working correctly
- Dependency injection failures

**Solutions:**

1. **Test Database Issues**
   ```bash
   # Ensure TestContainers is working
   docker info
   
   # Run tests with debug output
   ./gradlew test --info --debug
   
   # Run specific test class
   ./gradlew test --tests "TimesheetServiceUnitTest"
   ```

2. **Mock Configuration Issues**
   ```java
   // Ensure proper annotations
   @ExtendWith(MockitoExtension.class)
   class ServiceTest {
       
       @Mock
       private Repository repository;
       
       @InjectMocks
       private Service service;
       
       @BeforeEach
       void setUp() {
           MockitoAnnotations.openMocks(this);
       }
   }
   ```

3. **Spring Context Issues**
   ```java
   // For integration tests
   @SpringBootTest
   @TestPropertySource(locations = "classpath:application-test.properties")
   class IntegrationTest {
       // Test implementation
   }
   ```

### Integration Tests Failing

**Symptoms:**
- TestContainers startup failures
- Database schema errors
- Network connectivity issues

**Solutions:**

1. **TestContainers Issues**
   ```bash
   # Check Docker daemon
   docker version
   
   # Check available ports
   netstat -tlnp | grep -E "(543[2-9]|544[0-9])"
   
   # Clean Docker resources
   docker system prune -f
   ```

2. **Database Schema Issues**
   ```java
   // Add proper test configuration
   @TestConfiguration
   public class TestConfig {
       
       @Bean
       @Primary
       public DataSource dataSource() {
           // Configure test datasource
       }
   }
   ```

3. **Slow Test Execution**
   ```bash
   # Run tests in parallel
   ./gradlew test --parallel
   
   # Increase test memory
   export GRADLE_OPTS="-Xmx2g"
   ./gradlew test
   ```

### E2E Tests Failing

**Symptoms:**
- Playwright tests timeout
- Element not found errors
- Authentication failures in tests

**Solutions:**

1. **Playwright Setup Issues**
   ```bash
   cd frontend
   
   # Install Playwright browsers
   npx playwright install
   
   # Run tests in headed mode for debugging
   npx playwright test --headed
   
   # Generate test report
   npx playwright show-report
   ```

2. **Timing Issues**
   ```typescript
   // Add proper waits
   await page.waitForSelector('[data-testid="timesheet-form"]');
   await page.waitForLoadState('networkidle');
   
   // Use explicit waits instead of hard waits
   await expect(page.locator('.success-message')).toBeVisible();
   ```

3. **Test Data Issues**
   ```typescript
   // Set up test data before each test
   test.beforeEach(async ({ page }) => {
     await page.goto('/');
     await page.fill('[name="email"]', 'test@university.edu');
     await page.fill('[name="password"]', 'password123');
     await page.click('button[type="submit"]');
     await page.waitForURL('**/dashboard');
   });
   ```

---

## Performance Issues

### Application Performance

**Symptoms:**
- Response times > 2 seconds
- High CPU/memory usage
- User complaints about slowness

**Diagnosis Tools:**
```bash
# Application metrics
curl -s localhost:8084/actuator/metrics/jvm.memory.used | jq '.'
curl -s localhost:8084/actuator/metrics/http.server.requests | jq '.'

# System metrics
top -p $(pgrep java)
htop
iostat 1 5

# Database performance
curl -s localhost:8084/actuator/metrics/hikaricp.connections | jq '.'
```

**Solutions:**

1. **JVM Optimization**
   ```bash
   # Production JVM settings
   export JAVA_OPTS="-Xms2g -Xmx4g -XX:+UseG1GC -XX:MaxGCPauseMillis=200"
   ```

2. **Database Optimization**
   ```sql
   -- Add indexes for common queries
   CREATE INDEX CONCURRENTLY idx_timesheets_tutor_status 
   ON timesheets(tutor_id, status);
   
   -- Analyze table statistics
   ANALYZE timesheets;
   ```

3. **Caching Implementation**
   ```java
   @Cacheable(value = "timesheets", key = "#userId")
   public List<TimesheetResponse> getUserTimesheets(Long userId) {
       return timesheetRepository.findByTutorId(userId)
           .stream()
           .map(timesheetMapper::toResponse)
           .collect(toList());
   }
   ```

### Database Performance

**Symptoms:**
- Slow queries (>1 second)
- High database CPU usage
- Connection timeouts

**Diagnosis:**
```sql
-- Slow query analysis
SELECT query, calls, total_time, mean_time, stddev_time
FROM pg_stat_statements
WHERE mean_time > 1000  -- queries > 1 second
ORDER BY total_time DESC;

-- Index usage analysis
SELECT schemaname, tablename, attname, n_distinct, correlation
FROM pg_stats
WHERE tablename = 'timesheets';

-- Connection analysis
SELECT state, COUNT(*) 
FROM pg_stat_activity 
GROUP BY state;
```

**Solutions:**

1. **Query Optimization**
   ```sql
   -- Optimize common queries
   EXPLAIN ANALYZE 
   SELECT t.*, u.name, c.code 
   FROM timesheets t
   JOIN users u ON t.tutor_id = u.id
   JOIN courses c ON t.course_id = c.id
   WHERE t.status = 'PENDING_TUTOR_REVIEW';
   
   -- Add covering index
   CREATE INDEX idx_timesheets_covering 
   ON timesheets(status, tutor_id) 
   INCLUDE (course_id, hours, created_at);
   ```

2. **Connection Pool Optimization**
   ```yaml
   spring:
     datasource:
       hikari:
         maximum-pool-size: 20
         minimum-idle: 5
         idle-timeout: 600000
         max-lifetime: 1800000
         connection-timeout: 30000
         validation-timeout: 5000
   ```

---

## Security Issues

### Authentication Problems

**Symptoms:**
- Users can't log in with correct credentials
- JWT token issues
- Session timeouts

**Solutions:**

1. **JWT Configuration Issues**
   ```bash
   # Check JWT secret length (must be ≥32 characters)
   echo ${#JWT_SECRET}
   
   # Generate secure secret
   openssl rand -base64 32
   
   # Check token expiration
   export JWT_EXPIRATION=86400  # 24 hours
   ```

2. **Password Issues**
   ```java
   // Verify password encoding
   @Autowired
   private PasswordEncoder passwordEncoder;
   
   public boolean checkPassword(String rawPassword, String encodedPassword) {
       return passwordEncoder.matches(rawPassword, encodedPassword);
   }
   ```

3. **Session Management**
   ```bash
   # Check session configuration
   curl -s localhost:8084/actuator/configprops | grep -i session
   ```

### Authorization Problems

**Symptoms:**
- Users accessing unauthorized resources
- Role-based restrictions not working
- API endpoints not protected

**Solutions:**

1. **Security Configuration Review**
   ```java
   @Configuration
   @EnableWebSecurity
   public class SecurityConfig {
       
       @Bean
       public SecurityFilterChain filterChain(HttpSecurity http) throws Exception {
           return http
               .authorizeHttpRequests(auth -> auth
                   .requestMatchers("/api/v1/auth/**").permitAll()
                   .requestMatchers("/api/v1/admin/**").hasRole("ADMIN")
                   .requestMatchers("/api/v1/timesheets/**").hasAnyRole("TUTOR", "LECTURER", "ADMIN")
                   .anyRequest().authenticated()
               )
               .build();
       }
   }
   ```

2. **Role Assignment Issues**
   ```sql
   -- Check user roles
   SELECT id, email, role FROM users WHERE email = 'user@university.edu';
   
   -- Update user role if needed
   UPDATE users SET role = 'LECTURER' WHERE email = 'user@university.edu';
   ```

---

## Deployment Issues

### Container Issues

**Symptoms:**
- Docker containers won't start
- Out of memory errors
- Network connectivity issues

**Solutions:**

1. **Container Resource Issues**
   ```bash
   # Check container resources
   docker stats catams-backend
   
   # Increase memory limits
   docker run -m 2g --name catams-backend ...
   
   # Check container logs
   docker logs catams-backend --tail 50
   ```

2. **Network Issues**
   ```bash
   # Check Docker networks
   docker network ls
   docker network inspect bridge
   
   # Test connectivity between containers
   docker exec catams-backend ping catams-postgres
   ```

3. **Volume Mount Issues**
   ```bash
   # Check volume mounts
   docker inspect catams-backend | grep -A 10 Mounts
   
   # Fix permission issues
   chown -R 1000:1000 /app/logs
   ```

### Environment Configuration

**Symptoms:**
- Environment variables not loaded
- Configuration mismatch between environments
- SSL certificate issues

**Solutions:**

1. **Environment Variable Issues**
   ```bash
   # Check environment variables in container
   docker exec catams-backend env | grep -E "(DB_|JWT_)"
   
   # Set environment variables
   docker run -e DB_URL=jdbc:postgresql://db:5432/catams ...
   ```

2. **SSL Certificate Issues**
   ```bash
   # Check certificate validity
   openssl x509 -in cert.crt -text -noout
   
   # Renew Let's Encrypt certificate
   certbot renew --nginx
   
   # Test SSL configuration
   openssl s_client -connect catams.university.edu:443
   ```

---

## Monitoring and Logging

### Log Analysis

**Common Log Patterns:**

1. **Database Connection Errors**
   ```bash
   grep -i "connection.*refused\|timeout" logs/catams.log
   ```

2. **Authentication Failures**
   ```bash
   grep -i "authentication.*failed\|unauthorized" logs/catams.log
   ```

3. **Performance Issues**
   ```bash
   grep -i "slow.*query\|timeout\|OutOfMemoryError" logs/catams.log
   ```

### Health Monitoring

**Health Check Commands:**
```bash
# Application health
curl -s localhost:8084/actuator/health | jq '.'

# Database health
curl -s localhost:8084/actuator/health/db | jq '.'

# Memory usage
curl -s localhost:8084/actuator/metrics/jvm.memory.used | jq '.'

# Active threads
curl -s localhost:8084/actuator/metrics/jvm.threads.live | jq '.'
```

---

## Emergency Procedures

### Application Recovery

```bash
#!/bin/bash
# emergency-recovery.sh

echo "Starting emergency recovery..."

# Stop all services
systemctl stop catams-frontend || true
systemctl stop catams-backend || true

# Kill hanging processes
pkill -f java || true
pkill -f node || true

# Clean up resources
docker system prune -f
rm -rf /tmp/catams-*

# Check database connectivity
if ! pg_isready -h localhost -p 5432 -U catams; then
    echo "Starting database..."
    docker start catams-postgres
    sleep 10
fi

# Restart services
systemctl start catams-backend
sleep 30

# Verify backend is running
if curl -f localhost:8084/actuator/health; then
    systemctl start catams-frontend
    echo "Recovery successful"
else
    echo "Recovery failed - check logs"
    exit 1
fi
```

### Data Recovery

```bash
#!/bin/bash
# data-recovery.sh

BACKUP_FILE="$1"

if [ -z "$BACKUP_FILE" ]; then
    echo "Usage: $0 <backup_file>"
    exit 1
fi

# Create recovery point
pg_dump -h localhost -p 5432 -U catams catams > "/tmp/pre-recovery-$(date +%Y%m%d_%H%M%S).sql"

# Stop application
systemctl stop catams-backend

# Restore database
psql -h localhost -p 5432 -U catams -d catams < "$BACKUP_FILE"

# Start application
systemctl start catams-backend

echo "Data recovery completed"
```

---

## Getting Help

### Contact Information

- **Technical Support**: it-support@university.edu
- **Development Team**: catams-dev@university.edu
- **Emergency Contact**: +1-xxx-xxx-xxxx (24/7 support)

### Escalation Process

1. **Level 1**: Check this troubleshooting guide
2. **Level 2**: Search logs and application metrics
3. **Level 3**: Contact technical support with:
   - Error messages
   - Log excerpts
   - Steps to reproduce
   - System configuration
4. **Level 4**: Emergency escalation for production issues

### Information to Provide

When contacting support, include:

```bash
# System information
uname -a
java -version
node --version
docker --version

# Application status
curl -s localhost:8084/actuator/health
ps aux | grep -E "(java|node)"
docker ps

# Recent logs (last 50 lines)
tail -50 logs/catams.log

# Error messages
grep -i error logs/catams.log | tail -10
```

---

**Troubleshooting Guide Version**: 1.0  
**Last Updated**: 2025-08-12  
**Maintainers**: Development Team & DevOps  
**Emergency Support**: Available 24/7 for production issues