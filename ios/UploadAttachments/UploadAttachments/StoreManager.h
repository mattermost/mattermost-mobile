#import <Foundation/Foundation.h>
#import "MattermostBucket.h"

@interface StoreManager : NSObject
@property MattermostBucket *bucket;
@property (nonatomic, strong) NSDictionary *entities;

+(instancetype)shared;
-(NSDictionary *)getChannelById:(NSString *)channelId;
-(NSDictionary *)getChannelsBySections:(NSString *)forTeamId;
-(NSDictionary *)getCurrentChannel;
-(NSString *)getCurrentChannelId;
-(NSString *)getCurrentTeamId;
-(NSString *)getCurrentUserId;
-(NSDictionary *)getDefaultChannel:(NSString *)forTeamId;
-(NSDictionary *)getEntities:(BOOL)loadFromFile;
-(UInt64)getMaxFileSize;
-(NSArray *)getMyTeams;
-(NSString *)getServerUrl;
-(NSString *)getToken;
-(void)updateEntities:(NSString *)content;
@end
