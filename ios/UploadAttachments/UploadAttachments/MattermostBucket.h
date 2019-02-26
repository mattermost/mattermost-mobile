#import <Foundation/Foundation.h>

@interface MattermostBucket :  NSObject
- (NSUserDefaults *)bucketByName:(NSString*)name;
-(id) getPreference:(NSString *)key;
-(NSString *)readFromFile:(NSString *)fileName;
-(NSDictionary *)readFromFileAsJSON:(NSString *)fileName;
-(void)removeFile:(NSString *)fileName;
-(void)removePreference:(NSString *)key;
-(void)setPreference:(NSString *)key value:(NSString *) value;
-(void)writeToFile:(NSString *)fileName content:(NSString *)content;
@end
