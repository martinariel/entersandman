// Doingg JS, this will change the world!


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
	$.cookie ( 'latitude'     , this.latitude     , { expires: 7, path: '/' });
	$.cookie ( 'longitude'    , this.longitude    , { expires: 7, path: '/' });
	$.cookie ( 'locality'     , this.locality     , { expires: 7, path: '/' });
	$.cookie ( 'country'      , this.country      , { expires: 7, path: '/' });
	$.cookie ( 'country_code' , this.country_code , { expires: 7, path: '/' });
};

//---------------------------------------------------------
//---------------------------------------------------------

function reload_actions()
{
	$.getJSON ( "/load-actions/", function ( result ) 
	{
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
		delay ( function() 
		{
			loader.fadeOut ( 1000 , function () 
			{	
				$(this).remove();

				for ( var i = 0 ; i < result.actions.length ; i++)
				{
					var action = make_html_action ( result.actions[i] , false ).hide().fadeIn(1000);

					$('#actions').append ( action );;
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

    	global_settings.map.setView ( pos , 11 );

    	if ( global_settings.marker != null )
    		global_settings.map.removeLayer ( global_settings.marker );

		global_settings.marker = new L.Marker ( pos );
		global_settings.map.addLayer(global_settings.marker);
    }

    $('#country_flag').attr('class', 'flag flag-'+global_settings.country_code );
	$('#country'  ).html ( global_settings.country  );
	$('#locality' ).html ( global_settings.locality );
}

//---------------------------------------------------------
//---------------------------------------------------------

function me_too ( action_id )
{
	var params = {
		'action_id' : action_id ,
		'latitude'  : global_settings.latitude ,
		'longitude' : global_settings.longitude 
	}

	$.post ("/me-too/" , params , function ( result ) 
	{
		$( "#me_too_count_" + action_id ).html ( result.actions[0].MeToos );
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

		var plot2 = $.jqplot( "chart_" + action_id , [line1], {
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
		  		color: '#56A5EC'
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

			var pos = new L.LatLng( vector[vector.length-1][0] ,vector[vector.length-1][1] );

    		map.setView ( pos , 9 );

    		for ( var i = 0 ; i < vector.length ; i++)
    		{
				heatmap.pushData( vector[i][0], vector[i][1], vector[i][2] * 2);
			}
			
			//push more data ...
			map.addLayer(heatmap);
		});
	});	
}

//---------------------------------------------------------

function create_actions_handlers()
{
	$('.me_too').each ( function()
	{
		$(this).unbind('click');
		$(this).click ( function()
		{
			me_too ( $(this).attr ( "actionid") );	
		});
	});

	$('.action').each ( function() 
	{
		$(this).unbind('mouseenter mouseleave')
		$(this).hover ( function() 
		{
			var content = $('#action_content_' + $(this).attr("actionid") ).html();

			content += " http://doadoing.com/doing/" + $(this).attr("actionid") + "/";

			content = encodeURIComponent ( content );

			$("<div>")
			.html(
				"<a href='javascript:heat_map (" + $(this).attr("actionid") + ");'>Heat Map</a> | " +
				"<a href='javascript:stats (" + $(this).attr("actionid") + ");'>Stats</a> | " + 
				"<a href='https://twitter.com/intent/tweet?text=" + content + "' target='_new'>Tweet</a>")
			.attr("id","action_hover").appendTo($(this));

		},
		function() { 
			$('#action_hover').remove();
		});
	});
}

//---------------------------------------------------------

function make_html_action ( acc , is_new )
{
	var action = $('<div>');
	action.addClass ( "action" );
	action.attr ( "actionid" , acc.Id );
	action.attr ( "id"       , "action_" + acc.Id );

	var time = $('<div>');
	time.addClass ( "action_time" )

	if ( is_new )
	{
		var now = $('<div>');
		now.addClass ( "segundos" );
		now.html     ( "now"      );
		time.append ( now );
	}
	else
	{
		var seconds = $ ('<div>');
		var hour    = $ ('<div>');

		seconds.addClass ( "segundos" );
		hour.addClass    ( "hora");

		seconds.html ( acc.Second + "s" );
		hour.html    ( acc.Hour   + ":" + acc.Minute );

		time.append ( seconds );
		time.append ( hour    );
	
	}

	var content = $('<div>');
	content.addClass ( "action_content" );
	content.attr ( "id" , "action_content_" + acc.Id );
	content.html ( acc.Content );

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
		if ( 1 == 1 || result.length > 0 )
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
	var params = {
		'content'   : $('#new_action').val()    ,
		'latitude'  : global_settings.latitude  ,
		'longitude' : global_settings.longitude 
	};

	if ( params.content == "")
		return;

	$.post ( "/add-action/" , params , function ( result ) 
	{	
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
		if ( global_settings.poll_count++ == 0 )
		{
			setTimeout ( poll , 120000 );
			return;
		}
			
		var action_id = $(".action").first().attr("actionid");

		var params = {
			"last"      : action_id , 
			"latitude"  : global_settings.latitude  ,
			"longitude" : global_settings.longitude ,
			"filter"    : global_settings.actions_filter
		};

	    $.getJSON( "/new-actions/", params , function(data)
	    {
	        $("#new_actions").remove();

	        if ( data.count > 0 )
	        {
	        	var count = $('<div>');
	        	count.attr ( "id" , "new_actions");

	        	count.html ( "<center><a href='/'>New Doings (" + data.count + ")</a></center>");

	        	count.hide().prependTo('#actions').slideDown("slow");
	        }

	        setTimeout ( poll , 120000 );

	    },
	    "json");
	})();

});