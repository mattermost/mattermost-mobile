#import <Foundation/Foundation.h>
#import "MattermostBucket.h"

@interface PerformRequests : NSObject<NSURLSessionDelegate, NSURLSessionTaskDelegate>
@property (nonatomic, strong) NSString *appGroupId;
@property (nonatomic, strong) NSString *requestId;
@property (nonatomic, strong) NSMutableArray *fileIds;
@property (nonatomic, strong) NSArray *files;
@property (nonatomic, strong) NSDictionary *post;

@property (nonatomic, strong) NSString *serverUrl;
@property (nonatomic, strong) NSString *token;
@property (nonatomic, strong) NSExtensionContext *extensionContext;
@property MattermostBucket *bucket;

- (id) initWithPost:(NSDictionary *) post
          withFiles:(NSArray *) files
       forRequestId:(NSString *)requestId
       inAppGroupId:(NSString *) appGroupId
       inContext:(NSExtensionContext *) extensionContext;

-(void)createPost;
@end
