// Doingg JS, this will change the world!

String.prototype.new_link = function ( url , _target)
{
	return '<a href="' + url + '" target="' + _target + '">' + this + '</a>';
}

String.prototype.parseURL = function() {
	return this.replace(/[A-Za-z]+:\/\/[A-Za-z0-9-_]+\.[A-Za-z0-9-_:%&~\?\/.=]+/g, function(url) {
		return url.new_link(url, "_new");
	});
};

String.prototype.parseUsername = function() {
	return this.replace(/[@]+[A-Za-z0-9-_]+/g, function(u) {
		var username = u.replace("@","")
		return u.new_link("http://twitter.com/" + username , "_new");
	});
};

String.prototype.parseHashtag = function() {
	return this.replace(/[#]+[A-Za-z0-9-_]+/g, function(t) {
		var tag = t.replace("#","%23")
		return t.new_link("http://search.twitter.com/search?q="+tag , "_new");
	});
};

//---------------------------------------------------------
//---------------------------------------------------------
//---------------------------------------------------------

function ReverseGeocode ( latitude , longitude , callback )
{
	var latlng = new google.maps.LatLng(latitude, longitude);

    global_settings.geocoder.geocode({'latLng': latlng}, function(results, status) 
    {
      if (status == google.maps.GeocoderStatus.OK) 
      {
        if (results[1]) 
        {
          callback ( results[1]);
        } 
      }
     });
}

//---------------------------------------------------------
//---------------------------------------------------------
//---------------------------------------------------------

function GetLocation ( location ) 
{
    global_settings.latitude  = location.coords.latitude;
    global_settings.longitude = location.coords.longitude;

    global_settings.locality = "";

    var admin_level_1 = "";

    ReverseGeocode ( global_settings.latitude , global_settings.longitude , function ( result )
    {
    	//console.log ( result );
    	for ( var i =0 ; i < result.address_components.length ; i++)
    	{
    		for ( var j = 0 ; j < result.address_components [i].types.length ;j++)
    		{
    			if ( result.address_components[i].types[j] == "country" )
    			{
    				global_settings.country      = result.address_components[i].long_name;
    				global_settings.country_code = result.address_components[i].short_name;
    			}
    			else if ( result.address_components[i].types[j] == "locality")
    			{
    				global_settings.locality = result.address_components[i].long_name;
    			}
    			else if ( result.address_components[i].types[j] =="administrative_area_level_1")
    			{
    				admin_level_1 = result.address_components[i].long_name;
    			}
    		}
    	}

    	if ( global_settings.locality == "" )
    	{
    		global_settings.locality = admin_level_1;
    	}

    	global_settings.dehydrate();
    	show_location();
    });
}

//---------------------------------------------------------
//---------------------------------------------------------
//---------------------------------------------------------

function GlobalSettings()
{
	this.latitude    = 0;
	this.longitude   = 0;
	this.geocoder    = null;
	this.currentPage = 0;

	this.loadingLock = false;

	this.country        = "";
	this.country_code   = "";
	this.locality       = "";
	this.actions_filter = "";
	this.title          = document.title;
	this.mobile         = false;
	this.server_date    = Date.parse ( server_date );

	// Define the map to use from MapBox
    // This is the TileJSON endpoint copied from the embed button on your map
    this.url_tiles = 'http://a.tiles.mapbox.com/v3/mfernandez.map-y9wqazq6.jsonp';

    this.map    = null;
    this.marker = null;

    this.refresh_actions = true;
    this.poll_count = 0;
}

//---------------------------------------------------------

GlobalSettings.prototype.init = function()
{
	this.geocoder = new google.maps.Geocoder();

	this.hydrate();

	if ( this.latitude != 0 || this.longitude != 0 )
		return;

	GetLocation ( geoip );

	if ( navigator.geolocation )
	{
		navigator.geolocation.getCurrentPosition ( GetLocation );
	}
};

//---------------------------------------------------------

GlobalSettings.prototype.init_map = function ( container , check_click )
{
	// Make a new Leaflet map in your container div
    var amap = new L.Map( container )  // container's id="mapbox"

    // Get metadata about the map from MapBox
    wax.tilejson ( this.url_tiles, function(tilejson) 
    {
        amap.addLayer( new wax.leaf.connector ( tilejson ) );
    });

    if ( check_click )
	{    
	    amap.on('click', function(e)
	    {
	    	var location = {
	    		coords : {
	    			latitude  : e.latlng.lat ,
	    			longitude : e.latlng.lng
	    		}
	    	};

	    	GetLocation ( location );
	    });
	}

	return amap;
};

