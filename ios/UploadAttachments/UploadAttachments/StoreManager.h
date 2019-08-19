#import <Foundation/Foundation.h>
#import "MattermostBucket.h"
#import "MMKeychainManager.h"

@interface StoreManager : NSObject
@property MattermostBucket *bucket;
@property MMKeychainManager *keychain;
@property (nonatomic, strong) NSDictionary *entities;

+(instancetype)shared;
-(NSDictionary *)getChannelById:(NSString *)channelId;
-(NSDictionary *)getChannelsBySections:(NSString *)forTeamId excludeArchived:(BOOL)excludeArchived;
-(NSDictionary *)getCurrentChannel;
-(NSString *)getCurrentChannelId;
-(NSString *)getCurrentTeamId;
-(NSString *)getCurrentUserId;
-(NSDictionary *)getDefaultChannel:(NSString *)forTeamId;
-(NSDictionary *)getEntities:(BOOL)loadFromFile;
-(UInt64)getMaxImagePixels;
-(UInt64)getMaxFileSize;
-(UInt64)getMaxPostSize;
-(NSArray *)getMyTeams;
-(NSString *)getServerUrl;
-(NSString *)getToken;
-(void)updateEntities:(NSString *)content;
@end
