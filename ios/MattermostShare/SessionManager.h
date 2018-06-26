#import <Foundation/Foundation.h>
#import "MattermostBucket.h"

@interface SessionManager : NSObject<NSURLSessionDelegate, NSURLSessionTaskDelegate>
@property (nonatomic, copy) void (^savedCompletionHandler)(void);
@property (nonatomic, copy) void (^sendShareEvent)(NSString *);
@property (nonatomic, copy) void (^closeExtension)(void);
@property MattermostBucket *bucket;


+(instancetype)sharedSession;
-(NSString *)getAppGroupIdFromRequestIdentifier:(NSString *) requestWithGroup;
-(NSURLSession *)createSessionForRequestRequest:(NSString *)requestId;
-(void)setDataForRequest:(NSDictionary *)data forRequestWithGroup:(NSString *)requestId;
-(void)createPostForRequest:(NSString *)requestId;
-(NSURL*)tempContainerURL:(NSString*)appGroupId;
@end
