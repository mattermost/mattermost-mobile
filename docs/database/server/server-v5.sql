-- Exported from QuickDBD: https://www.quickdatabasediagrams.com/
-- Link to schema: https://app.quickdatabasediagrams.com/#/d/7cAwTM
-- NOTE! If you have used non-SQL datatypes in your design, you will have to change these here.

-- Server Database - Schema Version 2
-- Please bump the version by 1, any time the schema changes.
-- Also, include the migration plan under app/database/migration/server,
-- update all models, relationships and types.
-- Lastly, export all PNGs, SVGs, etc under the source project (./docs/database)
-- If you have any question/queries that you would like to clarify, please reach out to the Mobile Platform Team.

SET XACT_ABORT ON

BEGIN TRANSACTION QUICKDBD

CREATE TABLE [Category] (
    -- server-generated
    [id] string  NOT NULL ,
    [collapsed] bool  NOT NULL ,
    [display_name] string  NOT NULL ,
    [muted] bool  NOT NULL ,
    [sort_order] number  NOT NULL ,
    -- alpha, recent, manual
    [sorting] string  NOT NULL ,
    [team_id] string  NOT NULL ,
    -- 'channels' | 'direct_messages' | 'favorites' | 'custom'
    [type] string  NOT NULL ,
    CONSTRAINT [PK_Category] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [CategoryChannel] (
    -- composition ID Team.id_Channel.id
    [id] string  NOT NULL ,
    [category_id] string  NOT NULL ,
    [channel_id] string  NOT NULL ,
    [sort_order] number  NOT NULL ,
    CONSTRAINT [PK_CategoryChannel] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [Channel] (
    -- server-generated
    [id] string  NOT NULL ,
    [create_at] string  NOT NULL ,
    [creator_id] string  NOT NULL ,
    [delete_at] number  NOT NULL ,
    [display_name] string  NOT NULL ,
    [is_group_constrained] bool  NOT NULL ,
    [name] string  NOT NULL ,
    [shared] bool  NOT NULL ,
    [team_id] string  NOT NULL ,
    [type] string  NOT NULL ,
    [update_at] number  NOT NULL ,
    [banner_info] string,
    [abac_policy_enforced] boolean  NOT NULL ,
    CONSTRAINT [PK_Channel] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [ChannelInfo] (
    -- same value as Channel.id
    [id] string  NOT NULL ,
    [guest_count] number  NOT NULL ,
    [header] string  NOT NULL ,
    [member_count] number  NOT NULL ,
    [pinned_post_count] number  NOT NULL ,
    [files_count] number  NOT NULL ,
    [purpose] string  NOT NULL ,
    CONSTRAINT [PK_ChannelInfo] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [ChannelMembership] (
    -- composition ID Channel.id-User.id
    [id] string  NOT NULL ,
    [channel_id] string  NOT NULL ,
    [user_id] string  NOT NULL ,
    [scheme_admin] bool  NOT NULL ,
    CONSTRAINT [PK_ChannelMembership] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [CustomEmoji] (
    -- auto-generated
    [id] string  NOT NULL ,
    [name] string  NOT NULL ,
    CONSTRAINT [PK_CustomEmoji] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [Draft] (
    -- auto-generated
    [id] string  NOT NULL ,
    [channel_id] string  NOT NULL ,
    -- stringify (array)
    [files] string  NOT NULL ,
    [message] string  NOT NULL ,
    [root_id] string  NULL ,
    [update_at] number  NOT NULL ,
    CONSTRAINT [PK_Draft] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [File] (
    -- server-generated
    [id] string  NOT NULL ,
    [extension] string  NOT NULL ,
    [height] number  NOT NULL ,
    -- base64 data string or filepath for video thumbnails
    [image_thumbnail] string  NOT NULL ,
    [local_path] string  NULL ,
    [mime_type] string  NOT NULL ,
    [name] string  NOT NULL ,
    [post_id] string  NOT NULL ,
    [size] number  NOT NULL ,
    [width] number  NOT NULL ,
    CONSTRAINT [PK_File] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [Group] (
    -- server-generated
    [id] string  NOT NULL ,
    [name] string  NOT NULL ,
    [display_name] string  NOT NULL ,
    [description] string  NOT NULL ,
    [remote_id] string  NOT NULL ,
    [source] string  NOT NULL ,
    [created_at] number  NOT NULL ,
    [updated_at] number  NOT NULL ,
    [deleted_at] number  NOT NULL ,
    CONSTRAINT [PK_Group] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [GroupChannel] (
    -- composition ID Group.id-Channel.id
    [id] string  NOT NULL ,
    [group_id] string  NOT NULL ,
    [channel_id] string  NOT NULL ,
    [created_at] number  NOT NULL ,
    [updated_at] number  NOT NULL ,
    [deleted_at] number  NOT NULL ,
    CONSTRAINT [PK_GroupChannel] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [GroupMembership] (
    -- composition ID Group.id-User.id
    [id] string  NOT NULL ,
    [group_id] string  NOT NULL ,
    [user_id] string  NOT NULL ,
    [created_at] number  NOT NULL ,
    [updated_at] number  NOT NULL ,
    [deleted_at] number  NOT NULL ,
    CONSTRAINT [PK_GroupMembership] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [GroupTeam] (
    -- composition ID Group.id-Team.id
    [id] string  NOT NULL ,
    [group_id] string  NOT NULL ,
    [team_id] string  NOT NULL ,
    [created_at] number  NOT NULL ,
    [updated_at] number  NOT NULL ,
    [deleted_at] number  NOT NULL ,
    CONSTRAINT [PK_GroupTeam] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [MyChannel] (
    -- same as Channel.id
    [id] string  NOT NULL ,
    [is_unread] boolean  NOT NULL ,
    [last_post_at] number  NOT NULL ,
    [last_viewed_at] number  NOT NULL ,
    [manually_unread] boolean  NOT NULL ,
    [mentions_count] number  NOT NULL ,
    [message_count] number  NOT NULL ,
    [roles] string  NOT NULL ,
    [viewed_at] number  NOT NULL ,
    CONSTRAINT [PK_MyChannel] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [MyChannelSettings] (
    -- same as Channel.id
    [id] string  NOT NULL ,
    [notify_props] string  NOT NULL ,
    CONSTRAINT [PK_MyChannelSettings] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [MyTeam] (
    -- same as Team.id
    [id] string  NOT NULL ,
    [roles] string  NOT NULL ,
    CONSTRAINT [PK_MyTeam] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [Post] (
    -- server generated
    [id] string  NOT NULL ,
    [channel_id] string  NOT NULL ,
    [create_at] number  NOT NULL ,
    [delete_at] number  NOT NULL ,
    [edit_at] number  NOT NULL ,
    [is_pinned] boolean  NOT NULL ,
    [message] string  NOT NULL ,
    [metadata] string  NULL ,
    [original_id] string  NOT NULL ,
    [pending_post_id] string  NOT NULL ,
    [previous_post_id] string  NOT NULL ,
    [props] string  NOT NULL ,
    [root_id] string  NOT NULL ,
    [type] string  NOT NULL ,
    [update_at] number  NOT NULL ,
    [user_id] string  NOT NULL ,
    CONSTRAINT [PK_Post] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [PostsInChannel] (
    -- auto-generated
    [id] string  NOT NULL ,
    [channel_id] string  NOT NULL ,
    [earliest] number  NOT NULL ,
    [latest] number  NOT NULL ,
    CONSTRAINT [PK_PostsInChannel] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [PostsInThread] (
    -- auto-generated
    [id] string  NOT NULL ,
    [earliest] number  NOT NULL ,
    [latest] number  NOT NULL ,
    [root_id] string  NOT NULL ,
    CONSTRAINT [PK_PostsInThread] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [Preference] (
    -- server-generated
    [id] string  NOT NULL ,
    [category] string  NOT NULL ,
    [name] string  NOT NULL ,
    [user_id] string  NOT NULL ,
    [value] string  NOT NULL ,
    CONSTRAINT [PK_Preference] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [Reaction] (
    -- server-generated
    [id] string  NOT NULL ,
    [create_at] number  NOT NULL ,
    [emoji_name] string  NOT NULL ,
    [post_id] string  NOT NULL ,
    [user_id] string  NOT NULL ,
    CONSTRAINT [PK_Reaction] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [Role] (
    -- server-generated
    [id] string  NOT NULL ,
    [name] string  NOT NULL ,
    -- stringify array
    [permissions] string  NOT NULL ,
    CONSTRAINT [PK_Role] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [System] (
    -- SYSTEM_IDENTIFIERS
    [id] string  NOT NULL ,
    [value] string  NOT NULL ,
    CONSTRAINT [PK_System] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [Team] (
    -- server-generated
    [id] string  NOT NULL ,
    [allowed_domains] string  NOT NULL ,
    [description] string  NOT NULL ,
    [display_name] string  NOT NULL ,
    [is_allow_open_invite] boolean  NOT NULL ,
    [is_group_constrained] boolean  NOT NULL ,
    [last_team_icon_updated_at] number  NOT NULL ,
    [name] string  NOT NULL ,
    [type] string  NOT NULL ,
    [update_at] number  NOT NULL ,
    CONSTRAINT [PK_Team] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [TeamChannelHistory] (
    -- same as Team.id
    [id] string  NOT NULL ,
    -- stringified JSON array; FIFO
    [channel_ids] string  NOT NULL ,
    CONSTRAINT [PK_TeamChannelHistory] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [TeamMembership] (
    -- auto-generated
    [id] string  NOT NULL ,
    [team_id] string  NOT NULL ,
    [user_id] string  NOT NULL ,
    [scheme_admin] bool  NOT NULL ,
    CONSTRAINT [PK_TeamMembership] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [TeamSearchHistory] (
    -- auto-generated
    [id] string  NOT NULL ,
    [created_at] number  NOT NULL ,
    [display_term] string  NOT NULL ,
    [team_id] string  NOT NULL ,
    [term] string  NOT NULL ,
    CONSTRAINT [PK_TeamSearchHistory] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [Thread] (
    -- similar to Post.id but for root post only
    [id] string  NOT NULL ,
    [is_following] boolean  NOT NULL ,
    [last_reply_at] number  NOT NULL ,
    [last_viewed_at] number  NOT NULL ,
    [reply_count] number  NOT NULL ,
    [unread_mentions] number  NOT NULL ,
    [unread_replies] number  NOT NULL ,
    [viewed_at] number  NOT NULL ,
    CONSTRAINT [PK_Thread] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [ThreadsInTeam] (
    -- auto-generated
    [id] string  NOT NULL ,
    [loaded_in_global_threads] boolean  NOT NULL ,
    [team_id] string  NOT NULL ,
    [thread_id] string  NOT NULL ,
    CONSTRAINT [PK_ThreadsInTeam] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

-- who is participating in this conversation
CREATE TABLE [ThreadParticipant] (
    -- auto-generated
    [id] string  NOT NULL ,
    [thread_id] string  NOT NULL ,
    [user_id] string  NOT NULL ,
    CONSTRAINT [PK_ThreadParticipant] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

CREATE TABLE [User] (
    -- server generated
    [id] string  NOT NULL ,
    [auth_service] string  NOT NULL ,
    [delete_at] number  NOT NULL ,
    [email] string  NOT NULL ,
    [first_name] string  NOT NULL ,
    [is_bot] boolean  NOT NULL ,
    [is_guest] boolean  NOT NULL ,
    [last_name] string  NOT NULL ,
    [last_picture_update] number  NOT NULL ,
    [locale] string  NOT NULL ,
    [nickname] string  NOT NULL ,
    [notify_props] string  NOT NULL ,
    [position] string  NOT NULL ,
    [props] string  NOT NULL ,
    [remote_id] string  NULL ,
    [roles] string  NOT NULL ,
    [status] string  NOT NULL ,
    [timezone] string  NOT NULL ,
    [update_at] number  NOT NULL ,
    [username] string  NOT NULL ,
    CONSTRAINT [PK_User] PRIMARY KEY CLUSTERED (
        [id] ASC
    )
)

ALTER TABLE [Category] WITH CHECK ADD CONSTRAINT [FK_Category_team_id] FOREIGN KEY([team_id])
REFERENCES [Team] ([id])

ALTER TABLE [Category] CHECK CONSTRAINT [FK_Category_team_id]

ALTER TABLE [CategoryChannel] WITH CHECK ADD CONSTRAINT [FK_CategoryChannel_category_id] FOREIGN KEY([category_id])
REFERENCES [Category] ([id])

ALTER TABLE [CategoryChannel] CHECK CONSTRAINT [FK_CategoryChannel_category_id]

ALTER TABLE [Channel] WITH CHECK ADD CONSTRAINT [FK_Channel_id] FOREIGN KEY([id])
REFERENCES [CategoryChannel] ([channel_id])

ALTER TABLE [Channel] CHECK CONSTRAINT [FK_Channel_id]

ALTER TABLE [Channel] WITH CHECK ADD CONSTRAINT [FK_Channel_creator_id] FOREIGN KEY([creator_id])
REFERENCES [User] ([id])

ALTER TABLE [Channel] CHECK CONSTRAINT [FK_Channel_creator_id]

ALTER TABLE [Channel] WITH CHECK ADD CONSTRAINT [FK_Channel_team_id] FOREIGN KEY([team_id])
REFERENCES [Team] ([id])

ALTER TABLE [Channel] CHECK CONSTRAINT [FK_Channel_team_id]

ALTER TABLE [ChannelInfo] WITH CHECK ADD CONSTRAINT [FK_ChannelInfo_id] FOREIGN KEY([id])
REFERENCES [Channel] ([id])

ALTER TABLE [ChannelInfo] CHECK CONSTRAINT [FK_ChannelInfo_id]

ALTER TABLE [ChannelMembership] WITH CHECK ADD CONSTRAINT [FK_ChannelMembership_channel_id] FOREIGN KEY([channel_id])
REFERENCES [Channel] ([id])

ALTER TABLE [ChannelMembership] CHECK CONSTRAINT [FK_ChannelMembership_channel_id]

ALTER TABLE [ChannelMembership] WITH CHECK ADD CONSTRAINT [FK_ChannelMembership_user_id] FOREIGN KEY([user_id])
REFERENCES [User] ([id])

ALTER TABLE [ChannelMembership] CHECK CONSTRAINT [FK_ChannelMembership_user_id]

ALTER TABLE [Draft] WITH CHECK ADD CONSTRAINT [FK_Draft_channel_id] FOREIGN KEY([channel_id])
REFERENCES [Channel] ([id])

ALTER TABLE [Draft] CHECK CONSTRAINT [FK_Draft_channel_id]

ALTER TABLE [Draft] WITH CHECK ADD CONSTRAINT [FK_Draft_root_id] FOREIGN KEY([root_id])
REFERENCES [Post] ([id])

ALTER TABLE [Draft] CHECK CONSTRAINT [FK_Draft_root_id]

ALTER TABLE [File] WITH CHECK ADD CONSTRAINT [FK_File_post_id] FOREIGN KEY([post_id])
REFERENCES [Post] ([id])

ALTER TABLE [File] CHECK CONSTRAINT [FK_File_post_id]

ALTER TABLE [GroupChannel] WITH CHECK ADD CONSTRAINT [FK_GroupChannel_group_id] FOREIGN KEY([group_id])
REFERENCES [Group] ([id])

ALTER TABLE [GroupChannel] CHECK CONSTRAINT [FK_GroupChannel_group_id]

ALTER TABLE [GroupChannel] WITH CHECK ADD CONSTRAINT [FK_GroupChannel_channel_id] FOREIGN KEY([channel_id])
REFERENCES [Channel] ([id])

ALTER TABLE [GroupChannel] CHECK CONSTRAINT [FK_GroupChannel_channel_id]

ALTER TABLE [GroupMembership] WITH CHECK ADD CONSTRAINT [FK_GroupMembership_group_id] FOREIGN KEY([group_id])
REFERENCES [Group] ([id])

ALTER TABLE [GroupMembership] CHECK CONSTRAINT [FK_GroupMembership_group_id]

ALTER TABLE [GroupMembership] WITH CHECK ADD CONSTRAINT [FK_GroupMembership_user_id] FOREIGN KEY([user_id])
REFERENCES [User] ([id])

ALTER TABLE [GroupMembership] CHECK CONSTRAINT [FK_GroupMembership_user_id]

ALTER TABLE [GroupTeam] WITH CHECK ADD CONSTRAINT [FK_GroupTeam_group_id] FOREIGN KEY([group_id])
REFERENCES [Group] ([id])

ALTER TABLE [GroupTeam] CHECK CONSTRAINT [FK_GroupTeam_group_id]

ALTER TABLE [GroupTeam] WITH CHECK ADD CONSTRAINT [FK_GroupTeam_team_id] FOREIGN KEY([team_id])
REFERENCES [Team] ([id])

ALTER TABLE [GroupTeam] CHECK CONSTRAINT [FK_GroupTeam_team_id]

ALTER TABLE [MyChannel] WITH CHECK ADD CONSTRAINT [FK_MyChannel_id] FOREIGN KEY([id])
REFERENCES [Channel] ([id])

ALTER TABLE [MyChannel] CHECK CONSTRAINT [FK_MyChannel_id]

ALTER TABLE [MyChannelSettings] WITH CHECK ADD CONSTRAINT [FK_MyChannelSettings_id] FOREIGN KEY([id])
REFERENCES [MyChannel] ([id])

ALTER TABLE [MyChannelSettings] CHECK CONSTRAINT [FK_MyChannelSettings_id]

ALTER TABLE [MyTeam] WITH CHECK ADD CONSTRAINT [FK_MyTeam_id] FOREIGN KEY([id])
REFERENCES [Team] ([id])

ALTER TABLE [MyTeam] CHECK CONSTRAINT [FK_MyTeam_id]

ALTER TABLE [Post] WITH CHECK ADD CONSTRAINT [FK_Post_channel_id] FOREIGN KEY([channel_id])
REFERENCES [Channel] ([id])

ALTER TABLE [Post] CHECK CONSTRAINT [FK_Post_channel_id]

ALTER TABLE [Post] WITH CHECK ADD CONSTRAINT [FK_Post_user_id] FOREIGN KEY([user_id])
REFERENCES [User] ([id])

ALTER TABLE [Post] CHECK CONSTRAINT [FK_Post_user_id]

ALTER TABLE [PostsInChannel] WITH CHECK ADD CONSTRAINT [FK_PostsInChannel_channel_id] FOREIGN KEY([channel_id])
REFERENCES [Channel] ([id])

ALTER TABLE [PostsInChannel] CHECK CONSTRAINT [FK_PostsInChannel_channel_id]

ALTER TABLE [PostsInThread] WITH CHECK ADD CONSTRAINT [FK_PostsInThread_root_id] FOREIGN KEY([root_id])
REFERENCES [Post] ([id])

ALTER TABLE [PostsInThread] CHECK CONSTRAINT [FK_PostsInThread_root_id]

ALTER TABLE [Preference] WITH CHECK ADD CONSTRAINT [FK_Preference_user_id] FOREIGN KEY([user_id])
REFERENCES [User] ([id])

ALTER TABLE [Preference] CHECK CONSTRAINT [FK_Preference_user_id]

ALTER TABLE [Reaction] WITH CHECK ADD CONSTRAINT [FK_Reaction_post_id] FOREIGN KEY([post_id])
REFERENCES [Post] ([id])

ALTER TABLE [Reaction] CHECK CONSTRAINT [FK_Reaction_post_id]

ALTER TABLE [Reaction] WITH CHECK ADD CONSTRAINT [FK_Reaction_user_id] FOREIGN KEY([user_id])
REFERENCES [User] ([id])

ALTER TABLE [Reaction] CHECK CONSTRAINT [FK_Reaction_user_id]

ALTER TABLE [TeamChannelHistory] WITH CHECK ADD CONSTRAINT [FK_TeamChannelHistory_id] FOREIGN KEY([id])
REFERENCES [Team] ([id])

ALTER TABLE [TeamChannelHistory] CHECK CONSTRAINT [FK_TeamChannelHistory_id]

ALTER TABLE [TeamMembership] WITH CHECK ADD CONSTRAINT [FK_TeamMembership_team_id] FOREIGN KEY([team_id])
REFERENCES [Team] ([id])

ALTER TABLE [TeamMembership] CHECK CONSTRAINT [FK_TeamMembership_team_id]

ALTER TABLE [TeamMembership] WITH CHECK ADD CONSTRAINT [FK_TeamMembership_user_id] FOREIGN KEY([user_id])
REFERENCES [User] ([id])

ALTER TABLE [TeamMembership] CHECK CONSTRAINT [FK_TeamMembership_user_id]

ALTER TABLE [TeamSearchHistory] WITH CHECK ADD CONSTRAINT [FK_TeamSearchHistory_team_id] FOREIGN KEY([team_id])
REFERENCES [Team] ([id])

ALTER TABLE [TeamSearchHistory] CHECK CONSTRAINT [FK_TeamSearchHistory_team_id]

ALTER TABLE [Thread] WITH CHECK ADD CONSTRAINT [FK_Thread_id] FOREIGN KEY([id])
REFERENCES [Post] ([id])

ALTER TABLE [Thread] CHECK CONSTRAINT [FK_Thread_id]

ALTER TABLE [ThreadsInTeam] WITH CHECK ADD CONSTRAINT [FK_ThreadsInTeam_team_id] FOREIGN KEY([team_id])
REFERENCES [Team] ([id])

ALTER TABLE [ThreadsInTeam] CHECK CONSTRAINT [FK_ThreadsInTeam_team_id]

ALTER TABLE [ThreadsInTeam] WITH CHECK ADD CONSTRAINT [FK_ThreadsInTeam_thread_id] FOREIGN KEY([thread_id])
REFERENCES [Thread] ([id])

ALTER TABLE [ThreadsInTeam] CHECK CONSTRAINT [FK_ThreadsInTeam_thread_id]

ALTER TABLE [ThreadParticipant] WITH CHECK ADD CONSTRAINT [FK_ThreadParticipant_thread_id] FOREIGN KEY([thread_id])
REFERENCES [Thread] ([id])

ALTER TABLE [ThreadParticipant] CHECK CONSTRAINT [FK_ThreadParticipant_thread_id]

ALTER TABLE [ThreadParticipant] WITH CHECK ADD CONSTRAINT [FK_ThreadParticipant_user_id] FOREIGN KEY([user_id])
REFERENCES [User] ([id])

ALTER TABLE [ThreadParticipant] CHECK CONSTRAINT [FK_ThreadParticipant_user_id]

CREATE INDEX [idx_Category_team_id]
ON [Category] ([team_id])

CREATE INDEX [idx_CategoryChannel_category_id]
ON [CategoryChannel] ([category_id])

CREATE INDEX [idx_CategoryChannel_channel_id]
ON [CategoryChannel] ([channel_id])

CREATE INDEX [idx_Channel_creator_id]
ON [Channel] ([creator_id])

CREATE INDEX [idx_Channel_name]
ON [Channel] ([name])

CREATE INDEX [idx_Channel_team_id]
ON [Channel] ([team_id])

CREATE INDEX [idx_ChannelMembership_channel_id]
ON [ChannelMembership] ([channel_id])

CREATE INDEX [idx_ChannelMembership_user_id]
ON [ChannelMembership] ([user_id])

CREATE INDEX [idx_Draft_channel_id]
ON [Draft] ([channel_id])

CREATE INDEX [idx_Draft_root_id]
ON [Draft] ([root_id])

CREATE INDEX [idx_File_post_id]
ON [File] ([post_id])

CREATE INDEX [idx_Group_name]
ON [Group] ([name])

CREATE INDEX [idx_Group_remote_id]
ON [Group] ([remote_id])

CREATE INDEX [idx_GroupChannel_group_id]
ON [GroupChannel] ([group_id])

CREATE INDEX [idx_GroupChannel_channel_id]
ON [GroupChannel] ([channel_id])

CREATE INDEX [idx_GroupMembership_group_id]
ON [GroupMembership] ([group_id])

CREATE INDEX [idx_GroupMembership_user_id]
ON [GroupMembership] ([user_id])

CREATE INDEX [idx_GroupTeam_group_id]
ON [GroupTeam] ([group_id])

CREATE INDEX [idx_GroupTeam_team_id]
ON [GroupTeam] ([team_id])

CREATE INDEX [idx_Post_channel_id]
ON [Post] ([channel_id])

CREATE INDEX [idx_Post_pending_post_id]
ON [Post] ([pending_post_id])

CREATE INDEX [idx_Post_user_id]
ON [Post] ([user_id])

CREATE INDEX [idx_PostsInChannel_channel_id]
ON [PostsInChannel] ([channel_id])

CREATE INDEX [idx_Preference_category]
ON [Preference] ([category])

CREATE INDEX [idx_Preference_user_id]
ON [Preference] ([user_id])

CREATE INDEX [idx_Reaction_post_id]
ON [Reaction] ([post_id])

CREATE INDEX [idx_Reaction_user_id]
ON [Reaction] ([user_id])

CREATE INDEX [idx_TeamMembership_team_id]
ON [TeamMembership] ([team_id])

CREATE INDEX [idx_TeamMembership_user_id]
ON [TeamMembership] ([user_id])

CREATE INDEX [idx_ThreadsInTeam_team_id]
ON [ThreadsInTeam] ([team_id])

CREATE INDEX [idx_ThreadsInTeam_thread_id]
ON [ThreadsInTeam] ([thread_id])

CREATE INDEX [idx_ThreadParticipant_thread_id]
ON [ThreadParticipant] ([thread_id])

CREATE INDEX [idx_ThreadParticipant_user_id]
ON [ThreadParticipant] ([user_id])

COMMIT TRANSACTION QUICKDBD
