#import <Foundation/Foundation.h>
#import <Cordova/CDVPlugin.h>

#import <MessageUI/MessageUI.h>
#import <MessageUI/MFMessageComposeViewController.h>

@interface SMSBuilder : CDVPlugin <MFMessageComposeViewControllerDelegate> {
}

//Uncomment this for cordova < 3.0
//- (void)showSMSBuilder:(NSArray*)arguments withDict:(NSDictionary*)options;

//Comment this for cordova < 3.0
- (void) showSMSBuilder:(CDVInvokedUrlCommand*)command;
@end
