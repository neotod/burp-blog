let inputs = $('.inputs-wrapper input')

function input_change(event) {
    let input_elem = $(event.target)
    if (input_elem.next().prop('tagName') == 'SPAN') input_elem.next().remove()
    input_elem.css('margin-bottom', '')
}

function input_focus(event) {
    let input_elem = $(event.target)
    if (input_elem.prop('tagName') == 'SPAN') {
        input_elem = input_elem.prev()
        input_elem.focus()
    }
    
    let input_next = input_elem.next()
    if (input_next.prop('tagName') == 'SPAN') input_next.remove()
    input_elem.css('margin-bottom', '')
}

function check_inputs_emptiness(event) {
    event.preventDefault()

    let submit_error = false
    for (let input_elem of inputs) {
        input_elem = $(input_elem)
        let next_elem = $(input_elem.next())

        if (input_elem.val() == '' && next_elem.prop('tagName') != 'SPAN') { // there is no error about the input
            error = `Please enter your ${input_elem.prop('title')}.`
            
            let alert_span = $('<span/>')
            alert_span.text(error)
            alert_span.addClass('login-register-error')
            alert_span.addClass('input-error')
            alert_span.click(input_focus)

            input_elem.css('margin-bottom', -3 + 'px')
            input_elem.after(alert_span)

            submit_error = true
        }
        else if (next_elem.prop('tagName') == 'SPAN') submit_error = true
    }

    if (!submit_error) {
        event.target.submit()
    }
}

$(document).ready(function () {
    $('.main-container form').submit(check_inputs_emptiness)
    $('.inputs-wrapper input').on('input', input_change)
    $('.inputs-wrapper input').focus(input_focus)
})