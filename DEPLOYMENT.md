# R&D Internal Software — Production Deployment Guide

This guide walks through every step from a fresh server to a running production deployment.

---

## 1. Architecture Overview

| Layer | Technology |
|---|---|
| Backend | Spring Boot 4, Java 17, Maven |
| Frontend | React 19 + Vite (static build) |
| Database | MySQL 8 |
| Auth | Session cookie + CSRF (XSRF-TOKEN) |
| File storage | Local filesystem (uploaded project documents) |
| Web server | Nginx (serves frontend, proxies /api → Spring Boot) |

**Recommended layout (same-origin via Nginx):**

```
Browser  ──►  Nginx :443  ──►  /           → /var/www/rnd-frontend  (static build)
                             ──►  /api/      → localhost:8080          (Spring Boot)
```

Using the same origin through Nginx eliminates CORS issues entirely and is strongly recommended.

---

## 2. Server Prerequisites (Ubuntu 22.04 LTS)

```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y git curl unzip nginx mysql-server

# Java 17
sudo apt install -y openjdk-17-jdk
java -version          # must print: openjdk 17...

# Node.js 20 LTS
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs
node -v                # must print: v20.x.x
npm -v
```

---

## 3. Checkout Source Code

```bash
cd /opt
sudo mkdir -p rnd
sudo chown -R $USER:$USER /opt/rnd
cd /opt/rnd

git clone <YOUR_GIT_REPO_URL> Research-n-Development
cd Research-n-Development

# Pin to the release tag or branch you are deploying
git checkout main          # or: git checkout v1.0.0
git pull
```

---

## 4. Database Setup

```bash
sudo systemctl enable mysql
sudo systemctl start mysql

# Secure MySQL (set root password, remove anonymous users, etc.)
sudo mysql_secure_installation

# Create production database and dedicated user
sudo mysql -u root -p
```

Inside the MySQL shell:

```sql
CREATE DATABASE rnd_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
CREATE USER 'rnd_user'@'localhost' IDENTIFIED BY '<STRONG_DB_PASSWORD>';
GRANT ALL PRIVILEGES ON rnd_db.* TO 'rnd_user'@'localhost';
FLUSH PRIVILEGES;
EXIT;
```

> **Important:** Create the database manually as shown above.
> `createDatabaseIfNotExist=true` is a **dev-only** convenience that must NOT appear in the production DB URL.
> Flyway will create all tables automatically when the backend first starts.

---

## 5. Backend Environment Configuration

All sensitive values are supplied as environment variables — nothing is hardcoded in the jar.

**Required environment variables:**

| Variable | Default | Notes |
|---|---|---|
| `SPRING_PROFILES_ACTIVE` | — | Must be `prod` in production |
| `SERVER_PORT` | `8080` | Internal port (not exposed externally) |
| `DB_URL` | — | Full JDBC URL, no `createDatabaseIfNotExist` in prod |
| `DB_USERNAME` | — | Required, no fallback in prod profile |
| `DB_PASSWORD` | — | Required, no fallback in prod profile |
| `CORS_ALLOWED_ORIGINS` | `http://localhost:5173,...` | Set to your real domain |
| `APP_SEED_DEFAULT_USERS_ENABLED` | `false` | Set `true` only on first deployment |
| `APP_HEAD_EMAIL` | — | Required when seeding is enabled |
| `APP_HEAD_USERNAME` | — | Required when seeding is enabled |
| `APP_HEAD_PASSWORD` | — | Required when seeding is enabled |

Create the production env file:

```bash
sudo mkdir -p /etc/rnd
sudo tee /etc/rnd/backend.env > /dev/null << 'EOF'
SPRING_PROFILES_ACTIVE=prod
SERVER_PORT=8080

# Production DB — no createDatabaseIfNotExist here
DB_URL=jdbc:mysql://localhost:3306/rnd_db?serverTimezone=UTC&useSSL=true&requireSSL=true
DB_USERNAME=rnd_user
DB_PASSWORD=<STRONG_DB_PASSWORD>

CORS_ALLOWED_ORIGINS=https://your-domain.com

# First deployment: set true to create the HEAD user, then set false and restart
APP_SEED_DEFAULT_USERS_ENABLED=true
APP_HEAD_EMAIL=head@yourcompany.com
APP_HEAD_USERNAME=RnD Head
APP_HEAD_PASSWORD=<STRONG_HEAD_PASSWORD>
EOF

# Lock down the file — only root can read it
sudo chmod 600 /etc/rnd/backend.env
sudo chown root:root /etc/rnd/backend.env
```

