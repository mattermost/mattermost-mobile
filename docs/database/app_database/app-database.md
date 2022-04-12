# App Database - Schema Version 1
# Please bump the version by 1, any time the schema changes.
# Also, include the migration plan under app/database/migration/server,
# update all models, relationships and types.
# Lastly, export all PNGs, SVGs, etc under the source project (./docs/database)
# If you have any question/queries that you would like to clarify, please reach out to the Mobile Platform Team.


Info
-
id PK string # auto-generated
build_number string
created_at number
version_number string


Global
-
id PK string # GLOBAL_IDENTIFIERS
value string


Servers
-
id PK string # auto-generated
db_path string
display_name string
url string INDEX
last_active_at number INDEX
identifier string INDEX
