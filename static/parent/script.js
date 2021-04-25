let query_fails_num = 0
let result_wrapper_click = false
let flashes_container = $('.flashes-container')

function update_flash_container(window) {
    let window_elem  = $(window)
    let window_width = window_elem.width()

    flashes_container.css('left', (window_width - flashes_container.width()) / 2)
}

function show_search_result(result) {      
    let result_main = $('.search-bar .result-container').children().eq(1)

    /* result = {
        id: {
            "subject": ,
            "image_url":
        },
        id: {
            "subject": ,
            "image_url":
        }, ...
    }
    */

    for (let post_id in result) {
        let post_div    = $('<div/>')
        let anchor_link = $('<a/>')
        let image_div   = $('<div/>')
        let subject_div = $('<div/>')
        let post_info   = result[post_id]
        let post_url    = new URL(`post-${post_id}`, window.location.origin)

        anchor_link.prop({'href': post_url, 'title': 'Click to see the post'})

        post_div.addClass('post-result')

        image_div.addClass('image-wrapper')
        image_div.css('background-image', `url(/${post_info.image_url})`)
        
        subject_div.addClass('subject-div')
        subject_div.text(post_info.subject)
        
        post_div.append(image_div)
        post_div.append(subject_div)
        anchor_link.append(post_div)
        result_main.append(anchor_link)
    }
}

function search() {
    let result_container        = $('.search-bar .result-container')
    let result_header_innertext = result_container.find('.result-header .innertext')
    let result_main             = result_container.children().eq(1)
    let search_inp              = $('.search-bar .input-wrapper input')
    let input                   = search_inp.val()
    
    if (input == '') {
        result_main.html('')
        search_inp.trigger('focus')
        return
    }
    
    let form_data = new FormData()
    form_data.append('search_inp', input)
    
    let result = null
    let jqxhr = $.ajax({
        type: 'POST',
        url: '/search_query',
        data: form_data,
        processData: false,
        contentType: false,
    })

    jqxhr.done(function(data) {
        result = JSON.parse(data)

        result_main.html('')
        result_header_innertext.text('Result:')

        if (!$.isEmptyObject(result)) {
            show_search_result(result)
        }
        else {
            let span = $('<span/>')
            span.addClass('nf-span')
            span.text('Nothing found!')
    
            result_main.append(span)
        }

        query_fails_num = 0
    })

    
    jqxhr.fail(function() {
        if (query_fails_num < 3) {
            query_fails_num++
            $('.search-bar .input-wrapper input').trigger('input')
        } 
        else {
            let span = $('<span/>')
            span.addClass('nf-span')
            span.text('ERROR: there are some problems, please refresh the page and search again :)')
    
            result_main.append(span)
        }

    })
}

function toggle_search_result(event) {
    let result_container = $('.search-bar .result-container')
    let search_inp = $('.search-bar .input-wrapper input')

    console.log('hi')
    
    if (event.type == 'focus' && search_inp.val() == '') {
        let search_bar_width = $('.search-bar').width()
        result_container.outerWidth(search_bar_width + 'px')
                        .addClass('result-show')

        let result_header_innertext = $('.search-bar .result-container .result-header .innertext')
        result_header_innertext.text('Type something to search')
    }
    else if (event.type == 'click') { // clicking on disapear button
        result_container.removeClass('result-show')

        search_inp.val('')

        let result_main = result_container.children().eq(1)
        result_main.empty()
    }
}

function change_elements_size(event) {
    let result_container   = $('.search-bar .result-container')
    let search_bar_width = $('.search-bar').width()
    result_container.outerWidth(search_bar_width + 'px')

    update_flash_container(event.target)
}


if (flashes_container) {
    let show_timer = flashes_container.find('.show-timer')
    console.log(show_timer.width())

    let interval_id = setInterval(function() {
        show_timer.width(parseInt(show_timer.width()) - 0.5 + 'px')
    }, 8)

    let timeout_id  = setTimeout(function() {
        flashes_container.remove()
        clearInterval(interval_id)
    }, 5000)

    flashes_container.find('.disappear-button').click(function() {
        clearTimeout(timeout_id)
        clearInterval(interval_id)
        flashes_container.remove()
    })

    update_flash_container(window)
}

// event bindings
let search_inp = $('.search-bar .input-wrapper input')
let result_disapear_btn = $('.search-bar .result-container .result-header .disapear-button')

result_disapear_btn.on('click', toggle_search_result)

search_inp.on('input', search)
          .on('focus', toggle_search_result)
          .on('keypress', function(event) {
                if (event.code == 'Escape') search_inp.blur()
            })

$(window).on('resize', change_elements_size)