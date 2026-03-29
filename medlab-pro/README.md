# MedLab Pro 🏥
**Sistem Informativ per Klinike Laboratorike**  
Full-Stack MERN | Cloud | REST API

---

## 🚀 Si te Filloni (Setup)

### 1. Klono dhe hap ne VSCode
```bash
# Hap folderin ne VSCode
code medlab-pro/
```

### 2. Setup Backend
```bash
cd backend

# Instalo dependency-t
npm install

# Kopjo .env.example ne .env
cp .env.example .env

# Edito .env me te dhenat tuaja:
# - MONGO_URI = lidhja me MongoDB Atlas
# - JWT_SECRET = nje string sekret
# - CLOUDINARY_* = kredencialet Cloudinary
# - SENDGRID_API_KEY = API key SendGrid
```

### 3. Setup Frontend
```bash
cd ../frontend

# Instalo dependency-t
npm install
```

### 4. Starto Sistemin
```bash
# Terminal 1 — Backend
cd backend && npm run dev

# Terminal 2 — Frontend
cd frontend && npm run dev
```

### 5. Hap ne browser
```
http://localhost:5173
```

---

## 📦 Struktura e Projektit

```
medlab-pro/
├── backend/               # Node.js + Express API
│   ├── config/           # DB dhe Cloudinary config
│   ├── controllers/      # Logjika biznesore
│   ├── middleware/        # Auth, Gabimet
│   ├── models/           # Skemat MongoDB
│   ├── routes/           # API endpoints
│   ├── utils/            # PDF Generator, Email
│   └── server.js         # Pika hyrese
│
└── frontend/             # React.js + Vite
    └── src/
        ├── pages/        # Faqet
        ├── components/   # Komponentet
        ├── store/        # Redux slices
        └── services/     # API calls
```

---

## 🗄️ MongoDB Atlas Setup (FALAS)

1. Shko tek **mongodb.com/atlas**
2. Krijo cluster falas (M0 Sandbox)
3. Database Access → Shto perdorues
4. Network Access → Allow from Anywhere (0.0.0.0/0)
5. Connect → Drivers → Kopjo connection string
6. Vendos ne `.env` → `MONGO_URI=mongodb+srv://...`

---

## ☁️ Deploy (Production)

### Backend → Render.com (FALAS)
1. Push kodin ne GitHub
2. render.com → New Web Service
3. Zgjidh repo → Root: `backend`
4. Build: `npm install` | Start: `node server.js`
5. Shto variablat `.env`

### Frontend → Vercel (FALAS)
1. vercel.com → Import Project
2. Root Directory: `frontend`
3. Shto `VITE_API_URL=https://medlab-api.render.com/api`

---

## 📋 Modulet

| Module | Statusi | Pershkrimi |
|--------|---------|------------|
| ✅ Auth & Perdoruesit | Komplet | JWT, bcrypt, role-based |
| ✅ Pacientet | Komplet | CRUD, kartela, histori |
| ✅ Laboratori | Komplet | Testet, porosi, rezultate, flamurim |
| ✅ Kontrollet | Komplet | Takime, vizita, receta |
| ✅ Pagesat | Komplet | Fatura, pagesa, raporte |
| ✅ Dashboard | Komplet | Statistika, aktiviteti |
| ✅ PDF Generator | Komplet | Raporte lab, fatura |
| ✅ Email | Komplet | Rezultate, fatura |
| 🔄 Frontend UI | Bazik+Stub | Dashboard, Pacientet komplet |

---

## 🔑 Rolet e Perdoruesve

| Roli | Qasja |
|------|-------|
| `admin` | I plote — te gjitha modulet |
| `mjek` | Pacientet, Kontrollet, Laboratori |
| `laborant` | Porosi, Rezultate Lab |
| `recepsionist` | Pacientet, Takime, Pagesat |

---

## 📡 API Endpoints Kryesore

```
POST   /api/auth/hyrje
GET    /api/pacientet
POST   /api/pacientet
GET    /api/pacientet/:id/histori
GET    /api/laborator/testet
POST   /api/laborator/porosi
PUT    /api/laborator/porosi/:id/rezultate
GET    /api/laborator/porosi/:id/raport    (PDF)
GET    /api/kontrollet/kalendar
POST   /api/kontrollet
GET    /api/pagesat/faturat
PUT    /api/pagesat/faturat/:id/paguaj
GET    /api/pagesat/statistika
GET    /api/dashboard
```

---

## 🛠️ Teknologjite

**Backend:** Node.js, Express.js, MongoDB, Mongoose, JWT, bcryptjs, PDFKit, Nodemailer  
**Frontend:** React 18, Vite, Redux Toolkit, React Router v6, Tailwind CSS, Axios

---

*MedLab Pro — Versioni 1.0 — 2026*
