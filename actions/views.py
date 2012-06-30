from actions.models               import *
from django.shortcuts             import render_to_response, get_object_or_404
from django.http                  import HttpResponseRedirect, HttpResponse
import pygeoip_modif

GEOIP = pygeoip_modif.Database('/var/www/doadoing.com/doadoing/GeoLiteCity.dat')

def mostrar_pagina ( template , parametros_extra = {} ) :

    return render_to_response ( template , dict ( parametros_extra.items() ) )

#------------------------------------------------------------

def home ( request ) :

	actions = Action.importants(-1) 

	info = GEOIP.lookup ( request.META['REMOTE_ADDR'] )

	return mostrar_pagina ( "home.html" , { "actions" : actions , "geolocation": info } )

#------------------------------------------------------------

def view_action ( request , action_id ) :

	actions = Action.objects.filter ( id = action_id )

	info = GEOIP.lookup ( request.META['REMOTE_ADDR'] )

	return mostrar_pagina ( "doing.html" , { "actions" : actions , "geolocation": info } )

#------------------------------------------------------------

def add_action ( request ) :

	content   = request.POST['content'].strip()
	latitude  = float ( request.POST [ "latitude"  ] )
	longitude = float ( request.POST [ "longitude" ] )

	#lets see if we have it

	actions = Action.search ( content , latitude , longitude , 0 )

	if len(actions) == 1 :

		a = actions[0]

		add_me_too ( request , a )

	else :

		a = Action()

		a.location = Location()

		a.from_ip = request.META['REMOTE_ADDR']

		a.location.longitude = longitude
		a.location.latitude  = latitude

		a.location.save()

		a.location_id = a.location.id 

		a.content = content

		a.save()

	return mostrar_pagina ( "json/actions.json" , { "actions" : [a] } )

#------------------------------------------------------------

def search_actions ( request ) :

	last = 0

	if "last" in request.GET :
		last = int ( request.GET['last'])

	actions = Action.search ( request.GET['action'] ,
						      float ( request.GET['latitude'  ] ),
						      float ( request.GET['longitude' ] ),
						      last
							)

	return mostrar_pagina ( "json/actions.json" , { "actions" : actions } )

#------------------------------------------------------------

def load_actions ( request ) :

	last = 0

	if "last" in request.GET :
		last = int ( request.GET ["last"])

	actions = Action.importants( last )

	return mostrar_pagina ( "json/actions.json" , { "actions" : actions } )

#------------------------------------------------------------

def add_me_too ( request , action ) :

	too = MeToo()

	too.from_ip = request.META['REMOTE_ADDR']

	too.location = Location()
	too.location.latitude  = float ( request.POST["latitude"  ] )
	too.location.longitude = float ( request.POST["longitude" ] )
	too.location.save()

	too.location_id = too.location.id

	too.action = action 

	too.save()

#------------------------------------------------------------

def me_too ( request ) :

	a = Action.objects.get ( id = request.POST["action_id"] )

	if str(a.id) not in request.session :
		request.session[str(a.id)] = 1
		add_me_too ( request , a )	

	return mostrar_pagina ( "json/actions.json" , { "actions" : [a] } )

#------------------------------------------------------------

def new_actions ( request ) :

	last      = request.GET ['last']
	latitude  = float ( request.GET["latitude"  ] )
	longitude = float ( request.GET["longitude" ] )
	content   = request.GET['filter'].strip()

	actions = Action.search ( content , latitude , longitude , last )

	return HttpResponse ( '{"count":' + str ( len( actions)) +'}' )

#------------------------------------------------------------

def stats ( request ) :

	return mostrar_pagina ( "json/stats.json" , 
							 {"data": Action.stats ( request.GET["action_id"] ) }
							 )

#------------------------------------------------------------

def heat_map ( request ) :

	return mostrar_pagina ( "json/heat_map.json" , 
						    { "data" : Action.heat_map ( request.GET["action_id"] ) }
						  )
