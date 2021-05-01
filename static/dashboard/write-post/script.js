let inputs = null
let current_post = null
let image_upload_file = null
let is_any_part_changed = false
let content_selection_indices = []

function show_error_span(elem, error, input_lock) {
    let next_elem = elem.next()

    if (next_elem.prop('tagName') == 'SPAN') {
        next_elem.text(error)
    }
    else {
        let error_span = $('<span/>')
            
        error_span.addClass('input-error')
        error_span.text(error)
    
        elem.after(error_span)
        elem.prop('lock', input_lock)
    }
}

function input_keypress(event) {
    update_length_indicator(event)

    let input_elem       = $(event.target)
    let length_indicator = input_elem.prev()
    let next_elem        = input_elem.next()

    length_indicator.fadeIn()

    if (input_elem.prop('lock')) {
        if (next_elem.prop('tagName' != 'SPAN')) input_elem.prop('lock', false)
        else {
            let valid_keyCodes = [
                                    3, 8, 9, 12, 13, 16, 17, 18, 19, 20, 21, 25, 27, 28, 29, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, 42, 43, 44, 45, 46, 47,
                                    91, 92, 93, 95, 112, 113, 114, 115, 116, 117, 118, 119, 120, 121, 122, 123, 124, 125, 126, 127, 128, 129, 130, 131, 132,
                                    133, 134, 135, 136, 137, 138, 139, 140, 141, 142, 143
                                ] // keys that are not a type of letter
        
            if (next_elem.prop('tagName') == 'SPAN' && valid_keyCodes.indexOf(event.keyCode) == -1) event.preventDefault() // we have a text that is saying your input has an error
        }
    }
}

function check_for_invalid_chars(input_elem, valid_chars) {
    let input        = $(input_elem)
    let next_elem    = input.next()
    let invalid_char = false
    let error_text   = ''

    for (let char of input.val()) {
        if (!valid_chars.includes(char.toLowerCase())) {
            invalid_char = true
            break
        }
    }

    if (invalid_char) {
        error_text = `Can't use invalid characters in your username, you can only use ${valid_chars} !`
    }

    if (error_text != '') {
        if (next_elem.prop('tagName') != 'SPAN') show_error_span(input, error_text, true)
        else next_elem.text(error_text)
    }
    else {
        if (next_elem.prop('tagName') == 'SPAN') {
            next_elem.remove()
            input.prop('lock', false)
        }
    }

}

function content_text_select(event) {
    let textarea = event.target
    content_selection_indices = [textarea.selectionStart, textarea.selectionEnd]
}

function tags_change(event) {
    check_for_invalid_chars(event.target, 'abcdefghijklmnopqrstuvwxyz, ')
    
    let tags_input = $(event.target)
    let last_char  = tags_input.val().slice(-1)

    if (last_char == ',') {
        let selected_tags_container = $('.input-tags-container .selected-tags-container')
        let selected_tags           = $('.input-tags-container .selected-tags-container > span')
        let tags_input              = $('.input-tags-container input')
        let tag                     = tags_input.val().slice(0, -1)
        
        let is_tag_duplicate = ''
        selected_tags.each(function() {
            if ($(this).text() == tag) {
                is_tag_duplicate = true
                return
            }
        })

        if (is_tag_duplicate) {
            tags_input.val('')
        }
        else if (selected_tags.length == 5) {
            let error_text = `You've reached the limit! Can't add any tag anymore.`
            show_error_span(tags_input, error_text, true)
            tags_input.val('')
        }
        else {
            let query = $.get('/jsquery/tags', {
                dataType: 'json'
            })
    
            query.done(function(data) {
                let valid_tags = JSON.parse(data)['tags']
    
                if (valid_tags.indexOf(tag) != -1) {
                    let tag_span = $('<span/>')
    
                    tag_span.on('click', (event) => $(event.target).remove())
                    tag_span.text(tag)
                    tag_span.prop('title', 'Click to discard the tag')
    
                    tags_input.val('')
    
                    selected_tags_container.append(tag_span)
                }
                else {
                    let error_text = `Please provide a tag between this list [${valid_tags.toString()}]!`
                    show_error_span(tags_input, error_text)
                }
            })
        }

    }
}

