-- MySQL dump 10.13  Distrib 9.3.0, for macos15.2 (arm64)
--
-- Host: localhost    Database: timesheet
-- ------------------------------------------------------
-- Server version	9.3.0

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `diary_activities`
--

DROP TABLE IF EXISTS `diary_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `diary_activities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `diary_activities`
--

LOCK TABLES `diary_activities` WRITE;
/*!40000 ALTER TABLE `diary_activities` DISABLE KEYS */;
INSERT INTO `diary_activities` VALUES (1,'Attività didattica svolta per dottorati','2025-12-04 17:24:39'),(2,'Attività per corsi di formazione','2025-12-04 17:24:39'),(3,'Attività per corsi di formazione S-W','2025-12-04 17:24:39'),(4,'Attività per corsi di perfezionamento','2025-12-04 17:24:39'),(5,'Attività per corsi di master','2025-12-04 17:24:39'),(6,'Attività per servizi agli studenti','2025-12-04 17:24:39'),(7,'Didattica integrativa non curricolare','2025-12-04 17:24:39'),(8,'Verifica dell\'apprendimento studenti','2025-12-04 17:24:39');
/*!40000 ALTER TABLE `diary_activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `diary_annual_entries`
--

DROP TABLE IF EXISTS `diary_annual_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `diary_annual_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `academic_year` varchar(9) NOT NULL,
  `diary_activity_id` int NOT NULL,
  `hours` decimal(5,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_activity_year` (`user_id`,`diary_activity_id`,`academic_year`),
  KEY `diary_activity_id` (`diary_activity_id`),
  CONSTRAINT `diary_annual_entries_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `diary_annual_entries_ibfk_2` FOREIGN KEY (`diary_activity_id`) REFERENCES `diary_activities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=40 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `diary_annual_entries`
--

LOCK TABLES `diary_annual_entries` WRITE;
/*!40000 ALTER TABLE `diary_annual_entries` DISABLE KEYS */;
INSERT INTO `diary_annual_entries` VALUES (19,1,'2025/26',1,4.00,'2025-12-23 15:25:05'),(21,1,'2025/26',2,3.00,'2025-12-23 15:42:01'),(23,1,'2025/26',3,2.00,'2025-12-25 10:27:00'),(24,1,'2025/26',5,2.00,'2025-12-25 10:27:06'),(25,1,'2024/25',3,2.00,'2025-12-25 10:28:05'),(26,1,'2024/25',5,1.00,'2025-12-25 10:35:16'),(27,1,'2024/25',6,5.00,'2025-12-25 10:35:16'),(28,1,'2024/25',7,4.00,'2025-12-25 10:35:24'),(29,1,'2025/26',4,1.00,'2026-01-03 10:27:38'),(30,1,'2025/26',6,1.00,'2026-01-13 08:47:59'),(31,1,'2025/26',7,3.00,'2026-01-13 08:59:21'),(39,1,'2024/25',1,1.00,'2026-02-13 09:39:23');
/*!40000 ALTER TABLE `diary_annual_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `diary_timesheet_entries`
--

DROP TABLE IF EXISTS `diary_timesheet_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `diary_timesheet_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timesheet_id` int NOT NULL,
  `user_id` int NOT NULL,
  `diary_activity_id` int NOT NULL,
  `date` date NOT NULL,
  `hours` decimal(5,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_diary_entry` (`timesheet_id`,`diary_activity_id`,`date`),
  KEY `user_id` (`user_id`),
  KEY `diary_activity_id` (`diary_activity_id`),
  CONSTRAINT `diary_timesheet_entries_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `diary_timesheet_entries_ibfk_2` FOREIGN KEY (`timesheet_id`) REFERENCES `timesheet` (`id`) ON DELETE CASCADE,
  CONSTRAINT `diary_timesheet_entries_ibfk_3` FOREIGN KEY (`diary_activity_id`) REFERENCES `diary_activities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2541 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `diary_timesheet_entries`
--

LOCK TABLES `diary_timesheet_entries` WRITE;
/*!40000 ALTER TABLE `diary_timesheet_entries` DISABLE KEYS */;
INSERT INTO `diary_timesheet_entries` VALUES (518,20,1,1,'2025-08-01',1.00,'2025-12-22 10:26:36'),(594,20,1,3,'2025-08-01',2.00,'2025-12-24 10:06:32'),(595,20,1,5,'2025-08-01',2.00,'2025-12-24 10:06:32'),(596,20,1,4,'2025-08-01',2.00,'2025-12-24 10:06:32'),(597,20,1,4,'2025-08-02',2.00,'2025-12-24 10:06:32'),(598,20,1,4,'2025-08-03',2.00,'2025-12-24 10:06:32'),(599,20,1,4,'2025-08-05',2.00,'2025-12-24 10:06:32'),(600,20,1,4,'2025-08-06',4.00,'2025-12-24 10:06:32'),(601,20,1,4,'2025-08-08',4.00,'2025-12-24 10:06:32'),(602,20,1,4,'2025-08-11',4.00,'2025-12-24 10:06:32'),(603,20,1,4,'2025-08-12',4.00,'2025-12-24 10:06:32'),(604,20,1,4,'2025-08-13',4.00,'2025-12-24 10:06:32'),(605,20,1,4,'2025-08-14',4.00,'2025-12-24 10:06:32'),(625,3,1,1,'2025-12-12',1.00,'2025-12-24 11:37:36'),(652,3,1,6,'2025-12-12',1.00,'2025-12-26 09:33:58'),(663,3,1,8,'2025-12-05',2.00,'2025-12-26 09:47:55'),(668,3,1,4,'2025-12-13',1.00,'2025-12-30 17:19:03'),(756,2866,2,1,'2026-01-01',2.00,'2026-01-13 23:17:09'),(768,2866,2,2,'2026-01-02',2.00,'2026-01-14 23:32:58'),(773,2866,2,5,'2026-01-04',2.00,'2026-01-14 23:33:25'),(776,2866,2,2,'2026-01-05',1.00,'2026-01-14 23:33:39'),(1310,2866,2,1,'2026-01-02',2.00,'2026-01-15 18:04:43'),(1391,3,1,1,'2025-12-07',2.00,'2026-01-17 17:26:53'),(1456,2866,2,2,'2026-01-01',1.00,'2026-01-20 08:53:22'),(1466,2866,2,2,'2026-01-03',2.00,'2026-01-20 08:53:29'),(1632,2866,2,3,'2026-01-01',1.00,'2026-01-20 14:31:04'),(1660,3,1,3,'2025-12-02',1.00,'2026-01-21 08:48:49'),(1665,15,1,6,'2026-01-01',1.00,'2026-01-21 08:57:22'),(1674,15,1,1,'2026-01-05',1.00,'2026-01-22 09:32:59'),(1791,2866,2,5,'2026-01-05',1.00,'2026-01-30 14:35:14'),(1794,2866,2,1,'2026-01-06',1.00,'2026-01-30 14:36:53'),(1835,2866,2,5,'2026-01-07',1.00,'2026-01-30 14:46:30'),(1851,2615,6,1,'2026-01-05',1.00,'2026-01-30 21:38:57'),(1947,2615,6,2,'2026-01-02',1.00,'2026-02-02 11:25:06'),(2026,2615,6,1,'2026-01-06',1.00,'2026-02-02 11:40:23'),(2390,2866,2,1,'2026-01-08',1.00,'2026-02-03 09:34:06'),(2399,3384,2,1,'2026-03-02',1.00,'2026-02-03 09:52:31'),(2403,815,1,2,'2026-03-02',1.00,'2026-02-03 11:03:36'),(2472,2717,6,1,'2026-03-01',1.00,'2026-02-03 14:54:35'),(2473,3385,2,1,'2026-04-01',1.00,'2026-02-05 15:51:51'),(2475,3385,2,1,'2026-04-03',2.00,'2026-02-05 15:52:23'),(2476,3385,2,2,'2026-04-06',2.00,'2026-02-05 15:52:23'),(2477,3385,2,5,'2026-04-06',2.00,'2026-02-05 15:52:23'),(2478,3385,2,6,'2026-04-07',1.00,'2026-02-05 15:52:23'),(2479,3385,2,6,'2026-04-10',1.00,'2026-02-05 15:52:23'),(2480,3385,2,6,'2026-04-16',2.00,'2026-02-05 15:52:23'),(2483,3386,2,1,'2026-05-01',1.00,'2026-02-10 08:30:40'),(2484,3386,2,2,'2026-05-04',2.00,'2026-02-10 08:30:40'),(2485,3386,2,5,'2026-05-04',2.00,'2026-02-10 08:30:40'),(2486,3386,2,5,'2026-05-06',2.00,'2026-02-10 08:30:40'),(2487,3386,2,5,'2026-05-08',2.00,'2026-02-10 08:30:40'),(2488,3386,2,4,'2026-05-12',2.00,'2026-02-10 08:30:40'),(2493,2616,6,1,'2026-02-01',1.00,'2026-02-11 21:52:39'),(2494,2869,2,1,'2025-12-01',1.00,'2026-02-11 21:55:01'),(2496,5967,2,1,'2025-11-01',1.00,'2026-02-11 22:03:34'),(2498,2869,2,2,'2025-12-01',1.00,'2026-02-11 22:03:47'),(2503,2869,2,3,'2025-12-01',1.00,'2026-02-11 22:12:22'),(2507,2869,2,4,'2025-12-01',1.00,'2026-02-11 22:13:51');
/*!40000 ALTER TABLE `diary_timesheet_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `institutional_activities`
--

DROP TABLE IF EXISTS `institutional_activities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `institutional_activities` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `institutional_activities`
--

LOCK TABLES `institutional_activities` WRITE;
/*!40000 ALTER TABLE `institutional_activities` DISABLE KEYS */;
INSERT INTO `institutional_activities` VALUES (1,'Consigli, commissioni,...','2025-12-16 10:50:49');
/*!40000 ALTER TABLE `institutional_activities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `institutional_timesheet_entries`
--

DROP TABLE IF EXISTS `institutional_timesheet_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `institutional_timesheet_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timesheet_id` int NOT NULL,
  `user_id` int NOT NULL,
  `institutional_activity_id` int NOT NULL,
  `date` date NOT NULL,
  `hours` decimal(5,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_institutional_entry` (`timesheet_id`,`institutional_activity_id`,`date`),
  KEY `user_id` (`user_id`),
  KEY `institutional_activity_id` (`institutional_activity_id`),
  CONSTRAINT `institutional_timesheet_entries_ibfk_1` FOREIGN KEY (`timesheet_id`) REFERENCES `timesheet` (`id`) ON DELETE CASCADE,
  CONSTRAINT `institutional_timesheet_entries_ibfk_2` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `institutional_timesheet_entries_ibfk_3` FOREIGN KEY (`institutional_activity_id`) REFERENCES `institutional_activities` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=958 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `institutional_timesheet_entries`
--

LOCK TABLES `institutional_timesheet_entries` WRITE;
/*!40000 ALTER TABLE `institutional_timesheet_entries` DISABLE KEYS */;
INSERT INTO `institutional_timesheet_entries` VALUES (13,20,1,1,'2025-08-04',1.00,'2025-12-23 22:56:21'),(14,1,1,1,'2025-10-01',1.00,'2025-12-23 22:56:38'),(20,3,1,1,'2025-12-08',2.00,'2025-12-24 11:37:36'),(35,3,1,1,'2025-12-16',1.00,'2025-12-26 09:28:00'),(48,15,1,1,'2026-01-05',1.00,'2026-01-07 11:14:54'),(53,15,1,1,'2026-01-07',2.00,'2026-01-07 16:07:48'),(309,2866,2,1,'2026-01-01',1.00,'2026-01-15 18:03:08'),(311,2866,2,1,'2026-01-02',1.00,'2026-01-15 18:03:19'),(316,2866,2,1,'2026-01-03',1.00,'2026-01-15 18:03:42'),(320,2866,2,1,'2026-01-04',1.00,'2026-01-15 18:04:06'),(329,2866,2,1,'2026-01-05',1.00,'2026-01-15 18:05:32'),(345,15,1,1,'2026-01-30',2.00,'2026-01-15 21:07:06'),(382,3,1,1,'2025-12-03',1.00,'2026-01-17 18:03:17'),(430,2866,2,1,'2026-01-08',2.00,'2026-01-20 08:53:44'),(713,2615,6,1,'2026-01-01',1.00,'2026-02-02 10:55:04'),(728,2615,6,1,'2026-01-02',2.00,'2026-02-02 11:35:03'),(901,32,1,1,'2026-02-01',1.00,'2026-02-03 11:28:12'),(918,32,1,1,'2026-02-02',1.00,'2026-02-03 14:21:29'),(937,3385,2,1,'2026-04-16',1.00,'2026-02-05 15:52:23'),(938,3385,2,1,'2026-04-20',1.00,'2026-02-05 15:52:23'),(939,3385,2,1,'2026-04-27',1.00,'2026-02-05 15:52:23'),(940,3386,2,1,'2026-05-13',2.00,'2026-02-10 08:30:40'),(941,3386,2,1,'2026-05-14',2.00,'2026-02-10 08:30:40'),(942,3386,2,1,'2026-05-15',1.00,'2026-02-10 08:30:40'),(943,3386,2,1,'2026-05-18',1.00,'2026-02-10 08:30:40'),(944,3386,2,1,'2026-05-19',1.00,'2026-02-10 08:30:40'),(945,3386,2,1,'2026-05-25',2.00,'2026-02-10 08:30:40'),(946,3386,2,1,'2026-05-26',2.00,'2026-02-10 08:30:40');
/*!40000 ALTER TABLE `institutional_timesheet_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=33 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES (1,'timesheet.create_own','Può creare il proprio timesheet'),(2,'timesheet.read_own','Può leggere il proprio timesheet'),(3,'timesheet.read_all','Può leggere tutti i timesheet'),(4,'activities.read_own','Può leggere le proprie attività'),(5,'activities.read_all','Può leggere le attività di tutti'),(6,'timesheet.update_own','Può salvare/aggiornare le ore del proprio timesheet'),(7,'diary.read_own','Visualizzazione diario annuale personale'),(8,'diary.write_own','Inserimento e modifica ore diario annuale'),(9,'timesheet.submit_own','Permette di inviare il proprio timesheet'),(10,'projects.read','Visualizzazione elenco progetti'),(11,'projects.create','Permesso per creare nuovi progetti'),(12,'projects.view_details','Visualizzazione dettagli completi progetto (risorse, WP, assegnazioni)'),(13,'projects.update','Modifica dati anagrafici del progetto'),(14,'projects.edit_workpackages','Permesso di aggiungere, modificare o cancellare Work Packages'),(15,'projects.edit_resources','Consente di aggiungere/modificare/rimuovere risorse assegnate ai progetti'),(17,'projects.read_anagrafica','Visualizza l’anagrafica utenti per l’assegnazione ai progetti'),(18,'projects.read.capoprogetto','Permesso per visualizzare la lista dei progetti come capo progetto'),(19,'projects.create_roles','Permesso per aggiungere un nuovo ruolo per i progetti'),(20,'own_report','Permesso per creare il proprio report'),(21,'didattica.read_docenti','Permesso per visualizzare tutti i docenti'),(22,'didattica.read_limits','Permesso per recuperare i limiti per anno accademico dei docenti'),(23,'didattica.write_limits','Permesso per aggiornare/inserire limiti ore per i docenti'),(24,'didattica.teachings','Permesso per visualizzare e definire i budget degli insegnamenti'),(25,'projects.change_status','Permesso per gestire gli stati dei timesheet dei progetti'),(26,'admin.read_users','Permesso per leggere la lista degli utenti memorizzati nel sistema'),(27,'admin.active_users','Permesso per attivare/disattivare un utente'),(29,'admin.read_roles','Lettura ruoli nel sistema'),(30,'admin.read_permissions','Lettura permessi nel sistema'),(31,'admin.permissions','Permesso per modificare/aggiungere/eliminare un permesso'),(32,'admin.roles','Permesso per creare/modificare/eliminare un ruolo');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_assignments`
--

DROP TABLE IF EXISTS `project_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `project_id` int NOT NULL,
  `role_id` int DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `assigned_hours` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `user_id` (`user_id`),
  KEY `project_id` (`project_id`),
  KEY `fk_project_role` (`role_id`),
  CONSTRAINT `fk_project_role` FOREIGN KEY (`role_id`) REFERENCES `project_roles` (`id`),
  CONSTRAINT `project_assignments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_assignments_ibfk_2` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=12 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_assignments`
--

LOCK TABLES `project_assignments` WRITE;
/*!40000 ALTER TABLE `project_assignments` DISABLE KEYS */;
INSERT INTO `project_assignments` VALUES (1,1,1,NULL,'2025-10-01','2026-09-30',200.00),(2,6,1,2,'2025-10-01','2026-03-30',140.00),(3,6,3,6,'2026-01-23','2026-05-30',100.00),(4,6,2,1,'2025-12-26','2026-03-01',10.00),(5,6,4,1,'2026-01-02','2026-02-06',30.00),(6,2,3,1,'2026-01-01','2026-05-30',250.00),(8,1,4,8,'2025-12-25','2026-04-29',40.00),(9,6,1,3,'2026-04-01','2026-09-30',20.00),(10,2,1,2,'2026-04-01','2026-04-30',50.00),(11,2,2,2,'2026-04-01','2026-04-30',50.00);
/*!40000 ALTER TABLE `project_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_roles`
--

DROP TABLE IF EXISTS `project_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_roles`
--

LOCK TABLES `project_roles` WRITE;
/*!40000 ALTER TABLE `project_roles` DISABLE KEYS */;
INSERT INTO `project_roles` VALUES (8,'Assegnista'),(9,'Borsista'),(10,'Contratto di ricerca'),(1,'Coordinatore scientifico'),(11,'Incarico di ricerca'),(12,'Incarico post-doc'),(4,'Professore associato'),(3,'Professore ordinario'),(2,'Ricercatore'),(5,'RTD-A'),(6,'RTD-B'),(7,'RTT'),(13,'ruolo di prova');
/*!40000 ALTER TABLE `project_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `project_timesheet_entries`
--

DROP TABLE IF EXISTS `project_timesheet_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_timesheet_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timesheet_id` int NOT NULL,
  `user_id` int NOT NULL,
  `project_assignment_id` int NOT NULL,
  `workpackage_id` int DEFAULT NULL,
  `date` date NOT NULL,
  `hours` decimal(5,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `workpackage_uid` int NOT NULL DEFAULT '-1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_project_entry_v2` (`timesheet_id`,`project_assignment_id`,`workpackage_uid`,`date`),
  KEY `user_id` (`user_id`),
  KEY `project_assignment_id` (`project_assignment_id`),
  KEY `workpackage_id` (`workpackage_id`),
  CONSTRAINT `project_timesheet_entries_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_timesheet_entries_ibfk_2` FOREIGN KEY (`timesheet_id`) REFERENCES `timesheet` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_timesheet_entries_ibfk_3` FOREIGN KEY (`project_assignment_id`) REFERENCES `project_assignments` (`id`) ON DELETE CASCADE,
  CONSTRAINT `project_timesheet_entries_ibfk_4` FOREIGN KEY (`workpackage_id`) REFERENCES `project_workpackages` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2149 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_timesheet_entries`
--

LOCK TABLES `project_timesheet_entries` WRITE;
/*!40000 ALTER TABLE `project_timesheet_entries` DISABLE KEYS */;
INSERT INTO `project_timesheet_entries` VALUES (765,3,1,1,1,'2025-12-03',2.00,'2025-12-24 11:37:36',1),(766,3,1,1,2,'2025-12-02',1.00,'2025-12-24 11:37:36',2),(767,3,1,1,2,'2025-12-04',2.00,'2025-12-24 11:37:36',2),(768,3,1,1,2,'2025-12-05',2.00,'2025-12-24 11:37:36',2),(822,2,1,1,1,'2025-11-01',2.00,'2025-12-26 09:22:49',1),(850,2615,6,2,6,'2026-01-01',2.00,'2026-01-07 22:57:56',6),(851,2616,6,3,3,'2026-02-02',3.00,'2026-01-10 09:49:59',3),(899,2717,6,4,9,'2026-03-02',2.00,'2026-01-15 10:29:19',9),(1002,15,1,1,1,'2026-01-01',1.00,'2026-01-15 18:25:56',1),(1006,15,1,1,2,'2026-01-05',1.00,'2026-01-15 21:07:32',2),(1058,2717,6,4,9,'2026-03-27',2.00,'2026-01-17 20:38:40',9),(1059,2740,6,3,3,'2026-04-28',1.00,'2026-01-17 20:40:43',3),(1069,15,1,1,2,'2026-01-01',1.00,'2026-01-20 10:54:28',2),(1087,15,1,1,1,'2026-01-02',1.00,'2026-01-20 15:12:32',1),(1132,15,1,8,NULL,'2026-01-02',1.00,'2026-01-27 16:28:40',-1),(1139,15,1,8,NULL,'2026-01-03',1.00,'2026-01-27 16:30:21',-1),(1143,15,1,1,2,'2026-01-02',1.00,'2026-01-27 16:33:10',2),(1156,15,1,8,NULL,'2026-01-06',1.00,'2026-01-27 16:45:59',-1),(1170,15,1,8,NULL,'2026-01-01',1.00,'2026-01-27 17:00:43',-1),(1183,15,1,8,NULL,'2026-01-07',1.00,'2026-01-27 21:06:02',-1),(1192,15,1,8,NULL,'2026-01-04',1.00,'2026-01-29 14:16:08',-1),(1206,15,1,8,NULL,'2026-01-08',2.00,'2026-01-29 14:16:37',-1),(1220,3,1,8,NULL,'2025-12-01',1.00,'2026-01-30 09:37:57',-1),(1314,3037,2,6,NULL,'2026-02-01',1.00,'2026-02-02 09:52:29',-1),(1315,2866,2,6,NULL,'2026-01-01',1.00,'2026-02-02 09:57:09',-1),(1317,2866,2,6,NULL,'2026-01-02',1.00,'2026-02-02 09:57:56',-1),(1331,2615,6,3,3,'2026-01-04',1.00,'2026-02-02 10:48:56',3),(1360,2615,6,3,3,'2026-01-05',3.00,'2026-02-02 11:25:50',3),(1370,2615,6,4,9,'2026-01-03',1.00,'2026-02-02 11:26:05',9),(1379,2615,6,4,9,'2026-01-04',1.00,'2026-02-02 11:26:16',9),(1524,32,1,1,1,'2026-02-01',2.00,'2026-02-02 13:52:27',1),(1788,32,1,1,1,'2026-02-02',2.00,'2026-02-03 08:49:39',1),(1793,32,1,8,NULL,'2026-02-06',1.00,'2026-02-03 08:49:58',-1),(1794,2717,6,4,9,'2026-03-01',1.00,'2026-02-03 08:52:37',9),(1822,2615,6,3,3,'2026-01-02',1.00,'2026-02-03 09:26:06',3),(1829,3384,2,6,NULL,'2026-03-01',1.00,'2026-02-03 09:52:42',-1),(1832,32,1,1,1,'2026-02-03',2.00,'2026-02-03 09:53:17',1),(1845,32,1,1,2,'2026-02-03',1.00,'2026-02-03 09:54:25',2),(1847,815,1,1,1,'2026-03-02',1.00,'2026-02-03 11:03:51',1),(2006,3385,2,10,10,'2026-04-01',1.00,'2026-02-05 15:47:32',10),(2007,3385,2,10,10,'2026-04-03',2.00,'2026-02-05 15:47:32',10),(2008,3385,2,10,10,'2026-04-06',1.00,'2026-02-05 15:47:32',10),(2009,3385,2,10,10,'2026-04-08',1.00,'2026-02-05 15:47:32',10),(2010,3385,2,10,10,'2026-04-10',2.00,'2026-02-05 15:47:32',10),(2011,3385,2,10,10,'2026-04-13',2.00,'2026-02-05 15:47:32',10),(2012,3385,2,10,10,'2026-04-16',1.00,'2026-02-05 15:47:32',10),(2013,3385,2,10,10,'2026-04-20',1.00,'2026-02-05 15:47:32',10),(2014,3385,2,10,10,'2026-04-24',1.00,'2026-02-05 15:47:32',10),(2015,3385,2,10,10,'2026-04-27',1.00,'2026-02-05 15:47:32',10),(2026,3385,2,11,NULL,'2026-04-01',1.00,'2026-02-05 15:48:05',-1),(2027,3385,2,11,NULL,'2026-04-02',2.00,'2026-02-05 15:48:05',-1),(2028,3385,2,11,NULL,'2026-04-04',2.00,'2026-02-05 15:48:05',-1),(2029,3385,2,11,NULL,'2026-04-06',2.00,'2026-02-05 15:48:05',-1),(2030,3385,2,11,NULL,'2026-04-09',2.00,'2026-02-05 15:48:05',-1),(2031,3385,2,11,NULL,'2026-04-10',1.00,'2026-02-05 15:48:05',-1),(2032,3385,2,11,NULL,'2026-04-13',1.00,'2026-02-05 15:48:05',-1),(2033,3385,2,11,NULL,'2026-04-17',1.00,'2026-02-05 15:48:05',-1),(2034,3385,2,11,NULL,'2026-04-25',1.00,'2026-02-05 15:48:05',-1),(2075,3384,2,6,NULL,'2026-03-26',1.00,'2026-02-10 07:29:38',-1),(2076,3384,2,6,NULL,'2026-03-27',2.00,'2026-02-10 07:29:38',-1),(2077,3384,2,6,NULL,'2026-03-30',2.00,'2026-02-10 07:29:38',-1),(2078,3386,2,6,NULL,'2026-05-25',1.00,'2026-02-10 07:33:27',-1),(2079,3386,2,6,NULL,'2026-05-27',2.00,'2026-02-10 07:33:27',-1),(2080,3386,2,6,NULL,'2026-05-28',1.00,'2026-02-10 07:33:27',-1),(2081,3386,2,6,NULL,'2026-05-29',3.00,'2026-02-10 07:33:27',-1),(2082,2741,6,3,7,'2026-05-25',1.00,'2026-02-10 07:35:51',7),(2083,2741,6,3,7,'2026-05-26',2.00,'2026-02-10 07:35:51',7),(2084,2741,6,3,7,'2026-05-27',3.00,'2026-02-10 07:35:51',7),(2085,2741,6,3,7,'2026-05-28',1.00,'2026-02-10 07:35:51',7),(2086,3386,2,6,NULL,'2026-05-01',1.00,'2026-02-10 08:30:40',-1),(2087,3386,2,6,NULL,'2026-05-04',2.00,'2026-02-10 08:30:40',-1),(2088,3386,2,6,NULL,'2026-05-05',2.00,'2026-02-10 08:30:40',-1),(2089,3386,2,6,NULL,'2026-05-11',2.00,'2026-02-10 08:30:40',-1),(2090,3386,2,6,NULL,'2026-05-12',1.00,'2026-02-10 08:30:40',-1),(2091,3386,2,6,NULL,'2026-05-13',3.00,'2026-02-10 08:30:40',-1),(2092,3386,2,6,NULL,'2026-05-18',1.00,'2026-02-10 08:30:40',-1),(2093,3386,2,6,NULL,'2026-05-20',2.00,'2026-02-10 08:30:40',-1),(2146,32,1,1,1,'2026-02-04',1.00,'2026-02-15 18:00:16',1);
/*!40000 ALTER TABLE `project_timesheet_entries` ENABLE KEYS */;
UNLOCK TABLES;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `trg_pte_bi` BEFORE INSERT ON `project_timesheet_entries` FOR EACH ROW BEGIN
  SET NEW.workpackage_uid = IFNULL(NEW.workpackage_id, -1);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;
