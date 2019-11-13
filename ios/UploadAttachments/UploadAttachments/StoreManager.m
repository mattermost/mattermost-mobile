#import "StoreManager.h"
#import "MMMConstants.h"

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
      self.keychain = [[MMKeychainManager alloc] init];
      [self getEntities:true];
  }
  return self;
}

#pragma public methods

-(NSDictionary *)getChannelById:(NSString *)channelId {
  NSDictionary *channelsStore = [self.entities objectForKey:@"channels"];
  NSDictionary *channels = [channelsStore objectForKey:@"channels"];
  NSDictionary *channel = channels[channelId];
  
  return channel;
}

-(NSDictionary *)getChannelsBySections:(NSString *)forTeamId excludeArchived:(BOOL)excludeArchived {
  NSDictionary *channelsStore = [self.entities objectForKey:@"channels"];
  NSString *currentUserId = [self getCurrentUserId];
  NSString *currentChannelId = [self getCurrentChannelId];
  NSDictionary *preferences = [self getMyPreferences];
  NSDictionary *channels = [channelsStore objectForKey:@"channels"];
  NSMutableDictionary *channelsInTeam = [[NSMutableDictionary alloc] init];
  NSMutableArray *publicChannels = [[NSMutableArray alloc] init];
  NSMutableArray *privateChannels = [[NSMutableArray alloc] init];
  NSMutableArray *directChannels = [[NSMutableArray alloc] init];
  
  for (NSString * key in channels) {
    NSMutableDictionary *channel = [[channels objectForKey:key] mutableCopy];

    NSNumber *deleteAt = [channel objectForKey:@"delete_at"];
    if (excludeArchived && ![deleteAt isEqualToNumber:@0]) {
      continue;
    }

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
        NSNumber *delete_at = [otherUser objectForKey:@"delete_at"] ?: 0;
          if (otherUser && [self isDirectChannelVisible:preferences otherUserId:otherUserId] && ![self isAutoClosed:preferences channel:channel currentChannelId:currentChannelId channelArchivedAt:delete_at]) {
          [channel setObject:[self displayUserName:otherUser] forKey:@"display_name"];
          [directChannels addObject:channel];
        }
      } else {
        NSNumber *delete_at = [channel objectForKey:@"delete_at"] ?: 0;
        if ([self isGroupChannelVisible:preferences channelId:key] && ![self isAutoClosed:preferences channel:channel currentChannelId:currentChannelId channelArchivedAt:delete_at]) {
            [channel setObject:[self completeDirectGroupInfo:key] forKey:@"display_name"];
            [directChannels addObject:channel];
        }
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
  
    if (credentials) {
        return [credentials objectForKey:@"url"];
    }
    
    return nil;
}

-(NSString *)getToken {
    NSDictionary *options = @{
        @"accessGroup": APP_GROUP_ID
    };
    NSString* serverUrl = [self getServerUrl];

    if (serverUrl) {
        NSDictionary *credentials = [self.keychain getInternetCredentialsForServer:[self getServerUrl] withOptions:options];
  
        return [credentials objectForKey:@"password"];
    }
    
    return nil;
}

-(UInt64)scanValueFromConfig:(NSDictionary *)config key:(NSString *)key {
  NSString *value = [config objectForKey:key];
  NSScanner *scanner = [NSScanner scannerWithString:value];
  unsigned long long convertedValue = 0;
  [scanner scanUnsignedLongLong:&convertedValue];
  return convertedValue;
}

-(UInt64)getMaxImagePixels {
  NSDictionary *config = [self getConfig];
  NSString *key = @"MaxImagePixels";
  if (config != nil && [config objectForKey:key]) {
    return [self scanValueFromConfig:config key:key];
  }

  return DEFAULT_SERVER_MAX_IMAGE_PIXELS;
}

-(UInt64)getMaxFileSize {
  NSDictionary *config = [self getConfig];
  NSString *key = @"MaxFileSize";
  if (config != nil && [config objectForKey:key]) {
    return [self scanValueFromConfig:config key:key];
  }

  return DEFAULT_SERVER_MAX_FILE_SIZE;
}

-(UInt64)getMaxPostSize {
    NSDictionary *config = [self getConfig];
    NSString *key = @"MaxPostSize";
    if (config != nil && [config objectForKey:key]) {
        return [self scanValueFromConfig:config key:key];
    }
    
    return DEFAULT_SERVER_MAX_POST_SIZE;
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
    NSString *user1 = ids[0];
    NSString *user2 = ids[2];
    if (user1 != nil && [user1 isEqualToString:currentUserId]) {
        return user2;
    }
    
    return user1;
}

-(NSDictionary *)getUserById:(NSString *)userId {
  NSDictionary *usersStore = [self.entities objectForKey:@"users"];
  NSDictionary *users = [usersStore objectForKey:@"profiles"];
  NSDictionary *user = [users objectForKey:userId];
  
  return user;
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

-(BOOL)isAutoClosed:(NSDictionary*)preferences channel:(NSDictionary *)channel currentChannelId:(NSString *)currentChannelId channelArchivedAt:(NSNumber *)channelArchivedAt {
    NSNumber *cutoff = [NSNumber numberWithLongLong:([[NSDate date] timeIntervalSince1970] * 1000 - (7 * 24 * 60 * 60 * 1000))];
    NSString *channelId = [channel objectForKey:@"id"];

    NSNumberFormatter *numberFormatter = [[NSNumberFormatter alloc] init];
    numberFormatter.numberStyle = NSNumberFormatterNoStyle;
    
    NSDictionary *viewTimePref = [preferences objectForKey:[NSString stringWithFormat:@"channel_approximate_view_time--%@", channelId]];
    NSNumber *viewTime = 0;
    if (viewTimePref != nil) {
        viewTime = [numberFormatter numberFromString:[viewTimePref objectForKey:@"value"]];
    }
    
    if ([viewTime doubleValue] > [cutoff doubleValue]) {
        return NO;
    }
    
    // If chhannel is archived we cannot post to it
    if ([channelArchivedAt doubleValue] > 0.0) {
        return YES;
    }
    
    NSDictionary *config = [self getConfig];
    if (![[config objectForKey:@"CloseUnusedDirectMessages"] isEqualToString:@"true"] || [self isFavoriteChannel:channelId]) {
        return NO;
    }

    NSDictionary *autoClosePref = [preferences objectForKey:@"sidebar_settings--close_unused_direct_messages"];
    
    if (autoClosePref == nil || [[autoClosePref objectForKey:@"value"] isEqualToString:@"after_seven_days"]) {
        NSNumber *lastChannelPostAt = [self lastChannelPostActivity:channelId];
        if ([lastChannelPostAt doubleValue] > [cutoff doubleValue]) {
            return NO;
        }
        
        NSDictionary *openTimePref = [preferences objectForKey:[NSString stringWithFormat:@"channel_open_time--%@", channelId]];
        NSNumber *openTime = 0;
        if (openTimePref != nil) {
            openTime = [numberFormatter numberFromString:[openTimePref objectForKey:@"value"]];
        }
        
        if ([openTime doubleValue] > [cutoff doubleValue]) {
            return NO;
        }
        
        NSNumber *lastActivity = [channel objectForKey:@"last_post_at"];
        return [lastActivity doubleValue] == 0.0 || [lastActivity doubleValue] < [cutoff doubleValue];
    }
    
    return NO;
}

-(BOOL)isFavoriteChannel:(NSString *)channelId {
    NSDictionary *preferences = [self getMyPreferences];
    NSDictionary *favoritePref = [preferences objectForKey:[NSString stringWithFormat:@"favorite_channel--%@", channelId]];
    return favoritePref != nil && [[favoritePref objectForKey:@"value"] isEqualToString:@"true"];
}

-(NSNumber *)lastChannelPostActivity:(NSString *)channelId {
    NSDictionary *allPosts = [[self.entities objectForKey:@"posts"] objectForKey:@"posts"];
    NSDictionary *postsInChannels = [[self.entities objectForKey:@"posts"] objectForKey:@"postsInChannel"];
    NSArray *postInChannel = [postsInChannels objectForKey:channelId];
    
    if (postInChannel != nil && [postInChannel count] > 0) {
        NSString *postId = [postInChannel lastObject];
        NSDictionary *post = [allPosts objectForKey:postId];
        if (post != nil) {
            return [post objectForKey:@"create_at"];
        }
    }

    return 0;
}

-(BOOL)isDirectChannelVisible:(NSDictionary *)preferences otherUserId:(NSString *) otherUserId {
    NSDictionary *dmPref = [preferences objectForKey:[NSString stringWithFormat:@"direct_channel_show--%@", otherUserId]];
    if (dmPref != nil) {
        NSString *value = [dmPref objectForKey:@"value"];
        if (value != nil) {
            return [value isEqualToString:@"true"];
        }
    }
    return NO;
}

-(BOOL)isGroupChannelVisible:(NSDictionary *)preferences channelId:(NSString *) channelId {
    NSDictionary *gmPref = [preferences objectForKey:[NSString stringWithFormat:@"group_channel_show--%@", channelId]];
    if (gmPref != nil) {
        NSString *value = [gmPref objectForKey:@"value"];
        if (value != nil) {
            return [value isEqualToString:@"true"];
        }
    }
    return NO;
}

@end
