#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"

@interface MattermostBucket :  NSObject <RCTBridgeModule>
- (NSUserDefaults *)bucketByName:(NSString*)name;
@end
