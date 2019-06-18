#import "RNCookieManagerIOS.h"
#if __has_include("RCTConvert.h")
#import "RCTConvert.h"
#else
#import <React/RCTConvert.h>
#endif

static NSString * const NOT_AVAILABLE_ERROR_MESSAGE = @"WebKit/WebKit-Components are only available with iOS11 and higher!";

@implementation RNCookieManagerIOS

- (instancetype)init
{
    self = [super init];
    if (self) {
        self.formatter = [NSDateFormatter new];
        [self.formatter setDateFormat:@"yyyy-MM-dd'T'HH:mm:ss.SSSZZZZZ"];
    }
    return self;
}

+ (BOOL)requiresMainQueueSetup
{
    return NO;
}

RCT_EXPORT_MODULE()

RCT_EXPORT_METHOD(
    set:(NSDictionary *)props
    useWebKit:(BOOL)useWebKit
    resolver:(RCTPromiseResolveBlock)resolve
    rejecter:(RCTPromiseRejectBlock)reject)
{
    NSString *name = [RCTConvert NSString:props[@"name"]];
    NSString *value = [RCTConvert NSString:props[@"value"]];
    NSString *domain = [RCTConvert NSString:props[@"domain"]];
    NSString *origin = [RCTConvert NSString:props[@"origin"]];
    NSString *path = [RCTConvert NSString:props[@"path"]];
    NSString *version = [RCTConvert NSString:props[@"version"]];
    NSDate *expiration = [RCTConvert NSDate:props[@"expiration"]];

    NSMutableDictionary *cookieProperties = [NSMutableDictionary dictionary];
    [cookieProperties setObject:name forKey:NSHTTPCookieName];
    [cookieProperties setObject:value forKey:NSHTTPCookieValue];
    [cookieProperties setObject:domain forKey:NSHTTPCookieDomain];
    [cookieProperties setObject:origin forKey:NSHTTPCookieOriginURL];
    [cookieProperties setObject:path forKey:NSHTTPCookiePath];
    [cookieProperties setObject:version forKey:NSHTTPCookieVersion];
    [cookieProperties setObject:expiration forKey:NSHTTPCookieExpires];

    NSHTTPCookie *cookie = [NSHTTPCookie cookieWithProperties:cookieProperties];

    NSLog(@"SETTING COOKIE");
    NSLog(@"%@", cookie);

    if (useWebKit) {
        if (@available(iOS 11.0, *)) {
            dispatch_async(dispatch_get_main_queue(), ^(){
                WKHTTPCookieStore *cookieStore = [[WKWebsiteDataStore defaultDataStore] httpCookieStore];
                [cookieStore setCookie:cookie completionHandler:nil];
                resolve(nil);
            });
        } else {
            reject(@"", NOT_AVAILABLE_ERROR_MESSAGE, nil);
        }
    } else {
        [[NSHTTPCookieStorage sharedHTTPCookieStorage] setCookie:cookie];
        resolve(nil);
    }
}

RCT_EXPORT_METHOD(setFromResponse:(NSURL *)url
    value:(NSString *)value
    resolver:(RCTPromiseResolveBlock)resolve
    rejecter:(RCTPromiseRejectBlock)reject) {
    NSArray *cookies = [NSHTTPCookie cookiesWithResponseHeaderFields:@{@"Set-Cookie": value} forURL:url];
    [[NSHTTPCookieStorage sharedHTTPCookieStorage] setCookies:cookies forURL:url mainDocumentURL:NULL];
    resolve(nil);
}

RCT_EXPORT_METHOD(getFromResponse:(NSURL *)url
    resolver:(RCTPromiseResolveBlock)resolve
    rejecter:(RCTPromiseRejectBlock)reject) {
    NSURLRequest *request = [NSURLRequest requestWithURL:url];
    [NSURLConnection sendAsynchronousRequest:request  queue:[[NSOperationQueue alloc] init]
                           completionHandler:^(NSURLResponse *response, NSData *data, NSError *error) {

        NSHTTPURLResponse *httpResponse = (NSHTTPURLResponse *)response;
        NSArray *cookies = [NSHTTPCookie cookiesWithResponseHeaderFields:httpResponse.allHeaderFields forURL:response.URL];
        NSMutableDictionary *dics = [NSMutableDictionary dictionary];

        for (int i = 0; i < cookies.count; i++) {
            NSHTTPCookie *cookie = [cookies objectAtIndex:i];
            [dics setObject:cookie.value forKey:cookie.name];
            NSLog(@"cookie: name=%@, value=%@", cookie.name, cookie.value);
            [[NSHTTPCookieStorage sharedHTTPCookieStorage] setCookie:cookie];
        }
        resolve(dics);
    }];
}