//---------------------------------------------------------

GlobalSettings.prototype.hydrate = function()
{
	this.latitude     = $.cookie ( "latitude"     );
	this.longitude    = $.cookie ( "longitude"    );
	this.country      = $.cookie ( "country"      );
	this.country_code = $.cookie ( "country_code" );
	this.locality     = $.cookie ( "locality"     );

	if ( this.latitude == null || this.longitude == null || 
		 this.latitude == 0    || this.longitude == 0    )
	{
		this.latitude  = 0;
		this.longitude = 0;
	}
};

//---------------------------------------------------------

GlobalSettings.prototype.dehydrate = function()
{
	if ( !this.mobile )
	{
		$.cookie ( 'latitude'     , this.latitude     , { expires: 7, path: '/' });
		$.cookie ( 'longitude'    , this.longitude    , { expires: 7, path: '/' });
		$.cookie ( 'locality'     , this.locality     , { expires: 7, path: '/' });
		$.cookie ( 'country'      , this.country      , { expires: 7, path: '/' });
		$.cookie ( 'country_code' , this.country_code , { expires: 7, path: '/' });
	}
};

//---------------------------------------------------------
//---------------------------------------------------------

function reload_actions()
{
	$.getJSON ( "/load-actions/", function ( result ) 
	{
		global_settings.server_date = Date.parse ( result.date );

		$('#actions').html("");

		for ( var i = 0 ; i < result.actions.length ; i++)
		{
			var action = make_html_action ( result.actions[i] , false );

			$('#actions').append ( action );
		}

		create_actions_handlers();
	});
}

//---------------------------------------------------------

function load_next_page()
{
	var loader = $('<div>');

	loader.html ( "<center><img src='/static/images/loading.gif'/ alt='Loading ...'><br></center>" );

	loader.hide().appendTo('#actions').slideDown("slow");

	//TODO: El heat del elemento
	var params = {
		"last" : $('.action').last().attr('actionid')
	}

	$.getJSON ( "/load-actions/", params ,  function ( result ) 
	{
		global_settings.server_date = Date.parse ( result.date );

		delay ( function() 
		{
			loader.fadeOut ( 1000 , function () 
			{	
				$(this).remove();

				for ( var i = 0 ; i < result.actions.length ; i++)
				{
					var action = make_html_action ( result.actions[i] , false ).hide().fadeIn(1000);

					$('#actions').append ( action );
				}

				create_actions_handlers();
				if ( result.actions.length > 0 )
				{
					global_settings.loadingLock = false;
				}
			});
			
			
		} , 500 );
	});

}

//---------------------------------------------------------
//---------------------------------------------------------

function show_location()
{
	if ( global_settings.map != null )
	{
		var pos = new L.LatLng( global_settings.latitude, global_settings.longitude);

		var currentZoom = global_settings.map.getZoom();

		if ( !currentZoom || currentZoom == undefined )
			currentZoom = 11;

    	global_settings.map.setView ( pos , currentZoom );

    	if ( global_settings.marker != null )
    		global_settings.map.removeLayer ( global_settings.marker );

		global_settings.marker = new L.Marker ( pos );
		global_settings.map.addLayer(global_settings.marker);
    }

    $('#country_flag').attr ( 'class', 'flag flag-' + global_settings.country_code );
	$('#country'  ).html ( global_settings.country  );
	$('#locality' ).html ( global_settings.locality );
}

//---------------------------------------------------------
//---------------------------------------------------------

function me_too ( action_id )
{
	var params = {
		'action_id'    : action_id                 ,
		'latitude'     : global_settings.latitude  ,
		'longitude'    : global_settings.longitude ,
		'country_code' : global_settings.country_code
	}

	var count = Number ( $('#me_too_count_' + action_id ).html() );

	$.post ("/me-too/" , params , function ( result ) 
	{
		if ( result.actions[0].MeToos == count )
			return;

		global_settings.server_date = Date.parse ( result.date );

		$('#action_' + result.actions [ 0 ].Id ).fadeOut ( 1000 , function () 
		{	
			locked_actions.push ( Number(action_id) );

			$(this).remove();

			$('html, body').animate( { scrollTop: 0 }, 'slow' );

			var action = make_html_action ( result.actions [ 0 ] , true );
			action.hide().prependTo('#actions').fadeIn("slow");

			create_actions_handlers();

		});
	},
	"json");
}

