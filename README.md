## Deprecation Notice
This repository has been deprecated and is not being maintained. It should not be used. If you have any questions, please get in touch with the collaborators.

fh-basichybrid-plugins
======================

This repo contains a cordova plugin that is consist of a few core Cordova plugins.

This is to work around an issue when building for ios.  At the moment, if each plugin is loaded separately, it will take too long to install all the plugins (it has to load the xcode project file and parse it everytime when install a plugin).

Now it only needs to do once since all the core plugins become one plugin.
