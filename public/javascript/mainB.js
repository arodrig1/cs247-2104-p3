// Initial code by Borui Wang, updated by Graham Roth
// For CS247, Spring 2014

(function() {

  var BAR_MIN = 0;
  var BAR_MAX = 100;
  //var BAR_START_STEP = 25;
  var BAR_RECORD_STEP = 1;
  var VID_MAX = 10000;
  var REC_KEY = 220;

  var cur_video_blob = null;
  var fb_instance;
  var username = null;
  var fb_chat_room_id = null;
  var fb_new_chat_room;
  var fb_instance_users;
  var fb_instance_stream;
  var my_color;
  var mediaRecorder;

  $(document).ready(function(){
    connect_to_chat_firebase();
    connect_webcam();
    /*$("#progressbar").progressbar({ 
      value: BAR_MIN,
      max: BAR_MAX,
      complete: function(event, ui) {
        console.log("Recording started!");
        mediaRecorder.start(VID_MAX);
        $(this).hide();
        $("#recordbar").show();        
      }
    });*/
    $("#recordbar").progressbar({ 
      value: BAR_MIN,
      max: BAR_MAX,
      complete: function(event, ui) {
        mediaRecorder.stop();
        $(this).progressbar("value", BAR_MIN);
        //$(this).hide();
        //$("#progressbar").progressbar("value", BAR_MIN);
        //$("#progressbar").show();        
      }
    });
    //$("#recordbar").hide();
  });

  function connect_to_chat_firebase(){
    /* Include your Firebase link here!*/
    fb_instance = new Firebase("https://resplendent-fire-793.firebaseio.com");

    // generate new chatroom id or use existing id
    var url_segments = document.location.href.split("#");
    if(url_segments[1]){
      fb_chat_room_id = url_segments[1];
    }else{
      fb_chat_room_id = Math.random().toString(36).substring(7);
    }
    display_msg({m:"Share this url with your friend to join this chat: "+ document.location.origin +"/versionB" + "#" + fb_chat_room_id,c:"red"})

    // set up variables to access firebase data structure
    fb_new_chat_room = fb_instance.child('chatrooms').child(fb_chat_room_id);
    fb_instance_users = fb_new_chat_room.child('users');
    fb_instance_stream = fb_new_chat_room.child('stream');
    my_color = "#"+((1<<24)*Math.random()|0).toString(16);

    // listen to events
    fb_instance_users.on("child_added",function(snapshot){
      display_msg({m:snapshot.val().name+" joined the room",c: snapshot.val().c});
    });
    fb_instance_stream.on("child_added",function(snapshot){
      display_msg(snapshot.val());
    });

    // block until username is answered
    username = window.prompt("Welcome, warrior! Please declare your name:");
    if(!username){
      username = "anonymous"+Math.floor(Math.random()*1111);
    }
    fb_instance_users.push({ name: username,c: my_color});
    $("#waiting").remove();

    // bind submission box
    $("#submission input").keydown(function( event ) {
      //console.log("KeyDOWN!");
      if (event.which == 13) {
        fb_instance_stream.push({m:username+": " +$(this).val(), c: my_color});
        $(this).val("");
        scroll_to_bottom(0);
      // Ctrl + '\' combo
      } else if (event.ctrlKey && event.which == REC_KEY) {
        event.preventDefault();
        $(this).val($(this).val() + "\\");
      // '\'' key
      } else if (event.which == REC_KEY) {
        event.preventDefault();
        //var startVal = $("#progressbar").progressbar("value");
        var recVal = $("#recordbar").progressbar("value");
        //if (startVal < BAR_MAX) $("#progressbar").progressbar("value", startVal + BAR_START_STEP);
        if (recVal == 0) mediaRecorder.start(VID_MAX);
        if (recVal < BAR_MAX) $("#recordbar").progressbar("value", recVal + BAR_RECORD_STEP);
      }
    });

    $("#submission input").keyup(function(event) {
      // '\'' key
      //console.log("KeyUP!");
      if (event.which == REC_KEY) {
        //var startVal = $("#progressbar").progressbar("value");
        var recVal = $("#recordbar").progressbar("value");
        //if (startVal < BAR_MAX) $("#progressbar").progressbar("value", BAR_MIN);
        if (recVal > 0 && recVal < BAR_MAX) {
          mediaRecorder.stop();
          $("#recordbar").progressbar("value", BAR_MIN);
          /*$("#recordbar").hide();
          $("#progressbar").progressbar("value", BAR_MIN);
          $("#progressbar").show();
          $("#recordbar").progressbar("value", BAR_MIN);*/
        }
      }
    });

    // scroll to bottom in case there is already content
    scroll_to_bottom(1300);
  }

  // creates a message node and appends it to the conversation
  function display_msg(data){
    $("#conversation").append("<div class='msg' style='color:"+data.c+"'>"+data.m+"</div>");
    if(data.v){
      // for video element
      var video = document.createElement("video");
      video.autoplay = true;
      video.controls = false; // optional
      video.loop = true;
      video.width = 120;

      var source = document.createElement("source");
      source.src =  URL.createObjectURL(base64_to_blob(data.v));
      source.type =  "video/webm";

      video.appendChild(source);

      // for gif instead, use this code below and change mediaRecorder.mimeType in onMediaSuccess below
      // var video = document.createElement("img");
      // video.src = URL.createObjectURL(base64_to_blob(data.v));

      document.getElementById("conversation").appendChild(video);
    }
  }

  function scroll_to_bottom(wait_time){
    // scroll to bottom of div
    setTimeout(function(){
      $("html, body").animate({ scrollTop: $(document).height() }, 200);
    }, wait_time);
  }

  function connect_webcam(){
    // we're only recording video, not audio
    var mediaConstraints = {
      video: true,
      audio: false
    };

    // callback for when we get video stream from user.
    var onMediaSuccess = function(stream) {
      // create video element, attach webcam stream to video element
      var video_width= 160;
      var video_height= 120;
      var webcam_stream = document.getElementById('webcam_stream');
      var video = document.createElement('video');
      webcam_stream.innerHTML = "";
      // adds these properties to the video
      video = mergeProps(video, {
          controls: false,
          width: video_width,
          height: video_height,
          src: URL.createObjectURL(stream)
      });
      video.play();
      webcam_stream.appendChild(video);

      var video_container = document.getElementById('video_container');
      mediaRecorder = new MediaStreamRecorder(stream);
      var index = 1;

      mediaRecorder.mimeType = 'video/webm';
      // mediaRecorder.mimeType = 'image/gif';
      // make recorded media smaller to save some traffic (80 * 60 pixels, 3*24 frames)
      mediaRecorder.video_width = video_width/2;
      mediaRecorder.video_height = video_height/2;

      mediaRecorder.ondataavailable = function (blob) {
          video_container.innerHTML = "";

          // convert data into base 64 blocks
          blob_to_base64(blob, function(b64_data){
            cur_video_blob = b64_data;
            fb_instance_stream.push({ m: username + ": " + $("#submission input").val(), v: cur_video_blob, c: my_color});
            $("#submission input").val("");
          });
      };

      console.log("Connected to media stream!");
    }

    // callback if there is an error when we try and get the video stream
    var onMediaError = function(e) {
      console.error('media error', e);
    }

    // get video stream from user. see https://github.com/streamproc/MediaStreamRecorder
    navigator.getUserMedia(mediaConstraints, onMediaSuccess, onMediaError);
  }

  // check to see if a message qualifies to be replaced with video.
  var has_emotions = function(msg){
    var options = ["lol",":)",":("];
    for(var i=0;i<options.length;i++){
      if(msg.indexOf(options[i])!= -1){
        return true;
      }
    }
    return false;
  }


  // some handy methods for converting blob to base 64 and vice versa
  // for performance bench mark, please refer to http://jsperf.com/blob-base64-conversion/5
  // note using String.fromCharCode.apply can cause callstack error
  var blob_to_base64 = function(blob, callback) {
    var reader = new FileReader();
    reader.onload = function() {
      var dataUrl = reader.result;
      var base64 = dataUrl.split(',')[1];
      callback(base64);
    };
    reader.readAsDataURL(blob);
  };

  var base64_to_blob = function(base64) {
    var binary = atob(base64);
    var len = binary.length;
    var buffer = new ArrayBuffer(len);
    var view = new Uint8Array(buffer);
    for (var i = 0; i < len; i++) {
      view[i] = binary.charCodeAt(i);
    }
    var blob = new Blob([view]);
    return blob;
  };

})();
