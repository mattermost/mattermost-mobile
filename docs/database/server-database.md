# Server Database - Schema Version 1
# Please bump the version by 1, any time the schema changes.
# Don't forget to write a migration in the code.


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
channel_id string INDEX FK - MyChannel.id
sort_order number


Channel
-
id PK string FK - CategoryChannel.channel_id # server-generated
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
id PK string # same value as Channel.id
guest_count number
header string
member_count number
pinned_post_count number
purpose string

ChannelMembership
-
id PK string # composition ID Channel.id-User.id
channel_id string INDEX FK >- Channel.id
user_id string INDEX

CustomEmoji
-
id PK string # auto-generated
name string


Draft
-
id PK string # auto-generated
channel_id  INDEX FK >- Channel.id
files string #stringify (array)
message string
root_id string INDEX NULL


File
-
id PK string # server-generated
extension string
height number
image_thumbnail string #base64 data string or filepath for video thumbnails
local_path  string NULL
mime_type string
name string
post_id string INDEX
size number
width number


MyChannel
-
id PK string # same as Channel.id
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
id PK string # same as Channel.id
notify_props string


MyTeam
- 
id PK string # same as Team.id
roles string



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
type string
update_at number
user_id string INDEX


PostsInChannel
-
id PK string # auto-generated
channel_id string  INDEX FK >- Channel.id #
earliest number
latest number


PostsInThread
-
id PK string # auto-generated
earliest number
latest number
root_id string


Preference
-
id string PK # server-generated
category string INDEX
name string
user_id string INDEX
value string


Reaction
-
id PK string # server-generated
create_at number
emoji_name string
post_id string INDEX
user_id string INDEX


Role
-
id PK string # server-generated
name string
permissions string #stringify array


SlashCommand ## do we need it ?
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
id PK string # same as Team.id
channel_ids string # stringified JSON array; FIFO


TeamMembership
-
id PK string # auto-generated
team_id string INDEX
user_id string INDEX


TeamSearchHistory
-
id PK string # same as Team.id
created_at number
display_term string
term string


TermsOfService ## ???
-
id PK string
accepted_at number


Thread
-
id PK string # similar to Post.id but for root post only
last_reply_at number
last_viewed_at number
is_following boolean
reply_count number
unread_replies number
unread_mentions number


ThreadsInTeam
-
id PK string # auto-generated
team_id string INDEX
thread_id string INDEX
loaded_in_global_threads boolean

ThreadParticipant # who is participating in this conversation
-
id PK string # auto-generated
thread_id string INDEX
user_id string INDEX


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