//---------------------------------------------------------

function stats ( action_id )
{
	var encontre = $('#action_' + action_id );

	if ( $('#chart_' + action_id ).length > 0 )
	{
		encontre.animate ( { height : '-=310'} , function() 
		{
			$('#chart_' + action_id ).remove();
		});
		return;
	}

	encontre.animate ( { height : '+=310'} );
	var params = {
		'action_id' : action_id
	}

	$.getJSON( "/stats/" , params , function(result)
	{
		var line1 = result.result;

		if ( line1.length == 0 )
			return;

		var chart = $('<div>');

		chart.attr ( "id" , "chart_" + action_id );
		chart.addClass ( "chart" );
		chart.appendTo ( encontre );

		var plot2 = $.jqplot( "chart_" + action_id , [line1], 
		{
		  title:'', 
		  grid: {
		  	background:"white"
		  },
		  axes:{
		    xaxis:{
		      renderer:$.jqplot.DateAxisRenderer, 
		      tickOptions:{formatString:'%#m/%#d %#H:00'},
		      min: line1[0][0],
		      tickInterval:'6 hours'
		    }
		  },
		  series:[ 
		  	{
		  		lineWidth:2,
		  		color: '#56A5EC',
		  		markerOptions: {size:4}
		  	}
		  ]
		});
	});
}

//---------------------------------------------------------

function heat_map (action_id)
{
	var params = {
		"action_id" : action_id
	};

	var encontre = $('#action_' + action_id );

	if ( $('#heat_map_' + action_id ).length > 0 )
	{
		encontre.animate ( { height : '-=310'} , function() 
		{
			$('#heat_map_' + action_id ).remove();
		});
		return;
	}

	encontre.animate ( { height : '+=310'} , function() 
	{ 
		$.getJSON ( "/heat-map/" , params , function(result)
		{
			var heat = $('<div>');

			heat.attr ( "id" , "heat_map_" + action_id );
			heat.addClass ( "heat_map" );
			heat.appendTo ( encontre );

			var map = global_settings.init_map ( 'heat_map_' + action_id );

			var heatmap = new L.TileLayer.HeatCanvas("Heat Canvas", map, {},
                        {'step':0.3, 'degree':HeatCanvas.LINEAR, 'opacity':0.7});

			var vector = result.result;

			if ( vector.length <= 0 )
				return;

			var positions = [];

    		for ( var i = 0 ; i < vector.length ; i++)
    		{
    			positions.push ( new L.LatLng (vector[i][0], vector[i][1]));
				heatmap.pushData( vector[i][0], vector[i][1], vector[i][2] * 2);
			}

			if ( positions.length == 1 || 
				(   vector.length == 2 && 
					vector[0][0] == vector[1][0] && 
					vector[0][1] == vector[1][1]  
				) 
			)
			{
				map.setView ( positions[0] , 15 );
			}
			else
			{
    			map.fitBounds (  new L.LatLngBounds ( positions ) );
    		}
			
			//push more data ...
			map.addLayer(heatmap);
		});
	});	
}

//---------------------------------------------------------

function update_times ()
{
	$('.action_time').each ( function()
	{
		$(this).html ( 
			calculate_time ( Date.parse ( $("#action_" + $(this).attr("actionid") ).attr("date") ))
		);
	});
}

//---------------------------------------------------------

function create_actions_handlers()
{
	$('.me_too').each ( function()
	{
		$(this).unbind('click');

		var action_id = Number ( $(this).attr ( "actionid") );

		if ( locked_actions.indexOf ( action_id ) != -1 )
		{
			$(this).addClass ( "disabled_me_too" );
			return;
		}

		$(this).click ( function(e)
		{
			me_too ( $(this).attr ( "actionid") );	
		});
	});

	$('.action').each ( function() 
	{
		$(this).unbind('mouseenter mouseleave click')

		$(this).click ( function(event)
		{
			if( $( event.target ).hasClass( "action" ) || 
				$( event.target ).hasClass( "action_content" )  )
    		{
        		window.location = "/doing/" + $(this).attr("actionid") + "/";
    		}
		});

		$(this).hover ( function() 
		{
			var content = $('#action_content_' + $(this).attr("actionid") ).html();

			content += " http://doadoing.com/doing/" + $(this).attr("actionid") + "/";

			content = encodeURIComponent ( content );

			$("<div>")
			.html(
				"<a href='javascript:heat_map (" + $(this).attr("actionid") + ");'>Heat Map</a> | " +
				"<a href='javascript:stats ("    + $(this).attr("actionid") + ");'>Stats</a> | " + 
				"<a href='https://twitter.com/intent/tweet?text=" + content + "' target='_new'>Tweet</a>")
			.attr("id","action_hover").appendTo($(this));

		},
		function() { 
			$('#action_hover').remove();
		});
	});

	$('a').click(function(event) 
	{
    	event.stopPropagation();
	});

	update_times();
}

