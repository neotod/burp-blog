function input_blur(event) {
    let input_elem       = $(event.target)
    let input_elem_name  = input_elem.prop('name')
    let input_elem_value = input_elem.val()
    let input_next_elem  = input_elem.next()

    let error_text = ''

    if (input_next_elem.prop('tagName') != 'SPAN') {
        if (input_elem_value) {
            if (input_elem_name == 'username') {
                let username_valid = true
                let valid_chars = 'abcdefghijklmnopqrstuvwxyz0123456789_'
                for (let char of input_elem_value) {
                    if (!valid_chars.includes(char)) {
                        username_valid = false
                        break
                    }
                }
        
                if (!username_valid) error_text = "Can't use invalid characters in your username, you can only use [a-z, A-Z, 0-9, _] !"
            }
            else if (input_elem_name == 'password') {
                let password = input_elem.val()
                if (password.length < 5) error_text = "Your password must be more than 5 characters!"
            }
            else if (input_elem_name == 'r_password') {
                let password = $('input[name=password]').val()
                let password_repeat = input_elem.val()
    
                if (password != password_repeat) error_text = "Your password and repeat password must be the same!"
            }
        
            if (error_text != '') {
                let alert_span = $('<span/>')
                alert_span.text(error_text)
                alert_span.addClass('login-register-error')
                alert_span.addClass('input-error')
                alert_span.click(input_focus)

                input_elem.css('margin-bottom', -3 + 'px')
                input_elem.after(alert_span)
            }
        }
    }
}

$('.inputs-wrapper input').blur(input_blur)