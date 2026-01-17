# sources.py
LOCAL_NEWS_MAP = {
    "mumbai": "site:mid-day.com OR site:mumbaimirror.com OR site:timesofindia.indiatimes.com/city/mumbai OR site:freepressjournal.in OR site:reddit.com/r/mumbai",
    "pune": "site:esakal.com OR site:punemirror.com OR site:pune-news.com OR site:hindustantimes.com/cities/pune-news OR site:reddit.com/r/pune",
    "nagpur": "site:thehitavada.com OR site:lokmat.com OR site:timesofindia.indiatimes.com/city/nagpur OR site:reddit.com/r/nagpur",
    "thane": "site:thaneweb.com OR site:timesofindia.indiatimes.com/city/thane OR site:reddit.com/r/thane",
    "maharashtra_general": "site:lokmat.com OR site:pudhari.news OR site:abpmajha.abplive.in OR site:loksatta.com OR site:maharashtratimes.com OR site:reddit.com/r/maharashtra"
}

def get_verification_query(topic, location):
    # Default to general if location not specific
    site_filter = LOCAL_NEWS_MAP.get(location.lower(), LOCAL_NEWS_MAP["maharashtra_general"])
    return f'{topic} {location} {site_filter}'