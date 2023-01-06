CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- create redactics_tmp and load extension
DROP DATABASE IF EXISTS redactics_tmp;
CREATE DATABASE redactics_tmp;
GRANT ALL PRIVILEGES ON DATABASE redactics_tmp TO postgres;
ALTER DATABASE redactics_tmp SET session_preload_libraries = 'anon';

-- create redactics API database
DROP DATABASE IF EXISTS redactics;
CREATE DATABASE redactics;
GRANT ALL PRIVILEGES ON DATABASE redactics TO postgres;