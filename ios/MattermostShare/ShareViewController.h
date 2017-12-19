#import <UIKit/UIKit.h>
#import "React/RCTBridgeModule.h"

@interface ShareViewController : UIViewController<RCTBridgeModule>
+ (NSURL*) tempContainerURL: (NSString*)appGroupId;
@end