//---------------------------------------------------------

function zeroFill( number, width )
{
  width -= number.toString().length;
  if ( width > 0 )
  {
    return new Array( width + (/\./.test( number ) ? 2 : 1) ).join( '0' ) + number;
  }
  return number + ""; // always return a string
}

function calculate_time ( aDate )
{
	var delta = new TimeSpan ( global_settings.server_date - aDate );
	var weeks  = delta.days / 7;
	var months = weeks / 4;

	if ( delta.days == 0 && delta.hours == 0 && delta.minutes == 0 )
	{
		return "now";
	}
	else if ( delta.days == 0 && delta.hours == 0 )
	{
		return zeroFill ( delta.minutes , 2 ) + "<span style='font-size:18px'>m</span>";
	}	
	else if ( delta.days == 0 )
	{
		return zeroFill ( delta.hours , 2 ) + "<span style='font-size:18px'>h</span>";
	}
	else if ( weeks < 1 )
	{
		return zeroFill ( delta.days , 2 ) + "<span style='font-size:18px'>d</span>";
	}
	else
	{
		return zeroFill ( Math.round ( weeks ) , 2 ) + "<span style='font-size:18px'>w</span>";
	} 
}

//---------------------------------------------------------

function make_html_action ( acc , is_new )
{
	var action = $('<div>');
	action.addClass ( "action" );
	action.attr ( "actionid" , acc.Id );
	action.attr ( "id"       , "action_" + acc.Id );
	action.attr ( "date"     , acc.Date );

	var time = $('<div>');
	time.addClass ( "action_time" )
	time.attr ( "actionid" , acc.Id );

	time.html ( calculate_time ( Date.parse ( acc.Date ) ) );

	var content = $('<div>');
	content.addClass ( "action_content" );
	content.attr ( "id" , "action_content_" + acc.Id );
	content.html ( acc.Content.parseURL().parseUsername().parseHashtag() );

	var me_too = $('<div>');
	me_too.addClass ( "action_metoos");

	me_too.html (
		"<div id=\"me_too_count_" + acc.Id + "\" class=\"me_too_count\">" + acc.MeToos + "</div>" +
		"<a class=\"btn me_too\" actionid=\"" + acc.Id + "\">me too</a>"
	);

	action.append ( time    );
	action.append ( content );
	action.append ( me_too  );

	return action;
}

//---------------------------------------------------------

function search_actions ( action_string )
{
	var params = {
		'action'    : action_string            ,
		'latitude'  : global_settings.latitude ,
		'longitude' : global_settings.latitude 
	}

	$.getJSON ( "/search-actions/" , params , function(result) 
	{
		global_settings.server_date = Date.parse ( result.date );

		if ( result.length > 0 )
		{
			global_settings.actions_filter = action_string;
		}

		$('#actions').html ( "" );

		for ( var i = 0 ; i < result.actions.length ; i++)
		{
			var action = make_html_action ( result.actions[i] , false );

			$('#actions').append ( action );
		}

		create_actions_handlers();
	});
}

//---------------------------------------------------------

function add_action()
{
	if ( $.trim( $('#new_action').val() ) == $.trim( global_settings.defaultValue) )
		return;

	var params = {
		'content'      : $.trim($('#new_action').val())  ,
		'latitude'     : global_settings.latitude  ,
		'longitude'    : global_settings.longitude ,
		'country_code' : global_settings.country_code 
	};

	if ( params.content == "")
		return;

	$.post ( "/add-action/" , params , function ( result ) 
	{	
		global_settings.server_date = Date.parse ( result.date );

		$('#action_' + result.actions [ 0 ].Id ).remove();

		var action = make_html_action ( result.actions [ 0 ] , true );
		action.hide().prependTo('#actions').slideDown("slow");

		create_actions_handlers();

	}, 
	"json");
}