/*!50003 SET @saved_cs_client      = @@character_set_client */ ;
/*!50003 SET @saved_cs_results     = @@character_set_results */ ;
/*!50003 SET @saved_col_connection = @@collation_connection */ ;
/*!50003 SET character_set_client  = utf8mb4 */ ;
/*!50003 SET character_set_results = utf8mb4 */ ;
/*!50003 SET collation_connection  = utf8mb4_unicode_ci */ ;
/*!50003 SET @saved_sql_mode       = @@sql_mode */ ;
/*!50003 SET sql_mode              = 'ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION' */ ;
DELIMITER ;;
/*!50003 CREATE*/ /*!50017 */ /*!50003 TRIGGER `trg_pte_bu` BEFORE UPDATE ON `project_timesheet_entries` FOR EACH ROW BEGIN
  SET NEW.workpackage_uid = IFNULL(NEW.workpackage_id, -1);
END */;;
DELIMITER ;
/*!50003 SET sql_mode              = @saved_sql_mode */ ;
/*!50003 SET character_set_client  = @saved_cs_client */ ;
/*!50003 SET character_set_results = @saved_cs_results */ ;
/*!50003 SET collation_connection  = @saved_col_connection */ ;

--
-- Table structure for table `project_workpackages`
--

DROP TABLE IF EXISTS `project_workpackages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `project_workpackages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `project_id` int NOT NULL,
  `code` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  `total_hours` decimal(10,2) DEFAULT NULL,
  `start_date` date DEFAULT NULL,
  `end_date` date DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `project_id` (`project_id`),
  CONSTRAINT `project_workpackages_ibfk_1` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `project_workpackages`
