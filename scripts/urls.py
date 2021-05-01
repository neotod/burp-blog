''' All of the urls of Burp Blog gathered here with a name like a constant.'''

HOME = '/'
INDEX = '/index'
INDEX_HTML = '/index.html'

LOGIN = '/login'
REGISTER = '/register'
LOGOUT = '/logout'

SEARCH = '/search'
DYNAMIC_SEARCH = '/search_query'

POST = '/post-<post_id>'

FILE = '/<file_name>'
FOLDER_FILE = '/<folder_name>' + FILE

DASHBOARD = '/dashboard'
DASHBOARD_WRITEPOST = '/dashboard/write-post'
DASHBOARD_ALLPOSTS = '/dashboard/all-posts'
DASHBOARD_ALLPOSTS_ACTIONS = '/dashboard/all-posts/<action>/<post_id>'
DASHBOARD_ALLPOSTS_EDIT = '/dashboard/all-posts/edit-post/<post_id>'
DASHBOARD_SETTING = '/dashboard/setting'
DASHBOARD_SETTING_PART = '/dashboard/setting/<part>'
DASHBOARD_EDITPOST = '/dashboard/'
DASHBOARD_DELETEPOST = '/dashboard'

JS_AJAX = '/jsquery/<query_type>'