function update_length_indicator(event) {
    $('.inputs-row .length-indicator').each(function(index, elem) {
        let indicator_span = $(this)
        let next_input     = indicator_span.next()
        let input_position = next_input.position()
        
        let css_left   = input_position.left + next_input.outerWidth() - indicator_span.width() - 20
        let css_top    = input_position.top + next_input.outerHeight() - indicator_span.outerHeight() - 3
        let css_height = next_input.outerHeight() - 5

        if (next_input.prop('tagName') == 'TEXTAREA') css_height = ''
    
        indicator_span.css({ 'left': css_left,
                             'top': css_top,
                             'height': css_height })
    
    })
}

function universal_input_change(event) {
    update_length_indicator(event)
    
    let input_elem   = $(event.target)
    let input_length = input_elem.val().length
    let length_limit = input_elem.prev().text()
    let max_length   = length_limit.split('/')[1]

    if (!input_elem.prev().hasClass('length-indicator')) return false
    
    input_elem.prev().text(input_length + '/' + max_length)

    if (input_length > max_length) input_elem.prev().css('color', 'red')
    else input_elem.prev().css('color', '')

    content_selection_indices = []
}

function universal_input_focus(event) {
    update_length_indicator(event)

    let input_elem = $(event.target)
    let next_elem  = input_elem.next()
    
    let make_link_container = $('.input-content-container .link-make-container')
    let link_address_inp    = $('.input-content-container .link-make-container .link-address input')
    let selected_text_span  = $('.tools-container .link-make-container .selected-text span:nth-child(3)')

    selected_text_span.text('')
    link_address_inp.val('')
    make_link_container.slideUp('fast')
    content_selection_indices = []

    if (!input_elem.prop('lock')) {
        if (next_elem.prop('tagName') == 'SPAN') next_elem.remove()
    }
}

function universal_input_blur(event) {
    let input_elem       = $(event.target)
    let length_indicator = input_elem.prev()

    content_selection_indices = []
}

function tools_click(event) {
    let tool_elem        = $(event.target)
    let tool_class       = tool_elem.prop('class').split(' ')[1]
    let content_textarea = $('.inputs-row textarea[name=content]')
    let content_text     = content_textarea.val()
    let selected_text    = content_text.slice(content_selection_indices[0], content_selection_indices[1])

    if (!selected_text || content_selection_indices.length == 0) {
        content_textarea.focus()
        return
    }

    if (tool_class == 'link-make-button') {
        let content_text  = $('.inputs-row textarea[name=content]').val()
        let selected_text = content_text.slice(content_selection_indices[0], content_selection_indices[1])
        
        $('.input-content-container .link-make-container .selected-text span:nth-child(3)').text(selected_text)
        let make_link_container = $('.input-content-container .link-make-container')
        make_link_container.slideDown('fast')

        $('.input-content-container .link-make-container .link-address input').focus()

    }
    else {
        let new_text = content_text
        let tag_parts = []

        if      (tool_class == 'bold-button')      tag_parts = ['<b>', '</b>']
        else if (tool_class == 'italic-button')    tag_parts = ['<i>', '</i>']
        else if (tool_class == 'underline-button') tag_parts = ['<u>', '</u>']

        new_text = content_text.slice(0, content_selection_indices[0]) +
        tag_parts[0] + selected_text + tag_parts[1] +
        content_text.slice(content_selection_indices[1])
    
        content_textarea.val(new_text)
        content_selection_indices = []
    }
}

