from django.core.management import setup_environ
import settings
setup_environ(settings)
import pycurl, json
import re
from actions.models import Action


hashtag = "#doadoing"


STREAM_URL = "https://stream.twitter.com/1/statuses/filter.json"
WORDS      = "track=" + hashtag
USER       = "_martinariel"
PASS       = "martin1793"

insensitive_hippo = re.compile ( re.escape ( hashtag ), re.IGNORECASE)

def on_tweet(data):
    try :    
        tweet = json.loads(data)
        content = tweet['text']
        
        content = insensitive_hippo.sub('', content )
        
        action = Action()
        action.content = content[:70]
        action.from_ip = 'Twitter'
        print (action.content)
        action.save()
        print ( action.id )
    except :
        return

conn = pycurl.Curl()
conn.setopt(pycurl.POST, 1)
conn.setopt(pycurl.POSTFIELDS, WORDS)
conn.setopt(pycurl.HTTPHEADER, ["Connection: keep-alive", "Keep-Alive: 3000"])
conn.setopt(pycurl.USERPWD, "%s:%s" % (USER, PASS))
conn.setopt(pycurl.URL, STREAM_URL)
conn.setopt(pycurl.WRITEFUNCTION, on_tweet)
conn.perform() 
