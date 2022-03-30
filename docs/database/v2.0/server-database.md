# Server Data DB
User
-
Id PK string
IsBot bool
IsGuest bool
DeleteAt number
Username string
AuthService string
Email string
Nickname string
Firstname string
Lastname string
Status string
Roles string # comma separated Role.Name
Props string # stringified JSON obj
NotifyProps string # stringified JSON obj
LastPictureUpdate number
Locale string
Position string
Timezone string # stringified JSON obj

Team
-
Id PK string
Name string
DisplayName string
Type string
AllowedDomains string
AllowOpenInvite bool
Description string
LastTeamIconUpdatedAt number
IsGroupContrained boolean

TeamMembership
-
TeamId string FK >- Team.Id
UserId string FK  >- User.Id

TeamChannelHistory
-
TeamId string FK >- Team.Id
ChannelIds string # stringified JSON array; FIFO

TeamSearchHistory
-
TeamId string FK >- Team.Id
Term string
DisplayTerm string
CreatedAt number

MyTeam
-
TeamId string FK >- Team.Id
Roles string # comma separated Role.Name
IsUnread bool
MentionsCount number

Channel
-
Id PK string FK -< MyChannel.Id
CreateAt number
DeleteAt number
TeamId string FK >- Team.Id
Type string
Name string
DisplayName string
CreatorId string FK >- User.Id
IsGroupContrained boolean

ChannelInfo
-
ChannelId string FK - Channel.Id
Header string
Purpose string
MemberCount number
GuestCount number
PinnedPostCount number

ChannelMembership
-
ChannelId string FK >- Channel.Id
UserId string FK  >- User.Id

MyChannel
-
Id
Roles string # comma separated Role.Name
MsgCount number
MentionsCount number
LastPostAt number
LastViewedAt number

MyChannelSettings
-
ChannelId string FK >- Channel.Id
NotifyProps string # stringified JSON obj

Post
-
Id PK string
OriginalId string
ChannelId string FK >- Channel.Id
UserId string FK >- User.Id
CreateAt number
DeleteAt number
EditAt number
RootId string INDEX
Message string
Type string
Props string # stringified JSON obj
IsPinned bool
PendingPostId NULL string
PreviousPostId NULL string

PostMetadata
-
PostId string FK >- Post.Id
Type string #exclude files and reactions
Data string # stringified JSON obj

PostsInChannel
-
ChannelId string FK >- Channel.Id
Earliest number
Latest number

PostsInThread
-
PostId string FK >- Post.Id
Earliest number
Latest number

File
-
Id PK string
PostId string FK >- Post.Id
Name string
MimeType string
Extension string
Width number
Height number
Size number
ImageThumbnail string #base64 data string
LocalPath NULL string

Reaction
-
Id PK string
PostId string FK >- Post.Id
UserId string FK >- User.Id
EmojiName string
CreateAt number

Role
-
Id PK string
Name string
Permissions string #stringify array

CustomEmoji
-
Id PK string
Name string

Preference
-
UserId string FK >- User.Id
Category string
Name string
Value string

SlashCommand
-
Id PK string
TeamId string FK >- Team.Id
Token string
Trigger string
Method string
Autocomplete boolean
Description string
Hint string
DisplayName string

TermsOfService
-
Id PK string
AcceptedAt number

System
-
Name string
Value string # stringify
# Config
# ServerVersion
# License
# RetentionPolicy
# DeviceToken
# Websocket {lastConnectAt, lastDisconnectAt}
# CurrentTeamID
# CurrentChannelID
# CurrentUserID
# SelectedPostID
# CurrentFocusedPostID
# RecentEmojis (array of emojis)

Draft
-
ChannelId string FK >- Channel.Id
RootId NULL string FK >- Post.Id
Message string
Files string #stringify (array)

Group
-
Id PK string
Name string
DisplayName string

GroupMembership
-
GroupId string FK >- Group.Id
UserId string FK >- User.Id

GroupsInChannel
-
GroupId string FK >- Group.Id
ChannelId string FK >- Channel.Id
MemberCount number
TimezoneCount number

GroupsInTeam
-
GroupId string FK >- Group.Id
TeamId string FK >- Team.Id
MemberCount number
TimezoneCount number

# Category Tables
Category
-
Id PK string
displayName string
type string  # 'channels' | 'direct_messages' | 'favorites' | 'custom'
sortOrder number
sorting string # alpha, recent, manual
collapsed bool
muted bool
teamId string FK -< Team.Id

CategoryChannel
rel - MyChannel
-
categoryId string FK >- Category.Id
channelId string FK - Channel.Id
sortOrder number



# CRT Tables