--

LOCK TABLES `project_workpackages` WRITE;
/*!40000 ALTER TABLE `project_workpackages` DISABLE KEYS */;
INSERT INTO `project_workpackages` VALUES (1,1,'WP1','Sviluppo Modello Prova',120.00,'2025-10-01','2026-09-30'),(2,1,'WP2','Validazione dati',90.00,'2025-10-01','2026-09-30'),(3,3,'WP1','Wp Phoenix',60.00,'2026-01-11','2026-03-29'),(4,4,'WP1','Wp banner',30.00,'2025-12-26','2026-03-06'),(5,1,'WP101','Work package modificato',10.00,'2025-12-29','2026-05-15'),(6,1,'WP3','WP modificato da console',30.00,'2026-01-01','2026-04-19'),(7,3,'WP2','Research',60.00,'2026-01-10','2026-05-26'),(8,3,'WP3','Terzo wp di prova',20.00,'2026-01-15','2026-05-29'),(9,2,'WP1 PROVA','Wp di prova',30.00,'2025-12-26','2026-03-01'),(10,1,'WP4','Report',100.00,'2026-04-01','2026-04-30');
/*!40000 ALTER TABLE `project_workpackages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `projects`
--

DROP TABLE IF EXISTS `projects`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `projects` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) DEFAULT NULL,
  `acronym` varchar(50) NOT NULL,
  `cup_code` varchar(50) NOT NULL,
  `project_code` varchar(50) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `status` enum('aperto','rendicontato','chiuso') NOT NULL DEFAULT 'aperto',
  `funding_entity` varchar(255) DEFAULT NULL,
  `entity_name` varchar(255) DEFAULT NULL,
  `total_hours` decimal(10,2) DEFAULT NULL,
  `banner_path` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `project_code` (`project_code`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `projects`
--

LOCK TABLES `projects` WRITE;
/*!40000 ALTER TABLE `projects` DISABLE KEYS */;
INSERT INTO `projects` VALUES (1,'Progetto AI','PAI','CUP99','PRJ-UPDATED','2025-10-01','2026-09-30','aperto',NULL,NULL,600.00,NULL,'2025-12-04 17:24:39'),(2,'PROVA','PRV','prv1','PROAGG1','2025-12-26','2026-05-31','aperto',NULL,NULL,100.00,NULL,'2025-12-26 21:32:59'),(3,'Progetto Phoeneix','PROVA 1','PRII1','PE02284735','2026-01-01','2026-05-30','aperto','MIUR','Università di Perugia',1100.00,NULL,'2025-12-26 21:34:51'),(4,'Progetto con banner','PRBANEER','H789000001L','BNR','2025-12-25','2026-04-29','aperto',NULL,NULL,400.00,'/uploads/project_banners/banner_1767003685788.png','2025-12-29 10:21:25');
/*!40000 ALTER TABLE `projects` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` int NOT NULL,
  `permission_id` int NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `permission_id` (`permission_id`),
  CONSTRAINT `role_permissions_ibfk_1` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE,
  CONSTRAINT `role_permissions_ibfk_2` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES (1,1),(5,1),(7,1),(1,2),(5,2),(7,2),(4,3),(5,3),(1,4),(5,4),(7,4),(4,5),(5,5),(1,6),(5,6),(7,6),(1,7),(5,7),(1,8),(5,8),(1,9),(5,9),(7,9),(3,10),(5,10),(3,11),(5,11),(3,12),(5,12),(3,13),(5,13),(3,14),(5,14),(3,15),(5,15),(3,17),(2,18),(3,19),(1,20),(4,21),(4,22),(4,23),(4,24),(3,25),(5,26),(5,27),(5,29),(5,30),(5,31),(5,32);
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(50) NOT NULL,
  `description` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES (1,'docente','Docente universitario'),(2,'capo_progetto','Docente coordinatore scientifico di un progetto'),(3,'responsabile_amministrativo','Responsabile progetti/approvazioni'),(4,'responsabile_didattica','Responsabile della didattica'),(5,'amministratore','Amministratore di sistema'),(7,'partecipante_progetto','Utente assegnato ad un progetto non docente');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teacher_hour_limits`
--

DROP TABLE IF EXISTS `teacher_hour_limits`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_hour_limits` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `max_total_hours` decimal(6,2) DEFAULT '1500.00',
  `max_teaching_hours` decimal(6,2) DEFAULT '350.00',
  `academic_year` varchar(9) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_user_year` (`user_id`,`academic_year`),
  CONSTRAINT `teacher_hour_limits_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teacher_hour_limits`
--

LOCK TABLES `teacher_hour_limits` WRITE;
/*!40000 ALTER TABLE `teacher_hour_limits` DISABLE KEYS */;
INSERT INTO `teacher_hour_limits` VALUES (1,1,1500.00,350.00,'2025/26'),(2,1,400.00,1050.00,'2024/25'),(3,6,1500.00,350.00,'2025/26'),(4,2,1300.00,350.00,'2025/26');
/*!40000 ALTER TABLE `teacher_hour_limits` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teacher_teachings`
--

DROP TABLE IF EXISTS `teacher_teachings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teacher_teachings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `teaching_id` int NOT NULL,
  `academic_year` varchar(9) DEFAULT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `assigned_hours` decimal(10,2) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uniq_teacher_teaching_year` (`user_id`,`teaching_id`,`academic_year`),
  KEY `teaching_id` (`teaching_id`),
  CONSTRAINT `teacher_teachings_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teacher_teachings_ibfk_2` FOREIGN KEY (`teaching_id`) REFERENCES `teachings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teacher_teachings`
--

LOCK TABLES `teacher_teachings` WRITE;
/*!40000 ALTER TABLE `teacher_teachings` DISABLE KEYS */;
INSERT INTO `teacher_teachings` VALUES (1,1,1,'2025/26','2025-10-01','2026-07-31',100.00),(2,1,2,'2025/26','2025-10-01','2026-07-31',100.00),(3,1,3,'2025/26','2025-10-01','2026-07-31',100.00),(7,2,4,'2025/26','2025-09-20','2026-01-16',50.00),(8,2,5,'2025/26','2025-09-20','2026-01-16',60.00),(9,6,6,'2025/26','2026-02-24','2026-06-30',40.00);
/*!40000 ALTER TABLE `teacher_teachings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teaching_timesheet_entries`
--

DROP TABLE IF EXISTS `teaching_timesheet_entries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teaching_timesheet_entries` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timesheet_id` int NOT NULL,
  `user_id` int NOT NULL,
  `teacher_teaching_id` int NOT NULL,
  `date` date NOT NULL,
  `start_time` time DEFAULT NULL,
  `end_time` time DEFAULT NULL,
  `academic_hours` decimal(5,2) NOT NULL,
  `activity_type` enum('lezione','Lezione pratica','Integrativa curriculare','Attività didattica a distanza*','Lezione tecnico-pratica','Equivalente alla ufficiale') DEFAULT 'lezione',
  `title` varchar(255) DEFAULT NULL,
  `description` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_teaching_entry` (`timesheet_id`,`teacher_teaching_id`,`date`),
  KEY `user_id` (`user_id`),
  KEY `teacher_teaching_id` (`teacher_teaching_id`),
  CONSTRAINT `teaching_timesheet_entries_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teaching_timesheet_entries_ibfk_2` FOREIGN KEY (`timesheet_id`) REFERENCES `timesheet` (`id`) ON DELETE CASCADE,
  CONSTRAINT `teaching_timesheet_entries_ibfk_3` FOREIGN KEY (`teacher_teaching_id`) REFERENCES `teacher_teachings` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=1856 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teaching_timesheet_entries`
--

LOCK TABLES `teaching_timesheet_entries` WRITE;
/*!40000 ALTER TABLE `teaching_timesheet_entries` DISABLE KEYS */;
INSERT INTO `teaching_timesheet_entries` VALUES (1293,3,1,3,'2025-12-10','00:00:00','00:00:00',2.00,'lezione',NULL,NULL,'2025-12-24 11:37:36'),(1304,3,1,3,'2025-12-06','00:00:00','00:00:00',2.00,'lezione',NULL,NULL,'2025-12-25 10:37:34'),(1308,3,1,3,'2025-12-09','00:00:00','00:00:00',2.00,'Lezione pratica','intro corso',NULL,'2025-12-25 11:08:57'),(1338,3,1,1,'2025-12-02','00:00:00','00:00:00',3.00,'lezione',NULL,'Prova 2','2025-12-25 19:11:59'),(1388,15,1,1,'2026-01-05','00:00:00','00:00:00',4.00,'Lezione pratica','intro corso',NULL,'2026-01-03 09:07:02'),(1407,15,1,2,'2026-01-06','00:00:00','00:00:00',3.00,'Integrativa curriculare','intro corso',NULL,'2026-01-07 16:07:48'),(1519,15,1,3,'2026-01-07','00:00:00','00:00:00',2.00,'Equivalente alla ufficiale',NULL,NULL,'2026-01-15 21:06:50'),(1531,15,1,1,'2026-01-06','00:00:00','00:00:00',2.00,'Lezione pratica','Esercitazione','Lezioni in cui sono stati svolti diversi esercizi pratici','2026-01-16 11:02:44'),(1576,3,1,3,'2025-12-01','00:00:00','00:00:00',2.00,'Lezione pratica',NULL,NULL,'2026-01-17 17:00:41'),(1582,3,1,2,'2025-12-01','00:00:00','00:00:00',2.00,'lezione',NULL,NULL,'2026-01-17 17:00:58'),(1736,32,1,1,'2026-02-05','00:00:00','00:00:00',2.00,'lezione',NULL,NULL,'2026-02-03 11:28:12'),(1737,32,1,3,'2026-02-07','00:00:00','00:00:00',2.00,'lezione','Prova',NULL,'2026-02-03 11:28:12'),(1787,32,1,3,'2026-02-02','00:00:00','00:00:00',1.00,'lezione',NULL,NULL,'2026-02-03 14:37:15'),(1789,32,1,1,'2026-02-02','00:00:00','00:00:00',1.00,'Lezione pratica',NULL,NULL,'2026-02-03 14:51:25'),(1818,815,1,1,'2026-03-04','00:00:00','00:00:00',2.00,'lezione',NULL,NULL,'2026-02-11 21:49:57'),(1820,1,1,1,'2025-10-01','00:00:00','00:00:00',1.00,'lezione',NULL,NULL,'2026-02-11 22:36:42'),(1826,2616,6,9,'2026-02-25','00:00:00','00:00:00',2.00,'lezione','Introduzione al corso','Introduzione al corso e presentazione argomenti di studio','2026-02-11 22:43:30'),(1827,2616,6,9,'2026-02-27','00:00:00','00:00:00',1.00,'lezione','Modello OSI','Spiegazione modello osi','2026-02-11 22:43:30'),(1828,2717,6,9,'2026-03-03','00:00:00','00:00:00',2.00,'lezione','HTTP vs HTTPS','Spiegazione http e https','2026-02-11 22:45:40'),(1829,2717,6,9,'2026-03-06','00:00:00','00:00:00',1.00,'lezione','DHCP','Spiegazione del DHCP','2026-02-11 22:45:40'),(1830,2717,6,9,'2026-03-11','00:00:00','00:00:00',3.00,'lezione','DNS','Spiegazione DNS','2026-02-11 22:45:40'),(1831,2717,6,9,'2026-03-16','00:00:00','00:00:00',2.00,'lezione','Protocolli di routing','Spiegazione OSPF, RIP, BGP','2026-02-11 22:45:40'),(1832,2717,6,9,'2026-03-20','00:00:00','00:00:00',1.00,'lezione','IPv4','Spieagzione ipv4','2026-02-11 22:45:40'),(1833,2740,6,9,'2026-04-02','00:00:00','00:00:00',2.00,'Lezione pratica','Ipv6','Spiegazione ipv6','2026-02-11 22:47:29'),(1834,2740,6,9,'2026-04-06','00:00:00','00:00:00',1.00,'lezione','FTP','Spiegazione dell\'FTP','2026-02-11 22:47:29'),(1835,2740,6,9,'2026-04-09','00:00:00','00:00:00',2.00,'lezione','SSH','Spiegazione ssh','2026-02-11 22:47:29'),(1836,2740,6,9,'2026-04-14','00:00:00','00:00:00',1.00,'lezione','NFS','Cosa è NFS','2026-02-11 22:47:29'),(1837,2741,6,9,'2026-05-04','00:00:00','00:00:00',2.00,'lezione','Esercitazione','Esercitazione sulle subnet mask','2026-02-11 22:48:55'),(1838,2741,6,9,'2026-05-08','00:00:00','00:00:00',1.00,'lezione','Posta elettronica','Spiegazione SMTP, PEC','2026-02-11 22:48:55'),(1840,32,1,1,'2026-02-03','00:00:00','00:00:00',1.00,'lezione',NULL,NULL,'2026-02-13 09:22:13'),(1847,32,1,2,'2026-02-02','00:00:00','00:00:00',4.00,'lezione',NULL,NULL,'2026-02-13 10:36:11');
/*!40000 ALTER TABLE `teaching_timesheet_entries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `teachings`
--

DROP TABLE IF EXISTS `teachings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `teachings` (
  `id` int NOT NULL AUTO_INCREMENT,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `budget_hour` decimal(10,2) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `code` (`code`)
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `teachings`
--

LOCK TABLES `teachings` WRITE;
/*!40000 ALTER TABLE `teachings` DISABLE KEYS */;
INSERT INTO `teachings` VALUES (1,'A0450032','Matematica Base',70.00,'2025-12-04 17:24:39'),(2,'A0680049','Fisica Avanzata',40.00,'2025-12-04 17:24:39'),(3,'A0260047','Programmazione Avanzata',90.00,'2025-12-04 17:24:39'),(4,'A0780098','PROGRAMMAZIONE PROCEDURALE',70.00,'2026-02-08 18:46:14'),(5,'A0556004','ANALISI MATEMATICA',80.00,'2026-02-08 18:46:14'),(6,'A0230010','ARCHITETTURA RETI',50.00,'2026-02-08 18:46:14');
/*!40000 ALTER TABLE `teachings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timesheet`
--

DROP TABLE IF EXISTS `timesheet`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timesheet` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `month` int NOT NULL,
  `academic_year` varchar(9) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `status` enum('vuoto','inserito','inviato','approvato','riaperto','rendicontato') DEFAULT 'vuoto',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_month_year` (`user_id`,`month`,`academic_year`),
  CONSTRAINT `timesheet_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6416 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timesheet`
--

LOCK TABLES `timesheet` WRITE;
/*!40000 ALTER TABLE `timesheet` DISABLE KEYS */;
INSERT INTO `timesheet` VALUES (1,1,10,'2025/26','inserito','2025-12-04 18:27:48'),(2,1,11,'2025/26','inviato','2025-12-04 18:27:48'),(3,1,12,'2025/26','inviato','2025-12-04 18:27:48'),(15,1,1,'2025/26','inviato','2025-12-04 21:46:26'),(19,1,9,'2024/25','vuoto','2025-12-04 21:47:14'),(20,1,8,'2024/25','inserito','2025-12-04 21:47:18'),(32,1,2,'2025/26','riaperto','2025-12-04 21:58:31'),(451,1,7,'2024/25','vuoto','2025-12-05 16:26:12'),(502,1,6,'2024/25','vuoto','2025-12-05 23:01:40'),(815,1,3,'2025/26','inserito','2025-12-08 10:29:59'),(2041,1,4,'2025/26','vuoto','2025-12-18 22:14:45'),(2042,1,5,'2025/26','vuoto','2025-12-18 22:14:46'),(2043,1,6,'2025/26','vuoto','2025-12-18 22:14:46'),(2044,1,7,'2025/26','vuoto','2025-12-18 22:14:49'),(2045,1,8,'2025/26','vuoto','2025-12-18 22:14:49'),(2613,6,12,'2025/26','vuoto','2025-12-31 11:31:38'),(2615,6,1,'2025/26','inviato','2025-12-31 11:33:40'),(2616,6,2,'2025/26','riaperto','2025-12-31 11:33:42'),(2636,6,11,'2025/26','vuoto','2026-01-04 17:51:10'),(2717,6,3,'2025/26','riaperto','2026-01-07 11:08:26'),(2732,6,10,'2025/26','vuoto','2026-01-07 11:13:59'),(2733,6,9,'2024/25','vuoto','2026-01-07 11:14:00'),(2740,6,4,'2025/26','riaperto','2026-01-07 11:14:02'),(2741,6,5,'2025/26','riaperto','2026-01-07 11:14:02'),(2742,6,6,'2025/26','vuoto','2026-01-07 11:14:02'),(2743,6,7,'2025/26','vuoto','2026-01-07 11:14:03'),(2744,6,8,'2025/26','vuoto','2026-01-07 11:14:03'),(2866,2,1,'2025/26','rendicontato','2026-01-09 10:16:22'),(2869,2,12,'2025/26','inserito','2026-01-09 10:28:59'),(3037,2,2,'2025/26','inviato','2026-01-11 15:43:42'),(3384,2,3,'2025/26','inserito','2026-01-15 10:54:50'),(3385,2,4,'2025/26','inviato','2026-01-15 10:54:50'),(3386,2,5,'2025/26','inviato','2026-01-15 10:54:50'),(3651,1,9,'2025/26','vuoto','2026-01-16 11:15:21'),(4012,1,10,'2026/27','vuoto','2026-01-19 15:47:28'),(5967,2,11,'2025/26','inserito','2026-02-08 18:47:33'),(5968,2,10,'2025/26','vuoto','2026-02-08 18:47:34'),(5969,2,9,'2024/25','vuoto','2026-02-08 18:47:37'),(5970,2,8,'2024/25','vuoto','2026-02-08 18:47:39'),(6055,7,2,'2025/26','vuoto','2026-02-11 10:39:01');
/*!40000 ALTER TABLE `timesheet` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `timesheet_project_status`
--

DROP TABLE IF EXISTS `timesheet_project_status`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `timesheet_project_status` (
  `id` int NOT NULL AUTO_INCREMENT,
  `timesheet_id` int NOT NULL,
  `project_id` int NOT NULL,
  `user_id` int NOT NULL,
  `status` enum('assegnato','inviato','approvato','riaperto','rendicontato') NOT NULL DEFAULT 'assegnato',
  `reopening_note` text,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uq_timesheet_project` (`timesheet_id`,`project_id`),
  KEY `fk_tps_project` (`project_id`),
  KEY `fk_tps_user` (`user_id`),
  CONSTRAINT `fk_tps_project` FOREIGN KEY (`project_id`) REFERENCES `projects` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tps_timesheet` FOREIGN KEY (`timesheet_id`) REFERENCES `timesheet` (`id`) ON DELETE CASCADE,
  CONSTRAINT `fk_tps_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6724 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `timesheet_project_status`
--

LOCK TABLES `timesheet_project_status` WRITE;
/*!40000 ALTER TABLE `timesheet_project_status` DISABLE KEYS */;
INSERT INTO `timesheet_project_status` VALUES (1,15,1,1,'inviato',NULL,'2026-01-27 14:24:55','2026-02-03 17:57:21'),(2,15,4,1,'inviato',NULL,'2026-01-27 14:24:55','2026-02-03 17:57:21'),(5,3,1,1,'inviato','','2026-01-27 14:26:41','2026-01-30 09:38:40'),(6,3,4,1,'inviato',NULL,'2026-01-27 14:26:41','2026-01-29 18:36:43'),(157,2866,3,2,'rendicontato',NULL,'2026-01-27 16:19:35','2026-02-03 09:29:32'),(219,2615,1,6,'rendicontato',NULL,'2026-01-27 17:13:30','2026-01-30 09:02:35'),(220,2615,3,6,'inviato',NULL,'2026-01-27 17:13:31','2026-02-03 09:26:46'),(221,2615,2,6,'approvato',NULL,'2026-01-27 17:13:31','2026-02-03 08:47:21'),(222,2615,4,6,'inviato',NULL,'2026-01-27 17:13:31','2026-01-29 18:36:43'),(384,2616,1,6,'inviato',NULL,'2026-01-29 15:07:43','2026-01-29 18:36:43'),(385,2616,3,6,'riaperto',NULL,'2026-01-29 15:07:43','2026-02-11 21:45:44'),(386,2616,2,6,'inviato',NULL,'2026-01-29 15:07:43','2026-01-29 18:36:43'),(387,2616,4,6,'inviato',NULL,'2026-01-29 15:07:43','2026-01-29 18:36:43'),(403,32,1,1,'approvato',NULL,'2026-01-29 15:51:07','2026-02-15 18:00:41'),(404,32,4,1,'riaperto',NULL,'2026-01-29 15:51:07','2026-02-15 18:01:06'),(422,2613,1,6,'assegnato',NULL,'2026-01-29 16:08:59','2026-01-29 16:08:59'),(423,2613,3,6,'assegnato',NULL,'2026-01-29 16:08:59','2026-01-29 16:08:59'),(424,2613,2,6,'assegnato',NULL,'2026-01-29 16:08:59','2026-01-29 16:08:59'),(425,2613,4,6,'assegnato',NULL,'2026-01-29 16:08:59','2026-01-29 16:08:59'),(488,2717,1,6,'inviato',NULL,'2026-01-29 17:28:31','2026-01-29 18:36:43'),(489,2717,3,6,'inviato',NULL,'2026-01-29 17:28:31','2026-01-29 18:36:43'),(490,2717,2,6,'riaperto',NULL,'2026-01-29 17:28:31','2026-02-03 08:52:13'),(491,2717,4,6,'inviato',NULL,'2026-01-29 17:28:31','2026-01-29 18:36:43'),(493,2740,1,6,'inviato',NULL,'2026-01-29 17:28:41','2026-01-29 18:36:43'),(494,2740,3,6,'riaperto',NULL,'2026-01-29 17:28:41','2026-02-11 21:45:02'),(495,2740,2,6,'inviato',NULL,'2026-01-29 17:28:41','2026-01-29 18:36:43'),(496,2740,4,6,'inviato',NULL,'2026-01-29 17:28:41','2026-01-29 18:36:43'),(498,2741,1,6,'inviato',NULL,'2026-01-29 17:28:42','2026-02-10 07:36:01'),(499,2741,3,6,'riaperto','Nota di riapertura del 10/05/2026','2026-01-29 17:28:42','2026-02-12 10:33:38'),(500,2741,2,6,'inviato',NULL,'2026-01-29 17:28:42','2026-02-10 07:36:01'),(501,2741,4,6,'inviato',NULL,'2026-01-29 17:28:42','2026-02-10 07:36:01'),(528,2636,1,6,'assegnato',NULL,'2026-01-29 17:29:31','2026-01-29 17:29:31'),(529,2636,3,6,'assegnato',NULL,'2026-01-29 17:29:31','2026-01-29 17:29:31'),(530,2636,2,6,'assegnato',NULL,'2026-01-29 17:29:31','2026-01-29 17:29:31'),(531,2636,4,6,'assegnato',NULL,'2026-01-29 17:29:31','2026-01-29 17:29:31'),(802,2,1,1,'assegnato',NULL,'2026-01-29 18:37:58','2026-01-29 18:37:58'),(803,2,4,1,'assegnato',NULL,'2026-01-29 18:37:58','2026-01-29 18:37:58'),(814,815,1,1,'assegnato',NULL,'2026-01-29 18:38:08','2026-01-29 18:38:08'),(815,815,4,1,'assegnato',NULL,'2026-01-29 18:38:08','2026-01-29 18:38:08'),(1327,2869,3,2,'assegnato',NULL,'2026-01-30 14:51:14','2026-01-30 14:51:14'),(1331,3037,3,2,'inviato',NULL,'2026-01-30 14:56:02','2026-02-03 09:15:19'),(1378,2732,1,6,'assegnato',NULL,'2026-01-30 14:58:27','2026-01-30 14:58:27'),(1379,2732,3,6,'assegnato',NULL,'2026-01-30 14:58:27','2026-01-30 14:58:27'),(1380,2732,2,6,'assegnato',NULL,'2026-01-30 14:58:27','2026-01-30 14:58:27'),(1381,2732,4,6,'assegnato',NULL,'2026-01-30 14:58:27','2026-01-30 14:58:27'),(1624,2742,1,6,'assegnato',NULL,'2026-01-30 22:44:49','2026-01-30 22:44:49'),(1625,2742,3,6,'assegnato',NULL,'2026-01-30 22:44:49','2026-01-30 22:44:49'),(1626,2742,2,6,'assegnato',NULL,'2026-01-30 22:44:49','2026-01-30 22:44:49'),(1627,2742,4,6,'assegnato',NULL,'2026-01-30 22:44:49','2026-01-30 22:44:49'),(4240,3384,3,2,'assegnato',NULL,'2026-02-03 09:52:27','2026-02-03 09:52:27'),(4243,3385,3,2,'inviato',NULL,'2026-02-03 09:52:34','2026-02-05 15:48:13'),(4327,2041,1,1,'assegnato',NULL,'2026-02-03 11:03:29','2026-02-03 11:03:29'),(4328,2041,4,1,'assegnato',NULL,'2026-02-03 11:03:29','2026-02-03 11:03:29'),(4843,1,1,1,'assegnato',NULL,'2026-02-03 17:44:55','2026-02-03 17:44:55'),(4844,1,4,1,'assegnato',NULL,'2026-02-03 17:44:55','2026-02-03 17:44:55'),(4845,19,1,1,'assegnato',NULL,'2026-02-03 17:44:55','2026-02-03 17:44:55'),(4846,19,4,1,'assegnato',NULL,'2026-02-03 17:44:55','2026-02-03 17:44:55'),(5109,3386,3,2,'inviato',NULL,'2026-02-05 15:40:10','2026-02-10 08:30:44'),(5112,3037,1,2,'assegnato',NULL,'2026-02-05 15:44:10','2026-02-05 15:44:10'),(5114,3384,1,2,'assegnato',NULL,'2026-02-05 15:44:11','2026-02-05 15:44:11'),(5116,3385,1,2,'inviato',NULL,'2026-02-05 15:44:11','2026-02-05 15:48:13'),(5124,3386,1,2,'inviato',NULL,'2026-02-05 15:44:52','2026-02-10 07:36:17'),(5129,3037,2,2,'assegnato',NULL,'2026-02-05 15:46:47','2026-02-05 15:46:47'),(5132,3384,2,2,'assegnato',NULL,'2026-02-05 15:46:49','2026-02-05 15:46:49'),(5135,3385,2,2,'inviato',NULL,'2026-02-05 15:46:49','2026-02-05 15:52:31'),(5277,2866,1,2,'assegnato',NULL,'2026-02-06 13:58:30','2026-02-06 13:58:30'),(5278,2866,2,2,'assegnato',NULL,'2026-02-06 13:58:30','2026-02-06 13:58:30'),(5340,2042,1,1,'assegnato',NULL,'2026-02-08 11:46:36','2026-02-08 11:46:36'),(5341,2042,4,1,'assegnato',NULL,'2026-02-08 11:46:36','2026-02-08 11:46:36'),(5342,2043,1,1,'assegnato',NULL,'2026-02-08 11:46:39','2026-02-08 11:46:39'),(5343,2043,4,1,'assegnato',NULL,'2026-02-08 11:46:39','2026-02-08 11:46:39'),(5344,2044,1,1,'assegnato',NULL,'2026-02-08 11:46:41','2026-02-08 11:46:41'),(5345,2044,4,1,'assegnato',NULL,'2026-02-08 11:46:41','2026-02-08 11:46:41'),(5346,2045,1,1,'assegnato',NULL,'2026-02-08 11:46:43','2026-02-08 11:46:43'),(5347,2045,4,1,'assegnato',NULL,'2026-02-08 11:46:43','2026-02-08 11:46:43'),(5373,2869,1,2,'assegnato',NULL,'2026-02-08 18:47:33','2026-02-08 18:47:33'),(5374,2869,2,2,'assegnato',NULL,'2026-02-08 18:47:33','2026-02-08 18:47:33'),(5375,5967,3,2,'assegnato',NULL,'2026-02-08 18:47:33','2026-02-08 18:47:33'),(5376,5967,1,2,'assegnato',NULL,'2026-02-08 18:47:33','2026-02-08 18:47:33'),(5377,5967,2,2,'assegnato',NULL,'2026-02-08 18:47:33','2026-02-08 18:47:33'),(5378,5968,3,2,'assegnato',NULL,'2026-02-08 18:47:34','2026-02-08 18:47:34'),(5379,5968,1,2,'assegnato',NULL,'2026-02-08 18:47:34','2026-02-08 18:47:34'),(5380,5968,2,2,'assegnato',NULL,'2026-02-08 18:47:34','2026-02-08 18:47:34'),(5381,5969,3,2,'assegnato',NULL,'2026-02-08 18:47:37','2026-02-08 18:47:37'),(5382,5969,1,2,'assegnato',NULL,'2026-02-08 18:47:37','2026-02-08 18:47:37'),(5383,5969,2,2,'assegnato',NULL,'2026-02-08 18:47:37','2026-02-08 18:47:37'),(5384,5970,3,2,'assegnato',NULL,'2026-02-08 18:47:39','2026-02-08 18:47:39'),(5385,5970,1,2,'assegnato',NULL,'2026-02-08 18:47:39','2026-02-08 18:47:39'),(5386,5970,2,2,'assegnato',NULL,'2026-02-08 18:47:39','2026-02-08 18:47:39'),(5551,3386,2,2,'inviato',NULL,'2026-02-10 07:33:08','2026-02-10 07:36:17');
/*!40000 ALTER TABLE `timesheet_project_status` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_id` int NOT NULL,
  `role_id` int NOT NULL,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `role_id` (`role_id`),
  CONSTRAINT `user_roles_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `user_roles_ibfk_2` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES (1,1),(2,1),(6,1),(2,2),(3,3),(4,4),(5,5),(7,7);
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` int NOT NULL AUTO_INCREMENT,
  `first_name` varchar(50) NOT NULL,
  `last_name` varchar(50) NOT NULL,
  `email` varchar(100) NOT NULL,
  `docente_code` varchar(20) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `fiscal_code` varchar(16) DEFAULT NULL,
  `is_active` tinyint(1) DEFAULT '1',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `fiscal_code` (`fiscal_code`)
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES (1,'Mario','Rossi','docente@example.com','[022971]','$2b$10$visfmPk3CrXKnsl8PJ.sCubWpVcE4bajTl.ScwB0R7ftpv7N4K6Xe','RSSMRA80A01H501Z',1,'2025-12-04 17:24:37'),(2,'Laura','Bianchi','capoprogetto@example.com','[044205]','$2b$10$8aQNQhgcrLtr6OLRud6c7uX0geTa3UKAlSqEVvD8TJjujX4aa5KWC','BNCLRA70A01H501Y',1,'2025-12-04 17:24:37'),(3,'Marco','Malvestiti','responsabile@example.com',NULL,'$2b$10$/dcfU99nzQ.GXwKt8TB9quLHM6G3AYPNCPePdhYTbUE6CwBqP2VfK','VRDMLC75A01H501X',1,'2025-12-04 17:24:37'),(4,'Giulia','Neri','didattica@example.com',NULL,'$2b$10$lOvDYhcD6o87ssKS5vvq6OLmKUwsdvfyxCcMAGaKochyVD/cHCsdW','NREGJL85A01H501W',1,'2025-12-04 17:24:37'),(5,'Admin','System','admin@example.com',NULL,'$2b$10$fqo7VaVH1.k2GzZaTNnOSeod4J1YywxTH1wh/aw7X/tGo7MdxtM46','ADMSYS90A01H501V',1,'2025-12-04 17:24:37'),(6,'Luca','Verdi','docente1@example.com','[067239]','$2b$10$IZFzdKfNL92LVX6OPnfAh.7uWVt5ntRxc6z9ihCVAFWB08310rgEi','LBBLIBA90A07G01L',1,'2025-12-31 11:27:18'),(7,'Paolo','Test','partecipante@example.com',NULL,'$2b$10$D/xZ0Gs61AH2U045JMttPuyNbb6/oZz4RRuLf.bP3EnXac.B2n0JK','TSTPPL90A01H501Q',1,'2026-02-11 10:31:38');
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Temporary view structure for view `view_timesheet_activities`
--

DROP TABLE IF EXISTS `view_timesheet_activities`;
/*!50001 DROP VIEW IF EXISTS `view_timesheet_activities`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_timesheet_activities` AS SELECT 
 1 AS `activity_id`,
 1 AS `activity_type`,
 1 AS `activity_name`,
 1 AS `activity_code`,
 1 AS `user_id`,
 1 AS `start_date`,
 1 AS `end_date`,
 1 AS `assigned_hours`,
 1 AS `project_id`,
 1 AS `project_name`,
 1 AS `workpackage_code`*/;