//---------------------------------------------------------

var global_settings = null;

var delay = (function(){
  var timer = 0;
  return function(callback, ms){
    clearTimeout (timer);
    timer = setTimeout(callback, ms);
  };
})();

//---------------------------------------------------------
//---------------------------------------------------------
//---------------------------------------------------------
//---------------------------------------------------------

$(document).ready(function() 
{
	global_settings = new GlobalSettings();

	(function(a,b)
	{
	if( /android.+mobile|avantgo|bada\/|blackberry|blazer|compal|elaine|fennec|hiptop|iemobile|ip(hone|od)|iris|kindle|lge |maemo|midp|mmp|netfront|opera m(ob|in)i|palm( os)?|phone|p(ixi|re)\/|plucker|pocket|psp|symbian|treo|up\.(browser|link)|vodafone|wap|windows (ce|phone)|xda|xiino/i.test(a) || 
	    /1207|6310|6590|3gso|4thp|50[1-6]i|770s|802s|a wa|abac|ac(er|oo|s\-)|ai(ko|rn)|al(av|ca|co)|amoi|an(ex|ny|yw)|aptu|ar(ch|go)|as(te|us)|attw|au(di|\-m|r |s )|avan|be(ck|ll|nq)|bi(lb|rd)|bl(ac|az)|br(e|v)w|bumb|bw\-(n|u)|c55\/|capi|ccwa|cdm\-|cell|chtm|cldc|cmd\-|co(mp|nd)|craw|da(it|ll|ng)|dbte|dc\-s|devi|dica|dmob|do(c|p)o|ds(12|\-d)|el(49|ai)|em(l2|ul)|er(ic|k0)|esl8|ez([4-7]0|os|wa|ze)|fetc|fly(\-|_)|g1 u|g560|gene|gf\-5|g\-mo|go(\.w|od)|gr(ad|un)|haie|hcit|hd\-(m|p|t)|hei\-|hi(pt|ta)|hp( i|ip)|hs\-c|ht(c(\-| |_|a|g|p|s|t)|tp)|hu(aw|tc)|i\-(20|go|ma)|i230|iac( |\-|\/)|ibro|idea|ig01|ikom|im1k|inno|ipaq|iris|ja(t|v)a|jbro|jemu|jigs|kddi|keji|kgt( |\/)|klon|kpt |kwc\-|kyo(c|k)|le(no|xi)|lg( g|\/(k|l|u)|50|54|\-[a-w])|libw|lynx|m1\-w|m3ga|m50\/|ma(te|ui|xo)|mc(01|21|ca)|m\-cr|me(di|rc|ri)|mi(o8|oa|ts)|mmef|mo(01|02|bi|de|do|t(\-| |o|v)|zz)|mt(50|p1|v )|mwbp|mywa|n10[0-2]|n20[2-3]|n30(0|2)|n50(0|2|5)|n7(0(0|1)|10)|ne((c|m)\-|on|tf|wf|wg|wt)|nok(6|i)|nzph|o2im|op(ti|wv)|oran|owg1|p800|pan(a|d|t)|pdxg|pg(13|\-([1-8]|c))|phil|pire|pl(ay|uc)|pn\-2|po(ck|rt|se)|prox|psio|pt\-g|qa\-a|qc(07|12|21|32|60|\-[2-7]|i\-)|qtek|r380|r600|raks|rim9|ro(ve|zo)|s55\/|sa(ge|ma|mm|ms|ny|va)|sc(01|h\-|oo|p\-)|sdk\/|se(c(\-|0|1)|47|mc|nd|ri)|sgh\-|shar|sie(\-|m)|sk\-0|sl(45|id)|sm(al|ar|b3|it|t5)|so(ft|ny)|sp(01|h\-|v\-|v )|sy(01|mb)|t2(18|50)|t6(00|10|18)|ta(gt|lk)|tcl\-|tdg\-|tel(i|m)|tim\-|t\-mo|to(pl|sh)|ts(70|m\-|m3|m5)|tx\-9|up(\.b|g1|si)|utst|v400|v750|veri|vi(rg|te)|vk(40|5[0-3]|\-v)|vm40|voda|vulc|vx(52|53|60|61|70|80|81|83|85|98)|w3c(\-| )|webc|whit|wi(g |nc|nw)|wmlb|wonu|x700|yas\-|your|zeto|zte\-/i.test(a.substr(0,4)))
		global_settings.mobile = true;
	})(navigator.userAgent||navigator.vendor||window.opera);

	global_settings.init();

	show_location();

	create_actions_handlers();

	$('#change_location').click(function()
	{	
		if ( $('#change_location').html() == 'Finish' )
		{
			$("#mapbox").hide ( "blind");
			$( '#change_location').html("Change Location");
		}
		else
		{
			$('#change_location').html ( "Finish");

			$("#mapbox").show("blind", function()
			{
				if ( global_settings.map == null)
				{	
					global_settings.map = global_settings.init_map ( "mapbox" , true );	
				}
				show_location();
			});
		}
	});

	global_settings.defaultValue = $("#new_action").val();

	$("#new_action")
	.focus(function() 
	{
		if (this.value === this.defaultValue) 
		{
			this.value = '';
			$("#new_action").removeClass ("disabled");
		}
	})
	.blur(function() 
	{
		if (this.value === '') 
		{
			this.value = this.defaultValue;
			$("#share_char_limit").html ( 70 );
			$("#new_action").addClass ("disabled");
		}
	})
	.keyup(function( evt)
	{
		 if ( evt.keyCode == 13 && this.value != this.defaultValue )
		 {
		 	add_action();
		 	this.value = this.defaultValue;
		 	$("#share_char_limit").html ( 70 );
		 	$("#new_action").addClass ("disabled");
		 }
		 else
		 {
		 	var valor = this.value; 

		 	if (valor.length >= 70) 
		 	{
                this.value = this.value.substring(0, 70);
                valor = this.value;
            }

            $("#share_char_limit").html ( 70 - valor.length ); 

		 	delay(function(){
      			if ( valor.length > 3 )
      			{
      				search_actions ( valor );
      			}
      			else if ( valor.length == 0 )
      			{
      				reload_actions();
      			}
    	 	}, 500 );
		}
	});

	$(".action_content").each( function(){
		$(this).html (  $(this).html().parseURL().parseUsername().parseHashtag() );
	});

	$('#btn_new_action').click ( function() 
	{
		add_action();
	});

	$(document).scroll(function() 
	{
		var totalHeight  = $(document).height();
		var windowHeight = $(window).height();
		var position     = $(this).scrollTop();

		// We check if we're at the bottom of the scrollcontainer
		if (!global_settings.loadingLock && totalHeight - position == windowHeight ) 
		{
			global_settings.loadingLock = true;

			// If we're at the bottom, show the overlay and retrieve the next page
			global_settings.currentPage++;
		
			delay ( load_next_page , 500 );
		}
	});

	(function poll()
	{
		// TODO tengo que chequear si esta habilitado el pooling
		if ( !poll_enabled )
			return false;

		if ( global_settings.poll_count++ == 0 )
		{
			setTimeout ( poll , 25000 );
			return;
		}
			
		var action_id = $(".action").first().attr("actionid");

		var params = {
			"last"      : action_id , 
			"latitude"  : global_settings.latitude  ,
			"longitude" : global_settings.longitude ,
			"filter"    : global_settings.actions_filter
		};

	    $.getJSON( "/new-actions/", params , function(result)
	    {
	    	global_settings.server_date = Date.parse ( result.date );
	    	update_times();

	        $("#new_actions").remove();

	        if ( result.actions.length > 0 )
	        {
	        	document.title = "(" + result.actions.length + ") " + global_settings.title;

	        	var count  = $('<div>');
	        	count.attr ( "id" , "new_actions");

	        	count.html ( "New Doings (" + result.actions.length + ")");

	        	count.hide().prependTo('#actions').slideDown("slow");

	        	count.click ( function() 
	        	{
	        		count.remove();
	        		document.title = global_settings.title;

	        		for ( var i = result.actions.length - 1 ; i >= 0 ; i-- )
	        		{
	        			$('#action_' + result.actions [ i ].Id ).remove();

						var action = make_html_action ( result.actions [ i ] , false );
						action.prependTo('#actions');
					}
					create_actions_handlers();
	        	});
	        }
	        else
	        {
	        	document.title = global_settings.title;
	        }

	        setTimeout ( poll , 25000 );

	    },
	    "json");
	})();

});


