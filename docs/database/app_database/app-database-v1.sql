-- Exported from QuickDBD: https://www.quickdatabasediagrams.com/
-- Link to schema: https://app.quickdatabasediagrams.com/#/d/JbG8iC
-- NOTE! If you have used non-SQL datatypes in your design, you will have to change these here.

-- App Database - Schema Version 1
-- Please bump the version by 1, any time the schema changes.
-- Also, include the migration plan under app/database/migration/server,
-- update all models, relationships and types.
-- Lastly, export all PNGs, SVGs, etc under the source project (./docs/database)
-- If you have any question/queries that you would like to clarify, please reach out to the Mobile Platform Team.

SET XACT_ABORT ON

BEGIN TRANSACTION QUICKDBD

CREATE TABLE [Info] (
    -- auto-generated
    [id] string  NOT NULL ,
    [build_number] string  NOT NULL ,
    [created_at] number  NOT NULL ,
    [version_number] string  NOT NULL ,
    CONSTRAINT [PK_Info] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [Global] (
    -- GLOBAL_IDENTIFIERS
    [id] string  NOT NULL ,
    [value] string  NOT NULL ,
    CONSTRAINT [PK_Global] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [Servers] (
    -- auto-generated
    [id] string  NOT NULL ,
    [db_path] string  NOT NULL ,
    [display_name] string  NOT NULL ,
    [url] string  NOT NULL ,
    [last_active_at] number  NOT NULL ,
    [identifier] string  NOT NULL ,
    CONSTRAINT [PK_Servers] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE INDEX [idx_Servers_url]
ON [Servers] ([url])

CREATE INDEX [idx_Servers_last_active_at]
ON [Servers] ([last_active_at])

CREATE INDEX [idx_Servers_identifier]
ON [Servers] ([identifier])

COMMIT TRANSACTION QUICKDBD