# Server Data DB


Category
-
id PK string
collapsed bool
display_name string
muted bool
sort_order number
sorting string # alpha, recent, manual
team_id string INDEX
type string  # 'channels' | 'direct_messages' | 'favorites' | 'custom'


CategoryChannel
-
category_id string INDEX
channel_id string INDEX
sort_order number


Channel
-
id PK string
create_at string
creator_id string INDEX
delete_at number
display_name string
is_group_constrained bool
name string INDEX
shared bool
team_id string INDEX
type string
update_at number


ChannelInfo
-
id string
guest_count number
header string
member_count number
pinned_post_count number
purpose string

ChannelMembership
-
channel_id string  INDEX
user_id string  INDEX

CustomEmoji
-
id PK string
name string


Draft
-
channel_id  INDEX
files string #stringify (array)
message string
root_id string INDEX NULL


File
-
id PK string
extension string
height number
image_thumbnail string #base64 data string
local_path  string NULL
mime_type string
name string
post_id string INDEX
size number
width number


MyChannel
-
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
notify_props string


MyTeam
- 
roles string



Post
-
id PK string
channel_id string INDEX
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
type string
update_at number
user_id string INDEX


PostsInChannel
-
channel_id string  INDEX
earliest number
latest number


PostsInThread
-
earliest number
latest number
root_id string


Preference
-
id string PK
category string INDEX
name string
user_id string INDEX
value string


Reaction
-
id PK string
create_at number
emoji_name string
post_id string INDEX
user_id string INDEX


Role
-
id PK string
name string
permissions string #stringify array


SlashCommand
-
id PK string
description string
display_name string
hint string
is_auto_complete boolean
method string
team_id string INDEX
token string
trigger string
update_at number


System
-
id PK string
value string # SYSTEM_IDENTIFIERS


Team
-
id PK string
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
channel_ids string # stringified JSON array; FIFO


TeamMembership
-
team_id string INDEX
user_id string INDEX


TeamSearchHistory
-
created_at number
display_term string
team_id string INDEX
term string


TermsOfService
-
id PK string
accepted_at number


Thread
-
id PK string # root post id only
last_reply_at number
last_viewed_at number
is_following boolean
reply_count number
unread_replies number
unread_mentions number
loaded_in_global_threads boolean


ThreadsInTeam
-
team_id string INDEX
thread_id string INDEX


ThreadParticipant
-
thread_id string INDEX
user_id string INDEX


User
-
id PK string
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
