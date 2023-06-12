$(document).ready(function(){

    
    var playing = false;

    const queryString = window.location.search;
    const urlParams = new URLSearchParams(queryString);
    const playerID = urlParams.get('pid');
    console.log('playerID', playerID);

    var ignoreClosed = false;

    $('#submitInitials').click(function(){
        const initials = ($('#i0').val() + $('#i1').val() + $('#i2').val()).trim();
        if(initials !== '') {
            ignoreClosed = true;
            send('submitInitials', { 'initials': initials });
            location.href = '/thanks.html';
        }
    });

    const beforeUnloadListener = (event) => {
      if(playing) {
        event.preventDefault();
        return confirm('Are you sure you want to leave the page? You will forfeit the rest of your lives.');
      }
    };

    addEventListener('beforeunload', beforeUnloadListener, { capture: true });

    const send = function(command, payload) {
        const obj = {
            command: command,
            payload: payload,
            to: 'master',
            from: playerID
        }
        console.log('sending', obj);
        ws.send(JSON.stringify(obj));
    }

    const showPanel = function(panelID) {
        $('.panel').not('#'+panelID).fadeOut(300);
        $('.panel#'+panelID).fadeIn(300);
    }

    const ws = new WebSocket("wss://websocket-server-ray.herokuapp.com/?pid="+playerID);
    // const ws = new WebSocket("ws://192.168.137.1:3000/?pid="+playerID);

    var drawing = false;

    ws.onopen =
        () => {
            console.log("Connected to the server");
            /* window.onmousemove = (event) => {
                if(drawing) {
                    const x = event.clientX/window.innerWidth;
                    const y = event.clientY/window.innerHeight;
                    console.log(x + ", " + y)
                    ws.send(JSON.stringify({x: x, y: y}));
                }
                
            }; */

            window.onmousedown = (event) => {
                drawing = true;
            }

            window.onmouseup = (event) => {
                drawing = false;
            }

            ws.onmessage = (event) => {
                const data = JSON.parse(event.data);
                if(data.command == 'livesLeft') {
                    if(data.payload.lives <= 0) {
                        // show game over 
                        showPanel('gameOver');
                        playing = false;
                    } else {
                        $('#lives').html('0'+data.payload.lives);
                    }
                } else if (data.command == 'grantGame') {
                    if(data.payload.playerID == playerID) {
                        playing = true;
                        showPanel('play');
                        // do start animation
                    } else {
                        showPanel('message');
                    }
                }
                
            }

            ws.onclose = (event) => {
                console.log('websocket connection closed.');
            }
        };



    $(window).resize(function(){
        $('#slider-vertical').css({
            height: $('#play').height()+'px'
        });
    });


    $('#slider-vertical').css({
        height: $('#play').height()+'px'
    });

    $( "#slider-vertical" ).slider({
      orientation: "vertical",
      range: "min",
      min: -1,
      max: 1,
      value: 0,
      step: 0.1,
      slide: function( event, ui ) {
        console.log(ui.value);

        send('movePaddle', { speed: ui.value} );
      }
      /*
      ,
      
      stop: function(event, ui) {
        
        send('movePaddle', { speed: 0 });
        $(ui.handle).animate({
            'bottom': '50%'
        }, 100, function(){
        });

      }
      */
    });

    $('input').keyup(function(e){
        console.log(e.originalEvent);
        if(e.originalEvent.key !== 'Backspace' && e.originalEvent.key !== 'Tab' && e.originalEvent.key !== 'Shift') {
            $(this).next().focus();
        }
    });

    
});
