from django.db import models
from itertools import groupby

class Location ( models.Model ) :

    country_code = models.CharField ( max_length = 10 )

    latitude  = models.FloatField ()
    longitude = models.FloatField ()

#---------------------------------------------------------

class Action ( models.Model ) :

    date_time    = models.DateTimeField ( auto_now_add = True )
    date_created = models.DateTimeField ( auto_now_add = True )
    content      = models.CharField     ( max_length   = 70 , db_index = True )
    from_ip      = models.CharField     ( max_length   = 32   )
    location     = models.ForeignKey    ( Location, blank = True , null = True )
    expired      = models.BooleanField  ( db_index = True )

    @staticmethod
    def importants ( last ):

        if last <= 0 :

            return Action.objects.filter ( expired = False ).order_by ( "-date_time")[:25]

        else :

            last_action = Action.objects.get ( id = last )

            return Action.objects.filter ( expired = False , date_time__lt = last_action.date_time ).order_by ("-date_time")[:25]

    @staticmethod
    def search_exact ( action_content , latitud , longitude ) :
        return Action.objects.filter ( content = action_content , expired = False )

    @staticmethod
    def search ( action_content , latitude , longitude , last ):
        if last == 0 :
            return Action.objects.filter ( content__icontains = action_content , expired = False ).order_by ("-date_time")
        else :

            last_action = Action.objects.get ( id = last )

            if action_content != "" :
                return Action.objects.filter ( date_time__gt   = last_action.date_time , \
                                               content__icontains = action_content     , 
                                               expired = False ).order_by ("-date_time")
            else :
                return Action.objects.filter ( date_time__gt   = last_action.date_time , \
                                               expired = False ).order_by ("-date_time")

    @staticmethod
    def stats ( action_id ):

        #Grouped by hour
        def extract_date_created(entity):
            return entity.date_created.strftime("%s %s:00" % ("%Y-%m-%d", "%H"))

        #Grouped by hour
        def extract_date(entity):
            return entity.date_time.strftime("%s %s:00" % ("%Y-%m-%d", "%H"))

        a = Action.objects.get ( id = action_id )

        me_toos = a.metoo_set.order_by ( "date_time")

        result = []

        result.append ( ( extract_date_created ( a ) , 1 ) )

        for start_date, group in groupby(me_toos, key=extract_date):
            result.append ( ( start_date , len ( list(group) ) ) )

        return result

    @staticmethod
    def heat_map ( action_id ):
        
        action = Action.objects.get ( id = action_id )

        me_toos = action.metoo_set.all()

        result = []

        def extract_geo ( me_too ) :
            return "%.3f|%.3f" % ( me_too.location.latitude , me_too.location.longitude )
        
        if not action.location is None:
            coordinate = extract_geo( action)
            coords = coordinate.split("|")
            result.append ( ( coords[0] , coords[1] , 1 ) )

        for coordinate, group in groupby ( me_toos , key=extract_geo) :
            coords = coordinate.split("|")
            result.append ( ( coords[0] , coords[1] , len (list(group ) ) ) )

        return result

#----------------------------------------------------------

class MeToo ( models.Model ) :

    date_time = models.DateTimeField ( auto_now_add = True )
    from_ip   = models.CharField     ( max_length   = 32   )
    location  = models.ForeignKey    ( Location )
    action    = models.ForeignKey    ( Action   )
    expired   = models.BooleanField  ( db_index = True )

    def __unicode__ ( self ):
        return "%s" % self.date_time
