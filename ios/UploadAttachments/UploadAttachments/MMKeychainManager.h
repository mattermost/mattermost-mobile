@interface MMKeychainManager : NSObject
-(NSDictionary *)getInternetCredentialsForServer:(NSString *)server withOptions:(NSDictionary *)options;
@end
