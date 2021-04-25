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

    let inputs          = $('.inputs-row > input, .inputs-row > textarea')
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
            url: '/dashboard/write-post',
            method: 'POST',
            data: form_data,
            processData: false,
            contentType: false
        })

        req.done(function(data) {
            inputs.val('')
            tags_spans.remove()
            location.reload()
        })
        req.fail(function(data) {
            let submit_container = $('input-submit-container input')
            let error_text       = 'Sorry, there is a problem with the server now, please refersh the page and write your post again (you should copy your text first).'
            show_error_span(submit_container, error_text, false)
        })
    }
}

function elements_resize() {
    update_length_indicator()

    let content_textarea  = $('.inputs-row textarea[name=content]')
    $('.input-content-container .link-make-container').width(content_textarea.width())
}


$(document).ready(function() {
    let inputs              = $('.inputs-row > input, .inputs-row > textarea')
    let subject_input       = $('.inputs-row input[name=subject]')
    let preface_textarea    = $('.inputs-row textarea[name=preface]')
    let tags_input          = $('.inputs-row input[name=tags]')
    let content_textarea    = $('.inputs-row textarea[name=content]')
    let tools_buttons       = $('.tools-container .tools')
    let link_make_buttons   = $('.input-content-container .link-make-container .buttons-container button')
    let link_make_container = $('.input-content-container .link-make-container')

    let filter_func = function(index) { return $(this).prop('name') != 'content' }
    let valid_chars = 'abcdefghijklmnopqrstuvwxyz0123456789_.,:; '

    subject_input   .on('input', () => check_for_invalid_chars(subject_input, valid_chars))
    preface_textarea.on('input', preface_input)
    tags_input      .on('input', tags_change)
    
    inputs.on('input', universal_input_change)
    inputs.on('focus', universal_input_focus)
    inputs.on('click', () => content_selection_indices = [])
    
    inputs.filter(filter_func).on('keydown', input_keypress)
    inputs.filter(filter_func).on('paste', input_keypress)
    
    content_textarea.select(content_text_select)
    tools_buttons    .click(tools_click)
    link_make_buttons.click(link_buttons_click)

    $('.main-container form').on('submit', form_submit)

    link_make_container.width(content_textarea.width())
    link_make_container.hide()

    // micelaneous event bindings
    $('.input-content-container .link-make-container .link-address input').keydown(function(event) {
        if (event.code == 'Enter') {
            let add_link_btn = $('.input-content-container .link-make-container .buttons-container .add-container button')
            add_link_btn.trigger('click')
            event.preventDefault()
        }
    })


    $(window).on('resize', elements_resize)
})