> After the first successful login, edit `/etc/rnd/backend.env`, set `APP_SEED_DEFAULT_USERS_ENABLED=false`, and restart the service.

---

## 6. Build the Backend

Run from the repository root:

```bash
cd /opt/rnd/Research-n-Development

# Build (skip tests for speed on deploy; use verify in CI)
./rnd-backend/mvnw -f rnd-backend/pom.xml clean package -DskipTests
```

**Jar output location:**

```
rnd-backend/target/rnd-backend-1.0.0.jar
```

> The jar name comes from `pom.xml`:
> - `artifactId` = `rnd-backend`
> - `version` = `1.0.0`
> Final name: `rnd-backend-1.0.0.jar`

To run with tests (recommended for CI/release):

```bash
./rnd-backend/mvnw -f rnd-backend/pom.xml clean verify
```

---

## 7. Run Backend as a systemd Service

```bash
# Create directories
sudo mkdir -p /opt/rnd/backend
sudo mkdir -p /opt/rnd/uploads/project-documents

# Copy the jar
sudo cp rnd-backend/target/rnd-backend-1.0.0.jar /opt/rnd/backend/rnd-backend.jar

# Create a dedicated non-root service user
sudo useradd --system --home /opt/rnd --shell /usr/sbin/nologin rnd || true
sudo chown -R rnd:rnd /opt/rnd/backend /opt/rnd/uploads

# Create the systemd unit
sudo tee /etc/systemd/system/rnd-backend.service > /dev/null << 'EOF'
[Unit]
Description=MedPlus RnD Backend
After=network.target mysql.service

[Service]
Type=simple
User=rnd
Group=rnd
WorkingDirectory=/opt/rnd/backend
EnvironmentFile=/etc/rnd/backend.env
ExecStart=/usr/bin/java \
  -Xmx512m \
  -jar /opt/rnd/backend/rnd-backend.jar \
  --app.documents.storage-dir=/opt/rnd/uploads/project-documents
SuccessExitStatus=143
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

# Enable and start
sudo systemctl daemon-reload
sudo systemctl enable rnd-backend
sudo systemctl start rnd-backend
sudo systemctl status rnd-backend
```

**Watch startup logs:**

```bash
sudo journalctl -u rnd-backend -f
```

A successful startup looks like:
```
Started RnD Backend (process ...).
Flyway: Migrating schema `rnd_db` to version 1 - baseline
Tomcat started on port 8080
```

---

## 8. Build the Frontend

```bash
cd /opt/rnd/Research-n-Development/rnd-frontend

npm ci            # installs exact versions from package-lock.json
npm run build     # outputs to rnd-frontend/dist/
```

**Build output:**

```
rnd-frontend/dist/
├── index.html
└── assets/
    ├── index-<hash>.js
    └── index-<hash>.css
```

> The frontend uses `VITE_API_BASE_URL` (empty by default) so all `/api` calls are relative to the same origin — no additional config needed when deploying behind Nginx.

---

## 9. Deploy Frontend with Nginx

