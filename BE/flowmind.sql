-- MySQL Workbench Forward Engineering

SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0;
SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0;
SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='ONLY_FULL_GROUP_BY,STRICT_TRANS_TABLES,NO_ZERO_IN_DATE,NO_ZERO_DATE,ERROR_FOR_DIVISION_BY_ZERO,NO_ENGINE_SUBSTITUTION';

-- -----------------------------------------------------
-- Schema flowmind
-- -----------------------------------------------------

-- -----------------------------------------------------
-- Schema flowmind
-- -----------------------------------------------------
CREATE SCHEMA IF NOT EXISTS `flowmind` DEFAULT CHARACTER SET utf8 ;
USE `flowmind` ;

-- -----------------------------------------------------
-- Table `flowmind`.`user`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `flowmind`.`user` (
  `user_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(45) NULL,
  `password` VARCHAR(45) NULL,
  `email` VARCHAR(45) NULL,
  `phone` VARCHAR(45) NULL,
  PRIMARY KEY (`user_id`))
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `flowmind`.`project`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `flowmind`.`project` (
  `project_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(45) NULL,
  `description` MEDIUMTEXT NULL,
  `created_at` DATETIME NULL,
  `user_id` INT NOT NULL,
  PRIMARY KEY (`project_id`, `user_id`),
  INDEX `fk_Project_User_idx` (`user_id` ASC) VISIBLE,
  CONSTRAINT `fk_Project_User`
    FOREIGN KEY (`user_id`)
    REFERENCES `flowmind`.`user` (`user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `flowmind`.`dataset`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `flowmind`.`dataset` (
  `dataset_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(45) NULL,
  `description` MEDIUMTEXT NULL,
  `project_id` INT NOT NULL,
  `user_id` INT NOT NULL,
  PRIMARY KEY (`dataset_id`, `project_id`, `user_id`),
  INDEX `fk_Dataset_Project1_idx` (`project_id` ASC, `user_id` ASC) VISIBLE,
  CONSTRAINT `fk_Dataset_Project1`
    FOREIGN KEY (`project_id` , `user_id`)
    REFERENCES `flowmind`.`project` (`project_id` , `user_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `flowmind`.`dataset_version`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `flowmind`.`dataset_version` (
  `dataset_version_id` INT NOT NULL AUTO_INCREMENT,
  `version_tag` VARCHAR(50) NULL,
  `geometry_type` VARCHAR(45) NULL,
  `created_at` DATETIME NULL,
  `train_cnt` INT NULL,
  `valid_cnt` INT NULL,
  `test_cnt` INT NULL,
  `ratio` JSON NULL,
  `dataset_id` INT NOT NULL,
  PRIMARY KEY (`dataset_version_id`, `dataset_id`),
  INDEX `fk_dataset_version_dataset1_idx` (`dataset_id` ASC) VISIBLE,
  CONSTRAINT `fk_dataset_version_dataset1`
    FOREIGN KEY (`dataset_id`)
    REFERENCES `flowmind`.`dataset` (`dataset_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `flowmind`.`label_class`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `flowmind`.`label_class` (
  `class_id` INT NOT NULL,
  `name` VARCHAR(45) NULL,
  `dataset_version_id` INT NOT NULL,
  PRIMARY KEY (`class_id`, `dataset_version_id`),
  INDEX `fk_label_class_dataset_version1_idx` (`dataset_version_id` ASC) VISIBLE,
  CONSTRAINT `fk_label_class_dataset_version1`
    FOREIGN KEY (`dataset_version_id`)
    REFERENCES `flowmind`.`dataset_version` (`dataset_version_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `flowmind`.`asset`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `flowmind`.`asset` (
  `asset_id` INT NOT NULL AUTO_INCREMENT,
  `name` VARCHAR(255) NULL,
  `storage_uri` MEDIUMTEXT NULL,
  `bytes` BIGINT NULL,
  `split` ENUM('train', 'val', 'test') NULL,
  `dataset_version_id` INT NOT NULL,
  PRIMARY KEY (`asset_id`, `dataset_version_id`),
  INDEX `fk_asset_dataset_version1_idx` (`dataset_version_id` ASC) VISIBLE,
  CONSTRAINT `fk_asset_dataset_version1`
    FOREIGN KEY (`dataset_version_id`)
    REFERENCES `flowmind`.`dataset_version` (`dataset_version_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `flowmind`.`annotation`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `flowmind`.`annotation` (
  `annotation_id` INT NOT NULL AUTO_INCREMENT,
  `storage_uri` MEDIUMTEXT NULL,
  `geometry` MEDIUMTEXT NULL,
  `asset_id` INT NOT NULL,
  `class_id` INT NOT NULL,
  PRIMARY KEY (`annotation_id`, `asset_id`, `class_id`),
  INDEX `fk_annotation_asset1_idx` (`asset_id` ASC) VISIBLE,
  INDEX `fk_annotation_label_class1_idx` (`class_id` ASC) VISIBLE,
  CONSTRAINT `fk_annotation_asset1`
    FOREIGN KEY (`asset_id`)
    REFERENCES `flowmind`.`asset` (`asset_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_annotation_label_class1`
    FOREIGN KEY (`class_id`)
    REFERENCES `flowmind`.`label_class` (`class_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `flowmind`.`model`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `flowmind`.`model` (
  `model_id` INT NOT NULL AUTO_INCREMENT,
  `hyperparam` JSON NULL,
  `version` VARCHAR(45) NULL,
  `model_type` VARCHAR(45) NULL,
  `convert_param` JSON NULL,
  `created_at` DATETIME NULL,
  `dataset_version_id` INT NOT NULL,
  `parent_model_id` INT NOT NULL,
  PRIMARY KEY (`model_id`, `dataset_version_id`, `parent_model_id`),
  INDEX `fk_model_dataset_version1_idx` (`dataset_version_id` ASC) VISIBLE,
  INDEX `fk_model_model1_idx` (`parent_model_id` ASC) VISIBLE,
  CONSTRAINT `fk_model_dataset_version1`
    FOREIGN KEY (`dataset_version_id`)
    REFERENCES `flowmind`.`dataset_version` (`dataset_version_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION,
  CONSTRAINT `fk_model_model1`
    FOREIGN KEY (`parent_model_id`)
    REFERENCES `flowmind`.`model` (`model_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


-- -----------------------------------------------------
-- Table `flowmind`.`evaluation`
-- -----------------------------------------------------
CREATE TABLE IF NOT EXISTS `flowmind`.`evaluation` (
  `f1_score` FLOAT NULL,
  `precision` FLOAT NULL,
  `recall` FLOAT NULL,
  `map_50` FLOAT NULL,
  `map_50_95` FLOAT NULL,
  `model_id` INT NOT NULL,
  PRIMARY KEY (`model_id`),
  CONSTRAINT `fk_evaluation_model1`
    FOREIGN KEY (`model_id`)
    REFERENCES `flowmind`.`model` (`model_id`)
    ON DELETE NO ACTION
    ON UPDATE NO ACTION)
ENGINE = InnoDB;


SET SQL_MODE=@OLD_SQL_MODE;
SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS;
SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS;
