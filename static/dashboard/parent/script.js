$(document).ready(function(){
    let navbar_anchors = $('main .main-container .navbar-container ul li a')
    let dashboard_part = location.href.split('/')[4]
    let setting_css    = {'background-color': 'gray', 'color': 'white', 'border-color': 'white'}

    if      (dashboard_part == 'write-post') navbar_anchors.eq(0).css(setting_css)
    else if (dashboard_part == 'all-posts')  navbar_anchors.eq(1).css(setting_css)
    else if (dashboard_part == 'setting')    navbar_anchors.eq(2).css(setting_css)

})