#import "SMSBuilder.h"

@implementation SMSBuilder

- (void) showSMSBuilder:(CDVInvokedUrlCommand*)command
{
	NSDictionary *parameters = [command.arguments objectAtIndex:0];
	[self showSMSBuilder:nil withDict:parameters];
}

- (void)showSMSBuilder:(NSArray*)arguments withDict:(NSDictionary*)options
{
	Class messageClass = (NSClassFromString(@"MFMessageComposeViewController"));
	if (messageClass != nil) {
		
        if (![messageClass canSendText]) {
			
					UIAlertView *alert = [[UIAlertView alloc] initWithTitle:@"Notice" message:@"SMS Text not available."
																   delegate:self cancelButtonTitle:@"OK" otherButtonTitles: nil];
					[alert show];
					return;
        }
		
  } else {
		UIAlertView *alert = [[UIAlertView alloc] initWithTitle:@"Notice" message:@"SMS Text not available."
													   delegate:self cancelButtonTitle:@"OK" otherButtonTitles: nil];
		[alert show];
		return;
	}
	
	
	NSString* body = [options valueForKey:@"body"];
	NSString* toRecipientsString = [options valueForKey:@"toRecipients"];
	
    MFMessageComposeViewController *picker = [[MFMessageComposeViewController alloc] init];
    picker.messageComposeDelegate = self;
	
	if(body != nil)
		picker.body = [options valueForKey:@"body"];
	
	if(toRecipientsString != nil)
		[picker setRecipients:[ toRecipientsString componentsSeparatedByString:@","]];
    
    [self.viewController presentModalViewController:picker animated:YES];
	
}

// Dismisses the composition interface when users tap Cancel or Send. Proceeds to update the message field with the result of the operation.
- (void)messageComposeViewController:(MFMessageComposeViewController *)controller didFinishWithResult:(MessageComposeResult)result
{
    // Notifies users about errors associated with the interface
	int webviewResult = 0;
	
	switch (result)
	{
		case MessageComposeResultCancelled:
			webviewResult = 0;
			break;
		case MessageComposeResultSent:
			webviewResult = 1;
			break;
		case MessageComposeResultFailed:
			webviewResult = 2;
			break;
		default:
			webviewResult = 3;
			break;
	}
	
    [self.viewController dismissModalViewControllerAnimated:YES];
	
	NSString* jsString = [[NSString alloc] initWithFormat:@"window.plugins.smsBuilder._didFinishWithResult(%d);",webviewResult];
	[self writeJavascript:jsString];
	
}

@end