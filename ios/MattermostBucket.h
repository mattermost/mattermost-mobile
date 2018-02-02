#import <Foundation/Foundation.h>
#import "React/RCTBridgeModule.h"

@interface MattermostBucket :  NSObject <RCTBridgeModule>
- (NSUserDefaults *)bucketByName:(NSString*)name;
-(NSString *)readFromFile:(NSString *)fileName appGroupId:(NSString *)appGroupId;
@end