SET character_set_client = @saved_cs_client;

--
-- Temporary view structure for view `view_timesheet_entries`
--

DROP TABLE IF EXISTS `view_timesheet_entries`;
/*!50001 DROP VIEW IF EXISTS `view_timesheet_entries`*/;
SET @saved_cs_client     = @@character_set_client;
/*!50503 SET character_set_client = utf8mb4 */;
/*!50001 CREATE VIEW `view_timesheet_entries` AS SELECT 
 1 AS `type`,
 1 AS `timesheet_id`,
 1 AS `user_id`,
 1 AS `activity_id`,
 1 AS `project_id`,
 1 AS `day`,
 1 AS `hours`,
 1 AS `academic_hours`,
 1 AS `start_time`,
 1 AS `end_time`,
 1 AS `activity_type`,
 1 AS `title`,
 1 AS `description`*/;
SET character_set_client = @saved_cs_client;

--
-- Table structure for table `workpackage_assignments`
--

DROP TABLE IF EXISTS `workpackage_assignments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workpackage_assignments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `project_assignment_id` int NOT NULL,
  `workpackage_id` int NOT NULL,
  `assigned_hours` decimal(10,2) NOT NULL,
  `start_date` date NOT NULL,
  `end_date` date NOT NULL,
  `active` tinyint(1) NOT NULL DEFAULT '1',
  PRIMARY KEY (`id`),
  UNIQUE KEY `user_wp_unique` (`user_id`,`workpackage_id`),
  KEY `workpackage_id` (`workpackage_id`),
  KEY `fk_wpa_project_assignment` (`project_assignment_id`),
  CONSTRAINT `fk_wpa_project_assignment` FOREIGN KEY (`project_assignment_id`) REFERENCES `project_assignments` (`id`) ON DELETE RESTRICT,
  CONSTRAINT `workpackage_assignments_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`) ON DELETE CASCADE,
  CONSTRAINT `workpackage_assignments_ibfk_2` FOREIGN KEY (`workpackage_id`) REFERENCES `project_workpackages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=16 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workpackage_assignments`
--

LOCK TABLES `workpackage_assignments` WRITE;
/*!40000 ALTER TABLE `workpackage_assignments` DISABLE KEYS */;
INSERT INTO `workpackage_assignments` VALUES (7,6,5,4,20.00,'2025-12-26','2026-03-06',1),(8,1,1,1,120.00,'2025-10-01','2026-09-30',1),(9,1,1,2,80.00,'2025-10-01','2026-09-30',1),(10,6,2,6,10.00,'2026-01-01','2026-04-19',1),(11,6,2,5,10.00,'2025-12-29','2026-05-15',1),(12,6,3,3,35.00,'2026-01-11','2026-03-29',1),(13,6,4,9,10.00,'2025-12-26','2026-03-01',1),(14,2,10,10,20.00,'2026-04-01','2026-04-30',1),(15,6,3,7,50.00,'2026-01-10','2026-05-26',1);
/*!40000 ALTER TABLE `workpackage_assignments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'timesheet'
--

