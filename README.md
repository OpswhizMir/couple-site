
A private, beautiful website built as a gesture of love. Features a photo gallery, poetry section, date planner, and savings dashboard — all running on a Dockerized stack hosted on AWS EC2.

---
## 🌐 Live Site
```
https://u***y.ddns.net
```


## 🏗️ Architecture

```
Browser
  └── HTTPS (443) / HTTP (80)
        └── Nginx (Docker)
              ├── /          → serves index.html (frontend)
              ├── /api/*     → proxied to Express backend:3001
              └── /photos/*  → proxied to Express backend:3001
                    └── Express (Node.js)
                          ├── SQLite DB (better-sqlite3)
                          └── Photo files (disk)
```

---

## 🧱 Tech Stack

| Layer | Technology | Purpose |
|---|---|---|
| Frontend | HTML / CSS / JavaScript | Single page UI |
| Backend | Node.js + Express | REST API |
| Database | SQLite (better-sqlite3) | Stores poems, dates, savings |
| File Storage | Disk (Docker Volume) | Stores uploaded photos |
| Web Server | Nginx Alpine | Reverse proxy + static files |
| Containers | Docker + Docker Compose | Orchestration |
| Cloud | AWS EC2 t2.micro | Hosting (free tier) |
| DNS | No-IP (u**zy.ddns.net) | Free domain |
| SSL | Let's Encrypt (Certbot) | Free HTTPS |

---

## 📁 Project Structure

```
love-site/
├── docker-compose.yml       ← orchestrates all containers
├── docker/
│   └── nginx.conf           ← reverse proxy config + SSL
├── frontend/
│   └── index.html           ← entire frontend (single file)
└── backend/
    ├── server.js            ← Express API
    ├── package.json         ← Node dependencies
    └── Dockerfile           ← backend container build
```

---

## 🚀 Deployment

### Prerequisites
- AWS EC2 t2.micro (Ubuntu 22.04)
- Docker + Docker Compose installed
- Port 22, 80, 443 open in Security Group
- Elastic IP assigned
- No-IP domain pointing to Elastic IP
- SSL certificate via Certbot

### First Time Setup
```bash
# 1. Clone/copy project to EC2
scp -i your-key.pem -r love-site/ ubuntu@<elastic-ip>:~

# 2. SSH into EC2
ssh -i your-key.pem ubuntu@<elastic-ip>

# 3. Install Docker
curl -fsSL https://get.docker.com | sudo sh
sudo usermod -aG docker ubuntu
newgrp docker

# 4. Get SSL certificate
sudo apt install certbot -y
sudo certbot certonly --webroot -w ~/love-site/frontend -d uzzy.ddns.net

# 5. Start everything
cd ~/love-site
docker compose up -d --build
```

### Verify it's running
```bash
docker ps
# Should show love-nginx (80, 443) and love-backend (3001)
```

---

## 🔁 Common Commands

### Start the site
```bash
cd ~/love-site
docker compose up -d
```

### Stop the site
```bash
docker compose down
```

### Restart only Nginx (after config changes)
```bash
docker compose restart nginx
```

### Rebuild after code changes
```bash
docker compose up -d --build
```

### View logs
```bash
docker logs love-nginx      # Nginx logs
docker logs love-backend    # Backend/API logs
```

### Check running containers
```bash
docker ps
```

---

## 💾 Data & Persistence

| Data | Location | Persists? |
|---|---|---|
| SQLite database | Docker volume `backend-data` | ✅ Yes |
| Uploaded photos | `/frontend/photos/` (bind mount) | ✅ Yes |
| SSL certificates | `/etc/letsencrypt/` (host) | ✅ Yes |
| Frontend code | `~/love-site/frontend/` (bind mount) | ✅ Yes |

### Backup the database
```bash
cp /var/lib/docker/volumes/love-site_backend-data/_data/love.db ~/love-db-backup.db
```

### Backup photos
```bash
cp -r ~/love-site/frontend/photos/ ~/photos-backup/
```

---

## 🔌 API Reference

### Photos
```
GET    /api/photos          List all photos
POST   /api/photos          Upload photo (multipart/form-data)
DELETE /api/photos/:id      Delete photo
```

### Poetry
```
GET    /api/poems           List all poems
POST   /api/poems           Create poem { title, body, author }
DELETE /api/poems/:id       Delete poem
```

### Date Schedule
```
GET    /api/dates               List all dates
POST   /api/dates               Create date { title, description, date_time, location, emoji }
PATCH  /api/dates/:id/toggle    Mark as done/undone
DELETE /api/dates/:id           Delete date
```

### Savings Goals
```
GET    /api/savings         List all goals
POST   /api/savings         Create goal { label, target, current, emoji }
PATCH  /api/savings/:id     Update goal/add amount { current }
DELETE /api/savings/:id     Delete goal
```

---

## 🔒 SSL Certificate Renewal

Certbot auto-renews every 90 days. To manually renew:
```bash
# Stop nginx temporarily
docker compose stop nginx

# Renew certificate
sudo certbot renew

# Start nginx again
docker compose start nginx
```

---

## 💰 Cost Breakdown

| Resource | Cost |
|---|---|
| EC2 t2.micro | Free (12 months) |
| Elastic IP | Free (while instance runs) |
| EBS Storage 30GB | Free (12 months) |
| No-IP Domain | Free |
| SSL Certificate | Free (Let's Encrypt) |
| **Total** | **$0/month** ✅ |

> ⚠️ After 12 months AWS free tier expires — t2.micro costs ~$8/month

---

## 🛠️ Troubleshooting

### Site not loading
```bash
docker ps                          # are containers running?
docker logs love-nginx             # any nginx errors?
sudo ss -tlnp | grep :80           # is port 80 bound?
sudo ss -tlnp | grep :443          # is port 443 bound?
```

### Photos not showing
```bash
curl https://uzzy.ddns.net/photos/<filename> -I    # should return 200
docker logs love-backend                            # any upload errors?
ls ~/love-site/frontend/photos/                    # files on disk?
```

### Database issues
```bash
docker exec love-backend node -e "
  const db = require('better-sqlite3')('/app/data/love.db');
  console.log(db.prepare('SELECT * FROM photos').all());
"
```

### Nginx config issues
```bash
docker exec love-nginx nginx -t    # test config syntax
docker compose restart nginx       # apply config changes
```

---

