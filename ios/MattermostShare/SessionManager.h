#import <Foundation/Foundation.h>
#import "MattermostBucket.h"
#import "KeyChainDataSource.h"

@interface SessionManager : NSObject<NSURLSessionDelegate, NSURLSessionTaskDelegate>
@property (nonatomic, copy) void (^savedCompletionHandler)(void);
@property MattermostBucket *bucket;
@property (nonatomic, retain) KeyChainDataSource *keyChain;
@property (nonatomic, strong) NSString *requestWithGroup;
@property (nonatomic, strong) NSString *certificateName;
@property (nonatomic) BOOL isBackground;


+(instancetype)sharedSession;
-(NSString *)getAppGroupIdFromRequestIdentifier:(NSString *) requestWithGroup;
-(NSURLSession *)createSessionForRequestRequest:(NSString *)requestId;
-(void)setRequestWithGroup:(NSString *)requestWithGroup certificateName:(NSString *)certificateName;
-(void)setDataForRequest:(NSDictionary *)data forRequestWithGroup:(NSString *)requestId;
-(void)createPostForRequest:(NSString *)requestId;
-(NSURL*)tempContainerURL:(NSString*)appGroupId;
@end
