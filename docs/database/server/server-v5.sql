-- Exported from QuickDBD: https://www.quickdatabasediagrams.com/
-- NOTE! If you have used non-SQL datatypes in your design, you will have to change these here.

-- Server Database - Schema Version 20
-- Please bump the version by 1, any time the schema changes.
-- Also, include the migration plan under app/database/migration/server,
-- update all models, relationships and types.
-- Lastly, export all PNGs, SVGs, etc under the source project (./docs/database)
-- If you have any question/queries that you would like to clarify, please reach out to the Mobile Platform Team.

CREATE TABLE "Category" (
    -- server-generated
    "id" string   NOT NULL,
    "collapsed" bool   NOT NULL,
    "display_name" string   NOT NULL,
    "muted" bool   NOT NULL,
    "sort_order" number   NOT NULL,
    -- alpha, recent, manual
    "sorting" string   NOT NULL,
    "team_id" string   NOT NULL,
    -- 'channels' | 'direct_messages' | 'favorites' | 'custom'
    "type" string   NOT NULL,
    CONSTRAINT "pk_Category" PRIMARY KEY (
        "id"
     )
);

CREATE TABLE "CategoryChannel" (
    -- composition ID Team.id_Channel.id
    "id" string   NOT NULL,
    "category_id" string   NOT NULL,
    "channel_id" string   NOT NULL,
    "sort_order" number   NOT NULL,
    CONSTRAINT "pk_CategoryChannel" PRIMARY KEY (
        "id"
     )
);

CREATE TABLE "Channel" (
    -- server-generated
    "id" string   NOT NULL,
    "create_at" string   NOT NULL,
    "creator_id" string   NOT NULL,
    "delete_at" number   NOT NULL,
    "display_name" string   NOT NULL,
    "is_group_constrained" bool   NOT NULL,
    "name" string   NOT NULL,
    "shared" bool   NOT NULL,
    "team_id" string   NOT NULL,
    "type" string   NOT NULL,
    "update_at" number   NOT NULL,
    "banner_info" string   NOT NULL,
    "abac_policy_enforced" boolean   NOT NULL,
    "autotranslation" boolean   NOT NULL,
    CONSTRAINT "pk_Channel" PRIMARY KEY (
        "id"
     )
);

CREATE TABLE "ChannelInfo" (
    -- same value as Channel.id
    "id" string   NOT NULL,
    "guest_count" number   NOT NULL,
    "header" string   NOT NULL,
    "member_count" number   NOT NULL,
    "pinned_post_count" number   NOT NULL,
    "files_count" number   NOT NULL,
    "purpose" string   NOT NULL,
    CONSTRAINT "pk_ChannelInfo" PRIMARY KEY (
        "id"
     )
);

CREATE TABLE "ChannelMembership" (
    -- composition ID Channel.id-User.id
    "id" string   NOT NULL,
    "channel_id" string   NOT NULL,
    "user_id" string   NOT NULL,
    "scheme_admin" bool   NOT NULL,
    CONSTRAINT "pk_ChannelMembership" PRIMARY KEY (
        "id"
     )
);

CREATE TABLE "CustomEmoji" (
    -- auto-generated
    "id" string   NOT NULL,
    "name" string   NOT NULL,
    CONSTRAINT "pk_CustomEmoji" PRIMARY KEY (
        "id"
     )
);

CREATE TABLE "CustomProfileField" (
    -- server-generated
    "id" string   NOT NULL,
    "group_id" string   NOT NULL,
    "name" string   NOT NULL,
    "type" string   NOT NULL,
    "target_id" string   NOT NULL,
    "target_type" string   NOT NULL,
    "create_at" number   NOT NULL,
    "update_at" number   NOT NULL,
    "delete_at" number   NOT NULL,
    -- stringified JSON
    "attrs" string   NULL,
    CONSTRAINT "pk_CustomProfileField" PRIMARY KEY (
        "id"
     )
);

CREATE TABLE "CustomProfileAttribute" (
    -- composition ID User.id-CustomProfileField.id
    "id" string   NOT NULL,
    "field_id" string   NOT NULL,
    "user_id" string   NOT NULL,
    "value" string   NOT NULL,
    CONSTRAINT "pk_CustomProfileAttribute" PRIMARY KEY (
        "id"
     )
);

CREATE TABLE "Draft" (
    -- auto-generated
    "id" string   NOT NULL,
    "channel_id" string   NOT NULL,
    -- stringify (array)
    "files" string   NOT NULL,
    "message" string   NOT NULL,
    "root_id" string   NULL,
    "type" string   NULL,
    CONSTRAINT "pk_Draft" PRIMARY KEY (
        "id"
     )
);