--
-- Dumping routines for database 'timesheet'
--

--
-- Final view structure for view `view_timesheet_activities`
--

/*!50001 DROP VIEW IF EXISTS `view_timesheet_activities`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013  SQL SECURITY DEFINER */
/*!50001 VIEW `view_timesheet_activities` AS select `tt`.`id` AS `activity_id`,'teaching' AS `activity_type`,`t`.`name` AS `activity_name`,`t`.`code` AS `activity_code`,`tt`.`user_id` AS `user_id`,`tt`.`start_date` AS `start_date`,`tt`.`end_date` AS `end_date`,`tt`.`assigned_hours` AS `assigned_hours`,NULL AS `project_id`,NULL AS `project_name`,NULL AS `workpackage_code` from (`teacher_teachings` `tt` join `teachings` `t` on((`t`.`id` = `tt`.`teaching_id`))) union all select `pa`.`id` AS `activity_id`,'project' AS `activity_type`,`p`.`name` AS `activity_name`,NULL AS `activity_code`,`pa`.`user_id` AS `user_id`,`pa`.`start_date` AS `start_date`,`pa`.`end_date` AS `end_date`,`pa`.`assigned_hours` AS `assigned_hours`,`p`.`id` AS `project_id`,`p`.`name` AS `project_name`,NULL AS `workpackage_code` from (`project_assignments` `pa` join `projects` `p` on((`p`.`id` = `pa`.`project_id`))) union all select `wa`.`id` AS `activity_id`,'workpackage' AS `activity_type`,`wp`.`description` AS `activity_name`,NULL AS `activity_code`,`wa`.`user_id` AS `user_id`,`wa`.`start_date` AS `start_date`,`wa`.`end_date` AS `end_date`,`wa`.`assigned_hours` AS `assigned_hours`,`p`.`id` AS `project_id`,`p`.`name` AS `project_name`,`wp`.`code` AS `workpackage_code` from ((`workpackage_assignments` `wa` join `project_workpackages` `wp` on((`wp`.`id` = `wa`.`workpackage_id`))) join `projects` `p` on((`p`.`id` = `wp`.`project_id`))) union all select `da`.`id` AS `activity_id`,'diary' AS `activity_type`,`da`.`name` AS `activity_name`,NULL AS `activity_code`,NULL AS `user_id`,NULL AS `start_date`,NULL AS `end_date`,NULL AS `assigned_hours`,NULL AS `project_id`,NULL AS `project_name`,NULL AS `workpackage_code` from `diary_activities` `da` union all select `ia`.`id` AS `activity_id`,'institutional' AS `activity_type`,`ia`.`name` AS `activity_name`,NULL AS `activity_code`,NULL AS `user_id`,NULL AS `start_date`,NULL AS `end_date`,NULL AS `assigned_hours`,NULL AS `project_id`,NULL AS `project_name`,NULL AS `workpackage_code` from `institutional_activities` `ia` */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;