function link_buttons_click(event) {
    let button_name         = $(event.target).text()
    let make_link_container = $('.input-content-container .link-make-container')
    let link_address_inp    = $('.input-content-container .link-make-container .link-address input')
    let selected_text_span  = $('.tools-container .link-make-container .selected-text span:nth-child(3)')

    if (button_name == 'Abort') {
        selected_text_span.text('')
        link_address_inp.val('')
        make_link_container.slideUp('fast')
    }
    else if (button_name == 'Add') {
        let address = link_address_inp.val()
        let error   = ''

        if (address == '') {
            error = 'Please provide link address'
        }
        else {
            let regexp = "((https|http)\:\/\/)?([a-zA-z0-9]+\.)+[a-zA-z]{2,10}(\/(.*))?[a-zA-z0-9]*"
            if (address.match(regexp) && address.match(regexp)[0] == address) {
                let content_textarea = $('.inputs-row textarea[name=content]')
                let content_text     = content_textarea.val()
                let selected_text    = content_text.slice(content_selection_indices[0], content_selection_indices[1])

                new_text = content_text.slice(0, content_selection_indices[0]) +
                `<a href="${address}">` + selected_text + "</a>" + 
                content_text.slice(content_selection_indices[1])
                content_textarea.val(new_text)
                
                selected_text_span.text('')
                link_address_inp.val('')
                make_link_container.slideUp('fast')
            }
            else {
                error = 'Please provide a valid address'
            }
        }

        if (error) show_error_span(link_address_inp, error)
    }
    content_selection_indices = []
}

function form_submit(event) {
    event.preventDefault()
    let required_inputs = inputs.not('[name=tags], [name=image], [name=preface]')
    let tags_spans      = $('.input-tags-container .selected-tags-container > span')
    let scrollto_elem   = null

    required_inputs.each(function(index) {
        let input_elem     = $(this)
        let prev_elem      = input_elem.prev()
        let next_elem      = input_elem.next()
        let input_with_err = false
        
        if (next_elem.prop('tagName') == 'SPAN') { // input have error span after it
            input_with_err = true
        }
        else if (input_elem.val() == '') // check for emptiness error
        {
            let error_text = `Please fill your post ${input_elem.prop('name')}`
            show_error_span(input_elem, error_text, false)
            input_with_err = true
        }

        if (input_with_err && !scrollto_elem) {
            scrollto_elem = input_elem
        }
    })
    
    inputs.each(function(index) { // check for length exceeding errors
        let input_elem     = $(this)
        let prev_elem      = input_elem.prev()
        let input_with_err = false

        if (prev_elem.hasClass('length-indicator')) {
            let input_val_length = input_elem.val().length
            let val_max_length   = parseInt(prev_elem.text().split('/')[1])

            if (input_val_length > val_max_length) input_with_err = true
        }

        if (input_with_err && !scrollto_elem) {
            scrollto_elem = input_elem
        }
    })

    if (tags_spans.length == 0) { // post doesn't have any tag
        let error_text = `Please choose at least one tag for your post.`
        let tags_input = $('.inputs-row > input[name=tags]')
        show_error_span(tags_input, error_text, false)
        
        if (!scrollto_elem) {
            scrollto_elem = tags_input
        }
    }


    if (location.href.includes('edit')) {
        if (!is_any_part_changed) { // if user tried to change the post image before, then is_any_part_change becomes true
            let subject_val = inputs.filter('input[name=subject]').val()
            let preface_val = inputs.filter('input[name=subject]').val()
            let content_val = inputs.filter('input[name=subject]').val()

            if (subject_val != current_post.subject) is_any_part_changed = true
            else if (preface_val != current_post.preface) is_any_part_changed = true
            else if (content_val != current_post.content) is_any_part_changed = true

            if (!is_any_part_changed) {
                let current_image_url = $('.input-image-container .image-wrapper img').prop('src')
                let post_image_url    = current_post.image_url
                
                if (current_image_url != post_image_url) is_any_part_changed = true

                if (!is_any_part_changed) {
                    let post_tags           = new Set(current_post.tags)
                    let selected_tags_spans = $('.input-tags-container .selected-tags-container > span')

                    selected_tags_spans.each(function(index) {
                        let tag = $( this ).text()
                        if (!post_tags.has(tag)) {
                            is_any_part_changed = true
                            return false
                        }
                    })
                }
            }
        }

        if (!is_any_part_changed) {
            let submit_button = inputs.eq(5)
            let error_text    = "Couldn't find any change in your post, please try to change something and sumbit again."
            show_error_span(submit_button, error_text, false)
        }
    }


    if (scrollto_elem) {
        scrollto_elem.get(0).scrollIntoView()
    } 
    else {
        let selected_tags = []
        tags_spans.each(function() {
            selected_tags.push($(this).text())
        })

        let form = $('.main-container form').get(0)
        let form_data = new FormData(form)
        form_data.set('tags', selected_tags)

        let req = $.ajax({
            url: location.pathname,
            method: 'POST',
            data: form_data,
            processData: false,
            contentType: false
        })

        req.done(function(data) {
            if (location.href.includes('edit')) {
                location.href = location.origin + '/dashboard/all-posts'
            }
            else {
                inputs.val('')
                tags_spans.remove()
                location.reload()
            }
        })
        req.fail(function(jqxhr, status, error) {
            let error_text           = ''
            let remove_current_image = true
            let show_error_elem      = null
            
            if (jqxhr.status == 403) {
                error_text = 'Please provide a image-kind file for your post image (files with extenstions like .png .jpg .jpeg)'
                show_error_elem = $('.input-image-container .buttons-container').children().eq(3)
            }
            else if (jqxhr.status == 413) {
                error_text = 'Please provide a file with less than 2MegaBytes size.'
                show_error_elem = $('.input-image-container .buttons-container').children().eq(3)
            }
            else {
                error_text = 'Sorry, there is a problem with the server now, try submit again or refersh the page and write your post again (you had better to have a copy of your post first).'
                show_error_elem = $('.input-submit-container')
                remove_current_image = false
            }

            if (remove_current_image) {
                let image_wrapper = $('.input-image-container .image-wrapper')
                let image_input   = inputs.filter('input[name=image]')

                image_wrapper.children().eq(0).prop('src', '/images/not-found.png')
                image_input.val('')
            }


            show_error_elem.get(0).scrollIntoView()
            show_error_span(show_error_elem, error_text, false)
        })
    }
}

