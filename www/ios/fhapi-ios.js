if(window.$fh){
  var $fh = window.$fh;

  /**
   * Override $fh.setUUID on devices as the uuid is provided by cordova
   */
  
  $fh.__dest__.setUUID = function (p, s, f) {
    //do nothing for devices  
  };

  /**
   * Override $fh.log
   */
  $fh.__dest__.log = function (p, s, f) {
    if(typeof p === "object" && p.message){
      window.console.log(p.message);
    } else if(typeof p === "string"){
      window.console.log(p);
    } else {
      window.console.log(JSON.stringify(p));
    }
  };

  /**
   * ACCELEROMETER
   */
  $fh.__dest__._accWatcher = undefined;
  $fh.__dest__.acc = function (p, s, f) {
    if (!p.act || p.act == "register") {
      if ($fh.__dest__._accWatcher) {
        f('acc_inuse', {}, p);
        return;
      }
      if (p.interval == 0) {
        navigator.accelerometer.getCurrentAcceleration(function (accel) {
          var result = {
            x: accel.x,
            y: accel.y,
            z: accel.z,
            when: accel.timestamp
          };
          s(result);
        }, function () {
          f('error_acc', {}, p);
        }, {})
      }
      if (p.interval > 0) {
        $fh.__dest__._accWatcher = navigator.accelerometer.watchAcceleration(function (accel) {
          var result = {
            x: accel.x,
            y: accel.y,
            z: accel.z,
            when: accel.timestamp
          };
          s(result);
        }, function () {
          f('error_acc', {}, p);
        }, {
          frequency: p.interval
        })
      }
    } else if (p.act == "unregister") {
      if ($fh.__dest__._accWatcher) {
        navigator.accelerometer.clearWatch($fh.__dest__._accWatcher);
        $fh.__dest__._accWatcher = undefined;
      }
      s();
    } else {
      f('acc_badact', {}, p);
    }
  };

  /**
   * Cemera
   */
  $fh.__dest__.cam = function(p, s, f){
    if(p.act && p.act != "picture"){
      f('cam_nosupport', {}, p);
      return;
    }
    var source = navigator.camera.PictureSourceType.CAMERA; //camera type
    if(p.source && p.source === 'photo'){
      source = navigator.camera.PictureSourceType.PHOTOLIBRARY;
    }
    var destType = navigator.camera.DestinationType.DATA_URL;
    if(p.uri){
      destType = navigator.camera.DestinationType.FILE_URI;
    }
    var options = {'sourceType':source, 'destinationType': destType};
    navigator.camera.getPicture(function(pic){
      if(p.uri){
        s({uri: pic});
      } else {
        var picdata = {format:'jpg', b64:pic};
        s(picdata);
      }
    }, function(message){
      f('cam_error', {message: message}, p);
    }, options);
  };

  /**
   *  CONTACTS
   */
  $fh.__dest__.contacts = function (p, s, f){
    var convertFormat = function (ct) {
      var c = ct;
      if(typeof ct == "string"){
        c = JSON.parse(ct);
      }
      return {
        first: getName(c).first,
        last: getName(c).last,
        name: getName(c).formatted || c.displayName || c.nickname,
        addr: convertRecords(c.addresses, "home"),
        phone: convertRecords(c.phoneNumbers, "mobile"),
        email: convertRecords(c.emails, "email"),
        id: c.id
      }
    };

    var getName = function(c){
      var first = "";
      var last = "";
      var formatted = null;
      if (c.name){
        first = c.name.givenName;
        last = c.name.familyName;
        formatted = c.name.formatted;
      } else if(c.displayName){
        var parts = c.displayName.split(" ");
        first = parts[0];
        last = parts[parts.length - 1];
      }
      
      return {
        first: first,
        last: last,
        formatted: formatted
      }
    };

    var processResults = function (cl) {
      var cs = [];
      for (var i = 0; i < cl.length; i++) {
        var c = convertFormat(cl[i]);
        cs.push(c);
      }
      return cs;
    };

    var convertRecords = function (records, defaultType) {
      var retJson = {};
      if (null != records) {
        for (var i = 0; i < records.length; i++) {
          var obj = records[i];
          if(typeof obj == "object"){
            retJson[obj.type] = obj.value;
          } else if(typeof obj == "string") {
            retJson[defaultType] = obj;
          }
        }
      }
      return retJson;
    };

    var fields = ["*"];
    var defaultFields = ["name", "displayName","nickname", "phoneNumbers", "emails", "addresses"];
    var options = { multiple: true, filter: ""};
    var acts = {
      list: function () {
        navigator.contacts.find(fields, function (cl) {
          var cs = processResults(cl);
          s({
            list: cs
          });
        }, function () {
          f('contacts_error', {}, p);
        }, options);
      },

      find: function () {
        var searchFields = defaultFields;
        if(p.by){
          searchFields.push(p.by);
        }
        
        options.filter = p.val;
        navigator.contacts.find(searchFields, function (cl) {
          var cs = processResults(cl);
          s({
            list: cs
          });
        }, function () {
          f('contacts_error', {}, p);
        }, options);
      },

      add: function() {
        if(p.gui){
          if(navigator.contacts.newContactUI){
            //gui is supported on ios
            navigator.contacts.newContactUI(function(cid){
              return s({id: cid});
            });
          } else if(navigator.contacts.insert){
            //gui is supported on android
            navigator.contacts.insert(function(c){
              var contact = convertFormat(c);
              return s(contact);
            });
          } else {
            return f("contacts_no_support");
          }
        } else {
          var params = {};
          var contactParam = p.contact;
          if (p.contact) {
            var phones = [];
            if (typeof p.contact.phone == "object") {
              for (var key in p.contact.phone) {
                phones.push({
                  type: key,
                  value: p.contact.phone[key]
                });
              }
            } else if (typeof p.contact.phone == "string") {
              phones.push({
                type: "mobile",
                value: p.contact.phone
              });
            }
            if (phones.length > 0) {
              contactParam["phoneNumbers"] = phones;
            }
            if (p.contact.first || p.contact.last) {
              contactParam["name"] = {
                "givenName": p.contact.first,
                "familyName": p.contact.last
              };
            }
          }
          var newContact = navigator.contacts.create(contactParam);
          newContact.save(function (c) {
            s(convertFormat(c));
          }, function (err) {
            f(err, {}, p);
          });
        }
      },

      remove: function () {
        if (!p.contact) {
          f('no_contact', {}, p);
          return;
        }
        if (!p.contact.id) {
          f("no_contactId", {}, p);
          return;
        }
        var params = {
          id: p.contact.id
        };
        var contactObj = navigator.contacts.create(params);
        contactObj.remove(function () {
          s();
        }, function (err) {
          f(err, {}, p);
        });
      },

      choose: function () {
        var chooseFunc = navigator.contacts.chooseContact || navigator.contacts.choose;
        if(chooseFunc && typeof chooseFunc === "function"){
          var options = {"fields": defaultFields};
          if(p.allowEdit){
            options["allowEditing"] = "true";
          }
          chooseFunc(function(cid, c){
            //ios returns cid and c and android only return c as the first arguments
            var data = c || cid;
            var cs = processResults([data]);
            s({
              list: cs
            });
          });
        } else {
          f('contacts_not_supported', {}, p);
        }
      }
    };

    var actfunc = acts[p.act];
    if (actfunc) {
      actfunc();
    } else {
      f('contacts_badact', {}, p);
    }
  };

  /**
   * File Upload
   */
  $fh.__dest__.file = function (p, s, f) {
    var errors = ['file_notfound', 'file_invalid_url', 'file_connection_err', 'file_server_err'];
    var acts = {
      'upload': function () {
        if (!p.filepath) {
          f('file_nofilepath');
          return;
        }
        if (!p.server) {
          f('file_noserver');
          return;
        }
        var options = {};
        if (p.filekey) {
          options.fileKey = p.filekey;
        }
        if (p.filename) {
          options.fileName = p.filename;
        }
        if (p.mime) {
          options.mimeType = p.mime;
        }
        if (p.params) {
        options.params = p.params;
        }
        var debug = false;
        if (p.debug) {
          debug = true;
        }
        if(!navigator.fileTransfer){
          navigator.fileTransfer = new FileTransfer();
        }
        navigator.fileTransfer.upload(p.filepath, p.server, function (message) {
          s({
            status: message.responseCode,
            res: message.response,
            size: message.bytesSent
          });
        }, function (error) {
          var err = 'file_unknown';
          if (1 <= error.code <= 4) {
            err = errors[error.code - 1];
          }
          f(err);
        }, options, debug);
      }
    }
    var actfunc = acts[p.act];
    if (actfunc) {
      actfunc();
    } else {
      f('file_badact');
    }
  };

  /** **************************************************
   *  GEO
   *  **************************************************
   */
  $fh.__dest__._geoWatcher = undefined;

  $fh.__dest__.geo = function (p, s, f) {
    if (!p.act || p.act == "register") {
      if ($fh.__dest__._geoWatcher) {
        f('geo_inuse', {}, p);
        return;
      }
      if (p.interval == 0) {
        navigator.geolocation.getCurrentPosition(function (position) {
          var coords = position.coords;
          var resdata = {
            lon: coords.longitude,
            lat: coords.latitude,
            alt: coords.altitude,
            acc: coords.accuracy,
            head: coords.heading,
            speed: coords.speed,
            when: position.timestamp
          };
          s(resdata);
        }, function () {
          f('error_geo');
        }, {
          enableHighAccuracy: p.enableHighAccuracy, 
          maximumAge: p.maximumAge || 600000
        });
      };
      if (p.interval > 0) {
        $fh.__dest__._geoWatcher = navigator.geolocation.watchPosition(

        function (position) {
          var coords = position.coords;
          var resdata = {
            lon: coords.longitude,
            lat: coords.latitude,
            alt: coords.altitude,
            acc: coords.accuracy,
            head: coords.heading,
            speed: coords.speed,
            when: position.timestamp
          };
          s(resdata);
        }, function () {
          f('error_geo');
        }, {
          timeout: p.interval,
          enableHighAccuracy: p.enableHighAccuracy, 
          maximumAge: p.maximumAge || 600000
        });
      };
    } else if (p.act == "unregister") {
      if ($fh.__dest__._geoWatcher) {
        navigator.geolocation.clearWatch($fh.__dest__._geoWatcher);
        $fh.__dest__._geoWatcher = undefined;
      };
      s();
    } else {
      f('geo_badact', {}, p);
    }
  };

  /** **************************************************
   *  NOTIFY
   *  **************************************************
   */

  $fh.__dest__.notify = function (p, s, f) {
    var acts = {
      vibrate: function () {
        navigator.notification.vibrate(1000);
      },

      beep: function () {
        navigator.notification.beep(2);
      }
    }
    var actfunc = acts[p.type];
    if (actfunc) {
      actfunc();
    } else {
      f('notify_badact', {}, p);
    }
  };

  /**
   * $fh.env
   */
  $fh.__dest__.env = function (p, s, f) {
    var uuid = null;
    if(window.fhdevice && window.fhdevice.uuid){
      uuid = window.fhdevice.uuid;
    } else if(navigator.device && navigator.device.uuid){
      uuid = navigator.device.uuid;
    } else if(window.device && window.device.uuid){
      uuid = window.device.uuid;
    }
    s({
      uuid: uuid
    });
  };

  /**
   * Orientation
   */
  $fh.__dest__.ori = function (p, s, f) {
    if (typeof p.act == "undefined" || p.act == "listen") {
      window.addEventListener('orientationchange', function (e) {
        s(window.orientation);
      }, false);
    } else if (p.act == "set") {
      if(navigator.deviceOrientation || (window.plugins && window.plugins.deviceOrientation)){
        if (!p.value) {
          f('ori_no_value');
          return;
        }
        var deviceOrientation = window.deviceOrientation || window.plugins.deviceOrientation;
        deviceOrientation.setOrientation(p.value, function(ori){
          s(ori);
        }, function(err){
          f('set_ori_error');
        });
      } else {
        f('ori_badact');
      }
    } else {
      f('ori_badact');
    }
  };
}
if(window.$fh){
  var $fh = window.$fh;
    
  $fh.__dest__.send = function(p, s, f){
    function getAsArray(input){
      var ret = [];
      if(input){
        if(typeof input === "string"){
          ret = [input];
        } else {
          ret = input;
        }
      }
      return ret;
    }
    if(p.type == "email"){
      var isHtml = false;
      var to = getAsArray(p.to);
      var cc = getAsArray(p.cc);
      var bcc = getAsArray(p.bcc);
      var attachments = getAsArray(p.attachments);
      if(p.isHtml){
        isHtml = true;
      }
      if(navigator.emailcomposer || (window.plugins && window.plugins.EmailComposer)){
        var emailcomposer = navigator.emailcomposer || window.plugins.EmailComposer;
        emailcomposer.showEmailComposerWithCallback(function(res){
          for(var key in emailcomposer.ComposeResultType){
              var result = "Unknown";
              if(emailcomposer.ComposeResultType[key] == res){
                  result = key;
                  break;
              }
          }
          if(result.toLowerCase().indexOf("fail") > -1){
            f(result);
          } else {
            s(result);
          }
        }, p.subject || "", p.body || "", to, cc, bcc, isHtml, attachments);
      } else {
        return f("send_nosupport");
      }
    }else if(p.type == "sms"){
      if(window.plugins && (window.plugins.smsComposer || window.plugins.smsBuilder)){
        var smsComposer = window.plugins.smsBuilder || window.plugins.smsComposer;
        smsComposer.showSMSBuilderWithCB(function(res){
          var status = 'Failed'; // default to failed
          if (result === 0)
          {
              status = 'Cancelled';
          }
          else if (result === 1)
          {
              status = 'Sent';
          }
          else if (result === 2)
          {
              status = 'Failed';
          }
          else if (result === 3)
          {
              status = 'NotSent';
          }

          if (status === 'Failed') {
            f(status);
          } else {
            s(status);
                }
          }, p.to, p.body); 
          return;
      } else {
        f('send_sms_nosupport', {}, p);
        return;
      }
    }else{
      f('send_nosupport', {}, p);
      return;
    }
  };
    
  $fh.__dest__.is_playing_audio = false;
  
  $fh.__dest__.audio = function(p, s, f){
    if(!$fh.__dest__.is_playing_audio && !p.path){
        f('no_audio_path');
        return;
    }
    var streamImpl = null;
    if(navigator.stream || (window.plugins && window.plugins.stream)){
      streamImpl = navigator.stream || window.plugins.stream;
    }
    if(!streamImpl){
      return f('audio_nosupport');
    }
    var acts = {
        'play': function(){
            streamImpl.play(p, function(){
                $fh.__dest__.is_playing_audio = true;
                s();
            }, f);
        },
        
        'pause': function(){
            streamImpl.pause(p, s, f);
        },
        
        'stop':function(){
            streamImpl.stop(p, function(){
                $fh.__dest__.is_playing_audio = false;
                s();
            }, f);
        }
    }
    
    acts[p.act]? acts[p.act]() : f('audio_badact');
  };
    
  $fh.__dest__.webview = function(p, s, f){
    var webviewImpl = null;
    if(navigator.webview || (window.plugins && window.plugins.webview)){
      webviewImpl = navigator.webview || window.plugins.webview;
    }
    if(!webviewImpl){
      return f('webview_nosupport');
    }
    if(!('act' in p) || p.act === 'open'){
      if(!p.url){
        f('no_url');
        return;
      }
      webviewImpl.load(p, s, f);
    } else {
      if(p.act === "close"){
        webviewImpl.close(p, s, f);
      }
    }
  };

    
  $fh.__dest__.file = function (p, s, f) {
    var errors =['file_notfound', 'file_invalid_url', 'file_connection_err', 'file_server_err', 'file_user_cancelled'];
    if(typeof navigator.fileTransfer === "undefined"){
      navigator.fileTransfer = new FileTransfer();
    }
    var acts = {
      'upload': function () {
          if (!p.filepath) {
              f('file_nofilepath');
              return;
          }
          if (!p.server) {
              f('file_noserver');
              return;
          }
          var options = {};
          if (p.filekey) {
              options.fileKey = p.filekey;
          }
          if (p.filename) {
              options.fileName = p.filename;
          }
          if (p.mime) {
              options.mimeType = p.mime;
          }
          if (p.params) {
              options.params = p.params;
          }
          navigator.fileTransfer.upload(p.filepath, p.server, function (result) {
              s({
                status: result.responseCode,
                  res: unescape(result.response),
                  size: result.bytesSent
              });
          }, function (errorResult) {
              var error = errorResult.code;
              var err = 'file_unknown';
              if( 1<= error <=4){
                err = errors[error - 1];
              }
              f(err);
          }, options);
      },
      
      'download': function() {
        if(!p.src){
          f('file_nofilesrc');
          return;
        }
        if(!p.dest){
          f('file_nofiledest');
          return;
        }
        window.requestFileSystem(LocalFileSystem.PERSISTENT, 0, function(fs){
          var appDir = fs.root.fullPath;
          var downloadTarget = [appDir, "Downloads", p.dest].join("/");
          if(p.progressListener && typeof p.progressListener === "function"){
            navigator.fileTransfer.onprogress = function(progressEvent){
              p.progressListener(progressEvent.loaded / progressEvent.total);
            }
          }
          navigator.fileTransfer.download(p.src, downloadTarget, function(entry){
            s(entry.fullPath);
          }, function(error){
            if(error.code === FileTransferError.FILE_NOT_FOUND_ERR){
              return f(errors[0]);
            } else if(error.code === FileTransferError.INVALID_URL_ERR){
              return f(errors[1]);
            } else if(error.code == FileTransferError.CONNECTION_ERR){
              return f(errors[2]);
            } else if(error.code === FileTransferError.ABORT_ERR){
              return f(errors[4]);
            }
          }, false, {headers: p.headers});
        }, function(err){
          return f(err.target.error.code);
        });
      },
      
      'cancelDownload': function(){
        navigator.fileTransfer.abort();
      },
      
      'open' : function(){
        if(!p.filepath){
          f('file_nopath');
          return;
        }
        var ref = window.open(p.filepath, "_system", {});
        ref.addEventListener('loadstop', function(){
          s();
        });
        ref.addEventListener('loaderror', function(){
          f();
        });
      },
      
      'list' : function(){
        if(!p.url){
          f('file_nourl');
          return;
        }
        if(navigator.ftputil || (window.plugins && window.plugins.ftputil)){
          var ftputil = navigator.ftputil || window.plugins.ftputil;
          ftputil.list(function(list){
            s({list: list});
          }, function(err){
            if(err == 1){
              f(errors[2]);
            } else if(err == 5){
              f(errors[1]);
            }
          }, p);
        } else {
          f('file_ftplist_nosupport');
        }
      }
    }
    
    var actfunc = acts[p.act];
    if(actfunc){
      actfunc();
    }else{
      f('file_badact');
    }
  };

  $fh.__dest__.push = function(p, s, f){
    if(typeof PushNotification === "undefined"){
      return f("push_no_impl");
    }
    var acts = {
      'register': function(){
        var onRegistration = function(event)  {
          if (!event.error) {
            console.log("Reg Success: " + event.pushID)
            s({deviceToken: event.pushID});
          } else {
            f(event.error);
          }
        }
        document.addEventListener("urbanairship.registration", onRegistration, false);

        PushNotification.isPushEnabled(function(enabled){
          if(enabled){
            PushNotification.registerForNotificationTypes(PushNotification.notificationType.sound|PushNotification.notificationType.alert|PushNotification.notificationType.badge);
          } else {
            PushNotification.enablePush(function(){
              PushNotification.registerForNotificationTypes(PushNotification.notificationType.sound|PushNotification.notificationType.alert|PushNotification.notificationType.badge);
            })
          }
        });

        document.addEventListener("resume", function(){
          PushNotification.resetBadge();
        }, false);
        document.addEventListener("pause", function(){
          document.removeEventListener("urbanairship.registration", onRegistration, false);
        }, false);
      },
      
      'receive': function(){
        var onPush = function(event){
          if(event.message){
            s(event.message);
          }
        }
        PushNotification.getIncoming(onPush);
        PushNotification.isPushEnabled(function(enabled){
          if(enabled){
            document.addEventListener("urbanairship.push", onPush, false);
          } else {
            PushNotification.enablePush(function(){
              document.addEventListener("urbanairship.push", onPush, false);
            })
          }
        });

        document.addEventListener("resume", function(){
          PushNotification.getIncoming(onPush);
        }, false);
        document.addEventListener("pause", function(){
          document.removeEventListener("urbanairship.push", onRegistration, false);
        }, false);
      }
    };
    
    acts[p.act]?acts[p.act]() : f('push_badact');
  };

  document.addEventListener('deviceready', function () {
    $fh._readyState = true;
    document.removeEventListener('deviceready', arguments.callee, false);
    while ($fh._readyCallbacks.length > 0) {
      var f = $fh._readyCallbacks.shift();
      try{
        f();
      }catch(e){
        console.log("Error during $fh.ready. Skip. Error = " + e.message);
      }
    }
  }, false);
}