```bash
# Copy build to web root
sudo mkdir -p /var/www/rnd-frontend
sudo rsync -av --delete \
  /opt/rnd/Research-n-Development/rnd-frontend/dist/ \
  /var/www/rnd-frontend/

# Install TLS certificate (first time only)
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com

# Create Nginx site config
sudo tee /etc/nginx/sites-available/rnd.conf > /dev/null << 'EOF'
server {
    listen 80;
    server_name your-domain.com;
    return 301 https://$host$request_uri;
}

server {
    listen 443 ssl http2;
    server_name your-domain.com;

    ssl_certificate     /etc/letsencrypt/live/your-domain.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/your-domain.com/privkey.pem;
    ssl_protocols       TLSv1.2 TLSv1.3;
    ssl_ciphers         HIGH:!aNULL:!MD5;

    # Security headers
    add_header Strict-Transport-Security "max-age=31536000; includeSubDomains" always;
    add_header X-Frame-Options            "DENY"                               always;
    add_header X-Content-Type-Options     "nosniff"                            always;
    add_header Referrer-Policy            "strict-origin-when-cross-origin"    always;
    add_header Permissions-Policy         "geolocation=(), microphone=()"      always;

    # Frontend static files (React SPA)
    root  /var/www/rnd-frontend;
    index index.html;

    location / {
        try_files $uri /index.html;   # required for React Router client-side routes
    }

    # Proxy all /api requests to Spring Boot
    location /api/ {
        proxy_pass         http://127.0.0.1:8080;
        proxy_http_version 1.1;
        proxy_set_header   Host              $host;
        proxy_set_header   X-Real-IP         $remote_addr;
        proxy_set_header   X-Forwarded-For   $proxy_add_x_forwarded_for;
        proxy_set_header   X-Forwarded-Proto $scheme;

        # Needed for session cookie to be forwarded correctly
        proxy_set_header   Cookie            $http_cookie;
    }
}
EOF

# Enable site and reload
sudo ln -sf /etc/nginx/sites-available/rnd.conf /etc/nginx/sites-enabled/rnd.conf
sudo nginx -t                         # must print: syntax is ok
sudo systemctl reload nginx
```

---

## 10. Database Migrations (Flyway)

- Flyway runs **automatically on every startup** before Hibernate.
- Migration files live in `rnd-backend/src/main/resources/db/migration/`.
- The baseline migration is **`V1__baseline.sql`** — it creates all tables, indexes, and constraints.
- `spring.flyway.baseline-on-migrate=true` is set in `application-prod.properties`, which allows Flyway to mark a pre-existing schema as baselined if needed.
- `ddl-auto=validate` in prod means Hibernate will **verify** (not modify) the schema on startup — if it mismatches it will fail fast.
- **Never use `ddl-auto=update` or `ddl-auto=create` in production.**
- To apply schema changes in future releases: add a new migration file `V2__description.sql`, commit it, and redeploy.

---

## 11. File Storage and Backups

Documents are stored at the path passed via `--app.documents.storage-dir`:

```
/opt/rnd/uploads/project-documents/
```

**Backup targets — must all be included:**

| What | Path |
|---|---|
| MySQL database | `mysqldump -u rnd_user -p rnd_db > backup.sql` |
| Uploaded documents | `/opt/rnd/uploads/project-documents/` |
| Env file | `/etc/rnd/backend.env` (store encrypted) |

---

## 12. Deployment Verification

**1. Backend health check:**

```bash
curl -i http://127.0.0.1:8080/api/auth/csrf
# Expect: HTTP 200 with a JSON body containing "token"
```

**2. Nginx / frontend check:**

```bash
curl -I https://your-domain.com
# Expect: HTTP 200

sudo nginx -t
sudo systemctl status nginx
sudo systemctl status rnd-backend
```

**3. Port check:**

```bash
sudo ss -lntp | grep -E '(:80|:443|:8080)'
# 80 and 443 must be visible (Nginx)
# 8080 must be visible but only on 127.0.0.1
```

**4. Functional test:**

- Open `https://your-domain.com` in a browser
- Log in with `APP_HEAD_USERNAME` / `APP_HEAD_PASSWORD` from the env file
- After confirming login works, set `APP_SEED_DEFAULT_USERS_ENABLED=false` and restart

---

## 13. Upgrading to a New Release

```bash
cd /opt/rnd/Research-n-Development

# Pull latest code
git fetch --all
git checkout main       # or: git checkout v1.1.0
git pull

# Rebuild backend
./rnd-backend/mvnw -f rnd-backend/pom.xml clean package -DskipTests
sudo cp rnd-backend/target/rnd-backend-1.0.0.jar /opt/rnd/backend/rnd-backend.jar
sudo systemctl restart rnd-backend
sudo journalctl -u rnd-backend -f     # watch for Flyway migrations and startup

# Rebuild frontend
cd rnd-frontend
npm ci
npm run build
sudo rsync -av --delete dist/ /var/www/rnd-frontend/
sudo systemctl reload nginx
```

