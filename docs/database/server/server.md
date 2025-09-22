# Server Database - Schema Version 10
# Please bump the version by 1, any time the schema changes.
# Also, include the migration plan under app/database/migration/server,
# update all models, relationships and types.
# Lastly, export all PNGs, SVGs, etc under the source project (./docs/database)
# If you have any question/queries that you would like to clarify, please reach out to the Mobile Platform Team.


Category
-
id PK string # server-generated
collapsed bool
display_name string
muted bool
sort_order number
sorting string # alpha, recent, manual
team_id string INDEX FK >- Team.id
type string  # 'channels' | 'direct_messages' | 'favorites' | 'custom'


CategoryChannel
-
id PK string # composition ID Team.id_Channel.id
category_id string INDEX FK >- Category.id
channel_id string INDEX
sort_order number


Channel
-
id PK string FK - CategoryChannel.channel_id # server-generated
create_at string
creator_id string INDEX FK >- User.id
delete_at number
display_name string
is_group_constrained bool
name string INDEX
shared bool
team_id string INDEX FK >- Team.id
type string
update_at number
banner_info string
abac_policy_enforced boolean


ChannelInfo
-
id PK string FK - Channel.id# same value as Channel.id
guest_count number
header string
member_count number
pinned_post_count number
files_count number
purpose string

ChannelMembership
-
id PK string # composition ID Channel.id-User.id
channel_id string INDEX FK >- Channel.id
user_id string INDEX FK >- User.id
scheme_admin bool

CustomEmoji
-
id PK string # auto-generated
name string


CustomProfileField
-
id PK string # server-generated
group_id string
name string
type string
target_id string
target_type string
create_at number
update_at number
delete_at number
attrs string NULL # stringified JSON


CustomProfileAttribute
-
id PK string # composition ID User.id-CustomProfileField.id
field_id string INDEX FK >- CustomProfileField.id
user_id string INDEX FK >- User.id
value string


Draft
-
id PK string # auto-generated
channel_id string  INDEX FK >- Channel.id
files string #stringify (array)
message string
root_id string INDEX NULL FK >- Post.id


File
-
id PK string # server-generated
extension string
height number
image_thumbnail string #base64 data string or filepath for video thumbnails
local_path  string NULL
mime_type string
name string
post_id string INDEX FK >- Post.id
size number
width number
is_blocked bool #Determines if a file has been blocked and cannot be opened anymore

Group
-
id PK string  # server-generated
name string INDEX
display_name string
description string
remote_id string INDEX
source string
created_at number
updated_at number
deleted_at number

GroupChannel
-
id PK string # composition ID Group.id-Channel.id
group_id string INDEX FK >- Group.id
channel_id string INDEX FK >- Channel.id
created_at number
updated_at number
deleted_at number

GroupMembership
-
id PK string # composition ID Group.id-User.id
group_id string INDEX FK >- Group.id
user_id string INDEX FK >- User.id
created_at number
updated_at number
deleted_at number

GroupTeam
-
id PK string # composition ID Group.id-Team.id
group_id string INDEX FK >- Group.id
team_id string INDEX FK >- Team.id
created_at number
updated_at number
deleted_at number

MyChannel
-
id PK string FK - Channel.id # same as Channel.id
is_unread boolean
last_post_at number
last_viewed_at number
manually_unread boolean
mentions_count number
message_count number
roles string
viewed_at number


MyChannelSettings
-
id PK string FK - MyChannel.id # same as Channel.id
notify_props string


MyTeam
- 
id PK string FK - Team.id # same as Team.id
roles string

PlaybookRun
-
id PK string # server-generated
playbook_id string
name string
description string
is_active boolean
active_stage number
active_stage_title string
participant_ids string # stringified array of user IDs
summary string
current_status string # (valid values InProgres, Finished)
owner_user_id string INDEX FK >- User.id
team_id string INDEX FK >- Team.id
channel_id string INDEX FK >- Channel.id
post_id string INDEX FK >- Post.id
create_at number
end_at number
delete_at number
last_status_update_at number
retrospective_enabled boolean
retrospective string
retrospective_published_at number
synced string NULL INDEX # optional field for sync status
last_sync_at number NULL # optional field for last sync timestamp

PlaybookChecklist
-
id PK string # server-generated
run_id string INDEX FK >- PlaybookRun.id
title string
sort_order number
synced string NULL INDEX # optional field for sync status
last_sync_at number NULL # optional field for last sync timestamp

PlaybookChecklistItem
-
id PK string # server-generated
checklist_id string INDEX FK >- PlaybookChecklist.id
title string
description string
state string # e.g., 'open', 'closed'
state_modified number
assignee_id string INDEX FK >- User.id
assignee_modified number
command string
command_last_run number
due_date number
task_actions string # stringified array of TaskAction
order number
completed_at number
synced string NULL INDEX # optional field for sync status
last_sync_at number NULL # optional field for last sync timestamp

Post
-
id PK string # server generated
channel_id string INDEX FK >- Channel.id
create_at number
delete_at number
edit_at number
is_pinned boolean
message string
metadata string NULL
original_id string
pending_post_id string INDEX
previous_post_id string
props string
root_id string
type string INDEX
update_at number
user_id string INDEX  FK >- User.id


PostsInChannel
-
id PK string  # auto-generated
channel_id string INDEX FK >- Channel.id
earliest number
latest number


PostsInThread
-
id PK string # auto-generated
earliest number
latest number
root_id string FK >- Post.id


Preference
-
id string PK # server-generated
category string INDEX
name string
user_id string INDEX FK >- User.id
value string


Reaction
-
id PK string # server-generated
create_at number
emoji_name string
post_id string INDEX FK >- Post.id
user_id string INDEX FK >- User.id


Role
-
id PK string # server-generated
name string
permissions string #stringify array


System
-
id PK string # SYSTEM_IDENTIFIERS
value string


Team
-
id PK string # server-generated
allowed_domains string
description string
display_name string
is_allow_open_invite boolean
is_group_constrained boolean
last_team_icon_updated_at number
name string
type string
update_at number


TeamChannelHistory
-
id PK string FK - Team.id # same as Team.id
channel_ids string # stringified JSON array; FIFO


TeamMembership
-
id PK string # auto-generated
team_id string INDEX FK >- Team.id
user_id string INDEX FK >- User.id
scheme_admin bool


TeamSearchHistory
-
id PK string # auto-generated
created_at number
display_term string
team_id string FK >- Team.id
term string


Thread
-
id PK string FK - Post.id # similar to Post.id but for root post only
is_following boolean
last_reply_at number
last_viewed_at number
reply_count number
unread_mentions number
unread_replies number  
viewed_at number


ThreadsInTeam
-
id PK string # auto-generated
loaded_in_global_threads boolean
team_id string INDEX FK >- Team.id
thread_id string INDEX FK >- Thread.id


ThreadParticipant # who is participating in this conversation
-
id PK string # auto-generated
thread_id string INDEX FK >- Thread.id
user_id string INDEX FK >- User.id


User
-
id PK string # server generated
auth_service string
delete_at number
email string
first_name string
is_bot boolean
is_guest boolean
last_name string
last_picture_update number
locale string
nickname string
notify_props string
position string
props string
remote_id string NULL
roles string
status string
timezone string
update_at number
username string