CREATE TABLE "ScheduledPost" (
    -- auto-generated
    "id" string   NOT NULL,
    "channel_id" string   NOT NULL,
    -- stringify (array)
    "files" string   NOT NULL,
    "message" string   NOT NULL,
    "root_id" string   NULL,
    "metadata" string   NULL,
    "create_at" number   NOT NULL,
    "update_at" number   NOT NULL,
    "scheduled_at" number   NOT NULL,
    "processed_at" number   NULL,
    "error_code" string   NOT NULL,
    "type" string   NULL,
    CONSTRAINT "pk_ScheduledPost" PRIMARY KEY (
        "id"
     )
);

-- Free plan table limit reached. SUBSCRIBE for more.



ALTER TABLE "Category" ADD CONSTRAINT "fk_Category_team_id" FOREIGN KEY("team_id")
REFERENCES "Team" ("id");

ALTER TABLE "CategoryChannel" ADD CONSTRAINT "fk_CategoryChannel_category_id" FOREIGN KEY("category_id")
REFERENCES "Category" ("id");

ALTER TABLE "Channel" ADD CONSTRAINT "fk_Channel_id" FOREIGN KEY("id")
REFERENCES "CategoryChannel" ("channel_id");

ALTER TABLE "Channel" ADD CONSTRAINT "fk_Channel_creator_id" FOREIGN KEY("creator_id")
REFERENCES "User" ("id");

ALTER TABLE "Channel" ADD CONSTRAINT "fk_Channel_team_id" FOREIGN KEY("team_id")
REFERENCES "Team" ("id");

ALTER TABLE "ChannelInfo" ADD CONSTRAINT "fk_ChannelInfo_id" FOREIGN KEY("id")
REFERENCES "Channel" ("id");

ALTER TABLE "ChannelMembership" ADD CONSTRAINT "fk_ChannelMembership_channel_id" FOREIGN KEY("channel_id")
REFERENCES "Channel" ("id");

ALTER TABLE "ChannelMembership" ADD CONSTRAINT "fk_ChannelMembership_user_id" FOREIGN KEY("user_id")
REFERENCES "User" ("id");

ALTER TABLE "CustomProfileAttribute" ADD CONSTRAINT "fk_CustomProfileAttribute_field_id" FOREIGN KEY("field_id")
REFERENCES "CustomProfileField" ("id");

ALTER TABLE "CustomProfileAttribute" ADD CONSTRAINT "fk_CustomProfileAttribute_user_id" FOREIGN KEY("user_id")
REFERENCES "User" ("id");

ALTER TABLE "Draft" ADD CONSTRAINT "fk_Draft_channel_id" FOREIGN KEY("channel_id")
REFERENCES "Channel" ("id");

ALTER TABLE "Draft" ADD CONSTRAINT "fk_Draft_root_id" FOREIGN KEY("root_id")
REFERENCES "Post" ("id");

ALTER TABLE "ScheduledPost" ADD CONSTRAINT "fk_ScheduledPost_channel_id" FOREIGN KEY("channel_id")
REFERENCES "Channel" ("id");

ALTER TABLE "ScheduledPost" ADD CONSTRAINT "fk_ScheduledPost_root_id" FOREIGN KEY("root_id")
REFERENCES "Post" ("id");

-- Free plan table limit reached. SUBSCRIBE for more.



CREATE INDEX "idx_Category_team_id"
ON "Category" ("team_id");

CREATE INDEX "idx_CategoryChannel_category_id"
ON "CategoryChannel" ("category_id");

CREATE INDEX "idx_CategoryChannel_channel_id"
ON "CategoryChannel" ("channel_id");

CREATE INDEX "idx_Channel_creator_id"
ON "Channel" ("creator_id");

CREATE INDEX "idx_Channel_name"
ON "Channel" ("name");

CREATE INDEX "idx_Channel_team_id"
ON "Channel" ("team_id");

CREATE INDEX "idx_ChannelMembership_channel_id"
ON "ChannelMembership" ("channel_id");

CREATE INDEX "idx_ChannelMembership_user_id"
ON "ChannelMembership" ("user_id");

CREATE INDEX "idx_CustomProfileAttribute_field_id"
ON "CustomProfileAttribute" ("field_id");

CREATE INDEX "idx_CustomProfileAttribute_user_id"
ON "CustomProfileAttribute" ("user_id");

CREATE INDEX "idx_Draft_channel_id"
ON "Draft" ("channel_id");

CREATE INDEX "idx_Draft_root_id"
ON "Draft" ("root_id");

CREATE INDEX "idx_ScheduledPost_channel_id"
ON "ScheduledPost" ("channel_id");

CREATE INDEX "idx_ScheduledPost_root_id"
ON "ScheduledPost" ("root_id");

-- Free plan table limit reached. SUBSCRIBE for more.