--
-- Final view structure for view `view_timesheet_entries`
--

/*!50001 DROP VIEW IF EXISTS `view_timesheet_entries`*/;
/*!50001 SET @saved_cs_client          = @@character_set_client */;
/*!50001 SET @saved_cs_results         = @@character_set_results */;
/*!50001 SET @saved_col_connection     = @@collation_connection */;
/*!50001 SET character_set_client      = utf8mb4 */;
/*!50001 SET character_set_results     = utf8mb4 */;
/*!50001 SET collation_connection      = utf8mb4_unicode_ci */;
/*!50001 CREATE ALGORITHM=UNDEFINED */
/*!50013  SQL SECURITY DEFINER */
/*!50001 VIEW `view_timesheet_entries` AS select 'teaching' AS `type`,`tte`.`timesheet_id` AS `timesheet_id`,`tte`.`user_id` AS `user_id`,`tte`.`teacher_teaching_id` AS `activity_id`,NULL AS `project_id`,dayofmonth(`tte`.`date`) AS `day`,NULL AS `hours`,`tte`.`academic_hours` AS `academic_hours`,`tte`.`start_time` AS `start_time`,`tte`.`end_time` AS `end_time`,`tte`.`activity_type` AS `activity_type`,`tte`.`title` AS `title`,`tte`.`description` AS `description` from `teaching_timesheet_entries` `tte` where (`tte`.`date` is not null) union all select 'diary' AS `type`,`dte`.`timesheet_id` AS `timesheet_id`,`dte`.`user_id` AS `user_id`,`dte`.`diary_activity_id` AS `activity_id`,NULL AS `project_id`,dayofmonth(`dte`.`date`) AS `day`,`dte`.`hours` AS `hours`,NULL AS `academic_hours`,NULL AS `start_time`,NULL AS `end_time`,NULL AS `activity_type`,NULL AS `title`,NULL AS `description` from `diary_timesheet_entries` `dte` where (`dte`.`date` is not null) union all select 'project' AS `type`,`pte`.`timesheet_id` AS `timesheet_id`,`pte`.`user_id` AS `user_id`,`pte`.`project_assignment_id` AS `activity_id`,`pa`.`project_id` AS `project_id`,dayofmonth(`pte`.`date`) AS `day`,`pte`.`hours` AS `hours`,NULL AS `academic_hours`,NULL AS `start_time`,NULL AS `end_time`,NULL AS `activity_type`,NULL AS `title`,NULL AS `description` from (`project_timesheet_entries` `pte` join `project_assignments` `pa` on((`pa`.`id` = `pte`.`project_assignment_id`))) where ((`pte`.`workpackage_id` is null) and (`pte`.`date` is not null)) union all select 'workpackage' AS `type`,`pte`.`timesheet_id` AS `timesheet_id`,`pte`.`user_id` AS `user_id`,`wa`.`id` AS `activity_id`,`pa`.`project_id` AS `project_id`,dayofmonth(`pte`.`date`) AS `day`,`pte`.`hours` AS `hours`,NULL AS `academic_hours`,NULL AS `start_time`,NULL AS `end_time`,NULL AS `activity_type`,NULL AS `title`,NULL AS `description` from ((`project_timesheet_entries` `pte` join `workpackage_assignments` `wa` on(((`wa`.`workpackage_id` = `pte`.`workpackage_id`) and (`wa`.`project_assignment_id` = `pte`.`project_assignment_id`)))) join `project_assignments` `pa` on((`pa`.`id` = `wa`.`project_assignment_id`))) where ((`pte`.`workpackage_id` is not null) and (`pte`.`date` is not null)) union all select 'institutional' AS `type`,`ite`.`timesheet_id` AS `timesheet_id`,`ite`.`user_id` AS `user_id`,`ite`.`institutional_activity_id` AS `activity_id`,NULL AS `project_id`,dayofmonth(`ite`.`date`) AS `day`,`ite`.`hours` AS `hours`,NULL AS `academic_hours`,NULL AS `start_time`,NULL AS `end_time`,NULL AS `activity_type`,NULL AS `title`,NULL AS `description` from `institutional_timesheet_entries` `ite` where (`ite`.`date` is not null) */;
/*!50001 SET character_set_client      = @saved_cs_client */;
/*!50001 SET character_set_results     = @saved_cs_results */;
/*!50001 SET collation_connection      = @saved_col_connection */;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-02-15 19:09:39
