#import "StoreManager.h"
#import "Constants.h"

@implementation StoreManager
+(instancetype)shared {
  static id manager = nil;
  static dispatch_once_t once;
  dispatch_once(&once, ^{
    manager = [[self alloc] init];
  });
  
  return manager;
}

-(instancetype)init {
  self = [super init];
  if (self) {
    self.bucket = [[MattermostBucket alloc] init];
    [self getEntities:true];
  }
  return self;
}

#pragma public methods

-(NSDictionary *)getChannelById:(NSString *)channelId {
  NSDictionary *channelsStore = [self.entities objectForKey:@"channels"];
  NSDictionary *channels = [channelsStore objectForKey:@"channels"];
  
  for (NSString * key in channels) {
    NSDictionary *channel = channels[key];
    NSString *channel_id = [channel objectForKey:@"id"];
    if ([channel_id isEqualToString:channelId]) {
      return channel;
    }
  }
  
  return nil;
}

-(NSDictionary *)getChannelsBySections:(NSString *)forTeamId {
  NSDictionary *channelsStore = [self.entities objectForKey:@"channels"];
  NSString *currentUserId = [self getCurrentUserId];
  NSDictionary *channels = [channelsStore objectForKey:@"channels"];
  NSMutableDictionary *channelsInTeam = [[NSMutableDictionary alloc] init];
  NSMutableArray *publicChannels = [[NSMutableArray alloc] init];
  NSMutableArray *privateChannels = [[NSMutableArray alloc] init];
  NSMutableArray *directChannels = [[NSMutableArray alloc] init];
  
  for (NSString * key in channels) {
    NSMutableDictionary *channel = [[channels objectForKey:key] mutableCopy];
    NSString *team_id = [channel objectForKey:@"team_id"];
    NSString *channelType = [channel objectForKey:@"type"];
    BOOL isDM = [channelType isEqualToString:@"D"];
    BOOL isGM = [channelType isEqualToString:@"G"];
    BOOL isPublic = [channelType isEqualToString:@"O"];
    BOOL isPrivate = [channelType isEqualToString:@"P"];
    if ([team_id isEqualToString:forTeamId] || isDM || isGM) {
      if (isPublic) {
        // public channel
        [publicChannels addObject:channel];
      } else if (isPrivate) {
        // private channel
        [privateChannels addObject:channel];
      } else if (isDM) {
        // direct message
        NSString *otherUserId = [self getOtherUserIdFromChannel:currentUserId withChannelName:[channel objectForKey:@"name"]];
        NSDictionary *otherUser = [self getUserById:otherUserId];
        if (otherUser) {
          [channel setObject:[self displayUserName:otherUser] forKey:@"display_name"];
          [directChannels addObject:channel];
        }
      } else {
        [channel setObject:[self completeDirectGroupInfo:key] forKey:@"display_name"];
        [directChannels addObject:channel];
      }
    }
  }
  
  [channelsInTeam setObject:[self sortDictArrayByDisplayName:publicChannels] forKey:@"public"];
  [channelsInTeam setObject:[self sortDictArrayByDisplayName:privateChannels] forKey:@"private"];
  [channelsInTeam setObject:[self sortDictArrayByDisplayName:directChannels] forKey:@"direct"];
  
  return channelsInTeam;
}

-(NSDictionary *)getCurrentChannel {
  NSString *currentChannelId = [self getCurrentChannelId];
  return [self getChannelById:currentChannelId];
}



-(NSString *)getCurrentChannelId {
  return [[self.entities objectForKey:@"channels"] objectForKey:@"currentChannelId"];
}

-(NSString *)getCurrentTeamId {
  return [[self.entities objectForKey:@"teams"] objectForKey:@"currentTeamId"];
}

-(NSString *)getCurrentUserId {
  return [[self.entities objectForKey:@"users"] objectForKey:@"currentUserId"];
}

-(NSDictionary *)getDefaultChannel:(NSString *)forTeamId {
  NSArray *channelsInTeam = [self getChannelsInTeam:forTeamId];
  NSPredicate *filter = [NSPredicate predicateWithFormat:@"name = %@", @"town-square"];
  NSArray *townSquare = [channelsInTeam filteredArrayUsingPredicate:filter];
  if (townSquare != nil && townSquare.count > 0) {
    return townSquare.firstObject;
  }
  
  return nil;
}

-(NSDictionary *)getEntities:(BOOL)loadFromFile {
  if (loadFromFile) {
    self.entities = [self.bucket readFromFileAsJSON:@"entities"];
  }
  return self.entities;
}

-(NSArray *)getMyTeams {
  NSDictionary *teamsStore = [self.entities objectForKey:@"teams"];
  NSDictionary *teams = [teamsStore objectForKey:@"teams"];
  NSDictionary *membership = [teamsStore objectForKey:@"myMembers"];
  NSMutableArray *myTeams = [[NSMutableArray alloc] init];
  
  for (NSString* key in teams) {
    NSDictionary *member = [membership objectForKey:key];
    NSDictionary *team = [teams objectForKey:key];
    if (member) {
      [myTeams addObject:team];
    }
  }

  
  return [self sortDictArrayByDisplayName:myTeams];
}

-(NSString *)getServerUrl {
  NSDictionary *general = [self.entities objectForKey:@"general"];
  NSDictionary *credentials = [general objectForKey:@"credentials"];
  
  return [credentials objectForKey:@"url"];
}

-(NSString *)getToken {
  NSDictionary *general = [self.entities objectForKey:@"general"];
  NSDictionary *credentials = [general objectForKey:@"credentials"];
  
  return [credentials objectForKey:@"token"];
}