-(NSString *)getDomainName:(NSURL *) url
{
    NSString *separator = @".";
    NSInteger maxLength = 2;

    NSURLComponents *components = [[NSURLComponents alloc]initWithURL:url resolvingAgainstBaseURL:FALSE];
    NSArray<NSString *> *separatedHost = [components.host componentsSeparatedByString:separator];
    NSInteger count = [separatedHost count];
    NSInteger endPosition = count;
    NSInteger startPosition = count - maxLength;

    NSMutableString *result = [[NSMutableString alloc]init];
    for (NSUInteger i = startPosition; i != endPosition; i++) {
        [result appendString:separator];
        [result appendString:[separatedHost objectAtIndex:i]];
    }
    return result;
}

RCT_EXPORT_METHOD(
    get:(NSURL *) url
    useWebKit:(BOOL)useWebKit
    resolver:(RCTPromiseResolveBlock)resolve
    rejecter:(RCTPromiseRejectBlock)reject)
{
    if (useWebKit) {
        if (@available(iOS 11.0, *)) {
            dispatch_async(dispatch_get_main_queue(), ^(){
                NSString *topLevelDomain = [self getDomainName:url];

                WKHTTPCookieStore *cookieStore = [[WKWebsiteDataStore defaultDataStore] httpCookieStore];
                [cookieStore getAllCookies:^(NSArray<NSHTTPCookie *> *allCookies) {
                    NSMutableDictionary *cookies = [NSMutableDictionary dictionary];
                    for(NSHTTPCookie *currentCookie in allCookies) {
                        NSString *domainWithDot = [NSString stringWithFormat:@".%@", currentCookie.domain];
                        if([currentCookie.domain containsString:topLevelDomain] || [domainWithDot containsString:topLevelDomain]) {
                            [cookies setObject:currentCookie.value forKey:currentCookie.name];
                        }
                    }
                    resolve(cookies);
                }];
            });
        } else {
            reject(@"", NOT_AVAILABLE_ERROR_MESSAGE, nil);
        }
    } else {
        NSMutableDictionary *cookies = [NSMutableDictionary dictionary];
        for (NSHTTPCookie *c in [[NSHTTPCookieStorage sharedHTTPCookieStorage] cookiesForURL:url]) {
            NSMutableDictionary *d = [NSMutableDictionary dictionary];
            [d setObject:c.value forKey:@"value"];
            [d setObject:c.name forKey:@"name"];
            [d setObject:c.domain forKey:@"domain"];
            [d setObject:c.path forKey:@"path"];
            NSString *expires = [self.formatter stringFromDate:c.expiresDate];
            if (expires != nil) {
                [d setObject:expires forKey:@"expiresDate"];
            }
            [cookies setObject:d forKey:c.name];
        }
        resolve(cookies);
    }
}

RCT_EXPORT_METHOD(
    clearAll:(BOOL)useWebKit
    resolver:(RCTPromiseResolveBlock)resolve
    rejecter:(RCTPromiseRejectBlock)reject)
{
    if (useWebKit) {
        if (@available(iOS 11.0, *)) {
            dispatch_async(dispatch_get_main_queue(), ^(){
                WKHTTPCookieStore *cookieStore = [[WKWebsiteDataStore defaultDataStore] httpCookieStore];
                [cookieStore getAllCookies:^(NSArray<NSHTTPCookie *> *allCookies) {
                    for(NSHTTPCookie *currentCookie in allCookies) {
                        // Uses the NSHTTPCookie directly has no effect, nor deleted the cookie nor thrown an error.
                        // Create a new cookie with the given values and delete this one do the work.
                        NSMutableDictionary<NSHTTPCookiePropertyKey, id> *cookieData =  [NSMutableDictionary dictionary];
                        [cookieData setValue:currentCookie.name forKey:NSHTTPCookieName];
                        [cookieData setValue:currentCookie.value forKey:NSHTTPCookieValue];
                        [cookieData setValue:currentCookie.domain forKey:NSHTTPCookieDomain];
                        [cookieData setValue:currentCookie.path forKey:NSHTTPCookiePath];

                        NSHTTPCookie *newCookie = [NSHTTPCookie cookieWithProperties:cookieData];
                        [cookieStore deleteCookie:newCookie completionHandler:^{}];
                    }
                    resolve(nil);
                }];
            });
        } else {
            reject(@"", NOT_AVAILABLE_ERROR_MESSAGE, nil);
        }
    } else {
        NSHTTPCookieStorage *cookieStorage = [NSHTTPCookieStorage sharedHTTPCookieStorage];
        for (NSHTTPCookie *c in cookieStorage.cookies) {
            [cookieStorage deleteCookie:c];
        }
        resolve(nil);
    }
}

