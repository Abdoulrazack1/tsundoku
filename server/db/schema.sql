-- =====================================================================
-- TSUNDOKU — Schéma de base de données (MySQL 8.x)
-- Conçu en 3NF. Modèle normalisé (cahier des charges v4 §4).
-- =====================================================================

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS comments;
DROP TABLE IF EXISTS contact_messages;
DROP TABLE IF EXISTS post_views;
DROP TABLE IF EXISTS list_books;
DROP TABLE IF EXISTS thematic_lists;
DROP TABLE IF EXISTS quotes;
DROP TABLE IF EXISTS series_assets;
DROP TABLE IF EXISTS reading_timeline;
DROP TABLE IF EXISTS post_tags;
DROP TABLE IF EXISTS post_categories;
DROP TABLE IF EXISTS book_tags;
DROP TABLE IF EXISTS book_categories;
DROP TABLE IF EXISTS tags;
DROP TABLE IF EXISTS categories;
DROP TABLE IF EXISTS posts;
DROP TABLE IF EXISTS books;
DROP TABLE IF EXISTS authors;
DROP TABLE IF EXISTS newsletter_subscribers;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;

-- ---------------------------------------------------------------------
-- Utilisateurs (administrateurs)
-- ---------------------------------------------------------------------
CREATE TABLE users (
    id            INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    username      VARCHAR(50)  NOT NULL UNIQUE,
    email         VARCHAR(255) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    role          ENUM('admin', 'editor', 'member') DEFAULT 'member',
    avatar_url    VARCHAR(500),
    bio           TEXT,
    created_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Auteurs (réels, pour les livres)
-- ---------------------------------------------------------------------
CREATE TABLE authors (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name        VARCHAR(255) NOT NULL UNIQUE,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    bio         TEXT,
    image_url   VARCHAR(500),
    nationality VARCHAR(100),
    birth_date  DATE NULL,
    death_date  DATE NULL,
    anilist_id  INT UNSIGNED NULL UNIQUE,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    INDEX idx_authors_slug (slug)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Séries (mangas, manhwa, manhua, light novels) — "La Bibliothèque"
-- ---------------------------------------------------------------------
CREATE TABLE books (
    id                 INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title              VARCHAR(255) NOT NULL,
    original_title     VARCHAR(255),                 -- titre japonais / romaji
    slug               VARCHAR(255) NOT NULL UNIQUE,
    author_id          INT UNSIGNED NOT NULL,
    cover_image_url    VARCHAR(500),
    isbn               VARCHAR(20) NULL UNIQUE,
    kind               ENUM('manga','manhwa','manhua','novel','bd') DEFAULT 'manga',
    demographic        ENUM('shonen','seinen','shojo','josei','kodomo','none') DEFAULT 'none',
    publication_year   YEAR NULL,
    publisher          VARCHAR(255),
    volumes            SMALLINT UNSIGNED,
    chapters           SMALLINT UNSIGNED,
    pages              SMALLINT UNSIGNED,
    language           VARCHAR(50),
    synopsis           TEXT,
    status             ENUM('lu','en_cours','a_lire','abandonne','relu') DEFAULT 'a_lire',
    publication_status ENUM('en_cours','termine','pause','annonce','inconnu') DEFAULT 'inconnu',
    rating             DECIMAL(2,1) NULL,
    source             ENUM('tsundoku','anilist','inko') DEFAULT 'tsundoku',
    anilist_id         INT UNSIGNED NULL,
    inko_id            VARCHAR(191) NULL,             -- UUID MangaDex / id source
    inko_source        VARCHAR(50) NULL,             -- mangadex, sushiscan…
    created_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at         TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (author_id) REFERENCES authors(id) ON DELETE CASCADE,
    INDEX idx_books_slug (slug),
    INDEX idx_books_status (status),
    INDEX idx_books_kind (kind),
    CONSTRAINT chk_books_rating CHECK (rating BETWEEN 0 AND 5)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- Assets visuels d'une série : couvertures de tomes, de chapitres, planches, illustrations
CREATE TABLE series_assets (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    book_id    INT UNSIGNED NOT NULL,
    type       ENUM('cover','volume','chapter','planche','art') NOT NULL DEFAULT 'art',
    label      VARCHAR(160),
    image_url  VARCHAR(500) NOT NULL,
    position   SMALLINT UNSIGNED DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    INDEX idx_assets_book (book_id, type)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Articles (chroniques, journaux, listes)
-- ---------------------------------------------------------------------
CREATE TABLE posts (
    id               INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    user_id          INT UNSIGNED NOT NULL,
    book_id          INT UNSIGNED NULL,
    title            VARCHAR(255) NOT NULL,
    slug             VARCHAR(255) NOT NULL UNIQUE,
    type             ENUM('chronique','journal','liste','analyse','dossier') DEFAULT 'chronique',
    excerpt          TEXT,
    content          LONGTEXT NOT NULL,
    cover_image_url  VARCHAR(500),
    reading_time     SMALLINT UNSIGNED,
    rating           DECIMAL(2,1) NULL,
    rating_art       DECIMAL(2,1) NULL,   -- dessin / direction artistique
    rating_story     DECIMAL(2,1) NULL,   -- scénario / narration
    rating_chars     DECIMAL(2,1) NULL,   -- personnages
    has_spoilers     BOOLEAN DEFAULT FALSE,
    status           ENUM('draft','published','archived') DEFAULT 'draft',
    featured         BOOLEAN DEFAULT FALSE,
    views_count      INT UNSIGNED DEFAULT 0,
    meta_title       VARCHAR(255),
    meta_description VARCHAR(320),
    published_at     TIMESTAMP NULL,
    created_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at       TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE SET NULL,
    INDEX idx_posts_slug (slug),
    INDEX idx_posts_status (status),
    INDEX idx_posts_type (type),
    INDEX idx_posts_published (published_at),
    INDEX idx_posts_featured (featured)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Catégories / genres
-- ---------------------------------------------------------------------
CREATE TABLE categories (
    id    INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name  VARCHAR(100) NOT NULL UNIQUE,
    slug  VARCHAR(100) NOT NULL UNIQUE,
    color VARCHAR(7),
    icon  VARCHAR(50)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Tags
-- ---------------------------------------------------------------------
CREATE TABLE tags (
    id   INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    slug VARCHAR(50) NOT NULL UNIQUE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Liaisons Many-to-Many
-- ---------------------------------------------------------------------
CREATE TABLE post_categories (
    post_id     INT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (post_id, category_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE post_tags (
    post_id INT UNSIGNED NOT NULL,
    tag_id  INT UNSIGNED NOT NULL,
    PRIMARY KEY (post_id, tag_id),
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE book_categories (
    book_id     INT UNSIGNED NOT NULL,
    category_id INT UNSIGNED NOT NULL,
    PRIMARY KEY (book_id, category_id),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE book_tags (
    book_id INT UNSIGNED NOT NULL,
    tag_id  INT UNSIGNED NOT NULL,
    PRIMARY KEY (book_id, tag_id),
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Timeline de lecture (journal)
-- ---------------------------------------------------------------------
CREATE TABLE reading_timeline (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    book_id    INT UNSIGNED NOT NULL,
    status     ENUM('lu','en_cours','a_lire','abandonne','relu') NOT NULL,
    start_date DATE NULL,
    end_date   DATE NULL,
    notes      TEXT,
    progress   SMALLINT UNSIGNED,
    source     ENUM('manual','anilist','inko') DEFAULT 'manual',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE,
    INDEX idx_timeline_dates (start_date, end_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Citations favorites
-- ---------------------------------------------------------------------
CREATE TABLE quotes (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    book_id     INT UNSIGNED NOT NULL,
    content     TEXT NOT NULL,
    page_number SMALLINT UNSIGNED,
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Listes thématiques
-- ---------------------------------------------------------------------
CREATE TABLE thematic_lists (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    title       VARCHAR(255) NOT NULL,
    slug        VARCHAR(255) NOT NULL UNIQUE,
    description TEXT,
    cover_image_url VARCHAR(500),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE list_books (
    list_id       INT UNSIGNED NOT NULL,
    book_id       INT UNSIGNED NOT NULL,
    order_in_list SMALLINT UNSIGNED NOT NULL DEFAULT 0,
    PRIMARY KEY (list_id, book_id),
    FOREIGN KEY (list_id) REFERENCES thematic_lists(id) ON DELETE CASCADE,
    FOREIGN KEY (book_id) REFERENCES books(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Vues (analytics)
-- ---------------------------------------------------------------------
CREATE TABLE post_views (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id    INT UNSIGNED NOT NULL,
    ip_hash    VARCHAR(64),
    user_agent VARCHAR(500),
    viewed_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    INDEX idx_views_post (post_id),
    INDEX idx_views_date (viewed_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Commentaires (modérés) — §26
-- ---------------------------------------------------------------------
CREATE TABLE comments (
    id          INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    post_id     INT UNSIGNED NOT NULL,
    parent_id   INT UNSIGNED NULL,
    author_name VARCHAR(80) NOT NULL,
    content     TEXT NOT NULL,
    approved    BOOLEAN DEFAULT FALSE,
    ip_hash     VARCHAR(64),
    created_at  TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (post_id) REFERENCES posts(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES comments(id) ON DELETE CASCADE,
    INDEX idx_comments_post (post_id, approved)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Messages de contact
-- ---------------------------------------------------------------------
CREATE TABLE contact_messages (
    id         INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    name       VARCHAR(120) NOT NULL,
    email      VARCHAR(255) NOT NULL,
    subject    VARCHAR(200),
    message    TEXT NOT NULL,
    is_read    BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ---------------------------------------------------------------------
-- Abonnés newsletter
-- ---------------------------------------------------------------------
CREATE TABLE newsletter_subscribers (
    id              INT UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    email           VARCHAR(255) NOT NULL UNIQUE,
    confirmed       BOOLEAN DEFAULT FALSE,
    confirm_token   VARCHAR(255),
    subscribed_at   TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    unsubscribed_at TIMESTAMP NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