-(UInt64)getMaxFileSize {
  NSDictionary *config = [self getConfig];
  if (config != nil && [config objectForKey:@"MaxFileSize"]) {
    NSString *maxFileSize = [config objectForKey:@"MaxFileSize"];
    NSScanner *scanner = [NSScanner scannerWithString:maxFileSize];
    unsigned long long convertedValue = 0;
    [scanner scanUnsignedLongLong:&convertedValue];
    return convertedValue;
  }
  
  return DEFAULT_SERVER_MAX_FILE_SIZE;
}

-(void)updateEntities:(NSString *)content {
    [self.bucket writeToFile:@"entities" content:content];
}

#pragma utilities

-(NSString *)completeDirectGroupInfo:(NSString *)channelId {
  NSDictionary *usersStore = [self.entities objectForKey:@"users"];
  NSDictionary *profilesInChannels = [usersStore objectForKey:@"profilesInChannel"];
  NSDictionary *profileIds = [profilesInChannels objectForKey:channelId];
  NSDictionary *channel = [self getChannelById:channelId];
  NSString *currentUserId = [self getCurrentUserId];
  NSMutableArray *result = [[NSMutableArray alloc] init];
  
  if (profileIds) {
    for (NSString *key in profileIds) {
      NSDictionary *user = [self getUserById:key];
      NSString *userId = [user objectForKey:@"id"];
      if (![userId isEqualToString:currentUserId]) {
        NSString *fullName = [self getUserFullName:user];
        [result addObject:fullName];
      }
    }
  }
  
  if ([result count] != ([profileIds count] - 1)) {
    return [channel objectForKey:@"display_name"];
  }
  
  NSArray *sorted = [result sortedArrayUsingSelector:@selector(localizedCaseInsensitiveCompare:)];
  return [sorted componentsJoinedByString:@", "];
}

-(NSString *)displayUserName:(NSDictionary *)user {
  NSString *teammateNameDisplay = [self getTeammateNameDisplaySetting];
  NSString *username = [user objectForKey:@"username"];
  NSString *name;
  
  if ([teammateNameDisplay isEqualToString:@"nickname_full_name"]) {
    name = [user objectForKey:@"nickname"] ?: [self getUserFullName:user];
  } else if ([teammateNameDisplay isEqualToString:@"full_name"]) {
    name = [self getUserFullName:user];
  } else {
    name = username;
  }
  
  if (!name || [[name stringByTrimmingCharactersInSet:[NSCharacterSet whitespaceCharacterSet]] length] == 0) {
    name = username;
  }
  
  return name;
}

-(NSArray *)getChannelsInTeam:(NSString *) teamId {
  NSDictionary *channels = [[self.entities objectForKey:@"channels"] objectForKey:@"channels"];
  NSArray *arr = [channels allValues];
  NSPredicate *filter = [NSPredicate predicateWithFormat:@"team_id = %@", teamId];
  
  return [arr filteredArrayUsingPredicate:filter];
}

-(NSDictionary *)getConfig {
  return [[self.entities objectForKey:@"general"] objectForKey:@"config"];
}

-(NSDictionary *)getMyPreferences {
  return [[self.entities objectForKey:@"preferences"] objectForKey:@"myPreferences"];
}

-(NSString *)getOtherUserIdFromChannel:(NSString *)currentUserId withChannelName:(NSString *)channelName {
  NSArray *ids = [channelName componentsSeparatedByString:@"_"];
  if ([ids[0] isEqualToString:currentUserId]) {
    return ids[2];
  }
  
  return ids[0];
}

-(NSDictionary *)getUserById:(NSString *)userId {
  NSDictionary *usersStore = [self.entities objectForKey:@"users"];
  NSDictionary *users = [usersStore objectForKey:@"profiles"];
  
  for (NSString* key in users) {
    NSDictionary *user = [users objectForKey:key];
    NSString *user_id = [user objectForKey:@"id"];
    if ([user_id isEqualToString:userId]) {
      return user;
    }
  }
  
  return nil;
}

-(NSString *)getUserFullName:(NSDictionary*) user {
  NSString *fistName = [user objectForKey:@"first_name"];
  NSString *lastName = [user objectForKey:@"last_name"];
  
  if (fistName && lastName) {
    return [fistName stringByAppendingFormat:@" %@", lastName];
  } else if (fistName) {
    return fistName;
  } else if (lastName) {
    return lastName;
  }
  
  return @"";
}

-(NSString *)getTeammateNameDisplaySetting {
  NSDictionary *config = [self getConfig];
  NSString *teammateNameDisplay = [config objectForKey:@"TeammateNameDisplay"];
  
  NSDictionary *preferences = [self getMyPreferences];
  NSString *key = @"display_settings--name_format";
  NSDictionary *displayFormat = [preferences objectForKey:key];
  
  if (displayFormat) {
    return [displayFormat objectForKey:@"value"];
  } else if (teammateNameDisplay) {
    return teammateNameDisplay;
  }
  
  return @"username";
}

-(NSArray *)sortDictArrayByDisplayName:(NSArray *)array {
  NSSortDescriptor *sd = [[NSSortDescriptor alloc]
                          initWithKey:@"display_name"
                          ascending:YES
                          selector: @selector(localizedCaseInsensitiveCompare:)];
  NSArray *sortDescriptor = [NSArray arrayWithObjects:sd, nil];
  return [array sortedArrayUsingDescriptors:sortDescriptor];
}

@end
