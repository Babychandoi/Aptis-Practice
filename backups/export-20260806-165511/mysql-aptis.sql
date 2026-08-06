-- MySQL dump 10.13  Distrib 8.4.11, for Linux (x86_64)
--
-- Host: localhost    Database: aptis
-- ------------------------------------------------------
-- Server version	8.4.11

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
-- Current Database: `aptis`
--

CREATE DATABASE /*!32312 IF NOT EXISTS*/ `aptis` /*!40100 DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci */ /*!80016 DEFAULT ENCRYPTION='N' */;

USE `aptis`;

--
-- Table structure for table `assets`
--

DROP TABLE IF EXISTS `assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `assets` (
  `id` char(36) NOT NULL,
  `bucket_name` varchar(100) NOT NULL,
  `object_key` varchar(1000) NOT NULL,
  `asset_type` enum('IMAGE','AUDIO','VIDEO','DOCUMENT','USER_RECORDING','AVATAR','IMPORT_FILE','EXPORT_FILE') NOT NULL,
  `mime_type` varchar(100) NOT NULL,
  `original_filename` varchar(500) DEFAULT NULL,
  `file_size` bigint DEFAULT NULL,
  `checksum_sha256` varchar(128) DEFAULT NULL,
  `duration_ms` bigint DEFAULT NULL,
  `width` int DEFAULT NULL,
  `height` int DEFAULT NULL,
  `access_scope` enum('PUBLIC','PRIVATE','SIGNED_URL') NOT NULL DEFAULT 'SIGNED_URL',
  `status` enum('UPLOADING','READY','FAILED','DELETED') NOT NULL DEFAULT 'UPLOADING',
  `owner_user_id` char(36) DEFAULT NULL,
  `created_by` char(36) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_assets_bucket_object` (`bucket_name`,`object_key`(600)),
  KEY `idx_assets_owner` (`owner_user_id`,`asset_type`),
  KEY `idx_assets_status` (`status`,`created_at`),
  CONSTRAINT `fk_assets_owner` FOREIGN KEY (`owner_user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `assets`
--

LOCK TABLES `assets` WRITE;
/*!40000 ALTER TABLE `assets` DISABLE KEYS */;
/*!40000 ALTER TABLE `assets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attempt_component_scores`
--

DROP TABLE IF EXISTS `attempt_component_scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attempt_component_scores` (
  `id` char(36) NOT NULL,
  `attempt_id` char(36) NOT NULL,
  `component_id` char(36) NOT NULL,
  `raw_score` decimal(10,2) DEFAULT NULL,
  `max_score` decimal(10,2) DEFAULT NULL,
  `percentage_score` decimal(8,4) DEFAULT NULL,
  `scaled_score` decimal(10,2) DEFAULT NULL,
  `cefr_level` enum('A1','A2','B1','B2','C1','C2') DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_attempt_component_score` (`attempt_id`,`component_id`),
  KEY `idx_attempt_component_score_component` (`component_id`),
  CONSTRAINT `fk_attempt_component_scores_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `test_attempts` (`id`),
  CONSTRAINT `fk_attempt_component_scores_component` FOREIGN KEY (`component_id`) REFERENCES `components` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attempt_component_scores`
--

LOCK TABLES `attempt_component_scores` WRITE;
/*!40000 ALTER TABLE `attempt_component_scores` DISABLE KEYS */;
/*!40000 ALTER TABLE `attempt_component_scores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attempt_part_scores`
--

DROP TABLE IF EXISTS `attempt_part_scores`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attempt_part_scores` (
  `id` char(36) NOT NULL,
  `attempt_id` char(36) NOT NULL,
  `part_id` char(36) NOT NULL,
  `raw_score` decimal(10,2) DEFAULT NULL,
  `max_score` decimal(10,2) DEFAULT NULL,
  `percentage_score` decimal(8,4) DEFAULT NULL,
  `total_items` int NOT NULL DEFAULT '0',
  `correct_items` int NOT NULL DEFAULT '0',
  `incorrect_items` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_attempt_part_score` (`attempt_id`,`part_id`),
  KEY `idx_attempt_part_score_part` (`part_id`),
  CONSTRAINT `fk_attempt_part_scores_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `test_attempts` (`id`),
  CONSTRAINT `fk_attempt_part_scores_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attempt_part_scores`
--

LOCK TABLES `attempt_part_scores` WRITE;
/*!40000 ALTER TABLE `attempt_part_scores` DISABLE KEYS */;
/*!40000 ALTER TABLE `attempt_part_scores` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attempt_question_sets`
--

DROP TABLE IF EXISTS `attempt_question_sets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attempt_question_sets` (
  `id` char(36) NOT NULL,
  `attempt_id` char(36) NOT NULL,
  `question_set_id` char(36) NOT NULL,
  `question_revision` int NOT NULL,
  `display_order` int NOT NULL,
  `mongo_snapshot_key` varchar(255) NOT NULL,
  `max_score` decimal(8,2) NOT NULL DEFAULT '1.00',
  `awarded_score` decimal(8,2) DEFAULT NULL,
  `status` enum('NOT_STARTED','IN_PROGRESS','ANSWERED','SCORED','SKIPPED') NOT NULL DEFAULT 'NOT_STARTED',
  `audio_play_count` int NOT NULL DEFAULT '0',
  `started_at` datetime DEFAULT NULL,
  `answered_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_attempt_question_set_order` (`attempt_id`,`display_order`),
  UNIQUE KEY `uk_attempt_question_set_unique` (`attempt_id`,`question_set_id`),
  KEY `idx_attempt_question_sets_question` (`question_set_id`),
  CONSTRAINT `fk_attempt_question_sets_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `test_attempts` (`id`),
  CONSTRAINT `fk_attempt_question_sets_question` FOREIGN KEY (`question_set_id`) REFERENCES `question_sets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attempt_question_sets`
--

LOCK TABLES `attempt_question_sets` WRITE;
/*!40000 ALTER TABLE `attempt_question_sets` DISABLE KEYS */;
INSERT INTO `attempt_question_sets` VALUES ('e3364e13-f5ee-4e3e-a519-6789ebbca0e8','c5099780-b519-430d-b04b-9452014b0283','b9e00ead-1ad2-4c17-a993-67c6db96ce46',1,1,'e3364e13-f5ee-4e3e-a519-6789ebbca0e8',10.00,NULL,'NOT_STARTED',0,NULL,NULL);
/*!40000 ALTER TABLE `attempt_question_sets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `attempt_recordings`
--

DROP TABLE IF EXISTS `attempt_recordings`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `attempt_recordings` (
  `id` char(36) NOT NULL,
  `attempt_question_set_id` char(36) NOT NULL,
  `item_id` varchar(100) NOT NULL,
  `asset_id` char(36) NOT NULL,
  `sequence_no` int NOT NULL DEFAULT '1',
  `duration_ms` bigint DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_attempt_recording` (`attempt_question_set_id`,`item_id`,`sequence_no`),
  KEY `idx_attempt_recordings_asset` (`asset_id`),
  CONSTRAINT `fk_attempt_recordings_aqs` FOREIGN KEY (`attempt_question_set_id`) REFERENCES `attempt_question_sets` (`id`),
  CONSTRAINT `fk_attempt_recordings_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `attempt_recordings`
--

LOCK TABLES `attempt_recordings` WRITE;
/*!40000 ALTER TABLE `attempt_recordings` DISABLE KEYS */;
/*!40000 ALTER TABLE `attempt_recordings` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` char(36) NOT NULL,
  `actor_user_id` char(36) DEFAULT NULL,
  `action` varchar(100) NOT NULL,
  `resource_type` varchar(100) NOT NULL,
  `resource_id` char(36) DEFAULT NULL,
  `before_json` json DEFAULT NULL,
  `after_json` json DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `user_agent` varchar(1000) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_audit_resource` (`resource_type`,`resource_id`,`created_at`),
  KEY `idx_audit_actor` (`actor_user_id`,`created_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES ('13872ab5-2d4e-4ce8-9d02-06afe7d3c6db','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','7819a413-4616-4f54-9adc-dc16d67af7eb',NULL,'{\"checksum\": \"7a9717c82045961a900f59663f750ac05b5f67dbfa50c9294601b44112e318f1\", \"revision\": 1}',NULL,NULL,'2026-08-06 07:12:56'),('14ef511c-4895-4394-b6e8-7b7ed0534e3c','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_UPDATE','QUESTION_SET','d8e9db97-ae3d-429e-b871-aba4c2ad6d8c','{\"title\": \"007\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"FREE\"}','{\"title\": \"007\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"PREMIUM\"}',NULL,NULL,'2026-08-06 07:17:23'),('16298bf9-72b7-49dc-8d56-5a7b3f991ac2','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','0d21ff9c-db65-474c-b6d6-af75455850f6',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:17:21'),('1c2ff98a-fe11-4c2c-aff6-ca7068897fa4','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','a5953d8e-2230-4508-96ba-754b91177d3a',NULL,'{\"checksum\": \"df92141257ac2ff79fb8c4f85797af9c62177fd3cdc1792939e8d696d4bb0199\", \"revision\": 1}',NULL,NULL,'2026-08-06 07:12:56'),('1df3787a-0d0f-4bab-b2f1-b5d844326af6','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_CREATE','QUESTION_SET','d8e9db97-ae3d-429e-b871-aba4c2ad6d8c',NULL,'{\"code\": \"READING_PART_1_007\", \"status\": \"DRAFT\"}',NULL,NULL,'2026-08-06 07:12:55'),('1eee4ee2-4c26-412a-8e28-81f892469c73','99e4374d-8ede-42ca-a60d-219155f5e7b9','USER_ROLES_UPDATE','USER','99e4374d-8ede-42ca-a60d-219155f5e7b9','{\"roles\": [\"SUPER_ADMIN\", \"STUDENT\", \"SUPPORT\", \"FINANCE\", \"ADMIN\", \"CONTENT_REVIEWER\", \"CONTENT_EDITOR\", \"TEACHER\"]}','{\"roles\": [\"SUPER_ADMIN\"]}',NULL,NULL,'2026-08-06 08:55:47'),('22e5691d-044c-458a-8633-4a5099c59b6f','99e4374d-8ede-42ca-a60d-219155f5e7b9','ENTITLEMENT_GRANT','USER','99e4374d-8ede-42ca-a60d-219155f5e7b9',NULL,'{\"endsAt\": \"2026-09-05T08:41:15.293164465Z\", \"reason\": \"Nâng cấp Premium 30 ngày\", \"entitlementCode\": \"PREMIUM_CONTENT_ACCESS\"}',NULL,NULL,'2026-08-06 08:41:15'),('24c22216-76c6-42a8-82f3-912ff60859a4','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','0d21ff9c-db65-474c-b6d6-af75455850f6',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:12:55'),('2683386a-c63a-4459-a802-c082c7ec7f2f','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','b9e00ead-1ad2-4c17-a993-67c6db96ce46',NULL,'{\"checksum\": \"a31a7e136dee0e9f2d9de0dc3708410ee5e87fe27d2bae46b1532efaa3bde2a4\", \"revision\": 1}',NULL,NULL,'2026-08-06 07:03:18'),('2e4bc7cb-ee20-4660-9abc-105fdf25ff25','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','ec3830ca-7d33-475b-977d-2925f223a3dd',NULL,'{\"checksum\": \"35591574316b2519f6f6b8414d5ee4ac1506c43ab0f0f98de0f6fbbd399fc1b5\", \"revision\": 1}',NULL,NULL,'2026-08-06 07:12:54'),('2e73e59e-6d74-4d54-a747-503b7c2e8579','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','bc8857da-98d2-44be-b3ff-ea6e67472d8c',NULL,'{\"checksum\": \"76915dcb684ffa3e85695101c959deb37ee9d3a2821a565deda6863872863af4\", \"revision\": 1}',NULL,NULL,'2026-08-06 07:16:51'),('319c46df-6a3b-471b-b126-51a6cc861133','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_UPDATE','QUESTION_SET','0d21ff9c-db65-474c-b6d6-af75455850f6','{\"title\": \"005\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"FREE\"}','{\"title\": \"005\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"PREMIUM\"}',NULL,NULL,'2026-08-06 07:17:21'),('3652b951-8d45-4a7f-ad1c-a7451d2f209b','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_UPDATE','QUESTION_SET','a801829f-c04c-484c-8ca9-7fdfa68295b6','{\"title\": \"008\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"FREE\"}','{\"title\": \"008\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"PREMIUM\"}',NULL,NULL,'2026-08-06 07:17:23'),('37c192d6-565b-4d82-bff2-2db6236b197d','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','ec494119-b3e6-4598-8e8d-40d2db835ebe',NULL,'{\"checksum\": \"4d64779122542fef5356273dbc766ab99e8d98e04d5afaa4f68c4957b335bd35\", \"revision\": 2}',NULL,NULL,'2026-08-06 07:17:25'),('3cf4b7b2-5a40-452b-a75d-6bd3079ed94c','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_CREATE','QUESTION_SET','b9e00ead-1ad2-4c17-a993-67c6db96ce46',NULL,'{\"code\": \"READING_PART_1_H5VKW6\", \"status\": \"DRAFT\"}',NULL,NULL,'2026-08-06 07:00:44'),('3dbb8176-b1cb-413c-a85c-2a62fec145ca','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','0d21ff9c-db65-474c-b6d6-af75455850f6',NULL,'{\"checksum\": \"c2bb08864157f92e9928a10e0f268ed37dec89f1f57aa356edca25d0a8595d9d\", \"revision\": 2}',NULL,NULL,'2026-08-06 07:17:21'),('40a9c3ef-dfbd-4beb-a7e8-1315c34248f0','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','a801829f-c04c-484c-8ca9-7fdfa68295b6',NULL,'{\"checksum\": \"3f2b8984adba9d1cfcc8c476d776e26fb47eee299d57636a5e91469d6ed21f8e\", \"revision\": 2}',NULL,NULL,'2026-08-06 07:17:23'),('46564c33-8c25-4d52-bbbd-456db20eb830','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_UPDATE','QUESTION_SET','a5953d8e-2230-4508-96ba-754b91177d3a','{\"title\": \"009\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"FREE\"}','{\"title\": \"009\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"PREMIUM\"}',NULL,NULL,'2026-08-06 07:17:24'),('46a5f8d3-3bb5-4f94-9e3d-83045afafdfd','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','13ed933c-e71f-4098-816c-72845efa9cb3',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:17:22'),('48d5aded-906f-4f4f-9c79-807c67f62b0b','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_CREATE','QUESTION_SET','72d88237-00fb-41d7-89a7-700ec8caaf2e',NULL,'{\"code\": \"READING_PART_1_002\", \"status\": \"DRAFT\"}',NULL,NULL,'2026-08-06 07:12:54'),('54d5ace1-3e45-4e83-8ea6-71a6c6ec2a08','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','a5953d8e-2230-4508-96ba-754b91177d3a',NULL,'{\"checksum\": \"b79c722dbc3cc1a48274df8b3a11c33f3de9dc839ac19385b9eccd430f6e9c7c\", \"revision\": 2}',NULL,NULL,'2026-08-06 07:17:24'),('56357291-c02b-406c-8ede-7f184bb1d3d9','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','ec494119-b3e6-4598-8e8d-40d2db835ebe',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:17:25'),('5ce40913-8758-4bda-9ddb-9a06526b57c7','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','ec3830ca-7d33-475b-977d-2925f223a3dd',NULL,'{\"checksum\": \"7819a52a7d2aec5f08dfd5e751ff8f9f0f81d2ff2fae16f49c6500c7eb49f941\", \"revision\": 2}',NULL,NULL,'2026-08-06 07:17:21'),('5fa49b74-c74b-43e0-8bef-deddfd416b3b','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','d8e9db97-ae3d-429e-b871-aba4c2ad6d8c',NULL,'{\"checksum\": \"6fe829f33729dab2d608338bc68f5bbc335dfe2c1f82bdd5009e537726771615\", \"revision\": 1}',NULL,NULL,'2026-08-06 07:12:55'),('6213d6e8-01ec-4557-b5f6-7d6f76cf5848','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_CREATE','QUESTION_SET','ec3830ca-7d33-475b-977d-2925f223a3dd',NULL,'{\"code\": \"READING_PART_1_004\", \"status\": \"DRAFT\"}',NULL,NULL,'2026-08-06 07:12:54'),('629126fa-c71d-41f3-ae1c-b6e49ef9b2e1','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','d8e9db97-ae3d-429e-b871-aba4c2ad6d8c',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:17:23'),('62e05305-9145-433d-bb13-6ce0f8684d8a','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_UPDATE','QUESTION_SET','ec3830ca-7d33-475b-977d-2925f223a3dd','{\"title\": \"004\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"FREE\"}','{\"title\": \"004\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"PREMIUM\"}',NULL,NULL,'2026-08-06 07:17:21'),('62efe4de-394e-4a10-a6df-0e654cc8d8de','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_CREATE','QUESTION_SET','a5953d8e-2230-4508-96ba-754b91177d3a',NULL,'{\"code\": \"READING_PART_1_009\", \"status\": \"DRAFT\"}',NULL,NULL,'2026-08-06 07:12:56'),('65a3158c-6e0c-4300-98e0-15cdd3ef0fa5','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','ec3830ca-7d33-475b-977d-2925f223a3dd',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:12:54'),('667a0d68-43e3-4def-b468-a384a9f63f41','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_CREATE','QUESTION_SET','24d5f0ca-5f9a-4bd4-9d50-7edfd7091855',NULL,'{\"code\": \"READING_PART_1_003\", \"status\": \"DRAFT\"}',NULL,NULL,'2026-08-06 07:12:54'),('6771ea77-c82c-4ec4-a6e4-4d493c5bd9e9','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_CREATE','QUESTION_SET','bc8857da-98d2-44be-b3ff-ea6e67472d8c',NULL,'{\"code\": \"READING_PART_1_013\", \"status\": \"DRAFT\"}',NULL,NULL,'2026-08-06 07:16:51'),('67b61167-4f26-41ed-80d6-bbec02a32628','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','ec494119-b3e6-4598-8e8d-40d2db835ebe',NULL,'{\"checksum\": \"dc44c1364443f84dc803e62e7c12cbf648bd24ff8ea08df7c15888ed83743dba\", \"revision\": 1}',NULL,NULL,'2026-08-06 07:12:56'),('68c7b2f5-ca04-4d6b-aefd-5705697bc27c','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_UPDATE','QUESTION_SET','72d88237-00fb-41d7-89a7-700ec8caaf2e','{\"title\": \"002\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"FREE\"}','{\"title\": \"002\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"PREMIUM\"}',NULL,NULL,'2026-08-06 07:17:18'),('6bc078af-a313-4974-89d5-277a9c46de07','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','ec3830ca-7d33-475b-977d-2925f223a3dd',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:17:21'),('6c1eabab-252d-4c5f-bb2b-fd2953938631','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','d8e9db97-ae3d-429e-b871-aba4c2ad6d8c',NULL,'{\"checksum\": \"e3a39b2c7eaa32a2529a99870ff6588aadbcbe2446139abd5b09b914c8a4da21\", \"revision\": 2}',NULL,NULL,'2026-08-06 07:17:23'),('6ee3a12a-b0ff-4710-9b32-f517683d0fd1','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','d8e9db97-ae3d-429e-b871-aba4c2ad6d8c',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:12:55'),('78807002-6701-4173-9196-ccad9839742c','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','a5953d8e-2230-4508-96ba-754b91177d3a',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:17:24'),('79996920-413f-4281-9f51-adf730d8acc4','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','b9e00ead-1ad2-4c17-a993-67c6db96ce46',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:03:17'),('7a0bb275-b54f-48a0-8454-5176388d364f','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','ec494119-b3e6-4598-8e8d-40d2db835ebe',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:12:56'),('7a0f43e2-913a-4ff1-bd9e-14a9c090bdb0','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_CREATE','QUESTION_SET','ec494119-b3e6-4598-8e8d-40d2db835ebe',NULL,'{\"code\": \"READING_PART_1_010\", \"status\": \"DRAFT\"}',NULL,NULL,'2026-08-06 07:12:56'),('7c58f693-a844-4a6a-81b4-c96ea9c354e5','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_CREATE','QUESTION_SET','f3f879a6-2755-4ef5-8aab-566ff97f6c96',NULL,'{\"code\": \"READING_PART_1_012\", \"status\": \"DRAFT\"}',NULL,NULL,'2026-08-06 07:16:51'),('82aff67f-df8e-42c6-a3dc-aa3940a746bf','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','24d5f0ca-5f9a-4bd4-9d50-7edfd7091855',NULL,'{\"checksum\": \"8a6d6134751d6b7b5abf08fd500dc32f5e4d68eaf77078ecc9d31fe4b2618af2\", \"revision\": 1}',NULL,NULL,'2026-08-06 07:12:54'),('8a893876-1dd2-4b3a-aacc-62e3f7af29e2','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_UPDATE','QUESTION_SET','24d5f0ca-5f9a-4bd4-9d50-7edfd7091855','{\"title\": \"003\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"FREE\"}','{\"title\": \"003\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"PREMIUM\"}',NULL,NULL,'2026-08-06 07:17:20'),('8cb0ad0f-94c2-400a-a2b6-1bf36b4011a1','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','a801829f-c04c-484c-8ca9-7fdfa68295b6',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:17:23'),('954bcfef-e62f-47a9-acde-dfe67bbcc2c0','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','7819a413-4616-4f54-9adc-dc16d67af7eb',NULL,'{\"checksum\": \"8073f33949f63fafce2b02a66f668afdda39a78a5bd0df3c5a0f7f397e70bfe2\", \"revision\": 2}',NULL,NULL,'2026-08-06 07:17:26'),('970fcfd3-e207-4b60-9197-bbd086f36298','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','72d88237-00fb-41d7-89a7-700ec8caaf2e',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:17:18'),('985834a5-e3ad-4b91-b425-e7b879121730','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','72d88237-00fb-41d7-89a7-700ec8caaf2e',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:12:54'),('98cd5439-ee19-47cd-96d1-b24a38817ffa','99e4374d-8ede-42ca-a60d-219155f5e7b9','USER_ROLES_UPDATE','USER','99e4374d-8ede-42ca-a60d-219155f5e7b9','{\"roles\": [\"STUDENT\", \"FINANCE\", \"ADMIN\", \"TEACHER\"]}','{\"roles\": [\"SUPER_ADMIN\", \"STUDENT\", \"SUPPORT\", \"FINANCE\", \"ADMIN\", \"CONTENT_REVIEWER\", \"TEACHER\", \"CONTENT_EDITOR\"]}',NULL,NULL,'2026-08-06 02:42:07'),('99ece08e-6a64-4374-8142-c4af9c855196','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','f3f879a6-2755-4ef5-8aab-566ff97f6c96',NULL,'{\"checksum\": \"2ea573a7d397eae3ceec604a4b218510060502f2eee8e5338ad3f9f8b757cf2c\", \"revision\": 1}',NULL,NULL,'2026-08-06 07:16:51'),('9e86f56d-fe99-4552-b3f3-27f0fa9ba35f','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','24d5f0ca-5f9a-4bd4-9d50-7edfd7091855',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:12:54'),('9fcbbcf7-7ead-4e36-a5d7-4e1c2e7239f9','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_UPDATE','QUESTION_SET','7819a413-4616-4f54-9adc-dc16d67af7eb','{\"title\": \"011\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"FREE\"}','{\"title\": \"011\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"PREMIUM\"}',NULL,NULL,'2026-08-06 07:17:26'),('a271848c-98cb-4f26-ac4f-f88fa84a51d7','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','7819a413-4616-4f54-9adc-dc16d67af7eb',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:12:56'),('aba80e33-4c0e-496d-8f2b-8013c29cfad1','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_CREATE','QUESTION_SET','7819a413-4616-4f54-9adc-dc16d67af7eb',NULL,'{\"code\": \"READING_PART_1_011\", \"status\": \"DRAFT\"}',NULL,NULL,'2026-08-06 07:12:56'),('b0e027ed-bffd-411c-8b28-0cddca1a1ac9','99e4374d-8ede-42ca-a60d-219155f5e7b9','ENTITLEMENT_GRANT','USER','99e4374d-8ede-42ca-a60d-219155f5e7b9',NULL,'{\"endsAt\": \"2026-09-05T08:40:50.646786876Z\", \"reason\": \"Nâng cấp Premium 30 ngày\", \"entitlementCode\": \"PREMIUM_CONTENT_ACCESS\"}',NULL,NULL,'2026-08-06 08:40:51'),('bdb87959-adb2-4f06-8dd3-eafeaa978745','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_UPDATE','QUESTION_SET','ec494119-b3e6-4598-8e8d-40d2db835ebe','{\"title\": \"010\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"FREE\"}','{\"title\": \"010\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"PREMIUM\"}',NULL,NULL,'2026-08-06 07:17:25'),('c21238bd-3794-4daa-9413-3656e21fdee9','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','a801829f-c04c-484c-8ca9-7fdfa68295b6',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:12:55'),('c3de367e-f486-4d1b-919b-1906313de175','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','72d88237-00fb-41d7-89a7-700ec8caaf2e',NULL,'{\"checksum\": \"af7c8c4dfaa81c680ce66b9e7470b441bb5f9441dacaa92f62b00e08546ba7e8\", \"revision\": 1}',NULL,NULL,'2026-08-06 07:12:54'),('c69a2911-df70-4d2d-ba79-9d4781c8e6bb','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','a801829f-c04c-484c-8ca9-7fdfa68295b6',NULL,'{\"checksum\": \"5fe58990336bac454eb80215aa032af4f15c37e1614cb32a68dbc388d7109461\", \"revision\": 1}',NULL,NULL,'2026-08-06 07:12:56'),('c81286af-d122-4fda-b9de-a68d70782376','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','a5953d8e-2230-4508-96ba-754b91177d3a',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:12:56'),('cc8ba390-031f-4ab8-b234-42addcfc1ae4','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','13ed933c-e71f-4098-816c-72845efa9cb3',NULL,'{\"checksum\": \"b46f75832055861d7497b5f0bcbf6e5ca0a61e3f4a2112dfb709e9f8d7155556\", \"revision\": 2}',NULL,NULL,'2026-08-06 07:17:22'),('d3dddcb7-d99f-4981-ab7c-19d5488dec8e','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','13ed933c-e71f-4098-816c-72845efa9cb3',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:12:55'),('d513c578-d1f2-43e4-a778-471ea1b53fc5','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_CREATE','QUESTION_SET','13ed933c-e71f-4098-816c-72845efa9cb3',NULL,'{\"code\": \"READING_PART_1_006\", \"status\": \"DRAFT\"}',NULL,NULL,'2026-08-06 07:12:55'),('dd86a66b-2105-4c97-aa09-e0d24f064ee4','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_CREATE','QUESTION_SET','a801829f-c04c-484c-8ca9-7fdfa68295b6',NULL,'{\"code\": \"READING_PART_1_008\", \"status\": \"DRAFT\"}',NULL,NULL,'2026-08-06 07:12:55'),('df4061b7-9605-4dc4-8102-3d3eb249e933','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','13ed933c-e71f-4098-816c-72845efa9cb3',NULL,'{\"checksum\": \"92d9f9b1e0d34d56e4e4d82dc08767121490e768d4b2de207636ab60aebace51\", \"revision\": 1}',NULL,NULL,'2026-08-06 07:12:55'),('e14cc4ef-9d84-4670-bf7b-3c6862c1e295','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_CREATE','QUESTION_SET','0d21ff9c-db65-474c-b6d6-af75455850f6',NULL,'{\"code\": \"READING_PART_1_005\", \"status\": \"DRAFT\"}',NULL,NULL,'2026-08-06 07:12:55'),('e1798257-406e-4cdc-8772-051b87e9079b','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','f3f879a6-2755-4ef5-8aab-566ff97f6c96',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:16:51'),('e4e6cd78-78b5-4e5c-84b7-c7462589715a','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','0d21ff9c-db65-474c-b6d6-af75455850f6',NULL,'{\"checksum\": \"5d918666e0c1cc946c249c8ab2f0cf1c3224c1a9c21a22e3813458a32d5ff93d\", \"revision\": 1}',NULL,NULL,'2026-08-06 07:12:55'),('e9828d40-5397-4e6c-bcd6-aaef2dab5425','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','24d5f0ca-5f9a-4bd4-9d50-7edfd7091855',NULL,'{\"checksum\": \"f173242d79a47faabfef20c337748a876d19b556730cdc114240d91dc7d137f4\", \"revision\": 2}',NULL,NULL,'2026-08-06 07:17:20'),('f6b52635-f034-468d-9985-d951ada107f9','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','bc8857da-98d2-44be-b3ff-ea6e67472d8c',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:16:51'),('fa17d8eb-cc1e-4fe1-8799-20064d1bd299','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','7819a413-4616-4f54-9adc-dc16d67af7eb',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:17:26'),('fa66afdc-0528-4183-8d0a-d2e00fbb7cae','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_SUBMIT_REVIEW','QUESTION_SET','24d5f0ca-5f9a-4bd4-9d50-7edfd7091855',NULL,'{\"note\": \"\"}',NULL,NULL,'2026-08-06 07:17:20'),('fb577009-c80b-4a0b-9f4a-b874fbc6a22d','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_PUBLISH','QUESTION_SET','72d88237-00fb-41d7-89a7-700ec8caaf2e',NULL,'{\"checksum\": \"0813c98f2ac7794f2738fb85a57596f0db318e929f5b65e05b2e35105b9ed5d2\", \"revision\": 2}',NULL,NULL,'2026-08-06 07:17:19'),('fd3120e8-4bd9-40e8-9539-ed24b2f4bb25','99e4374d-8ede-42ca-a60d-219155f5e7b9','QUESTION_SET_UPDATE','QUESTION_SET','13ed933c-e71f-4098-816c-72845efa9cb3','{\"title\": \"006\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"FREE\"}','{\"title\": \"006\", \"status\": \"DRAFT\", \"maxScore\": 10.0, \"itemCount\": 5, \"accessLevel\": \"PREMIUM\"}',NULL,NULL,'2026-08-06 07:17:22');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `auth_identities`
--

DROP TABLE IF EXISTS `auth_identities`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `auth_identities` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `provider` varchar(50) NOT NULL,
  `provider_user_id` varchar(255) NOT NULL,
  `provider_email` varchar(255) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_auth_identity_provider_user` (`provider`,`provider_user_id`),
  KEY `idx_auth_identities_user` (`user_id`),
  CONSTRAINT `fk_auth_identities_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `auth_identities`
--

LOCK TABLES `auth_identities` WRITE;
/*!40000 ALTER TABLE `auth_identities` DISABLE KEYS */;
/*!40000 ALTER TABLE `auth_identities` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_accounts`
--

DROP TABLE IF EXISTS `bank_accounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_accounts` (
  `id` char(36) NOT NULL,
  `bank_code` varchar(20) NOT NULL COMMENT 'Mã ngân hàng theo chuẩn VietQR, vd VCB, TCB',
  `bank_name` varchar(255) NOT NULL,
  `account_number` varchar(50) NOT NULL,
  `account_holder` varchar(255) NOT NULL,
  `qr_asset_id` char(36) DEFAULT NULL,
  `transfer_note` varchar(500) DEFAULT NULL COMMENT 'Ghi chú thêm hiển thị cho học viên',
  `is_active` tinyint(1) NOT NULL DEFAULT '0',
  `display_order` int NOT NULL DEFAULT '0',
  `created_by` char(36) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `fk_bank_accounts_qr` (`qr_asset_id`),
  KEY `idx_bank_accounts_active` (`is_active`,`display_order`),
  CONSTRAINT `fk_bank_accounts_qr` FOREIGN KEY (`qr_asset_id`) REFERENCES `assets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_accounts`
--

LOCK TABLES `bank_accounts` WRITE;
/*!40000 ALTER TABLE `bank_accounts` DISABLE KEYS */;
INSERT INTO `bank_accounts` VALUES ('1b000000-0000-4000-8000-000000000001','MB','MB Bank','0384896584','DO QUOC PHONG',NULL,'Vui lòng chuyển đúng số tiền và giữ nguyên nội dung chuyển khoản.',1,1,NULL,'2026-08-01 07:42:18','2026-08-06 02:46:15');
/*!40000 ALTER TABLE `bank_accounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `bank_transfer_requests`
--

DROP TABLE IF EXISTS `bank_transfer_requests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `bank_transfer_requests` (
  `id` char(36) NOT NULL,
  `order_id` char(36) NOT NULL,
  `bank_account_id` char(36) NOT NULL,
  `transfer_code` varchar(8) NOT NULL,
  `amount` bigint NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'VND',
  `status` enum('PENDING','CLAIMED','CONFIRMED','REJECTED','EXPIRED') NOT NULL DEFAULT 'PENDING',
  `claimed_at` datetime DEFAULT NULL,
  `claim_note` varchar(1000) DEFAULT NULL,
  `confirmed_by` char(36) DEFAULT NULL,
  `confirmed_at` datetime DEFAULT NULL,
  `confirmed_amount` bigint DEFAULT NULL,
  `admin_note` varchar(1000) DEFAULT NULL,
  `qr_expires_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL COMMENT 'Chết theo hạn đơn hàng',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_bank_transfer_code` (`transfer_code`),
  UNIQUE KEY `uk_bank_transfer_order` (`order_id`),
  KEY `fk_btr_bank_account` (`bank_account_id`),
  KEY `idx_btr_status` (`status`,`created_at`),
  KEY `idx_btr_claimed` (`status`,`claimed_at`),
  CONSTRAINT `fk_btr_bank_account` FOREIGN KEY (`bank_account_id`) REFERENCES `bank_accounts` (`id`),
  CONSTRAINT `fk_btr_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `bank_transfer_requests`
--

LOCK TABLES `bank_transfer_requests` WRITE;
/*!40000 ALTER TABLE `bank_transfer_requests` DISABLE KEYS */;
/*!40000 ALTER TABLE `bank_transfer_requests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blueprint_fixed_question_sets`
--

DROP TABLE IF EXISTS `blueprint_fixed_question_sets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blueprint_fixed_question_sets` (
  `blueprint_rule_id` char(36) NOT NULL,
  `question_set_id` char(36) NOT NULL,
  `display_order` int NOT NULL,
  PRIMARY KEY (`blueprint_rule_id`,`question_set_id`),
  KEY `idx_blueprint_fixed_question` (`question_set_id`),
  CONSTRAINT `fk_blueprint_fixed_question` FOREIGN KEY (`question_set_id`) REFERENCES `question_sets` (`id`),
  CONSTRAINT `fk_blueprint_fixed_rule` FOREIGN KEY (`blueprint_rule_id`) REFERENCES `blueprint_part_rules` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blueprint_fixed_question_sets`
--

LOCK TABLES `blueprint_fixed_question_sets` WRITE;
/*!40000 ALTER TABLE `blueprint_fixed_question_sets` DISABLE KEYS */;
/*!40000 ALTER TABLE `blueprint_fixed_question_sets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `blueprint_part_rules`
--

DROP TABLE IF EXISTS `blueprint_part_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `blueprint_part_rules` (
  `id` char(36) NOT NULL,
  `blueprint_id` char(36) NOT NULL,
  `part_id` char(36) NOT NULL,
  `question_set_count` int NOT NULL,
  `difficulty_min` tinyint DEFAULT NULL,
  `difficulty_max` tinyint DEFAULT NULL,
  `selection_strategy` enum('RANDOM','NEW_FIRST','WEAK_FIRST','FIXED') NOT NULL DEFAULT 'RANDOM',
  `allow_free_content` tinyint(1) NOT NULL DEFAULT '1',
  `allow_premium_content` tinyint(1) NOT NULL DEFAULT '1',
  `config_json` json DEFAULT NULL,
  `display_order` int NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_blueprint_rules_order` (`blueprint_id`,`display_order`),
  KEY `idx_blueprint_rules_part` (`part_id`),
  CONSTRAINT `fk_blueprint_rules_blueprint` FOREIGN KEY (`blueprint_id`) REFERENCES `test_blueprints` (`id`),
  CONSTRAINT `fk_blueprint_rules_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `blueprint_part_rules`
--

LOCK TABLES `blueprint_part_rules` WRITE;
/*!40000 ALTER TABLE `blueprint_part_rules` DISABLE KEYS */;
INSERT INTO `blueprint_part_rules` VALUES ('1a000000-0000-4000-8000-000000000001','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000001',1,NULL,NULL,'RANDOM',1,1,NULL,1),('1a000000-0000-4000-8000-000000000002','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000002',1,NULL,NULL,'RANDOM',1,1,NULL,2),('1a000000-0000-4000-8000-000000000011','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000011',1,NULL,NULL,'RANDOM',1,1,NULL,3),('1a000000-0000-4000-8000-000000000012','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000012',1,NULL,NULL,'RANDOM',1,1,NULL,4),('1a000000-0000-4000-8000-000000000013','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000013',1,NULL,NULL,'RANDOM',1,1,NULL,6),('1a000000-0000-4000-8000-000000000014','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000014',1,NULL,NULL,'RANDOM',1,1,NULL,7),('1a000000-0000-4000-8000-000000000021','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000021',1,NULL,NULL,'RANDOM',1,1,NULL,8),('1a000000-0000-4000-8000-000000000022','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000022',1,NULL,NULL,'RANDOM',1,1,NULL,9),('1a000000-0000-4000-8000-000000000023','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000023',1,NULL,NULL,'RANDOM',1,1,NULL,10),('1a000000-0000-4000-8000-000000000024','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000024',1,NULL,NULL,'RANDOM',1,1,NULL,11),('1a000000-0000-4000-8000-000000000031','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000031',1,NULL,NULL,'RANDOM',1,1,NULL,12),('1a000000-0000-4000-8000-000000000032','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000032',1,NULL,NULL,'RANDOM',1,1,NULL,13),('1a000000-0000-4000-8000-000000000033','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000033',1,NULL,NULL,'RANDOM',1,1,NULL,14),('1a000000-0000-4000-8000-000000000034','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000034',1,NULL,NULL,'RANDOM',1,1,NULL,15),('1a000000-0000-4000-8000-000000000041','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000041',1,NULL,NULL,'RANDOM',1,1,NULL,16),('1a000000-0000-4000-8000-000000000042','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000042',1,NULL,NULL,'RANDOM',1,1,NULL,17),('1a000000-0000-4000-8000-000000000043','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000043',1,NULL,NULL,'RANDOM',1,1,NULL,18),('1a000000-0000-4000-8000-000000000044','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000044',1,NULL,NULL,'RANDOM',1,1,NULL,19),('1b000000-0000-4000-8000-000000000001','19000000-0000-4000-8000-000000000002','16000000-0000-4000-8000-000000000001',1,NULL,NULL,'RANDOM',1,0,NULL,1),('1b000000-0000-4000-8000-000000000002','19000000-0000-4000-8000-000000000002','16000000-0000-4000-8000-000000000011',1,NULL,NULL,'RANDOM',1,0,NULL,2),('3fd7a621-916c-11f1-91a1-5ea0f6946b98','19000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000015',1,NULL,NULL,'RANDOM',1,1,NULL,5);
/*!40000 ALTER TABLE `blueprint_part_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `components`
--

DROP TABLE IF EXISTS `components`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `components` (
  `id` char(36) NOT NULL,
  `exam_version_id` char(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` text,
  `display_order` int NOT NULL,
  `duration_seconds` int DEFAULT NULL,
  `max_score` decimal(8,2) DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_components_version_code` (`exam_version_id`,`code`),
  KEY `idx_components_version_order` (`exam_version_id`,`display_order`),
  CONSTRAINT `fk_components_exam_version` FOREIGN KEY (`exam_version_id`) REFERENCES `exam_versions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `components`
--

LOCK TABLES `components` WRITE;
/*!40000 ALTER TABLE `components` DISABLE KEYS */;
INSERT INTO `components` VALUES ('15000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000001','GRAMMAR_VOCABULARY','Grammar & Vocabulary','Ngữ pháp và từ vựng',1,1500,50.00,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('15000000-0000-4000-8000-000000000002','14000000-0000-4000-8000-000000000001','READING','Reading','Đọc hiểu',2,1800,50.00,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('15000000-0000-4000-8000-000000000003','14000000-0000-4000-8000-000000000001','LISTENING','Listening','Nghe hiểu',3,1500,50.00,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('15000000-0000-4000-8000-000000000004','14000000-0000-4000-8000-000000000001','SPEAKING','Speaking','Nói',4,720,50.00,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('15000000-0000-4000-8000-000000000005','14000000-0000-4000-8000-000000000001','WRITING','Writing','Viết',5,3000,50.00,1,'2026-07-31 17:51:10','2026-07-31 17:51:10');
/*!40000 ALTER TABLE `components` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `content_access_overrides`
--

DROP TABLE IF EXISTS `content_access_overrides`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `content_access_overrides` (
  `id` char(36) NOT NULL,
  `resource_type` enum('QUESTION_SET','COMPONENT','PART','MOCK_TEST') NOT NULL,
  `resource_id` char(36) NOT NULL,
  `access_level` enum('FREE','PREMIUM') NOT NULL,
  `user_id` char(36) DEFAULT NULL,
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `reason` varchar(500) DEFAULT NULL,
  `created_by` char(36) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_content_access_resource` (`resource_type`,`resource_id`,`starts_at`,`ends_at`),
  KEY `idx_content_access_user` (`user_id`,`starts_at`,`ends_at`),
  CONSTRAINT `fk_content_access_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `content_access_overrides`
--

LOCK TABLES `content_access_overrides` WRITE;
/*!40000 ALTER TABLE `content_access_overrides` DISABLE KEYS */;
/*!40000 ALTER TABLE `content_access_overrides` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `email_verification_tokens`
--

DROP TABLE IF EXISTS `email_verification_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `email_verification_tokens` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_email_verification_hash` (`token_hash`),
  KEY `idx_email_verification_user` (`user_id`),
  CONSTRAINT `fk_email_verification_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `email_verification_tokens`
--

LOCK TABLES `email_verification_tokens` WRITE;
/*!40000 ALTER TABLE `email_verification_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `email_verification_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `evaluation_jobs`
--

DROP TABLE IF EXISTS `evaluation_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evaluation_jobs` (
  `id` char(36) NOT NULL,
  `attempt_id` char(36) NOT NULL,
  `attempt_question_set_id` char(36) NOT NULL,
  `question_set_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `evaluation_type` enum('SPEAKING_AI','WRITING_AI','SPEAKING_TEACHER','WRITING_TEACHER') NOT NULL,
  `status` enum('QUEUED','PROCESSING','COMPLETED','FAILED','CANCELLED') NOT NULL DEFAULT 'QUEUED',
  `mongo_evaluation_document_id` varchar(100) DEFAULT NULL,
  `idempotency_key` varchar(255) NOT NULL,
  `retry_count` int NOT NULL DEFAULT '0',
  `error_message` text,
  `queued_at` datetime NOT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_evaluation_jobs_idempotency` (`idempotency_key`),
  KEY `idx_evaluation_jobs_queue` (`status`,`queued_at`),
  KEY `idx_evaluation_jobs_attempt` (`attempt_id`,`status`),
  KEY `idx_evaluation_jobs_user` (`user_id`,`queued_at`),
  KEY `idx_evaluation_jobs_aqs` (`attempt_question_set_id`),
  KEY `idx_evaluation_jobs_question` (`question_set_id`),
  CONSTRAINT `fk_evaluation_jobs_aqs` FOREIGN KEY (`attempt_question_set_id`) REFERENCES `attempt_question_sets` (`id`),
  CONSTRAINT `fk_evaluation_jobs_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `test_attempts` (`id`),
  CONSTRAINT `fk_evaluation_jobs_question` FOREIGN KEY (`question_set_id`) REFERENCES `question_sets` (`id`),
  CONSTRAINT `fk_evaluation_jobs_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `evaluation_jobs`
--

LOCK TABLES `evaluation_jobs` WRITE;
/*!40000 ALTER TABLE `evaluation_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `evaluation_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `evaluation_summaries`
--

DROP TABLE IF EXISTS `evaluation_summaries`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `evaluation_summaries` (
  `id` char(36) NOT NULL,
  `evaluation_job_id` char(36) NOT NULL,
  `attempt_id` char(36) NOT NULL,
  `question_set_id` char(36) NOT NULL,
  `evaluator_type` enum('AI','TEACHER','MODERATOR') NOT NULL,
  `evaluator_user_id` char(36) DEFAULT NULL,
  `total_score` decimal(8,2) DEFAULT NULL,
  `max_score` decimal(8,2) DEFAULT NULL,
  `cefr_level` enum('A1','A2','B1','B2','C1','C2') DEFAULT NULL,
  `is_final` tinyint(1) NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_evaluation_summary_job_evaluator` (`evaluation_job_id`,`evaluator_user_id`),
  KEY `idx_evaluation_final` (`attempt_id`,`question_set_id`,`is_final`),
  KEY `idx_evaluation_summaries_job` (`evaluation_job_id`),
  KEY `fk_evaluation_summaries_question` (`question_set_id`),
  KEY `fk_evaluation_summaries_evaluator` (`evaluator_user_id`),
  KEY `idx_evaluation_summary_pending` (`evaluator_type`,`is_final`,`created_at`),
  CONSTRAINT `fk_evaluation_summaries_attempt` FOREIGN KEY (`attempt_id`) REFERENCES `test_attempts` (`id`),
  CONSTRAINT `fk_evaluation_summaries_evaluator` FOREIGN KEY (`evaluator_user_id`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_evaluation_summaries_job` FOREIGN KEY (`evaluation_job_id`) REFERENCES `evaluation_jobs` (`id`),
  CONSTRAINT `fk_evaluation_summaries_question` FOREIGN KEY (`question_set_id`) REFERENCES `question_sets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `evaluation_summaries`
--

LOCK TABLES `evaluation_summaries` WRITE;
/*!40000 ALTER TABLE `evaluation_summaries` DISABLE KEYS */;
/*!40000 ALTER TABLE `evaluation_summaries` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exam_products`
--

DROP TABLE IF EXISTS `exam_products`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_products` (
  `id` char(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_exam_products_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exam_products`
--

LOCK TABLES `exam_products` WRITE;
/*!40000 ALTER TABLE `exam_products` DISABLE KEYS */;
INSERT INTO `exam_products` VALUES ('13000000-0000-4000-8000-000000000001','APTIS_GENERAL','Aptis General','Bài thi Aptis General của British Council',1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('13000000-0000-4000-8000-000000000002','APTIS_ADVANCED','Aptis Advanced','Bài thi Aptis Advanced',1,'2026-07-31 17:51:10','2026-07-31 17:51:10');
/*!40000 ALTER TABLE `exam_products` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exam_versions`
--

DROP TABLE IF EXISTS `exam_versions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exam_versions` (
  `id` char(36) NOT NULL,
  `exam_product_id` char(36) NOT NULL,
  `code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `valid_from` date DEFAULT NULL,
  `valid_to` date DEFAULT NULL,
  `status` enum('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_exam_versions_code` (`code`),
  KEY `idx_exam_versions_product` (`exam_product_id`,`status`),
  CONSTRAINT `fk_exam_versions_product` FOREIGN KEY (`exam_product_id`) REFERENCES `exam_products` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exam_versions`
--

LOCK TABLES `exam_versions` WRITE;
/*!40000 ALTER TABLE `exam_versions` DISABLE KEYS */;
INSERT INTO `exam_versions` VALUES ('14000000-0000-4000-8000-000000000001','13000000-0000-4000-8000-000000000001','APTIS_GENERAL_2024','Aptis General 2024','2024-01-01',NULL,'PUBLISHED','2026-07-31 17:51:10','2026-07-31 17:51:10');
/*!40000 ALTER TABLE `exam_versions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `export_jobs`
--

DROP TABLE IF EXISTS `export_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `export_jobs` (
  `id` char(36) NOT NULL,
  `requested_by` char(36) NOT NULL,
  `export_type` enum('LEARNING_REPORT','REVENUE_REPORT','ATTEMPT_DETAIL','USER_LIST') NOT NULL,
  `params_json` json DEFAULT NULL,
  `status` enum('QUEUED','PROCESSING','COMPLETED','FAILED') NOT NULL DEFAULT 'QUEUED',
  `result_asset_id` char(36) DEFAULT NULL,
  `error_message` text,
  `queued_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_export_jobs_status` (`status`,`queued_at`),
  KEY `idx_export_jobs_requester` (`requested_by`,`queued_at`),
  KEY `idx_export_jobs_result` (`result_asset_id`),
  CONSTRAINT `fk_export_jobs_requester` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_export_jobs_result` FOREIGN KEY (`result_asset_id`) REFERENCES `assets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `export_jobs`
--

LOCK TABLES `export_jobs` WRITE;
/*!40000 ALTER TABLE `export_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `export_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `flyway_schema_history`
--

DROP TABLE IF EXISTS `flyway_schema_history`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `flyway_schema_history` (
  `installed_rank` int NOT NULL,
  `version` varchar(50) DEFAULT NULL,
  `description` varchar(200) NOT NULL,
  `type` varchar(20) NOT NULL,
  `script` varchar(1000) NOT NULL,
  `checksum` int DEFAULT NULL,
  `installed_by` varchar(100) NOT NULL,
  `installed_on` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `execution_time` int NOT NULL,
  `success` tinyint(1) NOT NULL,
  PRIMARY KEY (`installed_rank`),
  KEY `flyway_schema_history_s_idx` (`success`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `flyway_schema_history`
--

LOCK TABLES `flyway_schema_history` WRITE;
/*!40000 ALTER TABLE `flyway_schema_history` DISABLE KEYS */;
INSERT INTO `flyway_schema_history` VALUES (1,'1','auth and users','SQL','V1__auth_and_users.sql',-217552159,'aptis','2026-07-31 17:51:08',390,1),(2,'2','exam structure','SQL','V2__exam_structure.sql',-149360238,'aptis','2026-07-31 17:51:08',273,1),(3,'3','assets','SQL','V3__assets.sql',557903057,'aptis','2026-07-31 17:51:08',36,1),(4,'4','question bank','SQL','V4__question_bank.sql',-616843532,'aptis','2026-07-31 17:51:09',126,1),(5,'5','subscription and entitlement','SQL','V5__subscription_and_entitlement.sql',719208252,'aptis','2026-07-31 17:51:09',250,1),(6,'6','orders and payments','SQL','V6__orders_and_payments.sql',-211649626,'aptis','2026-07-31 17:51:09',594,1),(7,'7','blueprints and attempts','SQL','V7__blueprints_and_attempts.sql',-1038486904,'aptis','2026-07-31 17:51:10',375,1),(8,'8','progress','SQL','V8__progress.sql',-1690611147,'aptis','2026-07-31 17:51:10',167,1),(9,'9','evaluation jobs and platform','SQL','V9__evaluation_jobs_and_platform.sql',1066024540,'aptis','2026-07-31 17:51:10',291,1),(10,'10','seed reference data','SQL','V10__seed_reference_data.sql',460411981,'aptis','2026-07-31 17:51:10',41,1),(11,'11','user roles assigned at default','SQL','V11__user_roles_assigned_at_default.sql',-979574990,'aptis','2026-07-31 18:10:16',37,1),(12,'12','seed blueprint rules and promotions','SQL','V12__seed_blueprint_rules_and_promotions.sql',-2142840771,'aptis','2026-08-01 02:01:59',32,1),(13,'13','evaluation summary unique job','SQL','V13__evaluation_summary_unique_job.sql',-516276344,'aptis','2026-08-01 02:21:35',72,1),(14,'14','evaluation summary per evaluator','SQL','V14__evaluation_summary_per_evaluator.sql',1444219110,'aptis','2026-08-01 03:26:01',103,1),(15,'15','trial seed and indexes','SQL','V15__trial_seed_and_indexes.sql',-447223949,'aptis','2026-08-01 03:26:02',56,1),(16,'16','bank transfer','SQL','V16__bank_transfer.sql',847763682,'aptis','2026-08-01 07:42:18',275,1),(17,'17','question set hotness','SQL','V17__question_set_hotness.sql',461543380,'aptis','2026-08-05 02:02:04',710,1),(18,'18','configure mb bank account','SQL','V18__configure_mb_bank_account.sql',-712407321,'aptis','2026-08-05 03:40:02',38,1),(19,'19','bank transfer qr expiry','SQL','V19__bank_transfer_qr_expiry.sql',-1372978470,'aptis','2026-08-05 03:56:16',443,1),(20,'20','part scoring rules','SQL','V20__part_scoring_rules.sql',-1850598772,'aptis','2026-08-06 04:20:10',603,1),(21,'21','reading five parts and component test codes','SQL','V21__reading_five_parts_and_component_test_codes.sql',648045544,'aptis','2026-08-06 07:55:54',395,1);
/*!40000 ALTER TABLE `flyway_schema_history` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `import_jobs`
--

DROP TABLE IF EXISTS `import_jobs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `import_jobs` (
  `id` char(36) NOT NULL,
  `created_by` char(36) NOT NULL,
  `source_asset_id` char(36) NOT NULL,
  `import_type` enum('QUESTION_SET_EXCEL','ASSET_ZIP') NOT NULL,
  `status` enum('QUEUED','PROCESSING','COMPLETED','PARTIALLY_FAILED','FAILED') NOT NULL DEFAULT 'QUEUED',
  `total_rows` int NOT NULL DEFAULT '0',
  `success_rows` int NOT NULL DEFAULT '0',
  `failed_rows` int NOT NULL DEFAULT '0',
  `error_report_asset_id` char(36) DEFAULT NULL,
  `error_message` text,
  `queued_at` datetime NOT NULL,
  `started_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_import_jobs_status` (`status`,`queued_at`),
  KEY `idx_import_jobs_creator` (`created_by`,`queued_at`),
  KEY `idx_import_jobs_source` (`source_asset_id`),
  KEY `idx_import_jobs_report` (`error_report_asset_id`),
  CONSTRAINT `fk_import_jobs_creator` FOREIGN KEY (`created_by`) REFERENCES `users` (`id`),
  CONSTRAINT `fk_import_jobs_report` FOREIGN KEY (`error_report_asset_id`) REFERENCES `assets` (`id`),
  CONSTRAINT `fk_import_jobs_source` FOREIGN KEY (`source_asset_id`) REFERENCES `assets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `import_jobs`
--

LOCK TABLES `import_jobs` WRITE;
/*!40000 ALTER TABLE `import_jobs` DISABLE KEYS */;
/*!40000 ALTER TABLE `import_jobs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `order_items`
--

DROP TABLE IF EXISTS `order_items`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `order_items` (
  `id` char(36) NOT NULL,
  `order_id` char(36) NOT NULL,
  `item_type` enum('SUBSCRIPTION_PLAN') NOT NULL,
  `item_id` char(36) NOT NULL,
  `item_name` varchar(255) NOT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `unit_price` bigint NOT NULL,
  `discount_amount` bigint NOT NULL DEFAULT '0',
  `total_amount` bigint NOT NULL,
  `metadata_json` json DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_order_items_order` (`order_id`),
  KEY `idx_order_items_item` (`item_type`,`item_id`),
  CONSTRAINT `fk_order_items_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `order_items`
--

LOCK TABLES `order_items` WRITE;
/*!40000 ALTER TABLE `order_items` DISABLE KEYS */;
/*!40000 ALTER TABLE `order_items` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `orders`
--

DROP TABLE IF EXISTS `orders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `orders` (
  `id` char(36) NOT NULL,
  `order_code` varchar(50) NOT NULL,
  `user_id` char(36) NOT NULL,
  `status` enum('PENDING','AWAITING_PAYMENT','PAID','CANCELLED','EXPIRED','REFUNDED','PARTIALLY_REFUNDED') NOT NULL DEFAULT 'PENDING',
  `subtotal_amount` bigint NOT NULL,
  `discount_amount` bigint NOT NULL DEFAULT '0',
  `total_amount` bigint NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'VND',
  `promotion_code_id` char(36) DEFAULT NULL,
  `idempotency_key` varchar(255) NOT NULL,
  `expires_at` datetime DEFAULT NULL,
  `paid_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_orders_code` (`order_code`),
  UNIQUE KEY `uk_orders_idempotency` (`idempotency_key`),
  KEY `idx_orders_user_status` (`user_id`,`status`,`created_at`),
  KEY `idx_orders_expiry` (`status`,`expires_at`),
  KEY `fk_orders_promotion` (`promotion_code_id`),
  CONSTRAINT `fk_orders_promotion` FOREIGN KEY (`promotion_code_id`) REFERENCES `promotion_codes` (`id`),
  CONSTRAINT `fk_orders_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `orders`
--

LOCK TABLES `orders` WRITE;
/*!40000 ALTER TABLE `orders` DISABLE KEYS */;
/*!40000 ALTER TABLE `orders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `outbox_events`
--

DROP TABLE IF EXISTS `outbox_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `outbox_events` (
  `id` char(36) NOT NULL,
  `aggregate_type` varchar(100) NOT NULL,
  `aggregate_id` char(36) NOT NULL,
  `event_type` varchar(100) NOT NULL,
  `payload_json` json NOT NULL,
  `status` enum('PENDING','PROCESSING','PUBLISHED','FAILED') NOT NULL DEFAULT 'PENDING',
  `retry_count` int NOT NULL DEFAULT '0',
  `last_error` text,
  `available_at` datetime NOT NULL,
  `created_at` datetime NOT NULL,
  `published_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_outbox_pending` (`status`,`available_at`),
  KEY `idx_outbox_aggregate` (`aggregate_type`,`aggregate_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `outbox_events`
--

LOCK TABLES `outbox_events` WRITE;
/*!40000 ALTER TABLE `outbox_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `outbox_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `part_scoring_rules`
--

DROP TABLE IF EXISTS `part_scoring_rules`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `part_scoring_rules` (
  `id` char(36) NOT NULL,
  `part_id` char(36) NOT NULL,
  `max_score` decimal(8,2) NOT NULL,
  `points_per_correct` decimal(8,2) DEFAULT NULL,
  `perfect_bonus` decimal(8,2) NOT NULL DEFAULT '0.00',
  `included_in_overall` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_part_scoring_rules_part` (`part_id`),
  CONSTRAINT `fk_part_scoring_rules_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`),
  CONSTRAINT `chk_part_scoring_bonus` CHECK ((`perfect_bonus` >= 0)),
  CONSTRAINT `chk_part_scoring_correct` CHECK (((`points_per_correct` is null) or (`points_per_correct` > 0))),
  CONSTRAINT `chk_part_scoring_max` CHECK ((`max_score` > 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `part_scoring_rules`
--

LOCK TABLES `part_scoring_rules` WRITE;
/*!40000 ALTER TABLE `part_scoring_rules` DISABLE KEYS */;
INSERT INTO `part_scoring_rules` VALUES ('21000000-0000-4000-8000-000000000001','16000000-0000-4000-8000-000000000001',25.00,1.00,0.00,0,'2026-08-06 04:20:10','2026-08-06 04:20:10'),('21000000-0000-4000-8000-000000000002','16000000-0000-4000-8000-000000000002',25.00,1.00,0.00,0,'2026-08-06 04:20:10','2026-08-06 04:20:10'),('21000000-0000-4000-8000-000000000011','16000000-0000-4000-8000-000000000011',10.00,2.00,0.00,1,'2026-08-06 04:20:10','2026-08-06 04:20:10'),('21000000-0000-4000-8000-000000000012','16000000-0000-4000-8000-000000000012',5.00,1.00,0.00,1,'2026-08-06 04:20:10','2026-08-06 07:55:53'),('21000000-0000-4000-8000-000000000013','16000000-0000-4000-8000-000000000013',16.00,2.00,2.00,1,'2026-08-06 04:20:10','2026-08-06 04:20:10'),('21000000-0000-4000-8000-000000000014','16000000-0000-4000-8000-000000000014',14.00,2.00,0.00,1,'2026-08-06 04:20:10','2026-08-06 04:20:10'),('21000000-0000-4000-8000-000000000015','16000000-0000-4000-8000-000000000015',5.00,1.00,0.00,1,'2026-08-06 07:55:53','2026-08-06 07:55:53'),('21000000-0000-4000-8000-000000000021','16000000-0000-4000-8000-000000000021',26.00,2.00,0.00,1,'2026-08-06 04:20:10','2026-08-06 04:20:10'),('21000000-0000-4000-8000-000000000022','16000000-0000-4000-8000-000000000022',8.00,2.00,0.00,1,'2026-08-06 04:20:10','2026-08-06 04:20:10'),('21000000-0000-4000-8000-000000000023','16000000-0000-4000-8000-000000000023',8.00,2.00,0.00,1,'2026-08-06 04:20:10','2026-08-06 04:20:10'),('21000000-0000-4000-8000-000000000024','16000000-0000-4000-8000-000000000024',8.00,2.00,0.00,1,'2026-08-06 04:20:10','2026-08-06 04:20:10'),('21000000-0000-4000-8000-000000000031','16000000-0000-4000-8000-000000000031',5.00,NULL,0.00,1,'2026-08-06 04:20:10','2026-08-06 04:20:10'),('21000000-0000-4000-8000-000000000032','16000000-0000-4000-8000-000000000032',10.00,NULL,0.00,1,'2026-08-06 04:20:10','2026-08-06 04:20:10'),('21000000-0000-4000-8000-000000000033','16000000-0000-4000-8000-000000000033',15.00,NULL,0.00,1,'2026-08-06 04:20:10','2026-08-06 04:20:10'),('21000000-0000-4000-8000-000000000034','16000000-0000-4000-8000-000000000034',20.00,NULL,0.00,1,'2026-08-06 04:20:10','2026-08-06 04:20:10'),('21000000-0000-4000-8000-000000000041','16000000-0000-4000-8000-000000000041',5.00,1.00,0.00,1,'2026-08-06 04:20:10','2026-08-06 04:32:58'),('21000000-0000-4000-8000-000000000042','16000000-0000-4000-8000-000000000042',10.00,NULL,0.00,1,'2026-08-06 04:20:10','2026-08-06 04:20:10'),('21000000-0000-4000-8000-000000000043','16000000-0000-4000-8000-000000000043',15.00,5.00,0.00,1,'2026-08-06 04:20:10','2026-08-06 04:32:58'),('21000000-0000-4000-8000-000000000044','16000000-0000-4000-8000-000000000044',20.00,NULL,0.00,1,'2026-08-06 04:20:10','2026-08-06 04:20:10');
/*!40000 ALTER TABLE `part_scoring_rules` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `parts`
--

DROP TABLE IF EXISTS `parts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `parts` (
  `id` char(36) NOT NULL,
  `component_id` char(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `instructions` text,
  `display_order` int NOT NULL,
  `default_duration_seconds` int DEFAULT NULL,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_parts_component_code` (`component_id`,`code`),
  KEY `idx_parts_component_order` (`component_id`,`display_order`),
  CONSTRAINT `fk_parts_component` FOREIGN KEY (`component_id`) REFERENCES `components` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `parts`
--

LOCK TABLES `parts` WRITE;
/*!40000 ALTER TABLE `parts` DISABLE KEYS */;
INSERT INTO `parts` VALUES ('16000000-0000-4000-8000-000000000001','15000000-0000-4000-8000-000000000001','GRAMMAR','Grammar','Câu hỏi ngữ pháp','Chọn đáp án đúng.',1,750,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('16000000-0000-4000-8000-000000000002','15000000-0000-4000-8000-000000000001','VOCABULARY','Vocabulary','Câu hỏi từ vựng','Chọn từ phù hợp nhất.',2,750,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('16000000-0000-4000-8000-000000000011','15000000-0000-4000-8000-000000000002','PART_1','Reading Part 1','Điền từ vào đoạn văn ngắn','Chọn từ phù hợp cho mỗi khoảng trống.',1,300,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('16000000-0000-4000-8000-000000000012','15000000-0000-4000-8000-000000000002','PART_2','Reading Part 2','Sắp xếp câu thành đoạn','Sắp xếp các câu theo thứ tự đúng.',2,420,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('16000000-0000-4000-8000-000000000013','15000000-0000-4000-8000-000000000002','PART_4','Reading Part 4','Nối phát biểu với người nói','Nối mỗi phát biểu với người phù hợp.',4,480,1,'2026-07-31 17:51:10','2026-08-06 07:55:53'),('16000000-0000-4000-8000-000000000014','15000000-0000-4000-8000-000000000002','PART_5','Reading Part 5','Nối tiêu đề với đoạn văn','Nối mỗi đoạn với tiêu đề phù hợp.',5,600,1,'2026-07-31 17:51:10','2026-08-06 07:55:53'),('16000000-0000-4000-8000-000000000015','15000000-0000-4000-8000-000000000002','PART_3','Reading Part 3','Sắp xếp câu thành đoạn','Sắp xếp các câu theo thứ tự đúng.',3,420,1,'2026-08-06 07:55:53','2026-08-06 07:55:53'),('16000000-0000-4000-8000-000000000021','15000000-0000-4000-8000-000000000003','PART_1','Listening Part 1','Nghe đoạn hội thoại ngắn','Nghe và chọn đáp án đúng.',1,600,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('16000000-0000-4000-8000-000000000022','15000000-0000-4000-8000-000000000003','PART_2','Listening Part 2','Nối ý kiến với người nói','Nghe và nối mỗi ý kiến với người nói.',2,300,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('16000000-0000-4000-8000-000000000023','15000000-0000-4000-8000-000000000003','PART_3','Listening Part 3','Xác định quan điểm hai người','Nghe và xác định ai nêu ý kiến nào.',3,300,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('16000000-0000-4000-8000-000000000024','15000000-0000-4000-8000-000000000003','PART_4','Listening Part 4','Nghe độc thoại dài','Nghe và chọn đáp án đúng.',4,300,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('16000000-0000-4000-8000-000000000031','15000000-0000-4000-8000-000000000004','PART_1','Speaking Part 1','Trả lời câu hỏi cá nhân','Trả lời 3 câu hỏi, mỗi câu 30 giây.',1,150,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('16000000-0000-4000-8000-000000000032','15000000-0000-4000-8000-000000000004','PART_2','Speaking Part 2','Miêu tả tranh','Miêu tả tranh và trả lời câu hỏi liên quan.',2,180,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('16000000-0000-4000-8000-000000000033','15000000-0000-4000-8000-000000000004','PART_3','Speaking Part 3','So sánh hai tranh','So sánh hai tranh và nêu quan điểm.',3,180,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('16000000-0000-4000-8000-000000000034','15000000-0000-4000-8000-000000000004','PART_4','Speaking Part 4','Nói về chủ đề trừu tượng','Chuẩn bị 1 phút, nói 2 phút.',4,240,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('16000000-0000-4000-8000-000000000041','15000000-0000-4000-8000-000000000005','PART_1','Writing Part 1','Điền form ngắn','Trả lời 5 câu, mỗi câu 1-5 từ.',1,180,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('16000000-0000-4000-8000-000000000042','15000000-0000-4000-8000-000000000005','PART_2','Writing Part 2','Viết đoạn ngắn','Viết 20-30 từ.',2,420,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('16000000-0000-4000-8000-000000000043','15000000-0000-4000-8000-000000000005','PART_3','Writing Part 3','Trả lời trên diễn đàn','Trả lời 3 câu hỏi, mỗi câu 30-40 từ.',3,600,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('16000000-0000-4000-8000-000000000044','15000000-0000-4000-8000-000000000005','PART_4','Writing Part 4','Viết hai email','Viết email thân mật 50 từ và email trang trọng 120-150 từ.',4,1800,1,'2026-07-31 17:51:10','2026-07-31 17:51:10');
/*!40000 ALTER TABLE `parts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `password_reset_tokens`
--

DROP TABLE IF EXISTS `password_reset_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `password_reset_tokens` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `used_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_password_reset_hash` (`token_hash`),
  KEY `idx_password_reset_user` (`user_id`),
  CONSTRAINT `fk_password_reset_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `password_reset_tokens`
--

LOCK TABLES `password_reset_tokens` WRITE;
/*!40000 ALTER TABLE `password_reset_tokens` DISABLE KEYS */;
/*!40000 ALTER TABLE `password_reset_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_transactions`
--

DROP TABLE IF EXISTS `payment_transactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_transactions` (
  `id` char(36) NOT NULL,
  `order_id` char(36) NOT NULL,
  `provider` varchar(50) NOT NULL,
  `provider_transaction_id` varchar(255) DEFAULT NULL,
  `provider_order_id` varchar(255) DEFAULT NULL,
  `status` enum('INITIATED','PENDING','SUCCESS','FAILED','CANCELLED','EXPIRED','REFUNDED') NOT NULL DEFAULT 'INITIATED',
  `amount` bigint NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'VND',
  `idempotency_key` varchar(255) NOT NULL,
  `payment_url` text,
  `initiated_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  `failed_at` datetime DEFAULT NULL,
  `error_code` varchar(100) DEFAULT NULL,
  `error_message` varchar(1000) DEFAULT NULL,
  `raw_request_json` json DEFAULT NULL,
  `raw_response_json` json DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_payment_idempotency` (`idempotency_key`),
  KEY `idx_payment_order` (`order_id`,`status`),
  KEY `idx_payment_provider_transaction` (`provider`,`provider_transaction_id`),
  CONSTRAINT `fk_payment_transactions_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_transactions`
--

LOCK TABLES `payment_transactions` WRITE;
/*!40000 ALTER TABLE `payment_transactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_transactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `payment_webhook_events`
--

DROP TABLE IF EXISTS `payment_webhook_events`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `payment_webhook_events` (
  `id` char(36) NOT NULL,
  `provider` varchar(50) NOT NULL,
  `provider_event_id` varchar(255) DEFAULT NULL,
  `payload_checksum` varchar(128) DEFAULT NULL,
  `signature_valid` tinyint(1) NOT NULL DEFAULT '0',
  `event_type` varchar(100) DEFAULT NULL,
  `payload_json` json NOT NULL,
  `processing_status` enum('RECEIVED','PROCESSING','PROCESSED','FAILED','IGNORED') NOT NULL DEFAULT 'RECEIVED',
  `retry_count` int NOT NULL DEFAULT '0',
  `error_message` text,
  `received_at` datetime NOT NULL,
  `processed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_webhook_provider_event` (`provider`,`provider_event_id`),
  UNIQUE KEY `uk_webhook_provider_checksum` (`provider`,`payload_checksum`),
  KEY `idx_webhook_status` (`processing_status`,`received_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `payment_webhook_events`
--

LOCK TABLES `payment_webhook_events` WRITE;
/*!40000 ALTER TABLE `payment_webhook_events` DISABLE KEYS */;
/*!40000 ALTER TABLE `payment_webhook_events` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `permissions`
--

DROP TABLE IF EXISTS `permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `permissions` (
  `id` char(36) NOT NULL,
  `code` varchar(100) NOT NULL,
  `name` varchar(150) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_permissions_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `permissions`
--

LOCK TABLES `permissions` WRITE;
/*!40000 ALTER TABLE `permissions` DISABLE KEYS */;
INSERT INTO `permissions` VALUES ('11000000-0000-4000-8000-000000000001','question_set:read','Xem câu hỏi',NULL),('11000000-0000-4000-8000-000000000002','question_set:write','Tạo/sửa câu hỏi',NULL),('11000000-0000-4000-8000-000000000003','question_set:review','Duyệt câu hỏi',NULL),('11000000-0000-4000-8000-000000000004','question_set:publish','Xuất bản câu hỏi',NULL),('11000000-0000-4000-8000-000000000005','question_set:archive','Lưu trữ câu hỏi',NULL),('11000000-0000-4000-8000-000000000006','asset:write','Tải file lên',NULL),('11000000-0000-4000-8000-000000000007','user:read','Xem học viên',NULL),('11000000-0000-4000-8000-000000000008','user:write','Sửa học viên',NULL),('11000000-0000-4000-8000-000000000009','entitlement:grant','Tặng/thu hồi quyền',NULL),('11000000-0000-4000-8000-000000000010','order:read','Xem đơn hàng',NULL),('11000000-0000-4000-8000-000000000011','refund:write','Xử lý hoàn tiền',NULL),('11000000-0000-4000-8000-000000000012','plan:write','Quản lý gói dịch vụ',NULL),('11000000-0000-4000-8000-000000000013','evaluation:review','Chấm/sửa điểm bài thi',NULL),('11000000-0000-4000-8000-000000000014','report:read','Xem báo cáo',NULL),('11000000-0000-4000-8000-000000000015','blueprint:write','Quản lý đề thi thử',NULL),('11000000-0000-4000-8000-000000000016','audit:read','Xem nhật ký quản trị',NULL),('11000000-0000-4000-8000-000000000017','scoring:write','Cấu hình điểm','Xem và sửa thang điểm theo Part');
/*!40000 ALTER TABLE `permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `plan_features`
--

DROP TABLE IF EXISTS `plan_features`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `plan_features` (
  `id` char(36) NOT NULL,
  `plan_id` char(36) NOT NULL,
  `feature_code` varchar(100) NOT NULL,
  `feature_value` varchar(500) DEFAULT NULL,
  `display_name` varchar(255) DEFAULT NULL,
  `display_order` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_plan_features` (`plan_id`,`feature_code`),
  CONSTRAINT `fk_plan_features_plan` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `plan_features`
--

LOCK TABLES `plan_features` WRITE;
/*!40000 ALTER TABLE `plan_features` DISABLE KEYS */;
INSERT INTO `plan_features` VALUES ('6a58c53a-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000005','PREMIUM_CONTENT_ACCESS','true','Toàn bộ ngân hàng đề Premium',1),('6a58c81a-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000002','PREMIUM_CONTENT_ACCESS','true','Toàn bộ ngân hàng đề Premium',1),('6a58c899-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000004','PREMIUM_CONTENT_ACCESS','true','Toàn bộ ngân hàng đề Premium',1),('6a58c8e5-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000001','PREMIUM_CONTENT_ACCESS','true','Toàn bộ ngân hàng đề Premium',1),('6a58c923-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000003','PREMIUM_CONTENT_ACCESS','true','Toàn bộ ngân hàng đề Premium',1),('6a58c970-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000005','UNLIMITED_PRACTICE','true','Luyện tập không giới hạn',2),('6a58c9c3-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000002','UNLIMITED_PRACTICE','true','Luyện tập không giới hạn',2),('6a58ca09-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000004','UNLIMITED_PRACTICE','true','Luyện tập không giới hạn',2),('6a58ca57-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000001','UNLIMITED_PRACTICE','true','Luyện tập không giới hạn',2),('6a58ca94-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000003','UNLIMITED_PRACTICE','true','Luyện tập không giới hạn',2),('6a58cad4-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000005','FULL_MOCK_TEST','true','Thi thử đầy đủ 4 kỹ năng',3),('6a58cb1f-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000002','FULL_MOCK_TEST','true','Thi thử đầy đủ 4 kỹ năng',3),('6a58cb5a-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000004','FULL_MOCK_TEST','true','Thi thử đầy đủ 4 kỹ năng',3),('6a58cb96-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000001','FULL_MOCK_TEST','true','Thi thử đầy đủ 4 kỹ năng',3),('6a58cbcc-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000003','FULL_MOCK_TEST','true','Thi thử đầy đủ 4 kỹ năng',3),('6a58cc35-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000005','AI_WRITING_FEEDBACK','unlimited','Chấm Writing bằng AI',4),('6a58cc82-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000002','AI_WRITING_FEEDBACK','unlimited','Chấm Writing bằng AI',4),('6a58ccc4-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000004','AI_WRITING_FEEDBACK','unlimited','Chấm Writing bằng AI',4),('6a58cd01-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000001','AI_WRITING_FEEDBACK','unlimited','Chấm Writing bằng AI',4),('6a58cd3b-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000003','AI_WRITING_FEEDBACK','unlimited','Chấm Writing bằng AI',4),('6a58cd7c-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000005','AI_SPEAKING_FEEDBACK','unlimited','Chấm Speaking bằng AI',5),('6a58cdbc-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000002','AI_SPEAKING_FEEDBACK','unlimited','Chấm Speaking bằng AI',5),('6a58cdff-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000004','AI_SPEAKING_FEEDBACK','unlimited','Chấm Speaking bằng AI',5),('6a58ce3e-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000001','AI_SPEAKING_FEEDBACK','unlimited','Chấm Speaking bằng AI',5),('6a58ce76-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000003','AI_SPEAKING_FEEDBACK','unlimited','Chấm Speaking bằng AI',5),('6a58ceb6-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000005','DETAILED_ANALYTICS','true','Phân tích chi tiết theo Part',6),('6a58cefa-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000002','DETAILED_ANALYTICS','true','Phân tích chi tiết theo Part',6),('6a58cf33-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000004','DETAILED_ANALYTICS','true','Phân tích chi tiết theo Part',6),('6a58cf73-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000001','DETAILED_ANALYTICS','true','Phân tích chi tiết theo Part',6),('6a58cfb0-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000003','DETAILED_ANALYTICS','true','Phân tích chi tiết theo Part',6),('6a58d01d-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000005','DOWNLOAD_REPORT','true','Tải báo cáo học tập',7),('6a58d06d-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000002','DOWNLOAD_REPORT','true','Tải báo cáo học tập',7),('6a58d0a9-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000004','DOWNLOAD_REPORT','true','Tải báo cáo học tập',7),('6a58d0ea-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000001','DOWNLOAD_REPORT','true','Tải báo cáo học tập',7),('6a58d129-8d08-11f1-9d49-0a4216a93dfa','18000000-0000-4000-8000-000000000003','DOWNLOAD_REPORT','true','Tải báo cáo học tập',7);
/*!40000 ALTER TABLE `plan_features` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promotion_codes`
--

DROP TABLE IF EXISTS `promotion_codes`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotion_codes` (
  `id` char(36) NOT NULL,
  `code` varchar(100) NOT NULL,
  `discount_type` enum('FIXED_AMOUNT','PERCENTAGE') NOT NULL,
  `discount_value` bigint NOT NULL,
  `max_discount_amount` bigint DEFAULT NULL,
  `min_order_amount` bigint DEFAULT NULL,
  `max_total_uses` int DEFAULT NULL,
  `max_uses_per_user` int DEFAULT NULL,
  `total_used_count` int NOT NULL DEFAULT '0',
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `status` enum('DRAFT','ACTIVE','INACTIVE','ENDED') NOT NULL DEFAULT 'DRAFT',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_promotion_codes_code` (`code`),
  KEY `idx_promotion_codes_status` (`status`,`starts_at`,`ends_at`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotion_codes`
--

LOCK TABLES `promotion_codes` WRITE;
/*!40000 ALTER TABLE `promotion_codes` DISABLE KEYS */;
/*!40000 ALTER TABLE `promotion_codes` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `promotion_redemptions`
--

DROP TABLE IF EXISTS `promotion_redemptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `promotion_redemptions` (
  `id` char(36) NOT NULL,
  `promotion_code_id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `order_id` char(36) NOT NULL,
  `discount_amount` bigint NOT NULL,
  `redeemed_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_redemptions_order_code` (`order_id`,`promotion_code_id`),
  KEY `idx_redemptions_user` (`promotion_code_id`,`user_id`),
  KEY `fk_redemptions_user` (`user_id`),
  CONSTRAINT `fk_redemptions_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_redemptions_promotion` FOREIGN KEY (`promotion_code_id`) REFERENCES `promotion_codes` (`id`),
  CONSTRAINT `fk_redemptions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `promotion_redemptions`
--

LOCK TABLES `promotion_redemptions` WRITE;
/*!40000 ALTER TABLE `promotion_redemptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `promotion_redemptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `question_set_assets`
--

DROP TABLE IF EXISTS `question_set_assets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `question_set_assets` (
  `question_set_id` char(36) NOT NULL,
  `asset_id` char(36) NOT NULL,
  `role` varchar(50) NOT NULL,
  `display_order` int NOT NULL DEFAULT '1',
  PRIMARY KEY (`question_set_id`,`asset_id`,`role`),
  KEY `idx_question_set_assets_asset` (`asset_id`),
  CONSTRAINT `fk_question_set_assets_asset` FOREIGN KEY (`asset_id`) REFERENCES `assets` (`id`),
  CONSTRAINT `fk_question_set_assets_question` FOREIGN KEY (`question_set_id`) REFERENCES `question_sets` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `question_set_assets`
--

LOCK TABLES `question_set_assets` WRITE;
/*!40000 ALTER TABLE `question_set_assets` DISABLE KEYS */;
/*!40000 ALTER TABLE `question_set_assets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `question_set_tags`
--

DROP TABLE IF EXISTS `question_set_tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `question_set_tags` (
  `question_set_id` char(36) NOT NULL,
  `tag_id` char(36) NOT NULL,
  PRIMARY KEY (`question_set_id`,`tag_id`),
  KEY `idx_question_set_tags_tag` (`tag_id`),
  CONSTRAINT `fk_question_set_tags_question` FOREIGN KEY (`question_set_id`) REFERENCES `question_sets` (`id`),
  CONSTRAINT `fk_question_set_tags_tag` FOREIGN KEY (`tag_id`) REFERENCES `tags` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `question_set_tags`
--

LOCK TABLES `question_set_tags` WRITE;
/*!40000 ALTER TABLE `question_set_tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `question_set_tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `question_sets`
--

DROP TABLE IF EXISTS `question_sets`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `question_sets` (
  `id` char(36) NOT NULL,
  `part_id` char(36) NOT NULL,
  `task_type_id` char(36) NOT NULL,
  `topic_id` char(36) DEFAULT NULL,
  `code` varchar(100) NOT NULL,
  `title` varchar(255) DEFAULT NULL,
  `difficulty` tinyint DEFAULT NULL,
  `hotness` tinyint DEFAULT NULL,
  `cefr_min` enum('A1','A2','B1','B2','C1','C2') DEFAULT NULL,
  `cefr_max` enum('A1','A2','B1','B2','C1','C2') DEFAULT NULL,
  `access_level` enum('FREE','PREMIUM') NOT NULL DEFAULT 'PREMIUM',
  `status` enum('DRAFT','IN_REVIEW','PUBLISHED','SUSPENDED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `current_revision` int NOT NULL DEFAULT '1',
  `content_checksum` varchar(128) DEFAULT NULL,
  `item_count` int NOT NULL DEFAULT '0',
  `estimated_seconds` int DEFAULT NULL,
  `max_score` decimal(8,2) NOT NULL DEFAULT '1.00',
  `published_at` datetime DEFAULT NULL,
  `created_by` char(36) DEFAULT NULL,
  `updated_by` char(36) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_question_sets_code` (`code`),
  KEY `idx_question_sets_filter` (`part_id`,`status`,`access_level`,`difficulty`),
  KEY `idx_question_sets_topic` (`topic_id`),
  KEY `idx_question_sets_task_type` (`task_type_id`),
  KEY `idx_question_sets_hotness` (`part_id`,`status`,`hotness`),
  CONSTRAINT `fk_question_sets_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`),
  CONSTRAINT `fk_question_sets_task_type` FOREIGN KEY (`task_type_id`) REFERENCES `task_types` (`id`),
  CONSTRAINT `fk_question_sets_topic` FOREIGN KEY (`topic_id`) REFERENCES `topics` (`id`),
  CONSTRAINT `chk_question_sets_hotness` CHECK (((`hotness` is null) or (`hotness` between 1 and 5)))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `question_sets`
--

LOCK TABLES `question_sets` WRITE;
/*!40000 ALTER TABLE `question_sets` DISABLE KEYS */;
INSERT INTO `question_sets` VALUES ('0d21ff9c-db65-474c-b6d6-af75455850f6','16000000-0000-4000-8000-000000000011','12000000-0000-4000-8000-000000000003','1d0d6a8a-91fb-4938-a1fe-afa869b44753','READING_PART_1_005','005',NULL,3,NULL,NULL,'PREMIUM','PUBLISHED',2,'c2bb08864157f92e9928a10e0f268ed37dec89f1f57aa356edca25d0a8595d9d',5,NULL,10.00,'2026-08-06 07:17:21','99e4374d-8ede-42ca-a60d-219155f5e7b9','99e4374d-8ede-42ca-a60d-219155f5e7b9','2026-08-06 07:12:55','2026-08-06 07:17:21'),('13ed933c-e71f-4098-816c-72845efa9cb3','16000000-0000-4000-8000-000000000011','12000000-0000-4000-8000-000000000003','fd40eef0-f4e9-4134-af1a-aa6eaeac446f','READING_PART_1_006','006',NULL,3,NULL,NULL,'PREMIUM','PUBLISHED',2,'b46f75832055861d7497b5f0bcbf6e5ca0a61e3f4a2112dfb709e9f8d7155556',5,NULL,10.00,'2026-08-06 07:17:22','99e4374d-8ede-42ca-a60d-219155f5e7b9','99e4374d-8ede-42ca-a60d-219155f5e7b9','2026-08-06 07:12:55','2026-08-06 07:17:22'),('24d5f0ca-5f9a-4bd4-9d50-7edfd7091855','16000000-0000-4000-8000-000000000011','12000000-0000-4000-8000-000000000003','aa1431e4-3652-422a-a49f-b7cf5e531f67','READING_PART_1_003','003',NULL,3,NULL,NULL,'PREMIUM','PUBLISHED',2,'f173242d79a47faabfef20c337748a876d19b556730cdc114240d91dc7d137f4',5,NULL,10.00,'2026-08-06 07:17:20','99e4374d-8ede-42ca-a60d-219155f5e7b9','99e4374d-8ede-42ca-a60d-219155f5e7b9','2026-08-06 07:12:54','2026-08-06 07:17:20'),('72d88237-00fb-41d7-89a7-700ec8caaf2e','16000000-0000-4000-8000-000000000011','12000000-0000-4000-8000-000000000003','f7309693-9822-4a54-8adf-227ff95b47bf','READING_PART_1_002','002',NULL,3,NULL,NULL,'PREMIUM','PUBLISHED',2,'0813c98f2ac7794f2738fb85a57596f0db318e929f5b65e05b2e35105b9ed5d2',5,NULL,10.00,'2026-08-06 07:17:19','99e4374d-8ede-42ca-a60d-219155f5e7b9','99e4374d-8ede-42ca-a60d-219155f5e7b9','2026-08-06 07:12:54','2026-08-06 07:17:19'),('7819a413-4616-4f54-9adc-dc16d67af7eb','16000000-0000-4000-8000-000000000011','12000000-0000-4000-8000-000000000003','d18e0208-0b56-4b84-8929-4bbf586deb58','READING_PART_1_011','011',NULL,3,NULL,NULL,'PREMIUM','PUBLISHED',2,'8073f33949f63fafce2b02a66f668afdda39a78a5bd0df3c5a0f7f397e70bfe2',5,NULL,10.00,'2026-08-06 07:17:26','99e4374d-8ede-42ca-a60d-219155f5e7b9','99e4374d-8ede-42ca-a60d-219155f5e7b9','2026-08-06 07:12:56','2026-08-06 07:17:26'),('a5953d8e-2230-4508-96ba-754b91177d3a','16000000-0000-4000-8000-000000000011','12000000-0000-4000-8000-000000000003','b4635466-343a-47fc-9231-1049778208fd','READING_PART_1_009','009',NULL,3,NULL,NULL,'PREMIUM','PUBLISHED',2,'b79c722dbc3cc1a48274df8b3a11c33f3de9dc839ac19385b9eccd430f6e9c7c',5,NULL,10.00,'2026-08-06 07:17:24','99e4374d-8ede-42ca-a60d-219155f5e7b9','99e4374d-8ede-42ca-a60d-219155f5e7b9','2026-08-06 07:12:56','2026-08-06 07:17:24'),('a801829f-c04c-484c-8ca9-7fdfa68295b6','16000000-0000-4000-8000-000000000011','12000000-0000-4000-8000-000000000003','2b0a38f3-af35-4e5c-9d3c-26d6dc06b151','READING_PART_1_008','008',NULL,3,NULL,NULL,'PREMIUM','PUBLISHED',2,'3f2b8984adba9d1cfcc8c476d776e26fb47eee299d57636a5e91469d6ed21f8e',5,NULL,10.00,'2026-08-06 07:17:23','99e4374d-8ede-42ca-a60d-219155f5e7b9','99e4374d-8ede-42ca-a60d-219155f5e7b9','2026-08-06 07:12:55','2026-08-06 07:17:23'),('b9e00ead-1ad2-4c17-a993-67c6db96ce46','16000000-0000-4000-8000-000000000011','12000000-0000-4000-8000-000000000003','3c03d46a-ec86-4ca9-932c-7dc0e24b735b','READING_PART_1_H5VKW6','001',NULL,3,NULL,NULL,'FREE','PUBLISHED',1,'a31a7e136dee0e9f2d9de0dc3708410ee5e87fe27d2bae46b1532efaa3bde2a4',5,NULL,10.00,'2026-08-06 07:03:18','99e4374d-8ede-42ca-a60d-219155f5e7b9','99e4374d-8ede-42ca-a60d-219155f5e7b9','2026-08-06 07:00:44','2026-08-06 07:03:18'),('bc8857da-98d2-44be-b3ff-ea6e67472d8c','16000000-0000-4000-8000-000000000011','12000000-0000-4000-8000-000000000003','ad704c43-33c6-4842-b13b-197c8cf55a00','READING_PART_1_013','013',NULL,3,NULL,NULL,'PREMIUM','PUBLISHED',1,'76915dcb684ffa3e85695101c959deb37ee9d3a2821a565deda6863872863af4',5,NULL,10.00,'2026-08-06 07:16:51','99e4374d-8ede-42ca-a60d-219155f5e7b9','99e4374d-8ede-42ca-a60d-219155f5e7b9','2026-08-06 07:16:51','2026-08-06 07:16:51'),('d8e9db97-ae3d-429e-b871-aba4c2ad6d8c','16000000-0000-4000-8000-000000000011','12000000-0000-4000-8000-000000000003','147513cb-367b-407a-9164-7423069efd80','READING_PART_1_007','007',NULL,3,NULL,NULL,'PREMIUM','PUBLISHED',2,'e3a39b2c7eaa32a2529a99870ff6588aadbcbe2446139abd5b09b914c8a4da21',5,NULL,10.00,'2026-08-06 07:17:23','99e4374d-8ede-42ca-a60d-219155f5e7b9','99e4374d-8ede-42ca-a60d-219155f5e7b9','2026-08-06 07:12:55','2026-08-06 07:17:23'),('ec3830ca-7d33-475b-977d-2925f223a3dd','16000000-0000-4000-8000-000000000011','12000000-0000-4000-8000-000000000003','3565e433-5448-411c-883f-cd5ca038fee0','READING_PART_1_004','004',NULL,3,NULL,NULL,'PREMIUM','PUBLISHED',2,'7819a52a7d2aec5f08dfd5e751ff8f9f0f81d2ff2fae16f49c6500c7eb49f941',5,NULL,10.00,'2026-08-06 07:17:21','99e4374d-8ede-42ca-a60d-219155f5e7b9','99e4374d-8ede-42ca-a60d-219155f5e7b9','2026-08-06 07:12:54','2026-08-06 07:17:21'),('ec494119-b3e6-4598-8e8d-40d2db835ebe','16000000-0000-4000-8000-000000000011','12000000-0000-4000-8000-000000000003','9a5c030f-0acd-46ba-ba8d-e800dfea78c3','READING_PART_1_010','010',NULL,3,NULL,NULL,'PREMIUM','PUBLISHED',2,'4d64779122542fef5356273dbc766ab99e8d98e04d5afaa4f68c4957b335bd35',5,NULL,10.00,'2026-08-06 07:17:25','99e4374d-8ede-42ca-a60d-219155f5e7b9','99e4374d-8ede-42ca-a60d-219155f5e7b9','2026-08-06 07:12:56','2026-08-06 07:17:25'),('f3f879a6-2755-4ef5-8aab-566ff97f6c96','16000000-0000-4000-8000-000000000011','12000000-0000-4000-8000-000000000003','b735e796-31b4-4ef5-b183-24b0e254e4a0','READING_PART_1_012','012',NULL,3,NULL,NULL,'PREMIUM','PUBLISHED',1,'2ea573a7d397eae3ceec604a4b218510060502f2eee8e5338ad3f9f8b757cf2c',5,NULL,10.00,'2026-08-06 07:16:51','99e4374d-8ede-42ca-a60d-219155f5e7b9','99e4374d-8ede-42ca-a60d-219155f5e7b9','2026-08-06 07:16:51','2026-08-06 07:16:51');
/*!40000 ALTER TABLE `question_sets` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refresh_tokens`
--

DROP TABLE IF EXISTS `refresh_tokens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refresh_tokens` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `token_hash` varchar(255) NOT NULL,
  `device_id` varchar(255) DEFAULT NULL,
  `user_agent` varchar(1000) DEFAULT NULL,
  `ip_address` varchar(64) DEFAULT NULL,
  `expires_at` datetime NOT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `replaced_by_token_id` char(36) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_refresh_tokens_hash` (`token_hash`),
  KEY `idx_refresh_tokens_user` (`user_id`),
  KEY `idx_refresh_tokens_expires` (`expires_at`),
  CONSTRAINT `fk_refresh_tokens_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refresh_tokens`
--

LOCK TABLES `refresh_tokens` WRITE;
/*!40000 ALTER TABLE `refresh_tokens` DISABLE KEYS */;
INSERT INTO `refresh_tokens` VALUES ('166b9024-b807-4eb0-bd0f-f12e36b238da','99e4374d-8ede-42ca-a60d-219155f5e7b9','fe05f2d6fcf17c50b67f985186d2c20037ccad9ee479bfcea33518f5c153323d',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 04:31:40','2026-08-06 06:55:06','d65dd25b-d141-494e-9697-63cf7e3cf01f','2026-08-06 04:31:40'),('18b58ebf-7529-46d5-a91c-f04444b951aa','99e4374d-8ede-42ca-a60d-219155f5e7b9','87c54f3892e280e7f68fadb6e66e724f34e83a77985edcfc2fd244142d8fcd93',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 07:14:15','2026-08-06 07:18:14','e75aeb85-5092-48ab-967e-948b37eb760b','2026-08-06 07:14:15'),('25a482e1-f952-4b73-9ae9-4611f533447b','99e4374d-8ede-42ca-a60d-219155f5e7b9','7ffebe0ee8f080f009b66e402a44f0aec2560df3e343887f009b58b4bb443205',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 07:18:43','2026-08-06 07:39:00','6bdd9f8b-384b-4c7e-a19a-914686ee5443','2026-08-06 07:18:43'),('4d7a670b-3e21-4453-9b7c-d880a727a6ee','99e4374d-8ede-42ca-a60d-219155f5e7b9','b2ea70a628427ecf6ed5b431a8e3c7fb7d0b3fea9dade18c2f1dc45214dc0709',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 08:41:00','2026-08-06 08:55:15','d0540db0-e4df-44a5-a638-3f122e9c8e8e','2026-08-06 08:41:00'),('5866a30c-1449-4082-b10d-84128e6f84a3','99e4374d-8ede-42ca-a60d-219155f5e7b9','680e389d7ebdff0cb28ebbf709c8c65ed4bd13bad0b12067f3f8dccde09b6608',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 09:36:56',NULL,NULL,'2026-08-06 09:36:56'),('5f6f6041-51dd-4dd3-9ef4-e6cc8da189e2','99e4374d-8ede-42ca-a60d-219155f5e7b9','85e92f9218de7d90b6934ee4fd9484210d14701e805310d02ea4da3ba8f59b59',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 08:56:14','2026-08-06 09:36:56','5866a30c-1449-4082-b10d-84128e6f84a3','2026-08-06 08:56:14'),('65789040-0964-4594-909a-188702ef84d7','99e4374d-8ede-42ca-a60d-219155f5e7b9','8f12a32e00c14d63502d24026591e675915285e4206f5d7dadad83f64ccb11b6',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 08:40:58','2026-08-06 08:41:00','4d7a670b-3e21-4453-9b7c-d880a727a6ee','2026-08-06 08:40:58'),('6bdd9f8b-384b-4c7e-a19a-914686ee5443','99e4374d-8ede-42ca-a60d-219155f5e7b9','953d3966590459fc96c275088b710338395b7d2c62a1735edb42bd80a416218c',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 07:39:00','2026-08-06 07:39:03','de6d0f82-6ca4-4881-b62a-36c77028da78','2026-08-06 07:39:00'),('6e5ae10d-0c7e-4a49-974d-7b4f5d9fa824','99e4374d-8ede-42ca-a60d-219155f5e7b9','0d3468466cac9be867088c9089d2b45fddcd6b5b673c15cbeab1e9fa9b116cb7',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 02:57:44','2026-08-06 03:04:08','b96ff2bc-b8fe-4906-9af5-48f6e43acbf0','2026-08-06 02:57:44'),('70931fd2-c8db-45e3-88e2-bdfb1fbc8d70','99e4374d-8ede-42ca-a60d-219155f5e7b9','aeb689ba677e5e6ab5a04dcd85275e58b61bfa5abe6ec8882866b1e4cf124567',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 02:42:14','2026-08-06 02:57:44','6e5ae10d-0c7e-4a49-974d-7b4f5d9fa824','2026-08-06 02:42:14'),('848583e0-4c2c-4fb5-9b1c-85e4d86a7011','99e4374d-8ede-42ca-a60d-219155f5e7b9','56aa4cda8ea91d98bb4e198ca9046813c53358712b929f4236afaee1e3fd25c2',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 02:41:48','2026-08-06 02:42:14','70931fd2-c8db-45e3-88e2-bdfb1fbc8d70','2026-08-06 02:41:48'),('8a1a9fe0-3e36-4828-a3ec-a341e1c2d003','99e4374d-8ede-42ca-a60d-219155f5e7b9','2a00ba59b22c2e897f7c5ad20e450a2cfc1a2a45b98dc3add6818dd15794eb12',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 08:40:04','2026-08-06 08:40:58','65789040-0964-4594-909a-188702ef84d7','2026-08-06 08:40:04'),('9ae74dc8-75f9-4611-9aab-bf6cdf87b34c','99e4374d-8ede-42ca-a60d-219155f5e7b9','387a724f9700e566557ed6b3e31103cd79409a7551909aa48bb211a950e25058',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 03:42:53','2026-08-06 04:31:40','166b9024-b807-4eb0-bd0f-f12e36b238da','2026-08-06 03:42:53'),('a3146b31-20e1-4ab1-84b8-86dcb7f0d215','99e4374d-8ede-42ca-a60d-219155f5e7b9','03e32a003ab8664f1328953a8ec80caaed52b015495a38da74cb9366d59f9080',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 03:21:04','2026-08-06 03:42:53','9ae74dc8-75f9-4611-9aab-bf6cdf87b34c','2026-08-06 03:21:04'),('b96ff2bc-b8fe-4906-9af5-48f6e43acbf0','99e4374d-8ede-42ca-a60d-219155f5e7b9','c39ecc5bb783556c1ffd6975305119401f0d66eb92f70038d8c2f9314ac0438f',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 03:04:08','2026-08-06 03:21:04','a3146b31-20e1-4ab1-84b8-86dcb7f0d215','2026-08-06 03:04:08'),('c23d3f59-9da1-42f4-978c-54f0c18895f3','99e4374d-8ede-42ca-a60d-219155f5e7b9','8e9fda65b11e634ca9dde117fc59f063b0a6a63e8c49b7368f526c7374e9620e',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 08:21:55','2026-08-06 08:40:04','8a1a9fe0-3e36-4828-a3ec-a341e1c2d003','2026-08-06 08:21:55'),('cb629818-8705-4dbc-942b-ed04e5f40f4a','99e4374d-8ede-42ca-a60d-219155f5e7b9','63015f03265e05806b365565e29e39ef29423aa7db53f257d1fee72c1bac34eb',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 07:57:22','2026-08-06 08:21:55','c23d3f59-9da1-42f4-978c-54f0c18895f3','2026-08-06 07:57:22'),('d0540db0-e4df-44a5-a638-3f122e9c8e8e','99e4374d-8ede-42ca-a60d-219155f5e7b9','d015c47c9fa10d91f7b0cae0cb32ac4ea712b667910fc4eeb0a1a373dbdd0f54',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 08:55:15','2026-08-06 08:56:14','5f6f6041-51dd-4dd3-9ef4-e6cc8da189e2','2026-08-06 08:55:15'),('d65dd25b-d141-494e-9697-63cf7e3cf01f','99e4374d-8ede-42ca-a60d-219155f5e7b9','922e6d019483ca83197a026d664c348a1bb7a894175b57bff3122e89d9c0945d',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 06:55:06','2026-08-06 07:14:15','18b58ebf-7529-46d5-a91c-f04444b951aa','2026-08-06 06:55:06'),('de6d0f82-6ca4-4881-b62a-36c77028da78','99e4374d-8ede-42ca-a60d-219155f5e7b9','54949798edce41e3fcab2f39b35340e700b72608fbd78fe823e4ba3853485cac',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 07:39:03','2026-08-06 07:57:22','cb629818-8705-4dbc-942b-ed04e5f40f4a','2026-08-06 07:39:03'),('e75aeb85-5092-48ab-967e-948b37eb760b','99e4374d-8ede-42ca-a60d-219155f5e7b9','1565656fa4e901dd1a58e8b337ce9af9ae150eb14db9789e0275eeb564ab3575',NULL,'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/149.0.0.0 Safari/537.36','172.23.0.1','2026-09-05 07:18:14','2026-08-06 07:18:43','25a482e1-f952-4b73-9ae9-4611f533447b','2026-08-06 07:18:14');
/*!40000 ALTER TABLE `refresh_tokens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `refunds`
--

DROP TABLE IF EXISTS `refunds`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `refunds` (
  `id` char(36) NOT NULL,
  `order_id` char(36) NOT NULL,
  `payment_transaction_id` char(36) NOT NULL,
  `amount` bigint NOT NULL,
  `reason` varchar(1000) DEFAULT NULL,
  `status` enum('REQUESTED','PROCESSING','SUCCESS','FAILED','REJECTED') NOT NULL DEFAULT 'REQUESTED',
  `provider_refund_id` varchar(255) DEFAULT NULL,
  `requested_by` char(36) DEFAULT NULL,
  `requested_at` datetime NOT NULL,
  `completed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_refunds_order` (`order_id`,`status`),
  KEY `idx_refunds_payment` (`payment_transaction_id`),
  KEY `fk_refunds_requested_by` (`requested_by`),
  KEY `idx_refunds_status_requested` (`status`,`requested_at`),
  CONSTRAINT `fk_refunds_order` FOREIGN KEY (`order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_refunds_payment` FOREIGN KEY (`payment_transaction_id`) REFERENCES `payment_transactions` (`id`),
  CONSTRAINT `fk_refunds_requested_by` FOREIGN KEY (`requested_by`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `refunds`
--

LOCK TABLES `refunds` WRITE;
/*!40000 ALTER TABLE `refunds` DISABLE KEYS */;
/*!40000 ALTER TABLE `refunds` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `role_permissions`
--

DROP TABLE IF EXISTS `role_permissions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `role_permissions` (
  `role_id` char(36) NOT NULL,
  `permission_id` char(36) NOT NULL,
  PRIMARY KEY (`role_id`,`permission_id`),
  KEY `idx_role_permissions_permission` (`permission_id`),
  CONSTRAINT `fk_role_permissions_permission` FOREIGN KEY (`permission_id`) REFERENCES `permissions` (`id`),
  CONSTRAINT `fk_role_permissions_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `role_permissions`
--

LOCK TABLES `role_permissions` WRITE;
/*!40000 ALTER TABLE `role_permissions` DISABLE KEYS */;
INSERT INTO `role_permissions` VALUES ('10000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000004','11000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000001'),('10000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000002'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000002'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000002'),('10000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000003'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000003'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000003'),('10000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000004'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000004'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000004'),('10000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000005'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000005'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000005'),('10000000-0000-4000-8000-000000000002','11000000-0000-4000-8000-000000000006'),('10000000-0000-4000-8000-000000000003','11000000-0000-4000-8000-000000000006'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000006'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000006'),('10000000-0000-4000-8000-000000000004','11000000-0000-4000-8000-000000000007'),('10000000-0000-4000-8000-000000000005','11000000-0000-4000-8000-000000000007'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000007'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000007'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000008'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000008'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000009'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000009'),('10000000-0000-4000-8000-000000000005','11000000-0000-4000-8000-000000000010'),('10000000-0000-4000-8000-000000000006','11000000-0000-4000-8000-000000000010'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000010'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000010'),('10000000-0000-4000-8000-000000000006','11000000-0000-4000-8000-000000000011'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000011'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000011'),('10000000-0000-4000-8000-000000000006','11000000-0000-4000-8000-000000000012'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000012'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000012'),('10000000-0000-4000-8000-000000000004','11000000-0000-4000-8000-000000000013'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000013'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000013'),('10000000-0000-4000-8000-000000000004','11000000-0000-4000-8000-000000000014'),('10000000-0000-4000-8000-000000000006','11000000-0000-4000-8000-000000000014'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000014'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000014'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000015'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000015'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000016'),('10000000-0000-4000-8000-000000000007','11000000-0000-4000-8000-000000000017'),('10000000-0000-4000-8000-000000000008','11000000-0000-4000-8000-000000000017');
/*!40000 ALTER TABLE `role_permissions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `roles`
--

DROP TABLE IF EXISTS `roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `roles` (
  `id` char(36) NOT NULL,
  `code` varchar(50) NOT NULL,
  `name` varchar(100) NOT NULL,
  `description` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_roles_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `roles`
--

LOCK TABLES `roles` WRITE;
/*!40000 ALTER TABLE `roles` DISABLE KEYS */;
INSERT INTO `roles` VALUES ('10000000-0000-4000-8000-000000000001','STUDENT','Học viên','Người dùng cuối, luyện thi','2026-07-31 17:51:10','2026-07-31 17:51:10'),('10000000-0000-4000-8000-000000000002','CONTENT_EDITOR','Biên tập nội dung','Tạo và sửa câu hỏi','2026-07-31 17:51:10','2026-07-31 17:51:10'),('10000000-0000-4000-8000-000000000003','CONTENT_REVIEWER','Duyệt nội dung','Duyệt và xuất bản câu hỏi','2026-07-31 17:51:10','2026-07-31 17:51:10'),('10000000-0000-4000-8000-000000000004','TEACHER','Giáo viên','Chấm Speaking/Writing, xem bài học viên','2026-07-31 17:51:10','2026-07-31 17:51:10'),('10000000-0000-4000-8000-000000000005','SUPPORT','Hỗ trợ','Hỗ trợ học viên, xem đơn hàng','2026-07-31 17:51:10','2026-07-31 17:51:10'),('10000000-0000-4000-8000-000000000006','FINANCE','Kế toán','Xem doanh thu, xử lý hoàn tiền','2026-07-31 17:51:10','2026-07-31 17:51:10'),('10000000-0000-4000-8000-000000000007','ADMIN','Quản trị','Quản trị hệ thống','2026-07-31 17:51:10','2026-07-31 17:51:10'),('10000000-0000-4000-8000-000000000008','SUPER_ADMIN','Quản trị cấp cao','Toàn quyền','2026-07-31 17:51:10','2026-07-31 17:51:10');
/*!40000 ALTER TABLE `roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscription_plans`
--

DROP TABLE IF EXISTS `subscription_plans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscription_plans` (
  `id` char(36) NOT NULL,
  `code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `billing_type` enum('ONE_TIME','RECURRING') NOT NULL DEFAULT 'ONE_TIME',
  `duration_days` int DEFAULT NULL,
  `price_amount` bigint NOT NULL,
  `currency` varchar(10) NOT NULL DEFAULT 'VND',
  `status` enum('DRAFT','ACTIVE','INACTIVE','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `display_order` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_subscription_plans_code` (`code`),
  KEY `idx_subscription_plans_status` (`status`,`display_order`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscription_plans`
--

LOCK TABLES `subscription_plans` WRITE;
/*!40000 ALTER TABLE `subscription_plans` DISABLE KEYS */;
INSERT INTO `subscription_plans` VALUES ('18000000-0000-4000-8000-000000000001','PREMIUM_30','Premium 30 ngày','Truy cập toàn bộ nội dung Premium trong 30 ngày','ONE_TIME',30,199000,'VND','ACTIVE',1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('18000000-0000-4000-8000-000000000002','PREMIUM_90','Premium 90 ngày','Truy cập toàn bộ nội dung Premium trong 90 ngày','ONE_TIME',90,499000,'VND','ACTIVE',2,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('18000000-0000-4000-8000-000000000003','PREMIUM_180','Premium 180 ngày','Truy cập toàn bộ nội dung Premium trong 180 ngày','ONE_TIME',180,849000,'VND','ACTIVE',3,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('18000000-0000-4000-8000-000000000004','PREMIUM_365','Premium 365 ngày','Truy cập toàn bộ nội dung Premium trong 1 năm','ONE_TIME',365,1390000,'VND','ACTIVE',4,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('18000000-0000-4000-8000-000000000005','PREMIUM_LIFE','Premium trọn đời','Truy cập vĩnh viễn','ONE_TIME',NULL,2990000,'VND','ACTIVE',5,'2026-07-31 17:51:10','2026-07-31 17:51:10');
/*!40000 ALTER TABLE `subscription_plans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `tags`
--

DROP TABLE IF EXISTS `tags`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `tags` (
  `id` char(36) NOT NULL,
  `code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_tags_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `tags`
--

LOCK TABLES `tags` WRITE;
/*!40000 ALTER TABLE `tags` DISABLE KEYS */;
/*!40000 ALTER TABLE `tags` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `task_types`
--

DROP TABLE IF EXISTS `task_types`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `task_types` (
  `id` char(36) NOT NULL,
  `code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `renderer_key` varchar(100) NOT NULL,
  `validator_key` varchar(100) DEFAULT NULL,
  `response_type` varchar(50) NOT NULL,
  `schema_version` int NOT NULL DEFAULT '1',
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_task_types_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `task_types`
--

LOCK TABLES `task_types` WRITE;
/*!40000 ALTER TABLE `task_types` DISABLE KEYS */;
INSERT INTO `task_types` VALUES ('12000000-0000-4000-8000-000000000001','SINGLE_CHOICE','Chọn một đáp án','single-choice','SINGLE_CHOICE','SINGLE_CHOICE',1,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('12000000-0000-4000-8000-000000000002','MULTIPLE_CHOICE','Chọn nhiều đáp án','multiple-choice','MULTIPLE_CHOICE','MULTIPLE_CHOICE',1,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('12000000-0000-4000-8000-000000000003','GAP_FILL_CHOICE','Điền khuyết có sẵn','gap-fill-choice','SINGLE_CHOICE','SINGLE_CHOICE',1,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('12000000-0000-4000-8000-000000000004','MATCHING','Nối cặp','matching','MATCHING','MATCHING',1,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('12000000-0000-4000-8000-000000000005','SPEAKER_MATCHING','Nối người nói','speaker-matching','MATCHING','MATCHING',1,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('12000000-0000-4000-8000-000000000006','HEADING_MATCHING','Nối tiêu đề','heading-matching','MATCHING','MATCHING',1,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('12000000-0000-4000-8000-000000000007','SENTENCE_ORDERING','Sắp xếp câu','sentence-ordering','ORDERING','SENTENCE_ORDERING',1,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('12000000-0000-4000-8000-000000000008','SHORT_TEXT','Trả lời ngắn','short-text','TEXT_EXACT','SHORT_TEXT',1,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('12000000-0000-4000-8000-000000000009','LONG_TEXT','Viết đoạn/bài','long-text',NULL,'LONG_TEXT',1,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('12000000-0000-4000-8000-000000000010','AUDIO_RECORDING','Ghi âm','audio-recording',NULL,'AUDIO_RECORDING',1,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('12000000-0000-4000-8000-000000000011','IMAGE_DESCRIPTION','Miêu tả tranh','image-description',NULL,'AUDIO_RECORDING',1,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('12000000-0000-4000-8000-000000000012','IMAGE_COMPARISON','So sánh hai tranh','image-comparison',NULL,'AUDIO_RECORDING',1,1,'2026-07-31 17:51:10','2026-07-31 17:51:10');
/*!40000 ALTER TABLE `task_types` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `test_attempts`
--

DROP TABLE IF EXISTS `test_attempts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `test_attempts` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `blueprint_id` char(36) DEFAULT NULL,
  `component_id` char(36) DEFAULT NULL,
  `part_id` char(36) DEFAULT NULL,
  `mode` enum('PART_PRACTICE','CUSTOM_PRACTICE','MOCK_TEST') NOT NULL,
  `access_level_used` enum('FREE','PREMIUM') NOT NULL,
  `status` enum('CREATED','IN_PROGRESS','SUBMITTED','SCORING','COMPLETED','EXPIRED','ABANDONED','CANCELLED') NOT NULL DEFAULT 'CREATED',
  `started_at` datetime DEFAULT NULL,
  `submitted_at` datetime DEFAULT NULL,
  `completed_at` datetime DEFAULT NULL,
  `expires_at` datetime DEFAULT NULL,
  `duration_seconds` int DEFAULT NULL,
  `time_spent_seconds` int NOT NULL DEFAULT '0',
  `raw_score` decimal(10,2) DEFAULT NULL,
  `max_score` decimal(10,2) DEFAULT NULL,
  `percentage_score` decimal(8,4) DEFAULT NULL,
  `scaled_score` decimal(10,2) DEFAULT NULL,
  `cefr_level` enum('A1','A2','B1','B2','C1','C2') DEFAULT NULL,
  `total_items` int NOT NULL DEFAULT '0',
  `answered_items` int NOT NULL DEFAULT '0',
  `correct_items` int NOT NULL DEFAULT '0',
  `incorrect_items` int NOT NULL DEFAULT '0',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_attempts_user_created` (`user_id`,`created_at`),
  KEY `idx_attempts_user_status` (`user_id`,`status`),
  KEY `idx_attempts_expiry` (`status`,`expires_at`),
  KEY `idx_attempts_blueprint` (`blueprint_id`),
  KEY `idx_attempts_part` (`part_id`),
  KEY `idx_attempts_component` (`component_id`),
  CONSTRAINT `fk_test_attempts_blueprint` FOREIGN KEY (`blueprint_id`) REFERENCES `test_blueprints` (`id`),
  CONSTRAINT `fk_test_attempts_component` FOREIGN KEY (`component_id`) REFERENCES `components` (`id`),
  CONSTRAINT `fk_test_attempts_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`),
  CONSTRAINT `fk_test_attempts_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `test_attempts`
--

LOCK TABLES `test_attempts` WRITE;
/*!40000 ALTER TABLE `test_attempts` DISABLE KEYS */;
INSERT INTO `test_attempts` VALUES ('c5099780-b519-430d-b04b-9452014b0283','99e4374d-8ede-42ca-a60d-219155f5e7b9',NULL,'15000000-0000-4000-8000-000000000002','16000000-0000-4000-8000-000000000011','PART_PRACTICE','FREE','IN_PROGRESS','2026-08-06 07:18:59',NULL,NULL,NULL,NULL,0,NULL,10.00,NULL,NULL,NULL,5,0,0,0,'2026-08-06 07:18:59','2026-08-06 07:18:59');
/*!40000 ALTER TABLE `test_attempts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `test_blueprints`
--

DROP TABLE IF EXISTS `test_blueprints`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `test_blueprints` (
  `id` char(36) NOT NULL,
  `exam_version_id` char(36) NOT NULL,
  `component_id` char(36) DEFAULT NULL,
  `code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `mode` enum('PART_PRACTICE','CUSTOM_PRACTICE','MOCK_TEST') NOT NULL,
  `access_level` enum('FREE','PREMIUM') NOT NULL DEFAULT 'PREMIUM',
  `duration_seconds` int DEFAULT NULL,
  `status` enum('DRAFT','PUBLISHED','ARCHIVED') NOT NULL DEFAULT 'DRAFT',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_test_blueprints_component_code` (`component_id`,`code`),
  KEY `idx_test_blueprints_listing` (`exam_version_id`,`mode`,`status`,`access_level`),
  KEY `idx_test_blueprints_component` (`component_id`),
  CONSTRAINT `fk_test_blueprints_component` FOREIGN KEY (`component_id`) REFERENCES `components` (`id`),
  CONSTRAINT `fk_test_blueprints_exam_version` FOREIGN KEY (`exam_version_id`) REFERENCES `exam_versions` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `test_blueprints`
--

LOCK TABLES `test_blueprints` WRITE;
/*!40000 ALTER TABLE `test_blueprints` DISABLE KEYS */;
INSERT INTO `test_blueprints` VALUES ('19000000-0000-4000-8000-000000000001','14000000-0000-4000-8000-000000000001',NULL,'MOCK_FULL_V1','Thi thử Aptis General - Đề đầy đủ','Đầy đủ 5 học phần theo cấu trúc thi thật','MOCK_TEST','PREMIUM',9000,'PUBLISHED','2026-07-31 17:51:10','2026-08-01 02:01:59'),('19000000-0000-4000-8000-000000000002','14000000-0000-4000-8000-000000000001',NULL,'MOCK_SHORT_FREE_V1','Thi thử rút gọn (miễn phí)','Đề rút gọn để học viên trải nghiệm','MOCK_TEST','FREE',1800,'PUBLISHED','2026-07-31 17:51:10','2026-08-01 02:01:59');
/*!40000 ALTER TABLE `test_blueprints` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `topics`
--

DROP TABLE IF EXISTS `topics`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `topics` (
  `id` char(36) NOT NULL,
  `parent_id` char(36) DEFAULT NULL,
  `code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `description` text,
  `is_active` tinyint(1) NOT NULL DEFAULT '1',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_topics_code` (`code`),
  KEY `idx_topics_parent` (`parent_id`),
  CONSTRAINT `fk_topics_parent` FOREIGN KEY (`parent_id`) REFERENCES `topics` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `topics`
--

LOCK TABLES `topics` WRITE;
/*!40000 ALTER TABLE `topics` DISABLE KEYS */;
INSERT INTO `topics` VALUES ('147513cb-367b-407a-9164-7423069efd80',NULL,'CUSTOM_347154D22C3D','Part 1.7',NULL,1,'2026-08-06 07:12:55','2026-08-06 07:12:55'),('17000000-0000-4000-8000-000000000001',NULL,'DAILY_LIFE','Đời sống hàng ngày',NULL,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('17000000-0000-4000-8000-000000000002',NULL,'WORK_CAREER','Công việc',NULL,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('17000000-0000-4000-8000-000000000003',NULL,'EDUCATION','Giáo dục',NULL,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('17000000-0000-4000-8000-000000000004',NULL,'ENVIRONMENT','Môi trường',NULL,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('17000000-0000-4000-8000-000000000005',NULL,'TECHNOLOGY','Công nghệ',NULL,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('17000000-0000-4000-8000-000000000006',NULL,'HEALTH_SPORT','Sức khỏe & thể thao',NULL,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('17000000-0000-4000-8000-000000000007',NULL,'TRAVEL','Du lịch',NULL,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('17000000-0000-4000-8000-000000000008',NULL,'CULTURE_ARTS','Văn hóa & nghệ thuật',NULL,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('17000000-0000-4000-8000-000000000009',NULL,'SHOPPING_MONEY','Mua sắm & tiền bạc',NULL,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('17000000-0000-4000-8000-000000000010',NULL,'SOCIETY','Xã hội',NULL,1,'2026-07-31 17:51:10','2026-07-31 17:51:10'),('1d0d6a8a-91fb-4938-a1fe-afa869b44753',NULL,'CUSTOM_6FFA2C61804D','Part 1.5',NULL,1,'2026-08-06 07:12:55','2026-08-06 07:12:55'),('2b0a38f3-af35-4e5c-9d3c-26d6dc06b151',NULL,'CUSTOM_C63D61093C97','Part 1.8',NULL,1,'2026-08-06 07:12:55','2026-08-06 07:12:55'),('3565e433-5448-411c-883f-cd5ca038fee0',NULL,'CUSTOM_6FB598A0F140','Part 1.4',NULL,1,'2026-08-06 07:12:54','2026-08-06 07:12:54'),('3c03d46a-ec86-4ca9-932c-7dc0e24b735b',NULL,'CUSTOM_546C6A8F0D2A','Part 1.1',NULL,1,'2026-08-06 07:00:43','2026-08-06 07:00:43'),('880e84f0-ebad-4003-8085-baf0bde07ccc',NULL,'CUSTOM_856020406C60','dsada',NULL,1,'2026-08-05 02:48:22','2026-08-05 02:48:22'),('9a5c030f-0acd-46ba-ba8d-e800dfea78c3',NULL,'CUSTOM_6BCC5C711DA0','Part 1.10',NULL,1,'2026-08-06 07:12:56','2026-08-06 07:12:56'),('aa1431e4-3652-422a-a49f-b7cf5e531f67',NULL,'CUSTOM_31B45CFE6FA8','Part 1.3',NULL,1,'2026-08-06 07:12:54','2026-08-06 07:12:54'),('ad704c43-33c6-4842-b13b-197c8cf55a00',NULL,'CUSTOM_86ADA894730A','Part 1.13',NULL,1,'2026-08-06 07:16:51','2026-08-06 07:16:51'),('b4635466-343a-47fc-9231-1049778208fd',NULL,'CUSTOM_7836A372E9B2','Part 1.9',NULL,1,'2026-08-06 07:12:56','2026-08-06 07:12:56'),('b735e796-31b4-4ef5-b183-24b0e254e4a0',NULL,'CUSTOM_C3D559C780AD','Part 1.12',NULL,1,'2026-08-06 07:16:51','2026-08-06 07:16:51'),('d18e0208-0b56-4b84-8929-4bbf586deb58',NULL,'CUSTOM_597FFE377C98','Part 1.11',NULL,1,'2026-08-06 07:12:56','2026-08-06 07:12:56'),('f7309693-9822-4a54-8adf-227ff95b47bf',NULL,'CUSTOM_73E50B6E06D3','Part 1.2',NULL,1,'2026-08-06 07:12:54','2026-08-06 07:12:54'),('fd40eef0-f4e9-4134-af1a-aa6eaeac446f',NULL,'CUSTOM_3AED1273B2C3','Part 1.6',NULL,1,'2026-08-06 07:12:55','2026-08-06 07:12:55');
/*!40000 ALTER TABLE `topics` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trial_campaigns`
--

DROP TABLE IF EXISTS `trial_campaigns`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trial_campaigns` (
  `id` char(36) NOT NULL,
  `code` varchar(100) NOT NULL,
  `name` varchar(255) NOT NULL,
  `duration_days` int NOT NULL,
  `max_uses_per_user` int NOT NULL DEFAULT '1',
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `status` enum('DRAFT','ACTIVE','INACTIVE','ENDED') NOT NULL DEFAULT 'DRAFT',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_trial_campaigns_code` (`code`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trial_campaigns`
--

LOCK TABLES `trial_campaigns` WRITE;
/*!40000 ALTER TABLE `trial_campaigns` DISABLE KEYS */;
/*!40000 ALTER TABLE `trial_campaigns` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_component_progress`
--

DROP TABLE IF EXISTS `user_component_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_component_progress` (
  `user_id` char(36) NOT NULL,
  `component_id` char(36) NOT NULL,
  `total_attempts` int NOT NULL DEFAULT '0',
  `mastery_score` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `average_score` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `study_seconds` bigint NOT NULL DEFAULT '0',
  `estimated_cefr_level` enum('A1','A2','B1','B2','C1','C2') DEFAULT NULL,
  `last_studied_at` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`,`component_id`),
  KEY `idx_user_component_progress_component` (`component_id`),
  CONSTRAINT `fk_user_component_progress_component` FOREIGN KEY (`component_id`) REFERENCES `components` (`id`),
  CONSTRAINT `fk_user_component_progress_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_component_progress`
--

LOCK TABLES `user_component_progress` WRITE;
/*!40000 ALTER TABLE `user_component_progress` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_component_progress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_daily_learning_stats`
--

DROP TABLE IF EXISTS `user_daily_learning_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_daily_learning_stats` (
  `user_id` char(36) NOT NULL,
  `stat_date` date NOT NULL,
  `study_seconds` int NOT NULL DEFAULT '0',
  `attempts_started` int NOT NULL DEFAULT '0',
  `attempts_completed` int NOT NULL DEFAULT '0',
  `answered_items` int NOT NULL DEFAULT '0',
  `correct_items` int NOT NULL DEFAULT '0',
  PRIMARY KEY (`user_id`,`stat_date`),
  CONSTRAINT `fk_user_daily_stats_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_daily_learning_stats`
--

LOCK TABLES `user_daily_learning_stats` WRITE;
/*!40000 ALTER TABLE `user_daily_learning_stats` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_daily_learning_stats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_entitlements`
--

DROP TABLE IF EXISTS `user_entitlements`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_entitlements` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `entitlement_code` varchar(100) NOT NULL,
  `source_type` enum('SUBSCRIPTION','PROMOTION','ADMIN_GRANT','TRIAL') NOT NULL,
  `source_id` char(36) DEFAULT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_entitlements_check` (`user_id`,`entitlement_code`,`revoked_at`,`starts_at`,`ends_at`),
  KEY `idx_entitlements_source` (`source_type`,`source_id`),
  CONSTRAINT `fk_user_entitlements_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_entitlements`
--

LOCK TABLES `user_entitlements` WRITE;
/*!40000 ALTER TABLE `user_entitlements` DISABLE KEYS */;
INSERT INTO `user_entitlements` VALUES ('4d150031-7d4a-40f8-951a-8373004e363f','99e4374d-8ede-42ca-a60d-219155f5e7b9','PREMIUM_CONTENT_ACCESS','ADMIN_GRANT',NULL,'2026-08-06 08:40:50','2026-09-05 08:40:51',NULL,'2026-08-06 08:40:51','2026-08-06 08:40:51'),('c9b3b781-e5c6-416c-90c2-e820574d6373','99e4374d-8ede-42ca-a60d-219155f5e7b9','PREMIUM_CONTENT_ACCESS','ADMIN_GRANT',NULL,'2026-08-06 08:41:15','2026-09-05 08:41:15',NULL,'2026-08-06 08:41:15','2026-08-06 08:41:15');
/*!40000 ALTER TABLE `user_entitlements` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_part_progress`
--

DROP TABLE IF EXISTS `user_part_progress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_part_progress` (
  `user_id` char(36) NOT NULL,
  `part_id` char(36) NOT NULL,
  `total_attempts` int NOT NULL DEFAULT '0',
  `completed_question_sets` int NOT NULL DEFAULT '0',
  `mastery_score` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `average_score` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `study_seconds` bigint NOT NULL DEFAULT '0',
  `last_studied_at` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`,`part_id`),
  KEY `idx_user_part_progress_part` (`part_id`),
  CONSTRAINT `fk_user_part_progress_part` FOREIGN KEY (`part_id`) REFERENCES `parts` (`id`),
  CONSTRAINT `fk_user_part_progress_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_part_progress`
--

LOCK TABLES `user_part_progress` WRITE;
/*!40000 ALTER TABLE `user_part_progress` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_part_progress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_profiles`
--

DROP TABLE IF EXISTS `user_profiles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_profiles` (
  `user_id` char(36) NOT NULL,
  `full_name` varchar(255) DEFAULT NULL,
  `display_name` varchar(100) DEFAULT NULL,
  `avatar_object_key` varchar(500) DEFAULT NULL,
  `date_of_birth` date DEFAULT NULL,
  `gender` enum('MALE','FEMALE','OTHER','UNSPECIFIED') NOT NULL DEFAULT 'UNSPECIFIED',
  `target_cefr_level` enum('A1','A2','B1','B2','C1','C2') DEFAULT NULL,
  `target_exam_date` date DEFAULT NULL,
  `timezone` varchar(50) NOT NULL DEFAULT 'Asia/Ho_Chi_Minh',
  `locale` varchar(20) NOT NULL DEFAULT 'vi-VN',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`user_id`),
  CONSTRAINT `fk_user_profiles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_profiles`
--

LOCK TABLES `user_profiles` WRITE;
/*!40000 ALTER TABLE `user_profiles` DISABLE KEYS */;
INSERT INTO `user_profiles` VALUES ('99e4374d-8ede-42ca-a60d-219155f5e7b9',NULL,NULL,NULL,NULL,'UNSPECIFIED',NULL,NULL,'Asia/Ho_Chi_Minh','vi-VN','2026-08-01 06:16:21','2026-08-01 06:16:21'),('cbef1e4f-c1cc-4937-a1a1-1f5a5f39acbd',NULL,NULL,NULL,NULL,'UNSPECIFIED',NULL,NULL,'Asia/Ho_Chi_Minh','vi-VN','2026-08-01 06:23:00','2026-08-01 06:23:00');
/*!40000 ALTER TABLE `user_profiles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_question_stats`
--

DROP TABLE IF EXISTS `user_question_stats`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_question_stats` (
  `user_id` char(36) NOT NULL,
  `question_set_id` char(36) NOT NULL,
  `attempt_count` int NOT NULL DEFAULT '0',
  `correct_count` int NOT NULL DEFAULT '0',
  `incorrect_count` int NOT NULL DEFAULT '0',
  `mastery_score` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `average_score` decimal(8,4) NOT NULL DEFAULT '0.0000',
  `last_attempted_at` datetime DEFAULT NULL,
  `last_correct_at` datetime DEFAULT NULL,
  `last_incorrect_at` datetime DEFAULT NULL,
  `next_review_at` datetime DEFAULT NULL,
  PRIMARY KEY (`user_id`,`question_set_id`),
  KEY `idx_user_question_review` (`user_id`,`next_review_at`),
  KEY `idx_user_question_incorrect` (`user_id`,`incorrect_count`,`last_incorrect_at`),
  KEY `idx_user_question_mastery` (`user_id`,`mastery_score`),
  KEY `idx_user_question_question` (`question_set_id`),
  CONSTRAINT `fk_user_question_stats_question` FOREIGN KEY (`question_set_id`) REFERENCES `question_sets` (`id`),
  CONSTRAINT `fk_user_question_stats_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_question_stats`
--

LOCK TABLES `user_question_stats` WRITE;
/*!40000 ALTER TABLE `user_question_stats` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_question_stats` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_roles`
--

DROP TABLE IF EXISTS `user_roles`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_roles` (
  `user_id` char(36) NOT NULL,
  `role_id` char(36) NOT NULL,
  `assigned_at` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `assigned_by` char(36) DEFAULT NULL,
  PRIMARY KEY (`user_id`,`role_id`),
  KEY `idx_user_roles_role` (`role_id`),
  CONSTRAINT `fk_user_roles_role` FOREIGN KEY (`role_id`) REFERENCES `roles` (`id`),
  CONSTRAINT `fk_user_roles_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_roles`
--

LOCK TABLES `user_roles` WRITE;
/*!40000 ALTER TABLE `user_roles` DISABLE KEYS */;
INSERT INTO `user_roles` VALUES ('99e4374d-8ede-42ca-a60d-219155f5e7b9','10000000-0000-4000-8000-000000000008','2026-08-06 08:55:47',NULL),('cbef1e4f-c1cc-4937-a1a1-1f5a5f39acbd','10000000-0000-4000-8000-000000000001','2026-08-01 06:23:00',NULL);
/*!40000 ALTER TABLE `user_roles` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_subscriptions`
--

DROP TABLE IF EXISTS `user_subscriptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_subscriptions` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `plan_id` char(36) NOT NULL,
  `status` enum('PENDING','ACTIVE','EXPIRED','CANCELLED','REVOKED') NOT NULL DEFAULT 'PENDING',
  `starts_at` datetime DEFAULT NULL,
  `ends_at` datetime DEFAULT NULL,
  `auto_renew` tinyint(1) NOT NULL DEFAULT '0',
  `source_order_id` char(36) DEFAULT NULL,
  `activated_at` datetime DEFAULT NULL,
  `cancelled_at` datetime DEFAULT NULL,
  `revoked_at` datetime DEFAULT NULL,
  `revoke_reason` varchar(500) DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_subscriptions_active` (`user_id`,`status`,`starts_at`,`ends_at`),
  KEY `idx_user_subscriptions_expiry` (`status`,`ends_at`),
  KEY `idx_user_subscriptions_plan` (`plan_id`),
  KEY `idx_user_subscriptions_order` (`source_order_id`),
  CONSTRAINT `fk_user_subscriptions_order` FOREIGN KEY (`source_order_id`) REFERENCES `orders` (`id`),
  CONSTRAINT `fk_user_subscriptions_plan` FOREIGN KEY (`plan_id`) REFERENCES `subscription_plans` (`id`),
  CONSTRAINT `fk_user_subscriptions_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_subscriptions`
--

LOCK TABLES `user_subscriptions` WRITE;
/*!40000 ALTER TABLE `user_subscriptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_subscriptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `user_trials`
--

DROP TABLE IF EXISTS `user_trials`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `user_trials` (
  `id` char(36) NOT NULL,
  `user_id` char(36) NOT NULL,
  `campaign_id` char(36) NOT NULL,
  `starts_at` datetime NOT NULL,
  `ends_at` datetime NOT NULL,
  `status` enum('ACTIVE','EXPIRED','CANCELLED') NOT NULL DEFAULT 'ACTIVE',
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_user_trials_active` (`user_id`,`status`,`starts_at`,`ends_at`),
  KEY `idx_user_trials_campaign` (`campaign_id`),
  KEY `idx_user_trials_expiry` (`status`,`ends_at`),
  CONSTRAINT `fk_user_trials_campaign` FOREIGN KEY (`campaign_id`) REFERENCES `trial_campaigns` (`id`),
  CONSTRAINT `fk_user_trials_user` FOREIGN KEY (`user_id`) REFERENCES `users` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `user_trials`
--

LOCK TABLES `user_trials` WRITE;
/*!40000 ALTER TABLE `user_trials` DISABLE KEYS */;
/*!40000 ALTER TABLE `user_trials` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `users`
--

DROP TABLE IF EXISTS `users`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `users` (
  `id` char(36) NOT NULL,
  `email` varchar(255) NOT NULL,
  `phone` varchar(30) DEFAULT NULL,
  `password_hash` varchar(255) DEFAULT NULL,
  `status` enum('PENDING_VERIFICATION','ACTIVE','LOCKED','SUSPENDED','DELETED') NOT NULL DEFAULT 'PENDING_VERIFICATION',
  `email_verified_at` datetime DEFAULT NULL,
  `phone_verified_at` datetime DEFAULT NULL,
  `last_login_at` datetime DEFAULT NULL,
  `failed_login_count` int NOT NULL DEFAULT '0',
  `locked_until` datetime DEFAULT NULL,
  `created_at` datetime NOT NULL,
  `updated_at` datetime NOT NULL,
  `deleted_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `uk_users_email` (`email`),
  UNIQUE KEY `uk_users_phone` (`phone`),
  KEY `idx_users_status` (`status`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `users`
--

LOCK TABLES `users` WRITE;
/*!40000 ALTER TABLE `users` DISABLE KEYS */;
INSERT INTO `users` VALUES ('99e4374d-8ede-42ca-a60d-219155f5e7b9','plat-admin@test.local',NULL,'$argon2id$v=19$m=19456,t=2,p=1$08f+xOQvPHSwfIISa5N0OA$wFtHN8yejPLKOWWICcROUqDiusJPLe8PW8rIghXTQIQ','ACTIVE','2026-08-01 08:08:45',NULL,'2026-08-06 02:41:48',0,NULL,'2026-08-01 06:16:21','2026-08-06 08:55:47',NULL),('cbef1e4f-c1cc-4937-a1a1-1f5a5f39acbd','phonglop7d@gmail.com',NULL,'$argon2id$v=19$m=19456,t=2,p=1$vSqAtEP1y6E20OfnMK95Yg$NLIioROgXCvIoxUlwkUjvsle4JWDq14/G2ZX6/g8cWE','ACTIVE','2026-08-01 06:23:00',NULL,'2026-08-06 02:23:06',0,NULL,'2026-08-01 06:23:00','2026-08-06 02:23:07',NULL);
/*!40000 ALTER TABLE `users` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Dumping events for database 'aptis'
--

--
-- Dumping routines for database 'aptis'
--
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-08-06  9:55:22