---

## 14. Rollback Strategy

Before every upgrade, keep a timestamped copy:

```bash
# Before upgrading backend
sudo cp /opt/rnd/backend/rnd-backend.jar \
        /opt/rnd/backend/rnd-backend-$(date +%Y%m%d).jar

# Before upgrading frontend
sudo cp -r /var/www/rnd-frontend \
           /var/www/rnd-frontend-$(date +%Y%m%d)
```

To roll back:

```bash
# Backend
sudo cp /opt/rnd/backend/rnd-backend-<DATE>.jar /opt/rnd/backend/rnd-backend.jar
sudo systemctl restart rnd-backend

# Frontend
sudo rsync -av --delete /var/www/rnd-frontend-<DATE>/ /var/www/rnd-frontend/
sudo systemctl reload nginx
```

---

## 15. Local Dev Quick-Start (Windows / VS Code)

Use the `launch.json` configurations in `.vscode/launch.json` — no `.env` file needed for local dev.

**Backend (terminal alternative):**

```powershell
$env:SPRING_PROFILES_ACTIVE="dev"
$env:DB_USERNAME="root"
$env:DB_PASSWORD="root"
$env:APP_HEAD_PASSWORD="admin"
$env:APP_HEAD_USERNAME="admin"
$env:APP_HEAD_EMAIL="admin@example.com"
$env:CORS_ALLOWED_ORIGINS="http://localhost:5173"
cd rnd-backend
.\mvnw spring-boot:run
```

**Frontend:**

```powershell
cd rnd-frontend
npm install
npm run dev
# Open http://localhost:5173
```

---

## 16. Production Go-Live Checklist

### Environment
- [ ] `SPRING_PROFILES_ACTIVE=prod` is set
- [ ] `DB_URL` points to the production database — no `createDatabaseIfNotExist`
- [ ] `DB_USERNAME` and `DB_PASSWORD` are production credentials
- [ ] `CORS_ALLOWED_ORIGINS` matches the real frontend domain
- [ ] `/etc/rnd/backend.env` has `chmod 600` and is owned by root
- [ ] `APP_SEED_DEFAULT_USERS_ENABLED=false` after first login

### Database
- [ ] `rnd_db` database created manually before first backend startup
- [ ] Flyway `V1__baseline.sql` ran successfully on first startup (check logs)
- [ ] Production startup uses `ddl-auto=validate` (confirmed in logs)
- [ ] No schema drift between dev and prod

### Backend
- [ ] Jar builds successfully: `./rnd-backend/mvnw -f rnd-backend/pom.xml clean verify`
- [ ] Jar is `rnd-backend/target/rnd-backend-1.0.0.jar`
- [ ] Service starts and `GET /api/auth/csrf` returns HTTP 200
- [ ] No exceptions in startup logs

### Frontend
- [ ] `npm run build` succeeds in `rnd-frontend/`
- [ ] `dist/` deployed to `/var/www/rnd-frontend/`
- [ ] Browser opens `https://your-domain.com` without console errors
- [ ] Login and logout work end to end

### Infrastructure
- [ ] Nginx serves frontend and proxies `/api` to backend
- [ ] HTTPS is enabled with a valid certificate
- [ ] Firewall: ports 80 and 443 open publicly, port 8080 internal only
- [ ] Backend runs as non-root `rnd` user
- [ ] Uploads directory is on persistent storage

### Backups
- [ ] MySQL backup plan is in place and tested
- [ ] `/opt/rnd/uploads/project-documents/` is included in backup
- [ ] `/etc/rnd/backend.env` is securely backed up (encrypted)
- [ ] Rollback copies of previous jar and frontend bundle are stored

### Final Sign-off
- [ ] Smoke tested: login, create benchmark, upload document, run calibration
- [ ] Deployment team has confirmed all checklist items above
