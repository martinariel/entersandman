from django.conf.urls.defaults import patterns, include, url

from django.contrib import admin
admin.autodiscover()

urlpatterns = patterns('',
    # Examples:
    
    url(r'^$', 'actions.views.home', name='home'),
    url(r'^add-action/'     , 'actions.views.add_action', name='add-action'),
    url(r'^me-too/'         , 'actions.views.me_too'         ),
    url(r'^load-actions/'   , 'actions.views.load_actions'   ),
    url(r'^search-actions/' , 'actions.views.search_actions' ),
    url(r'^stats/'          , 'actions.views.stats'          ),
    url(r'^heat-map/'       , 'actions.views.heat_map'       ),
    url(r'^new-actions/'    , 'actions.views.new_actions'    ),
    url(r'^doing/(\d+)/$'        , 'actions.views.view_action'    ),

    # Uncomment the admin/doc line below to enable admin documentation:
    url(r'^admin/doc/', include('django.contrib.admindocs.urls')),

    # Uncomment the next line to enable the admin:
    url(r'^admin/', include(admin.site.urls)),
)