function elements_resize() {
    update_length_indicator()

    let content_textarea  = $('.inputs-row textarea[name=content]')
    $('.input-content-container .link-make-container').width(content_textarea.width())
}

function upload_input_change(event) {
    let input_elem          = event.target
    let file                = input_elem.files[0]
    let image_wrapper       = $('.input-image-container .image-wrapper')
    let image_remove_btn    = $('.input-image-container .buttons-container button:nth-child(4)')
    let image_upload_chbox  = $('.input-image-container input[name=remove_image]')

    let image_src = URL.createObjectURL(file)
    image_wrapper.children().eq(0).prop('src', image_src)

    image_upload_file = file
    image_remove_btn.prop('disabled', false)

    is_any_part_changed = true
    image_upload_chbox.prop('checked', false)
}

function image_upload_buttons_click(event) {
    let elem              = $(event.target)
    let upload_file_input = $('.input-image-container .buttons-container > input')
    
    if (elem.text() == 'Upload photo') {
        upload_file_input.click()
    }
    else if (elem.text() == 'Remove photo') {
        let image_wrapper       = $('.input-image-container .image-wrapper')
        let image_upload_chbox  = $('.input-image-container input[name=remove_image]')

        upload_file_input.val('')
        $(image_wrapper.children().eq(0)).prop('src', '/images/not-found.png')

        image_upload_file = null
        elem.prop('disabled', true)

        image_upload_chbox.prop('checked', true)
    }

    if (elem.next().prop('tagName') == 'SPAN') elem.next().remove()
}

function fill_inputs() {
    let image_wrapper           = $('.input-image-container .image-wrapper')
    let subject_input           = $('.inputs-row input[name=subject]')
    let preface_textarea        = $('.inputs-row textarea[name=preface]')
    let content_textarea        = $('.inputs-row textarea[name=content]')
    let selected_tags_container = $('.input-tags-container .selected-tags-container')
    
    subject_input.val(current_post.subject)
    preface_textarea.val(current_post.preface)
    content_textarea.val(current_post.content)
    
    if (current_post.image_url) image_wrapper.children().eq(0).prop('src', current_post.image_url)
    else {
        image_wrapper.children().eq(0).prop('src', '/images/not-found.png')
        
        $('.input-image-container .buttons-container button:nth-child(4)').prop('disabled', true)
    }

    selected_tags_container.html('')
    for (tag of current_post.tags) {
        let tag_span = $('<span/>')
        tag_span.text(tag)
        tag_span.prop('title', 'Click to discard the tag')

        selected_tags_container.append(tag_span)
    }

    document.documentElement.scrollIntoView()
    is_any_part_changed = false
}

