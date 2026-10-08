# Timesheet – Backend & Frontend
 
Il progetto è composto da:

- **Frontend**: HTML, CSS e JavaScript (statico)
- **Backend**: Node.js + Express
- **Database**: MariaDB (con dati di test)
- **Reverse proxy**: Nginx  
- **Ambiente**: Docker / Docker Compose

---

## Cartelle da caricare

- **html** → contiene tutti i file del frontend
- **node** → contiene tutti i file del backend 
- **db/** → Contiene il dump del database con tabelle, viste e dati di test

## Database

Il file `db/Timesheet_full.sql` contiene:
- struttura completa del database
- viste
- dati di test
- utenti di test

### Importazione del database

Dopo l’avvio dei container MariaDB:

```bash
docker exec -i app-db mysql \
  -u root \
  -prootpassword \
  --default-character-set=utf8mb4 \
  appdb < db/Timesheet_full.sql


