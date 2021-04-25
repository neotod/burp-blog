function query_post() {
    let post_id = location.href.split('/').slice(-1)

    let ajax = $.ajax({
        url: '/jsquery/post',
        method: 'POST',
        body: post_id
    })

    ajax.done(function(data) {
        let post = JSON.parse(data)
        return post
    })
    ajax.fail(function() {

    })
}

function fill_inputs() {
    let post = query_post()
    let image_upload_container = $('.input-image-container')
    let upload_file_label      = $('.input-image-container > label')
    let upload_file_input      = $('.input-image-container > input')
    
    image_upload_container.html('')

    

    subject_input.val(post.subject)
}