function retrieve_post() {
    let post_id     = location.href.split('/').slice(-1)[0]
    let post_data   = new FormData()
    post_data.append('post_id', post_id)

    let ajax = $.ajax({
        url: '/jsquery/post',
        method: 'POST',
        data: post_data,
        contentType: false,
        processData: false
    })

    ajax.done(function(data) {
        current_post = JSON.parse(data)
        fill_inputs()
    })

    ajax.fail(function() {
        error_msg = "Something's wrong on retrieving your post from server, please try again."

        post_data = new FormData()
        post_data.append('msg', error_msg)
        
        flash_ajax = $.ajax({
            url: '/jsquery/flash',
            method: 'POST',
            data: post_data,
            contentType: false,
            processData: false
        })
        location.reload()
    })
}


$(document).ready(function() {
    inputs = $('.inputs-row > input, .inputs-row > textarea')

    let subject_input       = $('.inputs-row input[name=subject]')
    let preface_textarea    = $('.inputs-row textarea[name=preface]')
    let tags_input          = $('.inputs-row input[name=tags]')
    let content_textarea    = $('.inputs-row textarea[name=content]')
    let tools_buttons       = $('.tools-container .tools')
    let link_make_buttons   = $('.input-content-container .link-make-container .buttons-container button')
    let link_make_container = $('.input-content-container .link-make-container')
    let image_upload_btns   = $('.input-image-container .buttons-container button')
    let image_upload_inp    = $('.input-image-container input[name=image]')
    let image_upload_chbox  = $('.input-image-container input[name=remove_image]')
    let back_to_default_btn = $('.input-submit-container input:nth-child(1)')
    let main_form           = $('.main-container form')

    let filter_func = function(index) { return $(this).prop('name') != 'content' }
    let valid_chars = 'abcdefghijklmnopqrstuvwxyz0123456789_.,:; '

    subject_input   .on('input', () => check_for_invalid_chars(subject_input, valid_chars))
    tags_input      .on('input', tags_change)
    
    inputs.on('input', universal_input_change)
    inputs.on('focus', universal_input_focus)
    inputs.on('click', () => content_selection_indices = [])
    
    inputs.filter(filter_func).on('keydown', input_keypress)
    inputs.filter(filter_func).on('paste', input_keypress)
    
    content_textarea.select(content_text_select)
    tools_buttons.click(tools_click)
    link_make_buttons.click(link_buttons_click)
    back_to_default_btn.click(fill_inputs)

    image_upload_inp.on('change', upload_input_change)
    image_upload_inp.hide()
    image_upload_chbox.hide()

    main_form.on('submit', form_submit)

    link_make_container.width(content_textarea.width())
    link_make_container.hide()

    image_upload_btns.click(image_upload_buttons_click)
    image_upload_btns.eq(1).prop('disabled', true)
    
    // micelaneous event bindings
    $('.input-content-container .link-make-container .link-address input').keydown(function(event) {
        if (event.code == 'Enter') {
            let add_link_btn = $('.input-content-container .link-make-container .buttons-container .add-container button')
            add_link_btn.trigger('click')
            event.preventDefault()
        }
    })
    
    
    $(window).on('resize', elements_resize)
    
    // below is for the edit-post part
    if (location.href.includes('edit')) {
        let post_id = location.pathname.split('/').slice(-1)[0]
        
        retrieve_post()
        main_form.prop('action', '/dashboard/all-posts/edit-post/' + post_id)
        
        image_upload_btns.eq(1).prop('disabled', false)
    }
})