RCT_EXPORT_METHOD(clearByName:(NSString *) name
    resolver:(RCTPromiseResolveBlock)resolve
    rejecter:(RCTPromiseRejectBlock)reject) {
    NSHTTPCookieStorage *cookieStorage = [NSHTTPCookieStorage sharedHTTPCookieStorage];
    for (NSHTTPCookie *c in cookieStorage.cookies) {
      if ([[c name] isEqualToString:name]) {
        [cookieStorage deleteCookie:c];
      }
    }
    resolve(nil);
}

RCT_EXPORT_METHOD(
    getAll:(BOOL)useWebKit
    resolver:(RCTPromiseResolveBlock)resolve
    rejecter:(RCTPromiseRejectBlock)reject)
{
    if (useWebKit) {
        if (@available(iOS 11.0, *)) {
            dispatch_async(dispatch_get_main_queue(), ^(){
                WKHTTPCookieStore *cookieStore = [[WKWebsiteDataStore defaultDataStore] httpCookieStore];
                [cookieStore getAllCookies:^(NSArray<NSHTTPCookie *> *allCookies) {
                    resolve([self createCookieList: allCookies]);
                }];
            });
        } else {
            reject(@"", NOT_AVAILABLE_ERROR_MESSAGE, nil);
        }
    } else {
        NSHTTPCookieStorage *cookieStorage = [NSHTTPCookieStorage sharedHTTPCookieStorage];
        resolve([self createCookieList:cookieStorage.cookies]);
    }
}

RCT_EXPORT_METHOD(getAll:(RCTPromiseResolveBlock)resolve
    rejecter:(RCTPromiseRejectBlock)reject) {
    NSHTTPCookieStorage *cookieStorage = [NSHTTPCookieStorage sharedHTTPCookieStorage];
    NSMutableDictionary *cookies = [NSMutableDictionary dictionary];
    for (NSHTTPCookie *c in cookieStorage.cookies) {
        NSMutableDictionary *d = [NSMutableDictionary dictionary];
        [d setObject:c.value forKey:@"value"];
        [d setObject:c.name forKey:@"name"];
        [d setObject:c.domain forKey:@"domain"];
        [d setObject:c.path forKey:@"path"];
        NSString *expires = [self.formatter stringFromDate:c.expiresDate];
        if (expires != nil) {
            [d setObject:expires forKey:@"expiresDate"];
        }
        [cookies setObject:d forKey:c.name];
    }
}

-(NSDictionary *)createCookieList:(NSArray<NSHTTPCookie *>*)cookies
{
    NSMutableDictionary *cookieList = [NSMutableDictionary dictionary];
    for (NSHTTPCookie *cookie in cookies) {
        // NSLog(@"COOKIE: %@", cookie);
        [cookieList setObject:[self createCookieData:cookie] forKey:cookie.name];
    }
    return cookieList;
}

-(NSDictionary *)createCookieData:(NSHTTPCookie *)cookie
{
    NSMutableDictionary *cookieData = [NSMutableDictionary dictionary];
    [cookieData setObject:cookie.value forKey:@"value"];
    [cookieData setObject:cookie.name forKey:@"name"];
    [cookieData setObject:cookie.domain forKey:@"domain"];
    [cookieData setObject:cookie.path forKey:@"path"];
    return cookieData;
}

@end
