from django.db import models
from itertools import groupby

class Location ( models.Model ) :

    country_code = models.CharField ( max_length = 10 )

    latitude  = models.FloatField ()
    longitude = models.FloatField ()

#---------------------------------------------------------

class Action ( models.Model ) :

    date_time = models.DateTimeField ( auto_now_add = True )
    content   = models.CharField     ( max_length   = 70 , db_index = True )
    from_ip   = models.CharField     ( max_length   = 32   )
    location  = models.ForeignKey    ( Location, blank = True , null = True )
    expired   = models.BooleanField  ( db_index = True )

    @staticmethod
    def importants ( last ):

        if last <= 0 :
            return Action.objects.filter ( expired = False).order_by ( "-id")[:25]
        else :
            return Action.objects.filter ( expired = False , id__lt = last ).order_by ("-id")[:25]


    @staticmethod
    def search ( action_content , latitude , longitude , last ):
        if last == 0 :
            return Action.objects.filter ( content__search = action_content , expired = False ).order_by ("-date_time")
        else :
            return Action.objects.filter ( id__gt = int(last) , content__icontains = action_content , expired = False ).order_by ("-date_time")

    @staticmethod
    def stats ( action_id ):

        #Grouped by hour
        def extract_date(entity):
            return entity.date_time.strftime("%s %s" % ("%Y-%m-%d", "%H:%M"))

        a = Action.objects.get ( id = action_id )

        me_toos = a.metoo_set.order_by("date_time")

        result = []

        result.append ( ( extract_date ( a ) , 1 ) )

        for start_date, group in groupby(me_toos, key=extract_date):
            result.append ( ( start_date , len ( list(group) ) ) )

        return result

    @staticmethod
    def heat_map ( action_id ):
        
        action = Action.objects.get ( id = action_id )

        me_toos = action.metoo_set.all()

        result = []

        def extract_geo ( me_too ) :
            return "%.2f|%.2f" % ( me_too.location.latitude , me_too.location.longitude )
        
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
