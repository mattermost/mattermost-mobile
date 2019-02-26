#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"
#import "MattermostBucket.h"

@interface MattermostBucketModule : NSObject<RCTBridgeModule>
@property MattermostBucket *bucket;
@end
